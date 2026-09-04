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

**State:** `QA_PASS / PR_OPEN / REVIEW_FINDINGS_ABSORBED`  
**Slice:** Cognitive Passport contract projection + validation  
**Base SHA:** `1bd890c8a2ec784ad87d73eac6d19a294e050543`  
**Branch:** `ws01/cognitive-passport-registry`  
**PR:** `#367`

### Fresh continuation reconstruction

Fresh `main` remains `1bd890c8a2ec784ad87d73eac6d19a294e050543`; the branch is ahead and not behind. PR `#367` remains open and unmerged. No Slice B implementation is authorized while Slice A remains outside `main`.

The continuation review identified an existing passport owner that the initial Slice A preflight had not absorbed: `src/lib/sfi/cognitive-runtime/agentPassports.ts`, which already projects `SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY` as `SFI-AGENT-PASSPORT-1.2` for ROOT/Studio consumers.

The corrected ownership model is therefore:

- `SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY`: sole cognitive execution/agent registry;
- `agentPassports.ts`: sole runtime passport projection owner;
- `cognitivePassportRegistry.ts`: pure `SFI-COGNITIVE-PASSPORT-1.0` projector/validator attached to the existing passport owner, not an independent registry;
- `executionContracts.ts`: authoritative per-agent execution output/epistemic constraints;
- `MetaOrchestratorAgent`: sole cognitive orchestrator;
- `src/lib/ai/providerRouter.ts`: model/provider routing owner;
- existing task-graph implementation: task-graph owner;
- `epistemic_events`: transversal lineage/event owner.

No second agent registry, passport owner, orchestrator, model router, event universe, task graph or persistence writer remains in Slice A.

### Review findings corrected

Four post-implementation review findings were treated as real integration defects and corrected without expanding scope:

1. **P1 — duplicate passport owner:** the independent `SFI_COGNITIVE_PASSPORT_REGISTRY`/lookup owner was removed. `agentPassports.ts` now carries the cognitive contract projection as `cognitiveContract` for cognitive-runtime passports.
2. **P1 — EvidenceHunter epistemic boundary:** passport outputs now derive from `executionContractForAgent()` rather than coarse runtime layer. `evidence_hunter` cannot inherit `OBSERVATION`; its allowed outputs remain `INFERENCE`, `RECOMMENDATION`, `NOT_EXECUTED`.
3. **P1 — reality calibration RETURN:** `reality_calibration` now requires `RETURN` in `input.requiredEvidenceClasses`. This is an input evidence precondition and remains distinct from a future RETURN obligation.
4. **P2 — human confirmation validation:** `validateCognitivePassportAgainstSource()` rejects a passport that weakens `source.humanApprovalRequired`, with deterministic `CONFIRMATION_REQUIREMENT_MISMATCH` output.

### Implemented Slice A boundary

- frozen `SFI-COGNITIVE-PASSPORT-1.0` shape projected for all 21 historical runtime IDs;
- exact preservation of historical IDs;
- deterministic passport/source validation;
- output classes derived from existing execution contracts;
- conservative authority ceilings limited to `READ` / `RECOMMEND`;
- zero tool authority minted by passports;
- adaptive capability requests explicitly disabled until Slice B;
- provider/model-independent operation requirements metadata under the existing provider-router owner;
- RETURN/security/orchestration fields from the frozen contract;
- no capability grant semantics added;
- no external execution authority added.

### Persistence / events / routes

- migrations: none;
- tables: none;
- events added: none;
- routes added: none;
- direct SQL: none;
- new writer: none.

### Contract delta

None. The frozen contract is absorbable without fork.

### QA closure before this documentation-only handoff commit

Implementation HEAD `09056ad0070299b6557fef2ad228445c4ed931e7` completed `SFI Verify` run `33908757173` successfully in the primary `Verify SFI boundaries and build` job. Observed PASS includes:

- verify parallel topology;
- domain boundaries;
- canonical architecture preflight;
- institutional contracts;
- cognitive agent convergence / 21 IDs;
- `SFI cognitive passport registry` gate;
- AI governance/autonomous runtime;
- ROOT/runtime checks;
- Studio cognitive/runtime checks;
- runtime read-plane stability;
- universal closure RETURN fallback;
- typecheck;
- full build.

This workstream edit is documentation-only and moves the PR HEAD after the implementation QA above. SFI-00 must integrate only after the final PR HEAD's CI is observed green as well.

### Known defects / dependencies

- no remaining Slice A implementation defect is established after the four review corrections and successful implementation QA;
- Netlify preview status is not used as a substitute for canonical SFI Verify; Vercel preview had independently reported ready on the earlier head;
- baseline issue `#366` remains outside WS-01 ownership and under WS-03/WS-08 sequencing;
- SFI-00 remains sole merge/integration authority;
- Slice B remains blocked while `#367` is open; it must start only from a `main` containing admitted Slice A.

### Next safe action

Leave `#367` unmerged. Observe all CI on the final documentation-adjusted HEAD. If green and no new review finding appears, hand the PR to SFI-00 as integration-ready. Do not implement the Governed Capability Request Broker until Slice A is integrated into `main` or SFI-00 explicitly establishes an admitted stable dependency base.

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
