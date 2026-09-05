# WS-08 · ASSURANCE + RELEASE

**Mission:** independently prove release correctness, epistemic boundaries, authority boundaries, read-plane discipline and production RETURN without becoming a second implementation owner.

**Integration authority:** SFI-00  
**Self-merge:** FORBIDDEN

## Authority boundary

WS-08 may add or repair QA/assurance tooling, inspect CI/deployments/runtime evidence, record release receipts and request fixes from the owning workstream. It must not redesign another workstream's product domain, make sovereign user decisions, weaken a gate, mutate production to manufacture evidence, create a second product read/poll/persistence owner, merge its own work, or close program issues reserved to SFI-00.

## Read-plane invariant

```text
ONE INTERACTIVE NEED
→ ONE AUTHORITATIVE READ PER DOMAIN
→ ZERO DUPLICATE EQUIVALENT READS
→ ZERO N+1
```

## #366 · Pre-merge assurance

**Implementation owner:** WS-03 · DISCOVERY MESH  
**Independent verifier:** WS-08 · ASSURANCE + RELEASE

- PR #369 source HEAD: `c2a0614568bd428da9374fe7f1eda0d572e9f8c6`
- exact-head SFI Verify: `33923289572` / #2342 — `SUCCESS`
- inline review threads: `0 unresolved`
- contract delta: `NONE`
- authority expansion: `NONE`
- pre-merge verdict: `PRE-MERGE ASSURANCE PASS`

Frozen invariant:

```text
AVAILABLE + authoritative 0 = 0
LOADING != 0
DEGRADED != 0
UNAVAILABLE != 0
ERROR != 0
```

Deterministic assurance also locks contract-incomplete HTTP 200 not becoming `AVAILABLE`; hypothesis absence not asserted outside authoritative `AVAILABLE`; one world/state/timeline read owner; one 20-second poll owner; one 15-second product request timeout; serialized `inFlight` cycle; zero retry owner; zero N+1; and `ObservatoryInterpretiveFlow` owning zero fetches/timers while consuming canonical world + availability.

## #366 · Merge / deployment identity

- PR #369: `MERGED`
- source HEAD: `c2a0614568bd428da9374fe7f1eda0d572e9f8c6`
- merge SHA: `5ee9005d566a9f88d89b36976712294a73fbd833`
- exact #369 deployment workflow: `SFI Vercel Prebuilt Production`
- exact #369 deployment run: `33944928325` — `SUCCESS`
- exact deployment emitted: `https://system-friction-d9c5hxi2f-systemfrictioninstitute.vercel.app`
- canonical alias: `https://www.systemfriction.org`
- consolidated main at final production assurance: `0b054d0e5f4fb5ffbd02c67e9b3ee8ec354f5b25`
- later successful canonical deployment exercised by final smoke: run `33946952943`, SHA `b3deadf51f4c1c3c1ff81234a52a4c9b7c2d3780`, downstream of #369 merge SHA.

## Durable production-assurance mechanism

Contract: `SFI-PRODUCTION-OBSERVATORY-SMOKE-1.0`

Owners:

- `.github/workflows/sfi-production-observatory-smoke.yml`
- `scripts/qa-sfi-production-observatory-smoke.mjs`
- `docs/program/workstreams/WS-08-ASSURANCE-RELEASE.md`
- `docs/program/workstreams/WS-08-PRODUCTION-RETURN-366.md`

Bounds: canonical target `https://www.systemfriction.org`; HTTP timeout `12s`; browser observation window `28s`; product poll `20s`; harness retries `0`; artifact retention `30 days`; no secrets/private payloads persisted.

CDP bootstrap reads `DevToolsActivePort`, falls back to `/json/version`, uses browser-level `Target.getTargets`, creates `about:blank` via `Target.createTarget` only if required, and then attaches the bounded page observer. This is assurance bootstrap only; no product semantics changed.

## Final harness-code production receipt

- harness-code HEAD: `bc53bcd899286e8c44fb7846d75c07289454a89b`
- production smoke run: `33949491992` / #11 — `SUCCESS`
- artifact: `sfi-production-observatory-smoke-33949491992`
- artifact id: `9964354481`
- artifact SHA-256: `9087e2623449dddbfd911dd37310934c8fd3130a092cb571b558c6ca5fab6327`
- SFI Verify on harness-code HEAD: `33949491991` / #2376 — `SUCCESS`
- inline review threads: `0 unresolved`; prior CodeQL sanitization thread resolved/outdated.

Observed production gates:

- canonical target: `PASS`
- `/observatory` SSR / initial `LOADING`: `PASS`
- SSR numeric false-zero: `NONE`
- `/api/observatory/world`: HTTP 200 / `AVAILABLE`
- `/api/observatory/state`: HTTP 200 / naturally `DEGRADED`
- `/api/observatory/timeline`: HTTP 200 / `AVAILABLE`
- mounted hydrated browser: `PASS`
- false-zero / `UNAVAILABLE != ZERO`: `PASS`
- authoritative empty filter under `AVAILABLE`: `0, 0, 0, 0` — `PASS`
- hypothesis-absence boundary: `PASS`
- read plane: `2` world / `2` state / `2` timeline across the bounded window — `PASS`
- harness retries: `0`
- duplicate/retry amplification: `NONE`
- attributable 5xx/network failure: `NONE`
- unbounded request: `NONE`

The zero observation used the existing client-side Observatory search filter after world was already `AVAILABLE`; it issued no additional authoritative read and mutated no product/server state.

## Active disposition

# PRODUCTION RETURN: PASS

# #366 PRODUCTION ASSURANCE: PASS

# OBSERVED_IN_PRODUCTION: YES

`DEPLOYED + OBSERVED_IN_PRODUCTION`

- product defect found by final smoke: `NONE`
- contract delta: `NONE`
- authority expansion: `NONE`
- product semantic change by WS-08: `NONE`
- production mutation by WS-08: `NONE`

## Final integration gate

Final documentation-only PR HEAD after synchronized receipts: `dbb4abe7e123f37b539c2bac360a3d057ee2ec63`.

This final docs-only HEAD must receive terminal exact-head `SFI Verify: SUCCESS`. Production smoke remains bound to the last harness-code HEAD `bc53bcd899286e8c44fb7846d75c07289454a89b`; if workflow/harness/product code changes after that HEAD, production smoke must run again before merge readiness.

## Recommendation to SFI-00

**SFI-00: CLOSE #366 after Control Room verifies this exact receipt.**

WS-08 does not close #366 and does not merge PR #368.

NO SLICE B / RONDA 2 is authorized by this record.
