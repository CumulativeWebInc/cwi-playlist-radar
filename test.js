// test.js — adversarial suite for playlist-fraud-radar. Green or it doesn't ship.
'use strict';
const { validateRadar } = require('./validator');
const fs = require('fs');

const NOW = Date.parse('2026-09-19T08:15:00Z');
const seed = JSON.parse(fs.readFileSync(__dirname + '/radar.json', 'utf8'));
const clone = (o) => JSON.parse(JSON.stringify(o));

let passed = 0, failed = 0;
function t(name, data, expectErrors) {
  const errs = validateRadar(data, NOW);
  const ok = expectErrors ? errs.length > 0 : errs.length === 0;
  if (ok) { passed++; console.log(`PASS ${name}`); }
  else { failed++; console.log(`FAIL ${name}`); errs.slice(0, 3).forEach(e => console.log(`   -> ${e}`)); }
}

// --- positive: the real seed data must validate clean ---
t('seed data validates (5 entries)', seed, false);

// --- adversarial: invented playlist with no evidence ---
{
  const d = clone(seed);
  d.playlists.push({ id: 'invented-playlist', name: 'Totally Real Hits', platform: 'Spotify',
    curator: 'Nobody', playlist_uri: null, tiers: ['V'], evidence: [],
    freshness: { status: 'fresh', last_verified: '2026-09-19' }, flags: [], notes: 'Made up.' });
  t('invented playlist with no evidence is rejected', d, true);
}

// --- adversarial: uncited grade (evidence array present but empty-ish) ---
{
  const d = clone(seed);
  d.playlists.push({ id: 'uncited', name: 'Hype Machine', platform: 'Spotify', curator: 'X',
    playlist_uri: null, tiers: ['V'],
    evidence: [{ type: 'vibes', observed_at: '', verifier: '', method: '', detail: '' }],
    freshness: { status: 'fresh', last_verified: '2026-09-19' }, flags: [], notes: '' });
  t('grade with uncited/empty evidence is rejected', d, true);
}

// --- adversarial: stale mislabeled as fresh ---
{
  const d = clone(seed);
  const p = d.playlists.find(x => x.id === 'eric-alper-360');
  p.freshness.status = 'fresh';
  t('stale grade mislabeled as fresh is rejected', d, true);
}

// --- adversarial: payola flag without evidence ---
{
  const d = clone(seed);
  d.playlists.push({ id: 'flagged-noproof', name: 'Some Playlist', platform: 'Spotify', curator: 'Y',
    playlist_uri: null, tiers: ['U'],
    evidence: [{ type: 'failed_verification', observed_at: '2026-09-18', verifier: 'CWI engine',
      method: 'search', detail: 'Playlist could not be located through search.' }],
    freshness: { status: 'fresh', last_verified: '2026-09-18' },
    flags: ['Curator runs a secret payola ring (no source).'], notes: '' });
  t('flag without cited evidence is rejected', d, true);
}

// --- adversarial: defamatory language ---
{
  const d = clone(seed);
  const p = d.playlists.find(x => x.id === 'dj6rings-its-goin');
  p.notes = 'This curator is a known scammer running a fraud operation.';
  t('defamatory verdict language is rejected', d, true);
}

// --- adversarial: future observed_at ---
{
  const d = clone(seed);
  d.playlists.push({ id: 'future', name: 'Future Hits', platform: 'Spotify', curator: 'Z',
    playlist_uri: null, tiers: ['V'],
    evidence: [{ type: 'playlist_scan', observed_at: '2026-10-01', verifier: 'CWI engine',
      method: 'scan', detail: 'Found the track at position 3 of 50.' }],
    freshness: { status: 'fresh', last_verified: '2026-10-01' }, flags: [], notes: '' });
  t('future observed_at is rejected', d, true);
}

// --- adversarial: undefined tier ---
{
  const d = clone(seed);
  const p = d.playlists.find(x => x.id === 'flow-no-label-needed');
  p.tiers = ['X'];
  t('undefined tier is rejected', d, true);
}

// --- positive: legitimate new entry passes ---
{
  const d = clone(seed);
  d.playlists.push({ id: 'good-new', name: 'Real Ones', platform: 'Spotify', curator: 'Q',
    playlist_uri: 'spotify:playlist:abc123', tiers: ['V'],
    evidence: [{ type: 'full_playlist_scan', observed_at: '2026-09-19', verifier: 'CWI engine',
      method: 'Full scan of all 40 tracks', detail: 'Track found at position 12 of 40.' }],
    freshness: { status: 'fresh', last_verified: '2026-09-19' }, flags: [], notes: 'Clean add.' });
  t('legitimate fresh entry passes', d, false);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
