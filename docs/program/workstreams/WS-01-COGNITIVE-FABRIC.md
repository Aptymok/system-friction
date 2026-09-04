# WS-01 · COGNITIVE FABRIC

**Mission:** evolve the existing SFI cognitive runtime from dynamic pre-selection into a model-independent, adaptive, governed cognitive execution fabric without erasing existing agent lineage or authority boundaries.

**Initial baseline:** `565ac410fceb56d86ff9d6eaec85b901d0d77248`  
**Integration authority:** SFI-00  
**Self-merge:** FORBIDDEN

## 1. Existing capability to absorb

Before writing code, inspect and reuse:

- `src/lib/sfi/cognitive-runtime/automationSelector.ts`;
- `src/lib/sfi/cognitive-runtime/agents/metaOrchestrator.ts`;
- `src/lib/sfi/cognitive-runtime/taskGraphBuilder.ts`;
- `src/lib/sfi/cognitive-runtime/cognitiveCycle.ts`;
- `src/lib/sfi/cognitive-runtime/runtimeAgentExecutor.ts`;
- `src/lib/sfi/cognitive-runtime/agentExecutionMap.ts`;
- converged registry / execution contracts;
- AI governance policy;
- model/provider router and LLM augmentation path;
- Cognitive Spine materialization consumed by runtime;
- existing checkpoints/RETURN plan events.

Do not create a second orchestrator, second agent registry, second model router or second event store.

## 2. Target outcome

Implement:

```text
EXPLICIT
AUTO
ADAPTIVE
```

where adaptive means:

```text
running capability
→ CAPABILITY_REQUEST
→ governed broker
→ ADMIT / DENY / DEFER / ALREADY_SATISFIED / HUMAN_AUTHORITY_REQUIRED / EVIDENCE_REQUIRED
→ capability execution if admitted
→ receipt
→ trajectory continues
```

A capability may request another capability. It cannot grant itself authority.

## 3. Owned implementation domain

Primary ownership:

```text
src/lib/sfi/cognitive-runtime/**
src/lib/governance/** capability/runtime additions that do not conflict with existing owners
runtime-specific contracts/tests/docs
```

Shared files require SFI-00 sequencing.

Potential persistence owners, only after duplicate-owner preflight:

```text
sfi_cognitive_passports
sfi_capability_requests
sfi_capability_grants
```

`epistemic_events` remains the transversal event/lineage owner.

## 4. Required functional slices

### Slice A — Cognitive Passport Registry

- adapt existing execution contracts/registry into passport projection;
- preserve current 21 IDs and historical semantics;
- validate epistemic mode, tools, model requirements, authority ceiling, orchestration and RETURN rules;
- expose no new authority by default;
- produce deterministic validation errors;
- add CI contract gate.

### Slice B — Capability Broker

- persist/emit requests and dispositions;
- deduplicate equivalent requests in a trajectory;
- verify passport existence;
- verify scope/authority/evidence/budget/depth;
- support `ADMIT`, `DENY`, `DEFER`, `ALREADY_SATISFIED`, `HUMAN_AUTHORITY_REQUIRED`, `EVIDENCE_REQUIRED`;
- emit lineage events;
- never treat a model request as authorization.

### Slice C — Adaptive Task Graph

Replace rigid sequential-only semantics with a mutable DAG while preserving compatibility.

Required node states:

```text
PLANNED ADMITTED RUNNING WAITING_EVIDENCE WAITING_AUTHORITY COMPLETED SKIPPED FAILED SUPERSEDED
```

Required edge relations:

```text
REQUIRES SUPPLIES CONTRADICTS CALIBRATES GOVERNS FALSIFIES
```

Add nodes, never silently remove history.

### Slice D — Operation-Level Model Broker

Selection must use operation requirements, not a permanent one-agent/one-model assignment.

Inputs include:

```text
reasoning
structuredOutput
web
multimodal
computer
code
minContextTokens
latencyClass
costClass
privacyClass
provider constraints
```

Provider/model unavailable = fallback/degraded state, not fabricated availability.

### Slice E — Ephemeral Capability Grants

Implement scoped, time-bound grants with:

```text
principal
trajectory
step
capability
resource
allowedActions
authorityCeiling
issuedAt/expiresAt
confirmation
sensitivity
parent grant
nonce
state
```

No service-role credential reaches browser/model context.

### Slice F — Runtime stop/cost controls

Enforce:

- max depth;
- max capability invocations;
- duplicate request hash;
- max model calls;
- max tokens/cost where observable;
- deadline;
- no-new-state stop invariant.

## 5. Required compatibility

Do not break:

- explicit agent execution;
- current `auto` selector;
- existing agent dossier/event readers;
- governed proposal emission;
- checkpoint continuation;
- Universal Signal cycle;
- Method Lab deterministic simulation bridge;
- existing external execution contracts.

Compatibility aliases may remain while canonical new contracts evolve.

## 6. Forbidden outcomes

- `21 agents × frontier model` hard binding;
- agent self-authorization;
- implicit promotion of model output to evidence;
- unbounded recursive agent spawning;
- duplicate model router;
- hidden second task graph;
- raw secrets placed in execution metadata;
- default external execution authority;
- `service_role` exposure;
- model availability assumed from documentation rather than canary/config state.

## 7. QA gates

Must implement/absorb:

```text
SFI-RUNTIME-ADAPTIVE-CAPABILITY-1.0
SFI-CAPABILITY-AUTHORITY-1.0
SFI-MODEL-INDEPENDENCE-1.0
```

Must retain:

- canonical architecture preflight;
- runtime read-plane stability;
- zero interactive duplication;
- AI governance gates;
- typecheck;
- build.

Tests must prove:

1. capability can request another at runtime;
2. request alone cannot execute if broker denies;
3. duplicate request does not create a loop;
4. unavailable frontier model falls back without changing epistemic/authority state;
5. no model can obtain authority above passport ceiling;
6. evidence/model output distinction remains intact;
7. existing explicit/auto behavior remains compatible.

## 8. Definition of done

WS-01 is complete only when:

- passports are canonical projections of existing capability contracts;
- adaptive requests are real runtime behavior;
- task graph can mutate safely;
- per-operation model selection is implemented;
- grants are scoped/expiring;
- event lineage is persisted;
- runtime can stop safely;
- no existing institutional owner is duplicated;
- all gates pass;
- SFI-00 observes the merged behavior in production or the appropriate runtime environment.

## 9. Handoff format

Update this file or report to SFI-00:

```text
BASE SHA
BRANCH
COMMITS
FILES CHANGED
MIGRATIONS
EVENTS ADDED
ROUTES ADDED
CONTRACT DELTA
QA EXECUTED
QA RESULT
KNOWN DEFECTS
DEPENDENCIES
PR
NEXT SAFE ACTION
```

## 10. Durable handoff — 2026-09-04 — Slice A

**State:** `QA_PASS / PR_OPEN`  
**Slice:** Cognitive Passport Registry + validation  
**Base SHA:** `1bd890c8a2ec784ad87d73eac6d19a294e050543`  
**Branch:** `ws01/cognitive-passport-registry`  
**PR:** `#367`

### Preflight reconstruction

The existing runtime owners were inspected before implementation. `SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY` remains the sole canonical cognitive execution registry; `MetaOrchestratorAgent` remains the sole cognitive orchestrator; `src/lib/ai/providerRouter.ts` remains the model/provider routing owner; existing task-graph code remains the task-graph owner; `epistemic_events` remains the transversal lineage/event owner. `canonicalCapabilities.ts` was observed but was not promoted into a competing registry.

Slice A therefore implements passports as a deterministic projection over `SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY`. No second agent registry, orchestrator, model router, event universe, task graph or persistence writer was created.

### Implemented

- `SFI-COGNITIVE-PASSPORT-1.0` projection for all 21 historical runtime IDs;
- deterministic passport and registry validation;
- epistemic-mode projection from existing runtime layers;
- conservative authority projection that cannot exceed existing runtime authority and currently emits only `READ`/`RECOMMEND` ceilings;
- zero tool authority minted by passports;
- adaptive capability requests explicitly disabled in Slice A until the governed broker exists;
- provider/model-independent operation requirement metadata under the existing provider-router owner;
- RETURN/security/orchestration fields required by the frozen passport contract;
- CI contract gate added to the existing `SFI Verify` workflow.

### Persistence / events / routes

- migrations: none;
- tables: none;
- events added: none;
- routes added: none;
- direct SQL: none;
- new writer: none.

### Contract delta

None. The frozen contract can be absorbed without fork.

### QA closure

Initial PR workflow `SFI Verify` run `33905545517` correctly failed `P17_PR_PREFLIGHT_REQUIRED` because the PR body lacked the mandatory `SFI PRECHECK` markers. This was a PR-metadata failure, not a code defect. The PR body was corrected with all required preflight fields.

Full verification then ran on head `771c0c0a283d4aecbe98a617ddf790db78880bfe` in `SFI Verify` run `33905891122`. The primary `Verify SFI boundaries and build` job completed successfully, including:

- verify parallel topology: PASS;
- domain boundaries: PASS;
- canonical architecture preflight: PASS;
- cognitive agent convergence / 21 IDs: PASS;
- `SFI cognitive passport registry`: PASS;
- AI governance/autonomous runtime: PASS;
- runtime read-plane stability: PASS;
- all intervening SFI verification gates: PASS;
- typecheck: PASS;
- build: PASS.

No implementation defect was observed in Slice A by the completed primary verification chain.

### Known defects / dependencies

- baseline issue `#366` remains an unrelated WS-03/WS-08 assurance failure and has first integration priority under current SFI-00 state;
- SFI-00 remains sole merge/integration authority;
- Slice B depends on a stable passport projection and must not introduce self-authorization or a parallel event/persistence owner.

### Next safe action

Leave `#367` unmerged for SFI-00 sequencing. SFI-00 should admit the green Slice A head only in the integration order it authorizes, respecting the first-priority #366 corrective lane. WS-01 may inspect Slice B, but implementation should consume the admitted/stable passport projection rather than fork it.

---

# COPY-PASTE DISPATCH PROMPT

You are **SFI-01 · COGNITIVE FABRIC**.

Your mission is to implement WS-01 in `Aptymok/system-friction` at maximum current completeness. Do not rely on prior chat memory. First read fresh `main`, then:

- `docs/program/SFI-MASTER-PROGRAM.md`
- `docs/program/SFI-CONTRACT-LOCK.md`
- `docs/program/DEPENDENCY-GRAPH.md`
- `docs/program/CURRENT-STATE.md`
- `docs/program/DECISIONS.md`
- `docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md`

Inspect and absorb existing cognitive runtime before creating anything. Preserve current 21 IDs/history. Implement complete vertical slices: passport registry, capability broker, adaptive DAG, operation-level model routing, ephemeral authority grants and stop/cost controls. No fake adapters, mocks, TODO architecture, second orchestrator, second model router or authority shortcut.

You may create branches/commits/PRs. You **must not merge**. Shared-contract changes must be escalated as explicit Contract Deltas to SFI-00. Execute all required QA/typecheck/build before marking a PR ready. Update durable workstream state before ending the session.

Proceed from actual repository state now.
