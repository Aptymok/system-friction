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

The final documentation-only PR HEAD must receive terminal exact-head `SFI Verify: SUCCESS`. Production smoke remains bound to the last harness-code HEAD `bc53bcd899286e8c44fb7846d75c07289454a89b`; if workflow/harness/product code changes after that HEAD, production smoke must run again before merge readiness.

## Recommendation to SFI-00

**SFI-00: CLOSE #366 after Control Room verifies this exact receipt.**

WS-08 does not close #366 and does not merge PR #368.

NO SLICE B / RONDA 2 is authorized by this record.

## R2-B · PRE-MERGE ASSURANCE

**Formal baseline:** `a5a431a7d20b61e87c10b1c6345c56e5794c511a`  
**Independent verifier:** WS-08 · ASSURANCE + RELEASE  
**Assurance batch:** PR #375 · WS-05 and PR #377 · WS-07 only  
**Excluded from this batch:** PR #374  
**Integration authority:** SFI-00  
**WS-08 merge authority:** NONE

### PR #375 · WS-05 · Research Graph Projection

- exact source HEAD: `4c19b961bcaa8389e2ee403af40829ecc675c277`
- exact base: `a5a431a7d20b61e87c10b1c6345c56e5794c511a`
- PR state at assurance: `OPEN / NOT MERGED / MERGEABLE`
- exact-head SFI Verify: `33955302484` / #2405 — `SUCCESS`
- exact-head Research Graph projection gate: `SUCCESS`
- exact-head canonical discovery object integrity: `SUCCESS`
- exact-head typecheck/build: `SUCCESS / SUCCESS`
- CodeQL: `SUCCESS / no new alerts in changed code`
- review threads: `0`
- submitted reviews: `0`
- contract delta: `NONE`
- authority expansion: `NONE`
- persistence/migrations/RLS/Auth impact: `NONE`
- product/external mutation: `NONE`

Verified direction:

```text
SFI-CANONICAL-OBJECT-1.0
→ canonical publication/publicability gate
→ projectable-type gate
→ Research Graph VIEW
→ research citation/export representation
```

`RESEARCH GRAPH != CANON` and `EXTERNAL REPRESENTATION != CANON` remain intact. The projection imports the integrated Canonical Object Plane and its publication/publicability functions; it does not create a second canonical registry, publication registry, identity owner, citation owner or persistence owner.

Projectable types are exactly `METHOD | INSTRUMENT | DATASET | REPORT | PAPER | SOFTWARE | RELEASE | RETURN | PUBLICATION`. `CONCEPT` and `OBSERVATION` remain excluded.

The canonical `relatedObjects` field is untyped; therefore the only projected relationship is `RELATED_OBJECT`, and only when both endpoints are independently projectable canonical nodes. No `CITES`, `REFERENCES`, `DERIVED_FROM`, `IMPLEMENTS`, `VERSION_OF`, `SUPERSEDES`, `RETURN_OF`, `RELEASE_OF` or `PUBLICATION_OF` semantic is inferred. Nonprojectable related canonical IDs remain unprojected rather than reinterpreted.

The export representation contains no DOI, ORCID, ROR, affiliation or invented publication/release date. `CITATION.cff` remains unchanged and preserves the observed repository author alias `Aptymok`.

External preview contexts observed on this exact HEAD do not establish a product defect: Vercel reported a deployment rate limit and Netlify deploy previews failed, while the repository-owned exact-head Research Graph gate, canonical integrity, typecheck, build and CodeQL all completed successfully. They do not alter this pre-merge product/contract verdict.

**PR #375 PRE-MERGE ASSURANCE: PASS**

### PR #377 · WS-07 · Identity Coherence

- exact source HEAD: `1d53fa7a644f90f593a3291a125fc662638855b7`
- exact base: `a5a431a7d20b61e87c10b1c6345c56e5794c511a`
- PR state at assurance: `OPEN / NOT MERGED / MERGEABLE`
- exact-head SFI Verify: `33960313207` / #2406 — `SUCCESS`
- exact-head canonical discovery / entity-coherence QA: `SUCCESS`
- exact-head typecheck/build: `SUCCESS / SUCCESS`
- CodeQL: `SUCCESS / no new alerts in changed code`
- Vercel preview: `SUCCESS`
- review threads: `0`
- submitted reviews: `0`
- contract delta: `NONE`
- authority expansion: `NONE`
- persistence/migrations/RLS/Auth impact: `NONE`
- external account action: `NONE`

Canonical identity remains:

```text
System Friction Institute
SFI
https://systemfriction.org
https://systemfriction.org/#sfi
```

Identity coherence is absorbed into the existing `src/lib/public/institutionProfile.ts` owner. `CLAIMED != VERIFIED`; institutional `sameAs` is fail-closed; repository control remains `CONTROLLED_ASSET` and cannot become institutional `sameAs`; current Medium and LinkedIn evidence remains `CLAIMED`; the disambiguation candidate `Systemic Friction Institute, Inc` remains `COLLISION_CANDIDATE / DISAMBIGUATION_RISK` with `observedCollision: false`.

The branch modifies only the WS-07 identity document, discovery-integrity QA, root metadata projection and the existing institution profile owner. Its first commit descends directly from the formal R2-B baseline and no access-console, Supabase/Auth, account API, migration or other PR #374 scope file is present in its changed-file set. No PR #374 content is part of this assurance batch.

Netlify deploy-preview contexts failed, while exact-head SFI Verify, identity/discovery integrity, typecheck, build, CodeQL and Vercel preview succeeded. No causal product failure is established by those external Netlify contexts; they do not alter this pre-merge product/contract verdict.

**PR #377 PRE-MERGE ASSURANCE: PASS**

### Cross-PR coexistence

Changed-file sets are disjoint. No textual file conflict is present.

The semantic dependency remains one-way:

```text
institutionProfile.ts
→ canonicalObjectRegistry.ts
→ researchGraphProjection.ts
```

Therefore:

- WS-05 only consumes canonical identity transitively through the canonical object owner where applicable;
- WS-07 cannot create or mutate Research Graph nodes or relationships;
- Research Graph cannot create institutional identity facts or `sameAs`;
- identity classification does not mutate `CITATION.cff` or scholarly metadata;
- `sameAs` is not a Research Graph identifier;
- repository control is not scholarly affiliation;
- no canonical identity/object/publication owner is duplicated;
- no circular dependency is introduced;
- no implicit publication authority is introduced;
- no identity-to-CANON or Research-Graph-to-CANON promotion exists;
- no discovery-to-execution path exists;
- no request, grant or execution authority is introduced.

Cross-PR result:

```text
FILE CONFLICT: NONE
OWNER CONFLICT: NONE
CONTRACT CONFLICT: NONE
AUTHORITY CONFLICT: NONE
CONTRACT DELTA: NONE
AUTHORITY EXPANSION: NONE
PERSISTENCE/MIGRATIONS: NONE
```

### Integration order and revalidation rule

Recommended dependency-safe order:

```text
#377 · Identity Coherence
→ rebase/refresh #375 onto the new main
→ exact-head SFI Verify on the rebased #375 HEAD
→ WS-08 exact-head revalidation of #375
→ #375 · Research Graph Projection
```

Reason: `institutionProfile.ts` is upstream of `canonicalObjectRegistry.ts`, which is upstream of the Research Graph projection. Merging #377 first changes an upstream identity dependency consumed by the canonical object owner; therefore the currently assured #375 HEAD cannot be used as the second merge receipt without rebasing/refreshing and revalidating it against the new main.

# R2-B PRE-MERGE ASSURANCE: PASS

NO MERGE by WS-08. NO R3. NO product change. NO contract change. NO authority expansion.
