# WS-08 · ASSURANCE + RELEASE

**Mission:** independently prove release correctness, epistemic boundaries, authority boundaries, read-plane discipline and production RETURN without becoming a second implementation owner.

**Initial baseline:** `565ac410fceb56d86ff9d6eaec85b901d0d77248`  
**Integration authority:** SFI-00  
**Self-merge:** FORBIDDEN

## 1. Authority boundary

WS-08 may add or repair QA/assurance tooling, inspect CI/deployments/runtime evidence, record release receipts and request fixes from the owning workstream.

WS-08 must not:

- silently redesign another workstream's product domain;
- make sovereign user decisions;
- weaken a gate to obtain green CI;
- mutate production to manufacture evidence;
- create a second product read/poll/persistence owner;
- merge its own work;
- close program issues reserved to SFI-00.

## 2. Assurance matrix

Relevant releases are evaluated against:

```text
CANONICAL PREFLIGHT
OWNERSHIP / DUPLICATION
EPISTEMIC BOUNDARY
AUTHORITY BOUNDARY
RLS / DATA ACCESS
SECRET HANDLING
PRIVACY
LINEAGE
READ-PLANE COST
N+1 / DUPLICATE READS
MIGRATION SAFETY
BACKWARD COMPATIBILITY
API CONTRACT
TYPECHECK
UNIT / INTEGRATION QA
BUILD
ROLLBACK
DEPLOYMENT IDENTITY
PRODUCTION RETURN
```

Skipped dimensions must be non-applicable for a stated reason.

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

After merge:

1. record the exact merge SHA;
2. identify the exact successful production deployment containing it;
3. verify the canonical public target;
4. perform a bounded, read-only smoke;
5. observe SSR/initial hydration separately from hydrated state;
6. observe authoritative APIs and availability classification;
7. observe read multiplicity and request duration across a bounded poll window;
8. never manufacture negative/error production state;
9. persist logs/artifact with `PASS | FAIL | NOT_OBSERVED`;
10. return closure authority to SFI-00.

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

Deterministic assurance also locks:

- contract-incomplete HTTP 200 does not become `AVAILABLE`;
- hypothesis absence is not asserted outside authoritative `AVAILABLE`;
- one world/state/timeline read owner;
- one 20-second poll owner;
- one 15-second product request timeout;
- serialized `inFlight` cycle;
- zero retry owner;
- zero N+1;
- `ObservatoryInterpretiveFlow` owns zero fetches and zero timers and consumes canonical world + availability.

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
- this durable workstream record;
- `docs/program/workstreams/WS-08-PRODUCTION-RETURN-366.md` as the focused receipt.

The mechanism reuses GitHub-hosted Chrome and the existing Observatory product lifecycle. It creates no application authority or persistence owner.

Bounds:

- canonical target fixed to `https://www.systemfriction.org`;
- HTTP timeout: `12s`;
- browser observation window: `28s`;
- product polling cadence observed: `20s`;
- harness retries: `0`;
- GitHub Actions artifact retention: `30 days`;
- no secrets/private payloads persisted.

### 8.1 CDP bootstrap

The harness does not depend on `/json/list` spontaneously containing a page target. It:

1. reads both `DevToolsActivePort` lines;
2. uses the browser websocket path when present;
3. falls back to `/json/version` browser websocket discovery;
4. calls browser-level `Target.getTargets`;
5. creates `about:blank` with `Target.createTarget` only when no page target exists;
6. resolves the page websocket and attaches the bounded page CDP observer.

This is assurance bootstrap only; no product semantics changed.

## 9. Final production smoke receipt

**Assurance harness-code HEAD:** `bc53bcd899286e8c44fb7846d75c07289454a89b`  
**Production smoke run:** `33949491992` / #11 — `SUCCESS`  
**Artifact name:** `sfi-production-observatory-smoke-33949491992`  
**Artifact id:** `9964354481`  
**Artifact SHA-256:** `9087e2623449dddbfd911dd37310934c8fd3130a092cb571b558c6ca5fab6327`  
**SFI Verify on harness-code HEAD:** `33949491991` / #2376 — `SUCCESS`  
**Inline review threads:** `0 unresolved` — the prior CodeQL sanitization thread is resolved/outdated on this HEAD.

This receipt supersedes the earlier `NOT_OBSERVED` production verdicts and the earlier apparent PASS whose aggregate omitted `actualZero`. The earlier runs remain historical evidence only and are not the active disposition.

### 9.1 SSR / initial hydration — PASS

Canonical `/observatory` returned HTTP 200 and the SSR contract exposed:

- `world = LOADING`;
- `state = LOADING`;
- `timeline = LOADING`;
- all four primary counters = `LOADING`;
- numeric false-zero during SSR = `NONE`.

### 9.2 Authoritative API observations — PASS

- `/api/observatory/world`: HTTP `200`, `AVAILABLE`;
- `/api/observatory/state`: HTTP `200`, naturally `DEGRADED`;
- `/api/observatory/timeline`: HTTP `200`, `AVAILABLE`.

The naturally occurring degraded state was observed; no failure state was manufactured.

### 9.3 Hydrated browser — PASS

Headless Chrome/CDP observed the mounted canonical Observatory DOM.

Initial hydrated samples remained non-numeric while world availability was `LOADING`. By the bounded hydrated state:

- `world = AVAILABLE`;
- `state = DEGRADED`;
- `timeline = AVAILABLE`;
- `ObservatoryInterpretiveFlow = AVAILABLE` from the shared world availability;
- authoritative primary metrics matched the authoritative world response.

### 9.4 False-zero gate — PASS

Across all observed non-AVAILABLE primary-metric samples, no numeric zero was emitted.

`UNAVAILABLE != ZERO` remains satisfied in live production evidence; the naturally observed pre-availability state was `LOADING` and remained non-numeric.

### 9.5 AVAILABLE + actual zero — PASS

The harness uses the existing client-side Observatory search filter after world is already `AVAILABLE`. It applies a guaranteed non-matching assurance query without changing server/product state and without issuing an additional authoritative read.

Observed zero-filter sample:

- world remains `AVAILABLE`;
- all four primary metric elements remain `data-availability="AVAILABLE"`;
- observations = `0`;
- active sources = `0`;
- hypotheses = `0`;
- in return = `0`.

Therefore live production proves `AVAILABLE + authoritative filtered empty set = 0` without manufacturing an error or mutating product data.

### 9.6 Hypothesis-absence boundary — PASS

No governed-hypothesis absence claim was observed outside `AVAILABLE`. The co-rendered interpretive flow followed the canonical world availability during the browser session.

### 9.7 Bounded read plane — PASS

Across the 28-second browser window:

- world requests: `2`;
- state requests: `2`;
- timeline requests: `2`;
- second cycle occurs on the expected ~20-second product poll;
- harness retries: `0`;
- no duplicate/retry amplification inside the protected interval;
- no unexpected Observatory authoritative-read endpoint;
- no 5xx/network failure;
- no observed request exceeded the finite assurance guard;
- the zero-filter observation issued no extra authoritative read.

No second polling owner or N+1 behavior was introduced by assurance.

## 10. Active disposition

# PRODUCTION RETURN: PASS

# #366 PRODUCTION ASSURANCE: PASS

# OBSERVED_IN_PRODUCTION: YES

`DEPLOYED + OBSERVED_IN_PRODUCTION`

- product defect found by final smoke: `NONE`;
- contract delta: `NONE`;
- authority expansion: `NONE`;
- product semantic change by WS-08: `NONE`;
- production mutation by WS-08: `NONE`.

## 11. Recommendation to SFI-00

**SFI-00: CLOSE #366 after Control Room verifies this exact receipt.**

WS-08 does not close #366 and does not merge PR #368.

PR #368 may be integrated only after its final documentation HEAD receives terminal exact-head SFI Verify success and no new blocker appears.

NO SLICE B / RONDA 2 is authorized by this record.
