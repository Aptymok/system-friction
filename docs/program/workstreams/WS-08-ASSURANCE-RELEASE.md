# WS-08 · ASSURANCE + RELEASE

**Mission:** act as the adversarial assurance and release-verification cell for the entire SFI program. Prove that workstreams preserve contracts, authority, epistemic integrity, security, performance and production behavior. Do not become a second implementation owner.

**Initial baseline:** `565ac410fceb56d86ff9d6eaec85b901d0d77248`  
**Integration authority:** SFI-00  
**Self-merge:** FORBIDDEN

## 1. Role

WS-08 independently verifies work produced by WS-01 through WS-07.

It may:

- add/fix QA tests and validation tooling;
- identify contract violations;
- request changes;
- prepare migration/security/performance review;
- inspect CI;
- inspect production deployment/logs;
- record observed RETURN.

It must not:

- silently redesign another workstream's domain;
- make sovereign user decisions;
- weaken tests to make CI green;
- direct-SQL mutate production to hide a defect;
- approve its own unreviewed semantic contract changes.

## 2. Baseline closure first

Before new program work is considered safe, verify merged `565ac410...`:

1. exact production deployment success;
2. ROOT sovereign surface loads;
3. `NECESITA DE TI` only counts actionable human obligations;
4. report approvals open real dossiers/actions;
5. Library is accessible and non-fabricating;
6. Twin Learning is accessible and lineage-preserving;
7. Method Lab/Observatory/Studio navigation is reachable;
8. no public `UNAVAILABLE → 0` false-zero behavior;
9. no #362 interactive duplicate-read regression;
10. no new Supabase/Postgres timeout/retry burst attributable to navigation.

## 3. Assurance matrix

Every program PR is evaluated across relevant dimensions:

```text
CANONICAL PREFLIGHT
OWNERSHIP / DUPLICATION
EPISTEMIC BOUNDARY
AUTHORITY BOUNDARY
RLS / DATA ACCESS
SECRET HANDLING
PRIVACY
RIGHTS / LICENSE
LINEAGE
READ-PLANE COST
N+1 / DUPLICATE READS
MIGRATION SAFETY
BACKWARD COMPATIBILITY
API CONTRACT
TYPECHECK
UNIT/INTEGRATION QA
BUILD
ROLLBACK
PRODUCTION RETURN
```

Not every PR requires every domain, but skipped dimensions must be non-applicable for a stated reason.

## 4. Required program gates

WS-08 coordinates implementation/registration of these gates, absorbing existing QA infrastructure rather than creating a separate CI universe:

```text
SFI-RUNTIME-ADAPTIVE-CAPABILITY-1.0
SFI-CAPABILITY-AUTHORITY-1.0
SFI-MODEL-INDEPENDENCE-1.0
SFI-DOMAIN-NEUTRAL-KERNEL-1.0
SFI-DISCOVERY-INTEGRITY-1.0
SFI-ENTITY-COHERENCE-1.0
SFI-PUBLIC-EPISTEMIC-BOUNDARY-1.0
SFI-PUBLIC-MCP-READONLY-1.0
SFI-DISCOVERY-NO-DUPLICATE-CANON-1.0
SFI-AUDIO-RIGHTS-SEPARATION-1.0
SFI-AUDIO-EPHEMERAL-ASSET-1.0
```

Existing gates remain authoritative where they already cover a rule. Do not duplicate tests solely to create a new filename.

## 5. Runtime adversarial tests

For WS-01 prove:

- capability request does not self-authorize;
- denied request cannot execute;
- duplicate/recursive requests terminate;
- model unavailable/fallback does not change authority;
- scope/TTL/ceiling enforced;
- model output remains derived/inference;
- explicit/auto compatibility remains.

## 6. Twin/Method Lab adversarial tests

For WS-02 prove:

- historical learning remains reconstructable after amendment;
- simulation/reentry does not create OBSERVATION;
- same T0 replay is reproducible within declared nondeterminism;
- model/provider swap is an experimental variable, not memory replacement;
- private Twin state does not leak publicly.

## 7. Discovery adversarial tests

For WS-03 prove:

- only publicable objects enter sitemaps/feeds/capsules;
- JSON-LD identity is coherent;
- canonical/hreflang correct;
- no unverified external node in `sameAs`;
- no false-zero;
- crawlers are separated by policy class;
- ROOT/private endpoints excluded;
- Discovery Control Plane uses bounded reads;
- one canonical object does not create competing canonical URLs.

## 8. Machine-interface adversarial tests

For WS-04 prove:

- public MCP is read-only;
- public MCP cannot access ROOT/private cases/Twin;
- authenticated adapter uses existing scopes;
- high-capability model cannot bypass scope;
- OpenAPI/manifest/MCP descriptions agree;
- external listing is not claimed without receipt.

## 9. Research adversarial tests

For WS-05 prove:

- citation files parse;
- DOIs emitted are real/verified;
- ORCIDs emitted are verified;
- no fictional ROR;
- authors/institution roles correct;
- publication version/canonical landing metadata agree.

## 10. Audio adversarial tests

For WS-06 prove:

- instrument/reference banks cannot substitute each other;
- rights state gates execution/publication;
- SFZ path actually renders in supported fixture;
- raw source material is not default DB payload;
- ephemeral cleanup state is recorded;
- bounded rerender preserves unaffected stems where supported;
- rendered output does not become cultural observation by inheritance.

## 11. External identity adversarial tests

For WS-07 prove:

- claimed/verified state is evidence-backed;
- no fabricated handle/URL/identifier;
- canonical name/domain consistent;
- lost/degraded node not still emitted as verified;
- identity collision observations distinguish observed confusion from mere name similarity.

## 12. Migration review

For every migration:

```text
owner exists?
duplicate table/column?
RLS enabled?
policies explicit?
indexes appropriate?
foreign keys correct?
nullable/default semantics honest?
backfill bounded?
rollback understood?
production lock risk?
```

Only SFI-00 coordinates production application order.

## 13. Performance/read-plane review

Protect #362 invariant:

```text
ONE INTERACTIVE NEED
→ ONE AUTHORITATIVE READ PER DOMAIN
→ ZERO DUPLICATE EQUIVALENT READS
→ ZERO N+1
```

For new ROOT/Discovery UI:

- no heavy archive in periodic polling;
- no exact COUNT where bounded existence is enough;
- no full graph/state fanout for a card;
- dossier reads are explicit/on demand;
- mutation responses should be reused when canonical and fresh rather than write→discard→duplicate read.

## 14. Production verification protocol

After merge:

1. record merge SHA;
2. identify exact production workflow/deployment;
3. wait for terminal success/failure;
4. do not call production live before success;
5. exercise only non-sovereign smoke paths unless the user explicitly requests an action;
6. inspect relevant logs;
7. record observed failures separately from registered incidents;
8. compare expected RETURN against observed behavior;
9. update `CURRENT-STATE.md` via SFI-00.

## 15. Status language

Allowed:

```text
DESIGNED
IMPLEMENTED
QA_PASS
MERGED
DEPLOYED
OBSERVED_IN_PRODUCTION
```

Never collapse them into `DONE` without context.

## 16. Definition of done

WS-08 remains active through the whole program. It reaches program-complete state only when every completed workstream has independent assurance evidence, all merged functional surfaces have production RETURN where applicable, and no unresolved severity-critical contract/security/epistemic defect remains hidden behind green superficial CI.

## 17. Handoff

```text
BASE SHA
PR/WORKSTREAM REVIEWED
ASSURANCE DIMENSIONS
GATES RUN
FAILURES
FIX OWNER
MIGRATION REVIEW
PERFORMANCE REVIEW
DEPLOYMENT SHA/STATE
PRODUCTION OBSERVATION
UNRESOLVED RISK
RECOMMENDATION TO SFI-00
```

## 18. Final pre-merge assurance — 2026-09-04 · #366 / PR #369

**WS-08 state:** `QA_PASS / PRE-MERGE_ASSURANCE_PASS`  
**Reviewed PR:** `#369` — OPEN / NOT MERGED  
**Exact reviewed HEAD:** `c2a0614568bd428da9374fe7f1eda0d572e9f8c6`  
**HEAD stability:** verified unchanged during durable-persistence check  
**Implementation owner:** WS-03 · DISCOVERY MESH  
**Independent assurance owner:** WS-08 · ASSURANCE + RELEASE  
**Integration authority:** SFI-00

This final exact-head record replaces the earlier active FAIL verdicts tied to `db1dd108...`, `18ff987...`, and `7c8c0fe...`. Those findings were valid for their historical heads, but they are no longer the current disposition. The active pre-merge verdict for `c2a0614568bd428da9374fe7f1eda0d572e9f8c6` is:

**PRE-MERGE ASSURANCE PASS**

**PRE-MERGE PASS != DEPLOYED != OBSERVED_IN_PRODUCTION**

PR #369 has not been merged or deployed at this pre-merge checkpoint. Issue #366 must not be closed as production-observed until the exact merge SHA is deployed and receives bounded production RETURN.

### 18.1 Exact-head CI and review state

For exact HEAD `c2a0614568bd428da9374fe7f1eda0d572e9f8c6`:

- `SFI Verify` run `33923289572` / #2342: `SUCCESS`;
- `SFI Universal Signal` #520: `SUCCESS`;
- `SFI Session Controls` #127: `SUCCESS`;
- `SFI External OAuth` #335: `SUCCESS`;
- all five current inline #369 review threads: `RESOLVED`;
- unresolved same-slice review threads: `0`.

`SFI Final Closure Verify` #303 / run `33923289670` is `FAILURE`, with the failure localized to `Verify runtime wiring`. This was classified during exact-head assurance as `PREEXISTING_UNRELATED`: the failing runtime-wiring assertion is outside the #366 Observatory correction and is not evidence of a #369 causal regression. It is retained as an observed workflow failure rather than ignored.

External preview status is mixed: Vercel reports success while two Netlify deploy-preview contexts report failure. Those Netlify contexts are not GitHub workflow failures and no causal #369 defect was established from them; they are not promoted into product PASS or FAIL.

### 18.2 False-zero assurance — PASS

Independent exact-head assurance confirms the frozen `UNAVAILABLE != ZERO` invariant across the co-rendered public Observatory surface in deterministic pre-merge QA:

- `LOADING`, `DEGRADED`, `UNAVAILABLE`, and `ERROR` do not project numeric zero;
- `AVAILABLE` with an authoritative actual zero may project numeric `0`;
- contract-incomplete HTTP 200 payloads do not classify as `AVAILABLE`;
- hypothesis absence is asserted only when authoritative world availability is `AVAILABLE`;
- stale world data may be cleared on non-available reads without converting that state into a false-zero or false-absence claim.

### 18.3 Read-plane assurance — PASS

The exact reviewed implementation preserves the bounded read-plane topology in deterministic pre-merge QA:

```text
ONE INTERACTIVE NEED
→ ONE AUTHORITATIVE READ PER DOMAIN
→ ZERO DUPLICATE EQUIVALENT READS
→ ZERO N+1
```

Observed/locked topology for the Observatory public read cycle:

- one authoritative fetch for `world`;
- one authoritative fetch for `state`;
- one authoritative fetch for `timeline`;
- one `Promise.all` batch owner;
- one 20-second polling owner;
- zero retry owner / retry fanout;
- zero equivalent duplicate reads introduced by the correction;
- zero N+1 introduced by the correction.

### 18.4 Timeout / poll assurance — PASS

The earlier unbounded-serialization defect is closed in deterministic pre-merge QA on the exact reviewed HEAD:

- the existing poll cycle is serialized with the single `inFlight` guard;
- concurrent refresh generations cannot race and restore stale `AVAILABLE` state;
- the existing transport path has one 15-second bounded timeout;
- `15s < 20s` refresh cadence;
- `finally` can release the serialized generation after timeout/error;
- no retry loop, second timer, abort loop, or parallel polling owner was introduced.

### 18.5 ObservatoryInterpretiveFlow assurance — PASS

On the exact reviewed source HEAD, `ObservatoryInterpretiveFlow`:

- has zero world fetch owner;
- has zero polling/timer owner;
- consumes the canonical `world` read model from `ObservatoryConsole`;
- consumes the same canonical `availability.world` classification;
- uses availability-aware metric projection so non-AVAILABLE states do not become numeric zero;
- cannot emit the governed-hypothesis absence claim outside authoritative `AVAILABLE`.

### 18.6 Contract / authority / persistence review

For this #366 slice:

- contract delta: `NONE`;
- ROOT authority expansion: `NONE`;
- external execution authority: `NONE`;
- migrations/tables/writers/events: `NONE`;
- RLS/secret changes: `NONE`;
- production mutation by WS-08: `NONE`.

### 18.7 Pre-merge recommendation

**RECOMMENDATION:** integrate PR #369 at exact HEAD `c2a0614568bd428da9374fe7f1eda0d572e9f8c6`, subject to SFI-00's integration sequencing and exact-head guard.

## 19. Post-merge / post-deploy production assurance — 2026-09-04 · #366

**Source HEAD integrated:** `c2a0614568bd428da9374fe7f1eda0d572e9f8c6`  
**Exact merge SHA / main:** `5ee9005d566a9f88d89b36976712294a73fbd833`  
**Production workflow:** `SFI Vercel Prebuilt Production`  
**Exact deployment run:** `33944928325`  
**Workflow head SHA:** `5ee9005d566a9f88d89b36976712294a73fbd833`  
**Deployment conclusion:** `SUCCESS`  
**Exact production deployment:** `https://system-friction-d9c5hxi2f-systemfrictioninstitute.vercel.app`  
**Canonical alias:** `https://www.systemfriction.org`

The deployment identity chain is verified: the production workflow checked out `5ee9005d566a9f88d89b36976712294a73fbd833`, built the production artifact successfully, deployed the prebuilt output, emitted the exact production URL above, aliased it to `https://www.systemfriction.org`, and reached `Ready`.

### 19.1 Public smoke observation state

**PRODUCTION RETURN: NOT_OBSERVED**  
**#366 PRODUCTION ASSURANCE: NOT_OBSERVED**  
**Release state:** `DEPLOYED`, not `OBSERVED_IN_PRODUCTION`.

A fresh controlled public smoke could not be completed with the available execution surfaces. This is a tooling/access limitation, not evidence of product success or failure:

- the available public web fetch path did not return a fresh live canonical `/observatory` response;
- search-indexed copies were crawled before this deployment and were explicitly excluded as stale evidence;
- the container runtime could not resolve the public site for a direct HTTP smoke;
- the connected Vercel read/fetch/project surfaces returned authorization/access failures for this deployment, so fresh runtime request logs could not be retrieved;
- no browser automation runtime capable of observing initial DOM/hydration and subsequent client state was available.

No forced failure was manufactured.

### 19.2 Evidence still missing for production RETURN

The following production evidence remains required:

1. fresh current SSR / initial hydration output for `https://www.systemfriction.org/observatory`;
2. observed initial `LOADING` behavior and transition to the naturally occurring authoritative state;
3. fresh current responses from `/api/observatory/world`, `/api/observatory/state`, and `/api/observatory/timeline`;
4. confirmation that current non-authoritative states do not expose numeric false-zero counts;
5. confirmation that an actual authoritative zero, if present naturally under `AVAILABLE`, renders `0`;
6. confirmation that contract-incomplete HTTP 200 is not admitted as `AVAILABLE` in a naturally observed production response if such a state occurs; deterministic QA remains the negative-state evidence and no failure is to be induced;
7. co-rendered `ObservatoryInterpretiveFlow` behavior during the same live session, including no false-zero and no false hypothesis-absence outside `AVAILABLE`;
8. attributable request counts across initial load and a bounded polling window sufficient to assess duplicate fetch/poll behavior;
9. attributable 5xx/timeout/retry evidence during that bounded smoke, or runtime logs sufficient to explain any such event.

### 19.3 Current assurance boundaries

Deterministic pre-merge assurance remains `PASS` for the source contract and topology, but it is not promoted into production RETURN.

Accordingly:

- `/observatory` production smoke: `NOT_OBSERVED`;
- `world` API production smoke: `NOT_OBSERVED`;
- `state` API production smoke: `NOT_OBSERVED`;
- `timeline` API production smoke: `NOT_OBSERVED`;
- false-zero in production: `NOT_OBSERVED`;
- read-plane duplication/retry behavior in production: `NOT_OBSERVED`;
- attributable 5xx/timeout/retry burst: `NOT_OBSERVED`; absence cannot be inferred from unavailable runtime evidence.

Issue #366 was correctly reopened after merge and must remain open until a real live bounded production smoke yields `PRODUCTION RETURN: PASS`.

### 19.4 Recommendation to SFI-00

**KEEP #366 OPEN.** The merge and deployment stages are complete and verified; only observed production RETURN remains outstanding.

Next safe action is to provide/obtain one execution surface capable of a fresh live canonical browser/HTTP smoke (or working Vercel runtime-read access), then rerun only this bounded WS-08 post-deploy assurance. If that live observation proves the frozen invariant and no attributable read-plane/runtime regression, WS-08 may persist `PRODUCTION RETURN: PASS` and return the close recommendation to SFI-00.

No product change, merge, authority change, Slice B action, or issue closure is authorized by this record.

---

# COPY-PASTE DISPATCH PROMPT

You are **SFI-08 · ASSURANCE + RELEASE**.

Continue only from fresh repository and release state. PR #369 source HEAD `c2a0614568bd428da9374fe7f1eda0d572e9f8c6` is merged at `5ee9005d566a9f88d89b36976712294a73fbd833` and exact production deployment run `33944928325` succeeded. Durable status is `DEPLOYED / PRODUCTION RETURN NOT_OBSERVED` because a fresh canonical live smoke was not available to the assurance execution surface.

Do not infer PASS from deployment success or stale indexed content. Do not force error states. Obtain a fresh bounded canonical `/observatory` + three API smoke and attributable request/runtime evidence. Only then may production RETURN change to PASS or FAIL. WS-08 does not merge or close #366.
