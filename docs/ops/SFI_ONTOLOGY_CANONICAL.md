# SFI Canonical Ontology

CONSERVAR: This ontology is extracted from repository evidence only: Supabase inventories, runtime code under `src/app` and `src/lib`, QA reports, and the exported operational contract.

## Entities

| Classification | Entity | Evidence | Operational meaning |
| --- | --- | --- | --- |
| CONSERVAR | `action_proposals` | `supabase_inventory_compact.txt`; SFI perturbation and execution APIs | Proposal object that can enter the operational loop. |
| CONSERVAR | `sfi_execution_ledger` | `docs/ops/SUPABASE_OPERATIONAL_CONTRACT_2026-06-19.md`; `/api/sfi/recovery-queue/[id]/prepare-execution` | Execution record for accepted or queued proposals. |
| CONSERVAR | `sfi_outcomes` | `docs/ops/SUPABASE_OPERATIONAL_CONTRACT_2026-06-19.md`; `/api/sfi/execution/[id]/record-outcome` | Observed result of an execution. |
| CONSERVAR | `sfi_lessons` | `/api/sfi/execution/[id]/record-outcome` | Lesson derived from an observed outcome. |
| CONSERVAR | `sfi_field_perturbations` | `/api/sfi/perturbations` | Declared field intervention that can generate a proposal. |
| CONSERVAR | `epistemic_events` | `epistemic_events_schema.txt`; `/api/sfi/perturbations`; `/api/sfi/events` | Canonical event stream for operational evidence. |
| CONSERVAR | `sfi_declared_attractors` | exported operational contract; `readOperationalConsoleState` | Declared target state for alignment. |
| CONSERVAR | `sfi_proposal_alignment` | exported operational contract; attractor alignment views | Link between proposals and declared attractors. |
| CONSERVAR | `sfi_amv_memory` | `supabase_inventory_compact.txt`; exported operational contract | Longitudinal AMV memory object. |
| CONSERVAR | `scorefriction_observations` | `scorefriction_schema.txt`; `/api/scorefriction/observe` | Cultural signal observation. |
| CONSERVAR | `scorefriction_vectors` | `scorefriction_schema.txt`; ScoreFriction state connector | Vectorized ScoreFriction observation state. |
| CONSERVAR | `scorefriction_evidence` | migration header and verification script reference | Evidence object referenced by ScoreFriction verification flow. |
| CONSERVAR | `scorefriction_proposal_verifications` | `supabase_inventory_compact.txt`; `/api/scorefriction/verify` | Verification outcome for a ScoreFriction proposal. |
| CONSERVAR | `worldspect_snapshots` | `supabase_inventory_compact.txt`; WorldSpect snapshot store | External regime snapshot. |
| CONSERVAR | WorldSpect vector domain | `src/lib/worldspect/source-registry.ts`; `src/lib/worldspect/vector-aggregator.ts` | Domain-level external signal vector. |
| CONSERVAR | ROOT actor/profile/audit state | `/api/root/state`; ROOT auth helpers | Governance and control boundary. |
| CONSERVAR | graph nodes and graph edges | graph state APIs and QA runtime checks | Runtime graph projection. |
| CONSERVAR | logbook visible state | DB verify script and runtime QA contract | Visible operational log stream. |
| OCULTAR COMO INFRAESTRUCTURA | `audits` | legacy endpoints, terminal store, migration-only evidence | Historical audit surface outside the canonical SFI loop until DB status is confirmed. |
| OCULTAR COMO INFRAESTRUCTURA | `external_reality_weights` | `GlobalLearningAgent`; admin EWR reset endpoint | Legacy external weighting surface without localized DB inventory evidence. |
| OCULTAR COMO INFRAESTRUCTURA | `systemic_patterns` | pattern engine and ingest-patterns endpoint | Legacy pattern ingestion surface without localized DB inventory evidence. |

## Relations

| Classification | Relation | Evidence |
| --- | --- | --- |
| CONSERVAR | `epistemic_events` produces `sfi_field_perturbations` | `/api/sfi/perturbations` creates both records. |
| CONSERVAR | `sfi_field_perturbations` produces `action_proposals` | `/api/sfi/perturbations` inserts a proposal after perturbation creation. |
| CONSERVAR | `action_proposals` enter `sfi_execution_ledger` | `/api/sfi/recovery-queue/[id]/prepare-execution` inserts ledger rows and updates proposal status. |
| CONSERVAR | `sfi_execution_ledger` produces `sfi_outcomes` | `/api/sfi/execution/[id]/record-outcome` inserts outcomes by execution id. |
| CONSERVAR | `sfi_outcomes` produce `sfi_lessons` | `/api/sfi/execution/[id]/record-outcome` inserts lessons after outcome persistence. |
| CONSERVAR | `sfi_declared_attractors` align with `action_proposals` | exported contract and attractor alignment queue views. |
| CONSERVAR | `scorefriction_observations` produce `scorefriction_vectors` | ScoreFriction schema and state connector. |
| CONSERVAR | ScoreFriction proposals produce `scorefriction_proposal_verifications` | `/api/scorefriction/propose` and `/api/scorefriction/verify`. |
| CONSERVAR | WorldSpect source observations aggregate into `worldspect_snapshots` | WorldSpect source registry, vector aggregator, and snapshot store. |
| CONSERVAR | `vw_sfi_closed_loop_state` reads proposal, ledger, and outcome state | exported operational contract and `readOperationalConsoleState`. |

## Events

| Classification | Event | Evidence |
| --- | --- | --- |
| CONSERVAR | `sfi.perturbation.declared` | `/api/sfi/perturbations`. |
| CONSERVAR | ScoreFriction observation event | `/api/scorefriction/observe`; ScoreFriction state connector. |
| CONSERVAR | ScoreFriction evaluation event | `/api/scorefriction/evaluate`. |
| CONSERVAR | ScoreFriction proposal verification event | `/api/scorefriction/verify`. |
| CONSERVAR | SFI operational event | `/api/sfi/events`; `src/lib/sfi/operational/events.ts`. |
| CONSERVAR | WorldSpect snapshot/vector update | WorldSpect state and vector APIs. |
| CONSERVAR | ROOT state read event | `/api/root/state` guarded by ROOT actor permission. |

## State Transitions

| Classification | Transition | Evidence |
| --- | --- | --- |
| CONSERVAR | Proposal created to queued | `/api/sfi/recovery-queue/[id]/prepare-execution` updates `action_proposals.status` to `queued`. |
| CONSERVAR | Ledger pending to outcome recorded | `/api/sfi/execution/[id]/record-outcome` updates ledger status to `outcome_recorded`. |
| CONSERVAR | Execution verification unobserved to observed | `/api/sfi/execution/[id]/record-outcome` updates ledger verification to `observed`. |
| CONSERVAR | ScoreFriction observe to evaluate to propose to verify | `/api/scorefriction/observe`, `/evaluate`, `/propose`, `/verify`. |
| CONSERVAR | WorldSpect unavailable to degraded or active | QA runtime reports and WorldSpect operational state APIs. |
| CONSERVAR | ROOT unauthenticated to authorized state read | `/api/root/state` returns auth boundary under QA without ROOT actor session. |
