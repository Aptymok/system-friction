# SFI PROGRAM CURRENT STATE

**Updated:** 2026-09-04  
**Program authority:** SFI-00 · CONTROL ROOM  
**Source of truth:** fresh GitHub/Supabase/CI/production evidence overrides this file when newer.

## 1. Main and production baseline

Latest `main` at this state sync:

`f51a071ad728ba653349f5bc44f3b08191d73255`

Merged PR:

`#364 docs(program): bootstrap distributed SFI control plane`

PR #364 is documentation/control-plane only; it introduced no runtime/API/database/UI behavior and therefore does not replace the last functional production baseline.

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

Therefore #363 baseline state is `DEPLOYED`. It is not yet marked `OBSERVED_IN_PRODUCTION` for the new sovereign-inbox behavior until post-deploy navigation/behavior is explicitly observed.

## 2. Program control plane

The distributed program control plane is now merged to `main` through PR #364.

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

PR #364 passed canonical preflight, repository QA, typecheck and build before merge. Its post-merge `main` workflows may still be running when this state file is read; fresh workflow evidence overrides this line.

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
5. verify public false-zero behavior: unavailable/degraded cannot render as numeric zero;
6. observe production Supabase/Postgres/API/Auth logs under real navigation;
7. confirm no regression in #362 zero-duplicate read plane.

Deployment itself is already verified successful.

## 5. Workstream states and launch readiness

| Workstream | State | Safe next action |
|---|---|---|
| SFI-00 | READY | open Control Room chat; reconstruct fresh `main`, PRs, CI and baseline production state |
| WS-01 | READY | open Cognitive Fabric chat and inspect existing runtime against frozen contracts |
| WS-02 | READY | open Twin + Method Lab chat; inspect current owners and begin nonconflicting slices |
| WS-03 | READY | open Discovery Mesh chat; inspect/absorb current public semantic owners |
| WS-04 | READY_INSPECTION | inspect external gateway/MCP path; publication waits on stable WS-03/WS-01 dependencies |
| WS-05 | READY | inspect citation/publication metadata and real external identifiers |
| WS-06 | READY | inspect audio/FAD/Studio and material rights/storage owners |
| WS-07 | READY | inventory actual external identities; never fabricate account state |
| WS-08 | READY | perform post-deploy baseline behavior/log verification and adversarial assurance |

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

## 6. Launch order

Wave 1 may run simultaneously:

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

## 8. Session handoff format

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
