# WS-08 · #366 PRODUCTION RETURN

Status: `PRODUCTION RETURN: PASS`

`#366 PRODUCTION ASSURANCE: PASS`

`OBSERVED_IN_PRODUCTION: YES`

## Identity chain

- #369 source HEAD: `c2a0614568bd428da9374fe7f1eda0d572e9f8c6`
- #369 merge SHA: `5ee9005d566a9f88d89b36976712294a73fbd833`
- exact #369 production run: `33944928325` — `SUCCESS`
- canonical target: `https://www.systemfriction.org`
- consolidated main at final assurance: `0b054d0e5f4fb5ffbd02c67e9b3ee8ec354f5b25`
- successful canonical deployment exercised by final smoke: run `33946952943`, SHA `b3deadf51f4c1c3c1ff81234a52a4c9b7c2d3780`
- that deployed SHA is downstream of #369 merge SHA and contains the #369 correction.

## Durable mechanism

Contract: `SFI-PRODUCTION-OBSERVATORY-SMOKE-1.0`

- workflow: `.github/workflows/sfi-production-observatory-smoke.yml`
- harness: `scripts/qa-sfi-production-observatory-smoke.mjs`
- headless Chrome/CDP using browser-level target discovery and explicit `Target.createTarget` fallback
- HTTP timeout: `12s`
- browser observation window: `28s`
- harness retries: `0`
- expected product poll: `20s`
- no product mutation, secret persistence, second product polling owner or authority expansion.

## Final evidence

- assurance harness HEAD: `58955da5bb8bcd72659333981fa5e5b755593d49`
- production smoke run: `33949174572` / #8 — `SUCCESS`
- artifact: `sfi-production-observatory-smoke-33949174572`
- artifact id: `9964258153`
- artifact SHA-256: `d1a82bc0ead4e4dfb33277d72598cd0aadf29c6ef026d4d06568341a222f2706`
- SFI Verify on harness HEAD: `33949174627` / #2373 — `SUCCESS`

## Observed gates

### SSR — PASS

`/observatory` returned HTTP 200 with initial:

- world `LOADING`
- state `LOADING`
- timeline `LOADING`
- four primary metrics `LOADING`
- no numeric false-zero.

### APIs — PASS

- world: HTTP 200 / `AVAILABLE` / 900 nodes / 172 hypotheses / 6 source-summary entries / 0 warnings
- state: HTTP 200 / naturally `DEGRADED` / data present / 4 warnings
- timeline: HTTP 200 / `AVAILABLE` / 283 frames / 0 warnings

### Browser / hydration — PASS

Mounted Observatory DOM was observed. The hydrated world became `AVAILABLE`, state remained naturally `DEGRADED`, timeline became `AVAILABLE`, and `ObservatoryInterpretiveFlow` consumed the same `AVAILABLE` world classification.

Authoritative metrics expected `[900, 6, 172, 1]` and rendered `[900, 6, 172, 1]`.

### False-zero — PASS

No non-AVAILABLE primary metric rendered numeric zero during observed SSR/hydration.

### Actual zero — PASS

After world was authoritative `AVAILABLE`, the harness used the existing client-side search filter with a guaranteed no-match query. The filtered authoritative view rendered four `AVAILABLE` metrics as `0, 0, 0, 0`, with no additional authoritative network read.

### Hypothesis absence — PASS

No governed-hypothesis absence claim occurred outside `AVAILABLE`.

### Read plane — PASS

- world requests: 2
- state requests: 2
- timeline requests: 2
- second cycle aligned with the ~20s product poll
- retries by harness: 0
- no duplicate/retry amplification
- no unexpected authoritative Observatory read
- no 5xx/network failure
- no request exceeded the bounded request-duration guard
- zero-filter observation added no network read.

## Disposition

`DEPLOYED + OBSERVED_IN_PRODUCTION`

Contract delta: `NONE`.
Authority expansion: `NONE`.
Product semantic change by WS-08: `NONE`.

Recommendation to SFI-00: `CLOSE #366` after Control Room verifies this receipt.

WS-08 does not close #366, does not merge PR #368, and does not open Slice B / Ronda 2.
