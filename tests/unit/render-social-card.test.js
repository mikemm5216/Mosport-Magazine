'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { html, pngSize, SIZES } = require('../../scripts/render-social-card.js');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const dir = path.join(__dirname, '../../docs/social/2026-11-25');

test('card HTML uses only local Mosport assets: no remote URLs, no images beyond the owned mark', () => {
  const spec = JSON.parse(fs.readFileSync(path.join(dir, 'card-nba-cup-tiebreakers.json'), 'utf8'));
  for (const format of Object.keys(SIZES)) {
    // xmlns is an XML namespace identifier, never fetched; every other URL must be local.
    const doc = html(spec, format).replace(/\sxmlns="http:\/\/www\.w3\.org\/2000\/svg"/g, '');
    assert.doesNotMatch(doc, /https?:\/\//, format);
    assert.doesNotMatch(doc, /<img\b/i, format);
    assert.match(doc, /aria-label="Mosport brand mark"/);
  }
  assert.deepEqual(SIZES, { 'instagram-4x5': [1080, 1350], 'threads-1x1': [1080, 1080] });
});

test('committed social package: assets match their hashes and sizes, captions match their hashes and limits, nothing approved or posted', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'social-package.json'), 'utf8'));
  assert.equal(pkg.status, 'DRAFT_PENDING_C4_APPROVAL');
  const limits = { threads: 500, instagram: 2200 };
  for (const p of pkg.posts) {
    const png = fs.readFileSync(path.join(dir, p.asset.file));
    assert.equal(sha(png), p.asset.sha256, p.asset.file);
    assert.deepEqual(pngSize(png), [p.asset.width, p.asset.height]);
    assert.equal(sha(p.text), p.textSha256);
    assert.ok(p.text.length <= limits[p.channel]);
    assert.equal(p.approval.state, 'PENDING_HUMAN');
    assert.equal(p.publication.state, 'NOT_POSTED');
    assert.equal(p.performance.views, null);
  }
  const threads = pkg.posts.find(p => p.channel === 'threads');
  assert.equal(new URL(threads.landingUrl).origin, 'https://www.mosport.app');
  assert.match(threads.text, new RegExp(threads.landingUrl.replace(/[.?]/g, '\\$&')));
  assert.doesNotMatch(pkg.posts.find(p => p.channel === 'instagram').text, /https?:\/\//, 'Instagram caption must not pretend a URL is clickable');
});
