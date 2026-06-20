# SFI Decision Model

CONSERVAR: This model lists decision points already present in repository routes, APIs, libraries, inventories, and QA reports.

| Classification | Decision name | Inputs | Evidence required | Outputs | Risk |
| --- | --- | --- | --- | --- | --- |
| CONSERVAR | Declare perturbation | title, intention, desired future state, expected evidence, optional actor | valid request body and epistemic event persistence | `epistemic_events`, `sfi_field_perturbations`, `action_proposals` | High: starts the closed loop. |
| CONSERVAR | Prepare execution | recovery queue item id, case objective, expected evidence, actor | `vw_sfi_execution_recovery_queue` row and matching proposal context | `sfi_execution_ledger` row and proposal status `queued` | High: converts proposal into execution state. |
| CONSERVAR | Record outcome | execution id, observed effect, evidence, actor | existing `sfi_execution_ledger` row | `sfi_outcomes`, `sfi_lessons`, ledger status `outcome_recorded` | High: closes or contaminates operational evidence. |
| CONSERVAR | Read closed loop state | Supabase client, operational views | `vw_sfi_closed_loop_state` and related operational views | SFI Console operational state | Critical: central runtime truth is degraded if this fails. |
| CONSERVAR | Observe ScoreFriction signal | case id, signal payload, evidence payload | valid observation payload and ScoreFriction persistence path | `scorefriction_observations` and derived state | Medium: incomplete observations weaken cultural signal. |
| CONSERVAR | Evaluate ScoreFriction observation | case id or observation input | observation context and evaluator contract | evaluation envelope | Medium: evaluator failures must remain explicit. |
| CONSERVAR | Propose ScoreFriction action | case context, observation or evaluation context | evaluated signal and proposal contract | proposal/prototype output | Medium: proposal quality depends on source evidence. |
| CONSERVAR | Verify ScoreFriction proposal | proposal id, verification payload | proposal context and verification evidence | `scorefriction_proposal_verifications` | High: verification affects action confidence. |
| CONSERVAR | Aggregate WorldSpect vector | source observations, source registry, vector aggregator | configured sources and latest observations | WorldSpect snapshot/vector state | Medium: external source failures degrade the vector. |
| CONSERVAR | Read ROOT state | authenticated ROOT actor, permission `state.read` | valid ROOT actor session and table health checks | governance state, graph runtime, table health | Critical: unauthenticated access is correctly blocked. |
| CONSERVAR | Read AMV state | scope, memory source, graph or score state | scoped AMV connector evidence | AMV memory and scoped runtime state | Medium: missing memory produces degraded longitudinal reading. |
| OCULTAR COMO INFRAESTRUCTURA | Reset external reality weights | admin request | `external_reality_weights` table availability | reset result | High: table is not localized in current inventory evidence. |
| OCULTAR COMO INFRAESTRUCTURA | Ingest systemic patterns | admin request, pattern payload | `systemic_patterns` table availability | ingested patterns | High: table is not localized in current inventory evidence. |
| OCULTAR COMO INFRAESTRUCTURA | Read legacy audits | terminal, liturgia, calendar, bootstrap, global metrics consumers | `audits` table availability | legacy audit output | High: active code exists but current DB inventory evidence is not localized. |
