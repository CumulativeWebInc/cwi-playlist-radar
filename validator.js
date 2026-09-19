// validator.js — truth gate for playlist-fraud-radar.
// Every grade must cite evidence; stale must say stale; flags must cite sources;
// language stays factual (no defamatory words). Zero deps.
'use strict';

const FRESH_MS = 48 * 3600 * 1000;
const BANNED_WORDS = ['scam', 'scammer', 'scammers', 'fraud', 'fraudster', 'fraudsters',
  'fake curator', 'criminal', 'thief', 'thieves', 'con artist'];

function validateRadar(data, nowMs) {
  const errors = [];
  const fail = (id, msg) => errors.push(`${id}: ${msg}`);

  if (!data || typeof data !== 'object') return ['<root>: not an object'];
  if (!Array.isArray(data.playlists)) return ['<root>: playlists is not an array'];

  const tierIds = Object.keys(data.tiers || {});
  for (const p of data.playlists) {
    const id = p.id || '<no-id>';

    // 1. No grade without cited evidence.
    if (!Array.isArray(p.evidence) || p.evidence.length === 0) {
      fail(id, 'grade issued with no cited evidence');
    } else {
      for (const e of p.evidence) {
        if (!e.type || !e.observed_at || !e.verifier || !e.method || !e.detail) {
          fail(id, `evidence item missing required field (type/observed_at/verifier/method/detail): ${JSON.stringify(e).slice(0, 80)}`);
        }
        if (e.observed_at && !/^\d{4}-\d{2}-\d{2}$/.test(e.observed_at)) {
          fail(id, `observed_at must be ISO YYYY-MM-DD, got "${e.observed_at}"`);
        }
        if (e.observed_at) {
          const t = Date.parse(e.observed_at + 'T00:00:00Z');
          if (Number.isNaN(t)) fail(id, `observed_at unparseable: "${e.observed_at}"`);
          else if (t > nowMs) fail(id, `observed_at is in the future: "${e.observed_at}"`);
        }
      }
    }

    // 2. Tiers must be defined.
    for (const t of (p.tiers || [])) {
      if (!tierIds.includes(t)) fail(id, `tier "${t}" has no definition`);
    }
    if (!p.tiers || p.tiers.length === 0) fail(id, 'no tier assigned');

    // 3. Freshness honesty: <=48h from newest evidence = fresh, else stale.
    const newest = Math.max(...(p.evidence || []).map(e => Date.parse(e.observed_at + 'T00:00:00Z')).filter(Number.isFinite));
    const expected = (nowMs - newest) <= FRESH_MS ? 'fresh' : 'stale';
    if (p.freshness && p.freshness.status !== expected) {
      fail(id, `freshness mislabeled: marked "${p.freshness.status}", evidence requires "${expected}"`);
    }

    // 4. Flags must cite sources (flag text must reference evidence).
    for (const f of (p.flags || [])) {
      const cited = (p.evidence || []).some(e =>
        e.detail && f.split(/\s+/).slice(0, 6).some(w => w.length > 4 && e.detail.includes(w)));
      if (!cited) fail(id, `flag has no cited evidence: "${String(f).slice(0, 60)}"`);
    }

    // 5. Defamation guard: no verdict language anywhere in the entry,
    // ignoring negated contexts ("not proof of fraud", "no accusation of scam").
    const text = JSON.stringify(p).toLowerCase();
    for (const w of BANNED_WORDS) {
      const re = new RegExp(`\\b${w.replace(/ /g, '\\s+')}\\b`, 'g');
      let m, hit = false;
      while ((m = re.exec(text)) !== null) {
        const before = text.slice(Math.max(0, m.index - 40), m.index);
        const lastWords = before.split(/[^a-z]+/).filter(Boolean).slice(-4);
        const negated = lastWords.some(w => ['not', 'no', 'never', 'without', 'isnt', 'against', 'isn'].includes(w));
        if (!negated) { hit = true; break; }
      }
      if (hit) fail(id, `banned verdict language present: "${w}"`);
    }
  }
  return errors;
}

module.exports = { validateRadar, FRESH_MS, BANNED_WORDS };

if (require.main === module) {
  const fs = require('fs');
  const data = JSON.parse(fs.readFileSync(process.argv[2] || 'radar.json', 'utf8'));
  const errs = validateRadar(data, Date.now());
  if (errs.length) { console.error('VALIDATION FAILED:'); errs.forEach(e => console.error(' - ' + e)); process.exit(1); }
  console.log(`OK: ${data.playlists.length} entries validated.`);
}
