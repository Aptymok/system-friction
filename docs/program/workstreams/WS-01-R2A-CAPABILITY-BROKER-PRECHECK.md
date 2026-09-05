# WS-01 · R2-A · GOVERNED CAPABILITY BROKER PRECHECK

**Baseline:** `e1a84552049e6507db7057f6bc4dd765947a1ddf`  
**Branch:** `ws01/governed-capability-broker`  
**Slice:** B only — `SFI-CAPABILITY-REQUEST-1.0` governed admission and lineage.  
**Integration authority:** SFI-00.  
**Self-merge:** forbidden.

## Owners reused

- cognitive orchestrator: existing `MetaOrchestratorAgent`;
- cognitive agent registry: existing `SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY`;
- runtime passport owner: existing `agentPassports.ts` with `cognitivePassportRegistry.ts` as pure projector/validator;
- execution output/source contract: existing `executionContracts.ts`;
- model/provider routing: existing `src/lib/ai/providerRouter.ts` and canonical model-requirements owner;
- task graph: existing `taskGraphBuilder.ts`; Slice B does not mutate graph topology;
- execution: existing `runCognitiveAgent()` / `SFI_AGENT_EXECUTION_MAP`;
- AI authority/governance: existing `aiGovernancePolicy.ts`;
- event/lineage store: existing `epistemic_events` through `appendEpistemicEvent()`;
- checkpoints and RETURN: existing cognitive-cycle checkpoint and Universal RETURN owners.

No second orchestrator, agent registry, passport owner, model router, task graph, event store or authority engine is introduced.

## Persistence decision

No migration is required for Slice B.

`epistemic_events` already provides the transversal append-only lineage owner, logbook scoping, event IDs, hash chaining and durable payload storage needed for bounded capability requests/dispositions. Creating `sfi_capability_requests` now would duplicate a function the current lineage owner can absorb.

Therefore:

- new tables: none;
- migrations: none;
- direct SQL: none;
- RLS change: none;
- browser/model service credential: none.

Rollback is code-only: remove the Slice-B runtime/broker projection and CI gate; no schema/data rollback is required. Existing capability lineage events remain historical facts and are not silently deleted.

## Authority boundary

```text
CAPABILITY_REQUEST != AUTHORIZATION
```

A canonical passport may declare bounded permission to request another canonical cognitive capability. That declaration grants no tool, provider, external, CANON or execution authority.

Only the governed broker may return `ADMIT`. Only `ADMIT` permits delegation to the existing runtime executor. Every other disposition is non-executing.

Slice B creates no ephemeral grants and does not implement Slice C, D, E or general Slice-F controls. The only new bounds are the request depth/children/invocation limits strictly necessary to prevent recursive request amplification.

## Events / lineage

Canonical shared events reused:

- `SFI_CAPABILITY_REQUESTED`;
- `SFI_CAPABILITY_ADMITTED`;
- `SFI_CAPABILITY_DENIED`;
- `SFI_CAPABILITY_DEFERRED`.

`HUMAN_AUTHORITY_REQUIRED`, `EVIDENCE_REQUIRED` and `ALREADY_SATISFIED` remain exact dispositions inside the governed disposition event payload; no parallel event universe is created.

The existing `SFI_AGENT_EXECUTED` / `SFI_AGENT_SKIPPED` runtime event remains the execution receipt after an admitted request.

## Explicit exclusions

Not implemented in this PR:

- Adaptive Task Graph / Slice C;
- operation-level model broker / Slice D;
- ephemeral capability grants / Slice E;
- general stop/cost controls / Slice F;
- external adapters;
- MCP;
- Twin;
- audio;
- new ROOT powers;
- external execution authority;
- CANON authority.

## Contract disposition

Frozen contracts are absorbed as written. Proposed contract delta: `NONE`.
