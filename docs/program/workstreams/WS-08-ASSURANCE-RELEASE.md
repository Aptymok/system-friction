# WS-08 · ASSURANCE + RELEASE

**Mission:** independently prove release correctness, epistemic boundaries, authority boundaries, read-plane discipline and production RETURN without becoming a second implementation owner.

**Initial baseline:** `565ac410fceb56d86ff9d6eaec85b901d0d77248`  
**Integration authority:** SFI-00  
**Self-merge:** FORBIDDEN

## 1. Authority boundary

WS-08 may add or repair QA/assurance tooling, inspect CI/deployments/runtime evidence, record release receipts and request fixes from the owning workstream.

WS-08 must not silently redesign another workstream's product domain, make sovereign user decisions, weaken a gate to obtain green CI, mutate production to manufacture evidence, create a second product read/poll/persistence owner, merge its own work, or close program issues reserved to SFI-00.

## 2. Assurance matrix

Relevant releases are evaluated against canonical preflight, ownership/duplication, epistemic boundary, authority boundary, RLS/data access, secret handling, privacy, lineage, read-plane cost, N+1/duplicate reads, migration safety, backward compatibility, API contract, typecheck, unit/integration QA, build, rollback, deployment identity and production RETURN.

## 3. Read-plane invariant

```text
ONE INTERACTIVE NEED
→ ONE AUTHORITATIVE READ PER DOMAIN
→ ZERO DUPLICATE EQUIVALENT READS
→ ZERO N+1
```

Production assurance must not add a second product poller, retry owner, availability probe or persistence reader merely to observe the system.

## 4. Status language

```text
DESIGNED
IMPLEMENTED
QA_PASS
MERGED
DEPLOYED
OBSERVED_IN_PRODUCTION
```

These states are never collapsed into `DONE` without context.

## 5. Production verification protocol

After merge: record exact merge SHA; identify exact successful production deployment containing it; verify canonical public target; perform bounded read-only smoke; observe SSR/initial hydration separately from hydrated state; observe authoritative APIs and availability classification; observe read multiplicity and request duration across a bounded poll window; never manufacture negative/error production state; persist logs/artifact with `PASS | FAIL | NOT_OBSERVED`; return closure authority to SFI-00.

## 6. #366 · PRE-MERGE ASSURANCE

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

## 7. #366 · MERGE / DEPLOYMENT IDENTITY

- PR #369: `MERGED`
- source HEAD: `c2a0614568bd428da9374fe7f1eda0d572e9f8c6`
- merge SHA: `5ee9005d566a9f88d89b36976712294a73fbd833`
- exact #369 deployment workflow: `SFI Vercel Prebuilt Production`
- exact #369 deployment run: `33944928325` — `SUCCESS`
- exact deployment emitted: `https://system-friction-d9c5hxi2f-systemfrictioninstitute.vercel.app`
- canonical alias: `https://www.systemfriction.org`
- current consolidated main at final production assurance: `0b054d0e5f4fb5ffbd02c67e9b3ee8ec354f5b25`

A later successful canonical production receipt selected by the durable smoke is run `33946952943`, SHA `b3deadf51f4c1c3c1ff81234a52a4c9b7c2d3780`. That deployed SHA is downstream of #369 merge SHA and therefore contains the #369 correction.

## 8. Durable production-assurance mechanism

Contract: `SFI-PRODUCTION-OBSERVATORY-SMOKE-1.0`

Owners:

- `.github/workflows/sfi-production-observatory-smoke.yml`
- `scripts/qa-sfi-production-observatory-smoke.mjs`
- this durable workstream record
- `docs/program/workstreams/WS-08-PRODUCTION-RETURN-366.md`

Bounds: canonical target `https://www.systemfriction.org`; HTTP timeout `12s`; browser observation window `28s`; expected product poll `20s`; harness retries `0`; artifact retention `30 days`; no secrets/private payloads persisted.

### 8.1 CDP bootstrap

The harness reads both `DevToolsActivePort` lines, uses the browser websocket path when present, falls back to `/json/version`, calls browser-level `Target.getTargets`, creates `about:blank` with `Target.createTarget` only when no page target exists, resolves the page websocket and attaches the bounded page observer. No product semantics changed.

## 9. Final production smoke receipt

**Assurance harness-code HEAD:** `bc53bcd899286e8c44fb7846d75c07289454a89b`  
**Production smoke run:** `33949491992` / #11 — `SUCCESS`  
**Artifact name:** `sfi-production-observatory-smoke-33949491992`  
**Artifact id:** `9964354481`  
**Artifact SHA-256:** `9087e2623449dddbfd911dd37310934c8fd3130a092cb571b558c6ca5fab6327`  
**SFI Verify on harness-code HEAD:** `33949491991` / #2376 — `SUCCESS`  
**Inline review threads:** `0 unresolved` — prior CodeQL sanitization thread resolved/outdated.

This receipt supersedes earlier `NOT_OBSERVED` verdicts and the earlier apparent PASS whose aggregate omitted `actualZero`.

### 9.1 SSR / initial hydration — PASS

Canonical `/observatory` returned HTTP 200 with `world=LOADING`, `state=LOADING`, `timeline=LOADING`, all four primary counters `LOADING`, and no numeric false-zero.

### 9.2 Authoritative API observations — PASS

- `/api/observatory/world`: HTTP `200`, `AVAILABLE`
- `/api/observatory/state`: HTTP `200`, naturally `DEGRADED`
- `/api/observatory/timeline`: HTTP `200`, `AVAILABLE`

No failure state was manufactured.

### 9.3 Hydrated browser — PASS

Headless Chrome/CDP observed mounted canonical Observatory DOM. Initial hydrated samples remained non-numeric while world was `LOADING`; bounded hydrated state reached `world=AVAILABLE`, `state=DEGRADED`, `timeline=AVAILABLE`, with `ObservatoryInterpretiveFlow=AVAILABLE` from shared world availability. Authoritative primary metrics matched the authoritative world response.

### 9.4 False-zero gate — PASS

Across observed non-AVAILABLE primary-metric samples, no numeric zero was emitted.

### 9.5 AVAILABLE + actual zero — PASS

After world was already `AVAILABLE`, the harness used the existing client-side Observatory search filter with a guaranteed no-match query. The filtered authoritative view remained `AVAILABLE` and rendered all four primary metrics as `0, 0, 0, 0`, without product/server mutation and without issuing an additional authoritative read.

### 9.6 Hypothesis-absence boundary — PASS

No governed-hypothesis absence claim was observed outside `AVAILABLE`. The co-rendered interpretive flow followed canonical world availability.

### 9.7 Bounded read plane — PASS

Across the 28-second browser window: world requests `2`; state requests `2`; timeline requests `2`; second cycle aligned with expected ~20-second product poll; harness retries `0`; no duplicate/retry amplification; no unexpected authoritative Observatory read; no 5xx/network failure; no observed request exceeded the finite guard; zero-filter observation issued no extra authoritative read.

No second polling owner or N+1 behavior was introduced by assurance.

## 10. Active disposition

# PRODUCTION RETURN: PASS

# #366 PRODUCTION ASSURANCE: PASS

# OBSERVED_IN_PRODUCTION: YES

`DEPLOYED + OBSERVED_IN_PRODUCTION`

- product defect found by final smoke: `NONE`
- contract delta: `NONE`
- authority expansion: `NONE`
- product semantic change by WS-08: `NONE`
- production mutation by WS-08: `NONE`

## 11. Integration gate

Focused production-return receipt is synchronized to the final harness-code evidence. The final documentation-only PR HEAD must receive terminal exact-head `SFI Verify: SUCCESS`; this does not require another production smoke because no workflow/harness code changes after `bc53bcd899286e8c44fb7846d75c07289454a89b` are permitted in this closure step.

## 12. Recommendation to SFI-00

**SFI-00: CLOSE #366 after Control Room verifies this exact receipt.**

WS-08 does not close #366 and does not merge PR #368.

NO SLICE B / RONDA 2 is authorized by this record.
