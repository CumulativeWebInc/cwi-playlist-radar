# Playlist Fraud Radar 🛰️

Public, evidence-tiered playlist legitimacy dashboard. $0, static, GitHub Pages.

**Live:** https://cumulativewebinc.github.io/cwi-playlist-radar/

## What it is

Backlog #10 (Wave 1): a public web dashboard of playlist legitimacy checks — evidence-tiered table fed by CWI's own verify-before-you-pitch scans. Artists asking "which playlists are safe to pitch?" get grades with cited evidence, not rumors.

## Truth architecture

- Every grade cites its evidence: `observed_at` (ISO date), evidence tier, verifier, method, detail.
- Freshness: ≤48h = fresh, older = **stale**. A validator enforces this on every build.
- Tiers, never verdicts: V (verified) / U (unverified claim) / P (paid-placement pattern, factual). No one is called a scammer — a defamation guard fails the build on verdict language.
- Flags must cite sources. Grades without evidence are rejected.

## Files

- `index.html` — dashboard (renders `radar.json`)
- `methodology.html` — tiers, freshness, limits, corrections
- `radar.json` — machine-readable dataset (schema `playlist-fraud-radar/v1`)
- `validator.js` — truth gate
- `test.js` — adversarial suite (`node test.js`)
- `KILL-RULE-LOG.md` — 90-day kill clock: <200 monthly visitors by day 90 → kill

## Deploy gate

```bash
node test.js          # must be green
node validator.js radar.json
```

Ship only when both are green.
