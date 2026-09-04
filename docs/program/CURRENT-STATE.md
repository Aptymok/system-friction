# SFI PROGRAM CURRENT STATE

**Updated:** 2026-09-04  
**Program authority:** SFI-00 · CONTROL ROOM  
**Source of truth:** fresh GitHub/Supabase/CI/production evidence overrides this file when newer.

## 1. Main and production baseline

Repository `main` immediately before this state reconciliation commit:

`7372ec2b0b9d48b7a930034836b2da0d0d862507`

Latest control-plane commit before this reconciliation:

`7372ec2 docs(program): sync control-plane launch state`

The control-plane commits are documentation-only; they introduce no runtime/API/database/UI behavior and therefore do not replace the last functional production baseline.

Latest functional production baseline:

`565ac410fceb56d86ff9d6eaec85b901d0d77248`

Merged PR:

`#363 fix(root): make NEEDS YOU a real sovereign decision inbox`

PR #363 state at merge:

- mergeable: true;
- SFI Cognitive Spine: PASS;
- SFI Session Controls: PASS;
- SFI External OAuth: PASS;
- SFI Main-Only Convergence: PASS;
- SFI Verify: PASS.

Canonical production deployment for #363:

- workflow: `SFI Vercel Prebuilt Production`;
- run: `33897088220`;
- exact SHA: `565ac410fceb56d86ff9d6eaec85b901d0d77248`;
- conclusion: `success`;
- completed: 2026-09-04T16:49:36Z.

Therefore #363 baseline state is `DEPLOYED`. It is **not** `OBSERVED_IN_PRODUCTION`: SFI-00/WS-08 observed a public false-zero contract failure on 2026-09-04 and the remaining authenticated/log verification items are still open.

## 2. Program control plane

The distributed program control plane is merged to `main` through PR #364 and subsequent documentation-only state synchronization commits.

Canonical coordination files:

```text
docs/program/README.md
docs/program/SFI-MASTER-PROGRAM.md
docs/program/SFI-CONTRACT-LOCK.md
docs/program/DEPENDENCY-GRAPH.md
docs/program/CURRENT-STATE.md
docs/program/DECISIONS.md
docs/program/SFI-00-CONTROL-ROOM.md
docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md
docs/program/workstreams/WS-02-TWIN-METHOD-LAB.md
docs/program/workstreams/WS-03-DISCOVERY-MESH.md
docs/program/workstreams/WS-04-MACHINE-INTERFACES.md
docs/program/workstreams/WS-05-RESEARCH-GRAPH.md
docs/program/workstreams/WS-06-MATERIAL-AUDIO.md
docs/program/workstreams/WS-07-EXTERNAL-IDENTITY.md
docs/program/workstreams/WS-08-ASSURANCE-RELEASE.md
```

Fresh SFI-00 reconciliation on 2026-09-04 observed:

- open program PRs: none;
- repository branches: `main` only;
- `main` pre-reconciliation SHA: `7372ec2b0b9d48b7a930034836b2da0d0d862507`;
- visible current-main GitHub Actions/check runs: no observed failure; `SFI Verify` and `SFI Main-Only Convergence` completed successfully, together with visible Python/Actions/JavaScript-TypeScript analysis checks and Studio audio verification;
- no workstream implementation branch or PR currently exists;
- no contract delta is pending.

Fresh repository/infrastructure evidence always overrides this summary.

## 3. Already established before this program

### Runtime/read plane

- PR #362 merged before #363.
- interactive ROOT/CASES/TWIN/GOVERNANCE read path consolidated;
- one interactive need -> one authoritative read per data domain is a protected invariant;
- bounded reads and no N+1 in the interactive critical path;
- selected agent dossier reads avoid overlapping canonical event histories.

### ROOT

#363 implements/merges:

- actionable human queue semantics;
- targeted proposal/report decision dossiers;
- pending `report_agent` approvals visible in ROOT;
- evidence-request delegation to Evidence Hunter owner;
- human cycle obligations deep-link to case/cycle dossier;
- canonical institutional surface map;
- ROOT renamed/maintained as sovereign operation rather than Observatory;
- Library recovery as documentary catalog;
- Twin learning review surface;
- Method Lab/Observatory/Library/Studio/Twin Learning navigation.

### Public machine discovery already present

Repository/public runtime already contains:

- `/llms.txt`;
- `/llms-full.txt`;
- `/ai-index.json`;
- `/ai-policy`;
- `/field-schema.json`;
- `/openapi.json`;
- `/api/external/v1/manifest`;
- `robots.ts`;
- `sitemap.ts`;
- public institution profile.

The program must absorb these owners; it must not build a second machine-discovery plane.

### Cognitive runtime already present

Existing capabilities include:

- dynamic cognitive automation selection with `explicit` and `auto` modes;
- MetaOrchestrator selecting a minimum initial automation set;
- execution map for the registered cognitive agents/automations;
- cognitive cycle continuation/checkpointing;
- model augmentation/router with capability requirements;
- governed proposals from model/agent insight;
- Cognitive Spine context materialization;
- RETURN plan recording.

The program evolution is from dynamic pre-selection to governed runtime capability negotiation, not a rewrite from zero.

### Audio already present

Existing Universal Signal processing recognizes audio and activates FAD observation paths.

Not yet institutionalized at program bootstrap:

- SFZ canonical instrument packages;
- `SFI_INSTRUMENT_REGISTRY` owner;
- Acoustic Render Adapter;
- ephemeral material render workspace;
- audio production capabilities/passports;
- controlled render/evaluate/rerender loop.

## 4. Open baseline verification items

SFI-08 + SFI-00 must resolve before declaring the functional baseline `OBSERVED_IN_PRODUCTION`:

1. load ROOT and verify actionable queue behavior without executing sovereign actions;
2. verify pending report approvals are discoverable/actionable;
3. verify Library and Twin Learning surfaces are accessible;
4. verify Method Lab/Observatory/Studio navigation;
5. **FAILED 2026-09-04:** public false-zero behavior; the canonical public Observatory renders numeric zero during an initializing/hydrating state before authoritative availability is established;
6. observe production Supabase/Postgres/API/Auth logs under real navigation;
7. confirm no regression in #362 zero-duplicate read plane.

Deployment itself is verified successful. Baseline closure is blocked by item 5 and items 1-4/6-7 remain unobserved in this SFI-00 session rather than presumed successful.

### 4.1 Confirmed false-zero failure

Observed public behavior on 2026-09-04:

```text
PUBLIC hydrating / session initializing
OBSERVATIONS    0
ACTIVE SOURCES  0
HYPOTHESES      0
IN RETURN       0
```

Repository cause is present in `src/components/sfi/ObservatoryConsole.tsx`:

- `world` starts as `null`;
- missing `world?.nodes` / `world?.hypotheses` are projected through empty arrays;
- derived `.length` counters therefore become numeric zero before an authoritative read establishes availability;
- failed/non-OK reads are not represented as an explicit counter availability state.

This violates the frozen invariants:

```text
UNAVAILABLE != ZERO
AVAILABLE + 0 = 0
DEGRADED/UNAVAILABLE -> explicit state, not numeric zero
```

Corrective issue:

`#366 [WS-03/WS-08] Eliminate public false-zero during Observatory availability`

Owner routing:

- implementation: WS-03;
- independent assurance: WS-08;
- integration/release decision: SFI-00.

No contract delta is required. The implementation must conform to the already frozen contract, preserve the one-authoritative-read-per-domain invariant, add/absorb regression QA, and be re-observed after exact-SHA production deployment.

## 5. Workstream states and launch readiness

| Workstream | State | Safe next action |
|---|---|---|
| SFI-00 | READY | admit only contract-compliant green heads; keep functional baseline blocked from `OBSERVED_IN_PRODUCTION` until #366 and remaining baseline verification close |
| WS-01 | READY | inspect existing runtime against frozen contracts; complete bounded Cognitive Fabric slice before opening PR |
| WS-02 | READY | inspect current Twin + Method Lab and begin nonconflicting slices |
| WS-03 | READY | implement issue #366 first or in a bounded contract-compliant public availability slice; then continue Discovery Mesh work |
| WS-04 | READY_INSPECTION | inspect external gateway/MCP path; publication waits on stable WS-03/WS-01 dependencies |
| WS-05 | READY | inspect citation/publication metadata and real external identifiers |
| WS-06 | READY | inspect audio/FAD/Studio and material rights/storage owners |
| WS-07 | READY | inventory actual external identities; never fabricate account state |
| WS-08 | QA_FAILED | baseline public false-zero gate failed; independently verify #366 fix, then continue ROOT/log/read-plane baseline closure |

Allowed states:

```text
NOT_STARTED
INSPECTING
READY
READY_INSPECTION
IMPLEMENTING
PR_OPEN
WAITING_DEPENDENCY
WAITING_CONTRACT_DECISION
QA_FAILED
QA_PASS
MERGED
DEPLOYED
OBSERVED_IN_PRODUCTION
BLOCKED_EXTERNAL
COMPLETE
```

## 6. Launch and integration order

Wave 1 implementation may run simultaneously:

```text
SFI-01 · COGNITIVE FABRIC
SFI-03 · DISCOVERY MESH
SFI-05 · RESEARCH GRAPH
SFI-07 · EXTERNAL IDENTITY
SFI-08 · ASSURANCE + RELEASE
```

Also safe to start inspection/nonconflicting implementation immediately:

```text
SFI-02 · TWIN + METHOD LAB
SFI-06 · MATERIAL AUDIO
SFI-04 · MACHINE INTERFACES
```

WS-04 publication/integration remains dependency-bound to stable WS-03 semantic objects and WS-01 authenticated adaptive-capability contracts.

Until baseline assurance failure #366 is corrected, workstreams may inspect and implement in bounded branches, but SFI-00 should not admit unrelated new functional production exposure ahead of the baseline correction. A corrective PR for #366 has first integration priority.

## 7. Known strategic observations

### SFI is not digital-only

Digital systems are the first observation domain. Kernel/domain contracts must become or remain domain-neutral.

### Agent count is not strategic value

The future architecture values governed cognitive passports/capabilities and model-independent execution rather than permanently separate LLM brains.

### Model availability is runtime data

Astra or any future frontier model is an optional executor. Architecture cannot depend on one provider or model being available.

### Discovery is reconstruction redundancy

Goal is not follower count or virality. Goal is that SFI can be reconstructed correctly from multiple independent human/research/machine entry points while `systemfriction.org` remains canonical.

### External identity collision exists

Program must defend `System Friction Institute` / `systemfriction.org` against confusion with similarly named entities. External nodes must repeat verified canonical identity.

## 8. SFI-00 handoff — 2026-09-04

```text
BASE SHA
7372ec2b0b9d48b7a930034836b2da0d0d862507 (pre-reconciliation main)

MERGES COMPLETED
None in this SFI-00 session.

DEPLOYS OBSERVED
Canonical functional deployment receipt confirmed for 565ac410fceb56d86ff9d6eaec85b901d0d77248 via run 33897088220: success.
Public route behavior was observed; the functional baseline was not promoted to OBSERVED_IN_PRODUCTION.

WORKSTREAM STATE CHANGES
WS-08: READY -> QA_FAILED due confirmed false-zero baseline failure.
WS-03: READY with corrective issue #366 as first integration priority.

CONTRACT CHANGES
None.

OPEN FAILURES
#366 public Observatory false-zero during unavailable/loading state.
Authenticated ROOT/report/Library/Twin Learning/navigation verification remains unobserved.
Production Supabase/Postgres/API/Auth log verification remains unobserved from this session.
#362 duplicate-read production regression check remains unobserved.

HUMAN BLOCKERS
None identified for the corrective implementation.
No sovereign decision is required.

NEXT SAFE ACTION
WS-03 implements #366 with regression QA; WS-08 independently verifies it. SFI-00 then admits the exact green head, verifies deployment for the merge SHA, repeats public smoke and continues the remaining baseline closure checks before any OBSERVED_IN_PRODUCTION claim.
```

## 9. Workstream handoff format

Every workstream updates its durable file with:

```text
BASE SHA
BRANCH
COMMITS
FILES CHANGED
MIGRATIONS
EVENTS ADDED
ROUTES ADDED
CONTRACTS TOUCHED
QA EXECUTED
QA RESULT
KNOWN DEFECTS
UNRESOLVED DEPENDENCIES
PR
DEPLOYMENT STATE
NEXT SAFE ACTION
```

If a workstream cannot update this file directly because another PR owns it, it must update its own workstream file and SFI-00 reconciles the global state.
