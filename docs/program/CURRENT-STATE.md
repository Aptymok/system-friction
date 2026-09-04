# SFI PROGRAM CURRENT STATE

**Updated:** 2026-09-04  
**Program authority:** SFI-00 · CONTROL ROOM  
**Source of truth:** fresh GitHub/Supabase/CI/production evidence overrides this file when newer.

## 1. Main baseline

Latest merged baseline at program bootstrap:

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

Production deployment for this merge must be independently verified before marking `OBSERVED_IN_PRODUCTION`.

## 2. Already established before this program

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

## 3. Open baseline verification items

SFI-08 + SFI-00 must resolve before declaring baseline closed:

1. verify deployment of `565ac410...` to canonical production;
2. load ROOT and verify actionable queue behavior without executing sovereign actions;
3. verify pending report approvals are discoverable/actionable;
4. verify Library and Twin Learning surfaces are accessible;
5. verify Method Lab/Observatory/Studio navigation;
6. verify public false-zero behavior: unavailable/degraded cannot render as numeric zero;
7. observe production Supabase/Postgres/API/Auth logs under real navigation;
8. confirm no regression in #362 zero-duplicate read plane.

## 4. Program control-plane bootstrap branch

Current bootstrap branch:

`sfi-control-room-bootstrap`

Purpose:

- establish master program;
- freeze shared contracts;
- define dependencies;
- define durable current state;
- define decision ledger;
- create WS-01 through WS-08 dispatch/workstream contracts;
- open one documentation/control-plane PR;
- merge only after normal repository preflight/CI.

No production runtime change should be introduced by the bootstrap PR.

## 5. Workstream states

| Workstream | State | Safe next action |
|---|---|---|
| SFI-00 | BOOTSTRAPPING | merge control plane after CI; reconstruct production baseline |
| WS-01 | NOT_STARTED | read workstream contract after control-plane merge |
| WS-02 | NOT_STARTED | inspect current Twin + Method Lab against workstream contract |
| WS-03 | NOT_STARTED | inspect public semantic/discovery owners; no duplicate plane |
| WS-04 | NOT_STARTED | inspect external gateway and available MCP path |
| WS-05 | NOT_STARTED | inspect publication/citation metadata and real external identifiers |
| WS-06 | NOT_STARTED | inspect audio/FAD/Studio and rights/storage boundaries |
| WS-07 | NOT_STARTED | inventory actual external identities; no fabrication |
| WS-08 | BOOTSTRAPPING | verify baseline production and create assurance matrix |

Allowed states:

```text
NOT_STARTED
INSPECTING
READY
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

## 6. Known strategic observations

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

## 7. Session handoff format

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
