# WS-08 · #366 PRODUCTION RETURN

Timestamp: 2026-09-05T06:05:14Z

Status: `PRODUCTION RETURN: PASS`

## Identity chain

- #369 source HEAD: `c2a0614568bd428da9374fe7f1eda0d572e9f8c6`
- #369 merge SHA: `5ee9005d566a9f88d89b36976712294a73fbd833`
- exact #369 production run: `33944928325` — `SUCCESS`
- current consolidated main observed for this assurance round: `0b054d0e5f4fb5ffbd02c67e9b3ee8ec354f5b25`
- canonical target: `https://www.systemfriction.org`
- latest successful canonical production receipt exercised by the durable smoke: run `33946952943`, SHA `b3deadf51f4c1c3c1ff81234a52a4c9b7c2d3780`
- ancestry check: deployment SHA `b3deadf...` is downstream of #369 merge SHA `5ee9005...`; therefore the exercised production artifact contains the #369 correction.

## Durable assurance mechanism

Contract: `SFI-PRODUCTION-OBSERVATORY-SMOKE-1.0`

Owners reused/extended under WS-08 only:

- `.github/workflows/sfi-production-observatory-smoke.yml`
- `scripts/qa-sfi-production-observatory-smoke.mjs`

The workflow is bounded and leaves GitHub Actions logs plus a 30-day artifact containing JSON and execution log. It records timestamp, canonical target, related deployment run/SHA, per-surface/gate state, and explicit `PASS | FAIL | NOT_OBSERVED`. It uses no product secrets and performs no sovereign mutation.

Bounds:

- HTTP timeout: 12s
- browser observation window: 27s
- harness retries: 0
- expected product polling cadence: 20s
- real headless Chrome/CDP for hydrated DOM and network observation

## Production evidence

Assurance run: `33948836250` — `SUCCESS`

Artifact: `sfi-production-observatory-smoke-33948836250`, artifact id `9964160072`, SHA-256 `702ec779a62c019888f31ad7a2d8f4785a589d555ca0a19d5a7ab1e0f43623ff`.

Observed gates:

- canonical target: `PASS`
- canonical domain: `PASS`
- `/observatory` SSR / initial LOADING contract: `PASS`
- `/api/observatory/world`: observed as part of API gate, `PASS`
- `/api/observatory/state`: observed as part of API gate, `PASS`
- `/api/observatory/timeline`: observed as part of API gate, `PASS`
- hydrated browser observation: `PASS`
- `UNAVAILABLE != ZERO` / false-zero gate: `PASS`
- hypothesis-absence boundary: `PASS`
- bounded read plane: `PASS`
- 5xx/network failure/unbounded-request/retry-or-duplicate amplification: none triggered by the bounded browser gate
- actual authoritative zero: `NOT_OBSERVED` because no natural authoritative zero occurred in the bounded production window; this is observational evidence, not a failure and no state was manufactured. Deterministic #369 QA remains the proof that `AVAILABLE + authoritative 0 = 0`.

The production smoke does not require a naturally occurring zero in order to close the live production RETURN because the production protocol explicitly forbids manufacturing negative/error states and treats an actual zero as observable only when it occurs naturally. The live gate does require and did prove the production properties that can be observed continuously: initial nonnumeric LOADING, authoritative API availability, hydrated no-false-zero behavior, absence-claim boundary, bounded requests, no retry amplification, and no attributable 5xx/network failure in the smoke window.

## Disposition

`#366 PRODUCTION ASSURANCE: PASS`

`DEPLOYED + OBSERVED_IN_PRODUCTION`

Contract delta: `NONE`.
Authority expansion: `NONE`.
Product semantic change by WS-08: `NONE`.

Recommendation to SFI-00: `CLOSE #366` after Control Room verifies this receipt. WS-08 does not close the issue and does not merge PR #368.
