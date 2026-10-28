'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const R = require('../../site/js/assets/registry.js');

const REG = JSON.parse(fs.readFileSync(path.join(__dirname, '../../site/data/asset-registry.json'), 'utf8'));
const clone = (o) => JSON.parse(JSON.stringify(o));
const REQUIRED = ['cover-desktop-art', 'cover-mobile-art', 'today-feature-art', 'match-hero-art', 'editorial-card-art'];

test('the committed registry is valid and JSON-only (portable to a CMS)', () => {
  assert.deepEqual(R.validate(REG), []);
  assert.deepEqual(JSON.parse(JSON.stringify(REG)), REG);
});

test('all Founder-required art slots exist with size, crop, formats and fallback', () => {
  for (const id of REQUIRED) {
    const s = REG.slots[id];
    assert.ok(s, id);
    assert.ok(s.deliver.width > 0 && s.deliver.height > 0, id + ' size');
    assert.ok(/\.v\{n\}\.webp$/.test(s.deliver.expectedFile), id + ' file name pattern');
    assert.deepEqual(s.deliver.formats, ['webp', 'png', 'svg'], id + ' formats');
    assert.equal(s.fit, 'cover', id + ' crop');
    assert.equal(s.fallback.kind, 'gradient', id + ' fallback');
    assert.ok(s.safeZones && s.safeZones.length, id + ' safe zones');
  }
});

test('prototype renders the placeholder; production falls back', () => {
  const p = R.resolveArt(REG, 'cover-desktop-art', { mode: 'prototype', variant: 'desktop' });
  assert.equal(p.state, 'art');
  assert.equal(p.objectPosition, '62% 40%');
  const q = R.resolveArt(REG, 'cover-desktop-art', { mode: 'production', variant: 'desktop' });
  assert.equal(q.state, 'fallback');
  assert.equal(q.reason, 'STATUS_PLACEHOLDER_NOT_ALLOWED');
});

test('an ACTIVE licensed version renders in production with its crop and dark file', () => {
  const r = clone(REG);
  r.slots['cover-mobile-art'].versions.push({
    id: 'v2', status: 'ACTIVE', file: 'assets/art/cover-mobile-art.v2.webp', darkFile: 'assets/art/cover-mobile-art.v2.dark.webp', format: 'webp',
    width: 1170, height: 2532, sha256: 'a'.repeat(64), crops: { mobile: { focal: { x: 0.3, y: 0.2 } } },
    content: { kinds: ['equipment'], containsText: false, containsLogo: false, containsPerson: false },
    rights: { status: 'LICENSED' }, provenance: { addedBy: 'chatgpt-asset-agent' }
  });
  r.slots['cover-mobile-art'].activeVersion = 'v2';
  assert.deepEqual(R.validate(r), []);
  const x = R.resolveArt(r, 'cover-mobile-art', { mode: 'production', variant: 'mobile', theme: 'dark' });
  assert.equal(x.state, 'art');
  assert.equal(x.src, 'assets/art/cover-mobile-art.v2.dark.webp');
  assert.equal(x.objectPosition, '30% 20%');
});

test('art with a person, a logo or text is rejected by validation and by the resolver', () => {
  for (const k of ['containsPerson', 'containsLogo', 'containsText']) {
    const r = clone(REG);
    r.slots['cover-desktop-art'].versions[0].content[k] = true;
    assert.ok(R.validate(r).some((e) => /must not contain/.test(e)), k);
    assert.equal(R.resolveArt(r, 'cover-desktop-art', { mode: 'prototype' }).reason, 'ART_CONTENT_NOT_ALLOWED', k);
  }
});

test('BLOCKED or UNVERIFIED rights, a wrong format, and athlete kind never reach production', () => {
  const r = clone(REG);
  const v = r.slots['today-feature-art'].versions[0];
  v.status = 'ACTIVE';
  v.rights.status = 'UNVERIFIED';
  assert.equal(R.resolveArt(r, 'today-feature-art', { mode: 'production' }).state, 'fallback');
  assert.equal(R.resolveArt(r, 'today-feature-art', { mode: 'prototype' }).state, 'art');
  v.rights.status = 'BLOCKED';
  assert.equal(R.resolveArt(r, 'today-feature-art', { mode: 'prototype' }).state, 'fallback');
  v.rights.status = 'OWNED'; v.format = 'gif';
  assert.equal(R.resolveArt(r, 'today-feature-art', { mode: 'prototype' }).reason, 'FORMAT_NOT_ALLOWED');
  v.format = 'svg'; v.content.kinds = ['athlete'];
  assert.equal(R.resolveArt(r, 'today-feature-art', { mode: 'prototype' }).reason, 'ATHLETE_NOT_ALLOWED');
  assert.ok(R.validate(r).some((e) => /athlete/.test(e)));
});

test('a slot with no active version, a dangling version id or an unknown id falls back', () => {
  assert.equal(R.resolveArt(REG, 'editorial-card-art', {}).reason, 'NO_ACTIVE_VERSION');
  const r = clone(REG);
  r.slots['match-hero-art'].activeVersion = 'nope';
  assert.ok(R.validate(r).some((e) => /not in versions/.test(e)));
  assert.equal(R.resolveArt(r, 'match-hero-art', {}).reason, 'ACTIVE_VERSION_MISSING');
  assert.equal(R.resolveArt(REG, 'does-not-exist', {}).reason, 'UNKNOWN_SLOT');
});

test('team logos: no entry → tricode badge fallback', () => {
  const x = R.resolveTeamLogo(REG, 'UNKNOWN', { mode: 'prototype' });
  assert.equal(x.state, 'fallback');
  assert.equal(x.fallback.kind, 'tricode-badge');
});

test('fallback CSS follows the theme', () => {
  const fb = REG.slots['cover-desktop-art'].fallback;
  assert.equal(R.fallbackCss(fb, 'light'), fb.light);
  assert.equal(R.fallbackCss(fb, 'dark'), fb.dark);
});

test('CANDIDATE art: hidden by default, shown only in prototype preview, never in production', () => {
  const ids = ['cover-desktop-art', 'cover-mobile-art', 'today-feature-art', 'match-hero-art', 'editorial-card-art'];
  for (const id of ids) {
    const s = REG.slots[id];
    assert.ok(s.versions.some((v) => v.status === 'CANDIDATE' && v.id === 'chatgpt-art-v1'), id + ' has a candidate');
    assert.notEqual(s.activeVersion, 'chatgpt-art-v1', id + ' candidate is not active');
    const def = R.resolveArt(REG, id, { mode: 'prototype' });
    assert.notEqual(def.version, 'chatgpt-art-v1', id + ' default view');
    const pv = R.resolveArt(REG, id, { mode: 'prototype', preview: true, variant: 'mobile' });
    assert.equal(pv.state, 'art', id + ' preview');
    assert.equal(pv.version, 'chatgpt-art-v1');
    const prod = R.resolveArt(REG, id, { mode: 'production', preview: true });
    assert.notEqual(prod.version === 'chatgpt-art-v1' && prod.state === 'art', true, id + ' production');
  }
});

test('preview of a named candidate; history is kept (placeholder + both candidates)', () => {
  const s = REG.slots['cover-mobile-art'];
  assert.deepEqual(s.versions.map((v) => v.id), ['placeholder-v1', 'claude-crop-v1', 'native-illustration-v2', 'chatgpt-art-v1']);
  assert.equal(R.resolveArt(REG, 'cover-mobile-art', { preview: true }).version, 'chatgpt-art-v1');
  assert.equal(R.resolveArt(REG, 'cover-mobile-art', { preview: true, previewVersion: 'claude-crop-v1' }).version, 'claude-crop-v1');
});

test('repository NBA logos load in prototype, but unverified rights never enter production', () => {
  assert.equal(Object.keys(REG.teamLogos.entries).length, 30);
  for (const code of Object.keys(REG.teamLogos.entries)) {
    assert.equal(R.resolveTeamLogo(REG, code, {mode: 'prototype'}).state, 'art');
    assert.equal(R.resolveTeamLogo(REG, code, {mode: 'prototype', preview: true, previewVersion: 'native-illustration-v2'}).state, 'art');
    assert.equal(R.resolveTeamLogo(REG, code, {mode: 'production', preview: true}).state, 'fallback');
    assert.equal(REG.teamLogos.entries[code].versions[0].rights.status, 'UNVERIFIED');
  }
});

test('all active team-mark canvases are 80×80; original versions stay available', () => {
  for (const slot of Object.values(REG.teamLogos.entries)) {
    const v=slot.versions.find(v=>v.id===slot.activeVersion);
    assert.equal(v.width,80);assert.equal(v.height,80);
    assert.equal(v.normalization.fit,'contain');
    assert.ok(slot.versions.some(s=>s.file===v.normalization.sourceFile));
  }
});
