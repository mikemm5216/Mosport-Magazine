/* Trend Radar V1: deterministic, inspectable trend scoring (Founder decision
 * 2026-11-25, #35 #7164029496). Pure functions only: no network, no LLM, no
 * clock reads (the caller passes asOf). Every score is derived from explicit
 * inputs and returned with its parts, so a rank can be explained line by line.
 *
 * Rules that must hold:
 *  - Engagement velocity is scored only when a comparable measurement exists:
 *    same metric, same window, and a real baseline. Otherwise it is
 *    UNAVAILABLE and its weight is redistributed. Nothing is estimated.
 *  - A date-only timestamp is read as 00:00 UTC of that day (conservative:
 *    it can only make a trend look older, never fresher).
 *  - A source with no known timestamp cannot raise freshness.
 *  - The AI stage receives at most the top 3 STRONG candidates. LOW candidates
 *    are recorded only. */
'use strict';

const TIER_POINTS = { official: 40, major: 25, secondary: 10, social: 0 };
const TIER_CAP = { official: 1, major: 2, secondary: 2, social: 0 };
const WEIGHTS = { freshness: 0.25, engagement: 0.15, corroboration: 0.15, audience: 0.15, evidence: 0.15, content: 0.15 };
const THRESHOLDS = { strongTotal: 70, strongEvidence: 60, strongFreshness: 60, risingTotal: 50 };

const ISO = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|([+-])(\d{2}):(\d{2})))?$/;

function parseTime(value) {
  if (value == null) return null;
  // Strict ISO-8601 only: Date.parse accepts strings like 'Nov 24' and guesses a year,
  // and normalises overflow such as Feb 30 into another day, so every field is range-checked.
  const m = typeof value === 'string' ? ISO.exec(value) : null;
  if (!m) throw Error('BAD_TIMESTAMP: ' + value);
  const [, y, mo, d, h = '00', mi = '00', sec = '00', , , oh = '00', om = '00'] = m;
  const day = new Date(Date.UTC(+y, +mo - 1, +d));
  if (day.getUTCFullYear() !== +y || day.getUTCMonth() !== +mo - 1 || day.getUTCDate() !== +d
    || +h > 23 || +mi > 59 || +sec > 59 || +oh > 23 || +om > 59) throw Error('BAD_TIMESTAMP: ' + value);
  const t = Date.parse(m[4] == null ? value + 'T00:00:00Z' : value);
  if (Number.isNaN(t)) throw Error('BAD_TIMESTAMP: ' + value);
  return t;
}
const hoursBetween = (a, b) => (a - b) / 3600000;

/** Freshness from the latest dated development, or a scheduled related event within 72h.
 * A publication after asOf was not available at the cutoff and is rejected, never scored as fresh. */
function freshness(c, asOf) {
  if (!Number.isFinite(asOf)) throw Error('MISSING_AS_OF');
  const published = c.sources.map(s => parseTime(s.publishedAt)).filter(t => t != null);
  if (published.some(t => t > asOf)) throw Error('FUTURE_PUBLICATION: ' + c.id);
  const latest = Math.max(...published, -Infinity);
  let fromLatest = 0, age = null;
  if (latest !== -Infinity) {
    age = hoursBetween(asOf, latest);
    fromLatest = age <= 24 ? 100 : age <= 48 ? 80 : age <= 72 ? 60 : age <= 120 ? 35 : age <= 168 ? 15 : 0;
  }
  const next = parseTime(c.nextEventAt);
  const upcoming = next != null && next >= asOf && hoursBetween(next, asOf) <= 72 ? 85 : 0;
  return { score: Math.max(fromLatest, upcoming), ageHours: age == null ? null : Math.round(age * 10) / 10,
    nextEventWithin72h: upcoming > 0 };
}

/** Velocity only against a real, comparable baseline; otherwise UNAVAILABLE. A zero baseline has
 * no defined ratio policy, so it is UNAVAILABLE rather than scored as infinite growth. */
function engagement(c) {
  const e = c.engagement;
  const unavailable = reason => ({ score: null, status: 'UNAVAILABLE', reason });
  if (!e || e.value == null || e.baseline == null || !e.metric || e.windowHours == null || !e.baselineSource)
    return unavailable('no comparable measured metric and baseline');
  if (!Number.isFinite(e.value) || e.value < 0 || !Number.isFinite(e.baseline) || e.baseline < 0)
    return unavailable('measurement is not a finite non-negative number');
  if (!Number.isFinite(e.windowHours) || e.windowHours <= 0) return unavailable('measurement window is not positive');
  if (e.baseline === 0) return unavailable('baseline is zero: no ratio policy defined');
  const ratio = e.value / e.baseline;
  const score = ratio >= 3 ? 100 : ratio >= 2 ? 80 : ratio >= 1.25 ? 60 : ratio >= 1 ? 40 : 20;
  return { score, status: 'MEASURED', ratio: Math.round(ratio * 100) / 100 };
}

/** Distinct publishers reporting facts, by tier, with per-tier caps. Reactions and speculation do not corroborate. */
function corroboration(c) {
  const used = { official: new Set(), major: new Set(), secondary: new Set(), social: new Set() };
  for (const s of c.sources) if (s.claimType === 'fact' && used[s.tier]) used[s.tier].add(s.publisher);
  let score = 0;
  for (const tier of Object.keys(TIER_POINTS)) score += Math.min(used[tier].size, TIER_CAP[tier]) * TIER_POINTS[tier];
  return { score: Math.min(score, 100), publishers: Object.fromEntries(Object.entries(used).map(([k, v]) => [k, [...v].sort()])) };
}

function audience(c) {
  const map = { core: 100, adjacent: 60, outside: 20 };
  if (!(c.audience in map)) throw Error('BAD_AUDIENCE: ' + c.audience);
  return { score: map[c.audience] };
}

/** Evidence: official source present, share of key facts verified, conflicts, and whether primary pages were read directly. */
function evidence(c) {
  const e = c.evidence;
  if (!e || !(e.keyFactsTotal > 0) || e.keyFactsVerified > e.keyFactsTotal) throw Error('BAD_EVIDENCE: ' + c.id);
  const raw = (e.officialSourcePresent ? 40 : 0) + 40 * e.keyFactsVerified / e.keyFactsTotal
    + (e.primaryFetched ? 20 : 0) - 15 * (e.conflictsNoted || 0);
  return { score: Math.max(0, Math.min(100, Math.round(raw))) };
}

function content(c) {
  const k = c.content || {};
  const score = (k.rightsSafeVisual ? 30 : 0) + (k.uniqueAngle ? 35 : 0) + (k.landingRelevant ? 20 : 0) + (k.sensitive ? 0 : 15);
  return { score };
}

/** Merge candidates describing the same event (same eventKey); sources deduplicated by URL. */
function cluster(candidates) {
  const byKey = new Map();
  for (const c of candidates) {
    if (!c.eventKey) throw Error('MISSING_EVENT_KEY: ' + c.id);
    const prev = byKey.get(c.eventKey);
    if (!prev) { byKey.set(c.eventKey, { ...c, sources: [...c.sources], mergedIds: [c.id] }); continue; }
    const seen = new Set(prev.sources.map(s => s.url));
    for (const s of c.sources) if (!seen.has(s.url)) prev.sources.push(s);
    prev.mergedIds.push(c.id);
  }
  return [...byKey.values()];
}

function scoreCandidate(c, asOf) {
  const parts = { freshness: freshness(c, asOf), engagement: engagement(c), corroboration: corroboration(c),
    audience: audience(c), evidence: evidence(c), content: content(c) };
  const active = Object.keys(WEIGHTS).filter(k => parts[k].score != null);
  const weightSum = active.reduce((s, k) => s + WEIGHTS[k], 0);
  const total = Math.round(active.reduce((s, k) => s + parts[k].score * WEIGHTS[k], 0) / weightSum * 10) / 10;
  const strong = total >= THRESHOLDS.strongTotal && parts.evidence.score >= THRESHOLDS.strongEvidence
    && parts.freshness.score >= THRESHOLDS.strongFreshness;
  const tier = strong ? 'STRONG' : total >= THRESHOLDS.risingTotal ? 'RISING' : 'LOW';
  return { id: c.id, eventKey: c.eventKey, title: c.title, mergedIds: c.mergedIds || [c.id], total, tier, parts,
    effectiveWeights: Object.fromEntries(active.map(k => [k, Math.round(WEIGHTS[k] / weightSum * 1000) / 1000])) };
}

/** Rank by total, then evidence, then freshness, then id. Only the top 3 STRONG go to the AI stage. */
function rank(candidates, asOfIso) {
  if (asOfIso == null) throw Error('MISSING_AS_OF');
  const asOf = parseTime(asOfIso);
  const scored = cluster(candidates).map(c => scoreCandidate(c, asOf)).sort((a, b) =>
    b.total - a.total || b.parts.evidence.score - a.parts.evidence.score
    || b.parts.freshness.score - a.parts.freshness.score || a.id.localeCompare(b.id));
  return { asOf: asOfIso, weights: WEIGHTS, thresholds: THRESHOLDS, ranked: scored,
    aiCandidates: scored.filter(s => s.tier === 'STRONG').slice(0, 3).map(s => s.id),
    recordOnly: scored.filter(s => s.tier === 'LOW').map(s => s.id) };
}

if (require.main === module) {
  const fs = require('node:fs');
  const input = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  process.stdout.write(JSON.stringify(rank(input.candidates, input.asOf), null, 2) + '\n');
}
module.exports = { rank, scoreCandidate, cluster, freshness, engagement, corroboration, evidence, content, WEIGHTS, THRESHOLDS };
