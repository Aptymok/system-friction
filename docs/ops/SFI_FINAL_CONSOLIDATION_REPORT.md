# SFI Final Consolidation Report

CONSERVAR: This report closes the audit only; it does not introduce features, redesign UI, expand scope, or invent architecture.

## 1. What is real.

| Classification | Object or surface | DB status | Evidence |
| --- | --- | --- | --- |
| CONSERVAR | `action_proposals` | CONFIRMED_IN_DB | Compact inventory, exported operational contract, perturbation API, execution preparation API. |
| CONSERVAR | `sfi_execution_ledger` | CONFIRMED_IN_DB | Exported operational contract and outcome/prepare-execution APIs. |
| CONSERVAR | `sfi_outcomes` | CONFIRMED_IN_DB | Exported operational contract and record-outcome API. |
| CONSERVAR | `sfi_declared_attractors` | CONFIRMED_IN_DB | Exported operational contract and operational console reader. |
| CONSERVAR | `sfi_amv_memory` | CONFIRMED_IN_DB | Compact inventory and exported operational contract. |
| CONSERVAR | `vw_sfi_closed_loop_state` | CONFIRMED_IN_DB | Exported operational contract and operational console reader. |
| CONSERVAR | `vw_sfi_operational_cycle` | CONFIRMED_IN_DB | Exported operational contract and operational console reader. |
| CONSERVAR | `vw_sfi_stability` | CONFIRMED_IN_DB | Exported operational contract and operational console reader. |
| CONSERVAR | `vw_sfi_pipeline_loss` | CONFIRMED_IN_DB | Exported operational contract and operational console reader. |
| CONSERVAR | `vw_sfi_execution_recovery_queue` | CONFIRMED_IN_DB | Exported operational contract and prepare-execution API. |
| CONSERVAR | `vw_sfi_evidence_map` | CONFIRMED_IN_DB | Exported operational contract and operational console reader. |
| CONSERVAR | `vw_sfi_attractor_alignment_queue` | CONFIRMED_IN_DB | Exported operational contract and operational console reader. |
| CONSERVAR | `scorefriction_observations` | CONFIRMED_IN_DB | Compact inventory, schema inventory, observe API. |
| CONSERVAR | `scorefriction_vectors` | CONFIRMED_IN_DB | Compact inventory, schema inventory, ScoreFriction state connector. |
| CORREGIR | `scorefriction_evidence` | REFERENCED_NOT_LOCALIZED | Migration header and DB verify reference exist; compact table evidence was not localized in this audit. |
| CONSERVAR | `scorefriction_proposal_verifications` | CONFIRMED_IN_DB | Compact inventory and verify API. |
| CONSERVAR | `worldspect_snapshots` | CONFIRMED_IN_DB | Compact inventory, WorldSpect snapshot store, WorldSpect runtime APIs. |
| CONSERVAR | HOME `/` | RUNTIME_CONFIRMED | App route and navigation evidence. |
| CONSERVAR | SFI Console `/sfi-console` | RUNTIME_CONFIRMED | Route, client fetch to `/api/sfi/operational-state`, build output. |
| CONSERVAR | ROOT `/root` | RUNTIME_CONFIRMED_AUTH_GATED | Route exists and `/api/root/state` enforces ROOT actor permission. |
| CONSERVAR | ScoreFriction `/scorefriction` | RUNTIME_CONFIRMED | Route and canonical observe/evaluate/propose/verify APIs. |
| CONSERVAR | WorldSpect runtime | RUNTIME_CONFIRMED | WorldSpect state/vector APIs, source registry, vector aggregator. |
| CONSERVAR | AMV runtime | RUNTIME_CONFIRMED | AMV state API passed runtime QA. |

## 2. What is operational.

| Classification | Operational item | Evidence |
| --- | --- | --- |
| CONSERVAR | Typecheck is operational | `npm run typecheck` passed. |
| CONSERVAR | Build is operational | `npm run build` passed and produced 103 static pages. |
| CONSERVAR | Runtime preflight is operational | `npm run preflight:runtime` passed with 16 checks. |
| CONSERVAR | Route audit is operational | `npm run audit:routes` passed. |
| CONSERVAR | Dead component audit is operational | `npm run audit:dead-components` passed. |
| CONSERVAR | ScoreFriction state is operational | `npm run qa:sfi-runtime` and `npm run qa:sfi-convergence` reported OK state. |
| CONSERVAR | WorldSpect state and vector are operational | Runtime QA reported OK with explicit latest-null detections. |
| CONSERVAR | AMV state is operational | Runtime QA reported `/api/amv/state` OK. |
| CONSERVAR | Graph SFI profile is operational | Convergence QA reported `/api/graph/state?profile=sfi` OK. |
| CONSERVAR | SFI events endpoint is operational with fallback | Runtime QA reported `/api/sfi/events` OK and fallback state. |
| CONSERVAR | Public generated SFI export quarantine is operational | `public/generated/sfi` contains 0 files. |

## 3. What is degraded.

| Classification | Degraded item | Evidence |
| --- | --- | --- |
| CORREGIR | SFI operational state is degraded | `npm run qa:sfi-runtime` and `npm run qa:sfi-convergence` reported `/api/sfi/operational-state` DEGRADED. |
| CORREGIR | Closed loop validation is PARTIAL | Code path exists from proposal to ledger to outcome to view, but live DB verification failed. |
| CORREGIR | `scorefriction_evidence` is referenced but not localized as a confirmed table in compact inventory evidence | Migration header and DB verify reference exist without localized compact table confirmation. |
| CORREGIR | `audits` is active legacy dependency with incomplete current DB localization | endpoints and agent references exist; migration-only evidence exists. |
| CORREGIR | `external_reality_weights` is active legacy dependency without localized DB evidence | agent and admin endpoint references exist. |
| CORREGIR | `systemic_patterns` is active legacy dependency without localized DB evidence | pattern engine and ingest endpoint references exist. |

## 4. What is blocked.

| Classification | Blocked item | Evidence |
| --- | --- | --- |
| BLOQUEADO POR DEPENDENCIA EXTERNA | Live Supabase DB verification | `npm run db:verify:sfi` failed with `TypeError: fetch failed` for all checked objects. |
| BLOQUEADO POR DEPENDENCIA EXTERNA | Authenticated ROOT state verification | QA reports `/api/root/state` BLOCKED/auth required without ROOT actor session. |
| BLOQUEADO POR DEPENDENCIA EXTERNA | Live full-cycle persistence proof | Proposal, ledger, outcome, and view code exists, but DB verify cannot confirm live persistence. |
| BLOQUEADO POR DEPENDENCIA EXTERNA | Direct object status for DB verify targets | `logbook_visible`, `epistemic_events`, `worldspect_snapshots`, `scorefriction_evidence`, `scorefriction_observations`, `graph_nodes`, `graph_edges`, and `amv_learning` returned fetch failure in DB verify output. |

## 5. What should be removed.

| Classification | Target | Final status | Evidence |
| --- | --- | --- | --- |
| OCULTAR COMO INFRAESTRUCTURA | `audits` consumers | CREATE_MIGRATION_REQUIRED | Active runtime usage and migration-only evidence exist; current compact DB evidence was not localized. |
| OCULTAR COMO INFRAESTRUCTURA | `external_reality_weights` consumers | CREATE_MIGRATION_REQUIRED | Active agent/admin endpoint usage exists without localized DB evidence. |
| OCULTAR COMO INFRAESTRUCTURA | `systemic_patterns` consumers | CREATE_MIGRATION_REQUIRED | Active pattern engine/admin endpoint usage exists without localized DB evidence. |
| OCULTAR COMO INFRAESTRUCTURA | `apps/*` runtime alternatives | KEEP_AS_INFRASTRUCTURE | `src/app` is the runtime surface and no active app runtime proof overrides it in this audit. |
| BORRAR | public generated SFI dumps from public runtime surface | REMOVED_FROM_PUBLIC_SURFACE | Generated SFI public files were quarantined and `public/generated/sfi` now contains 0 files. |
| CORREGIR | unreferenced component candidates | REVIEW_BEFORE_DELETE | Dead component audit reports 40 unreferenced candidates; deletion requires consumer confirmation. |

## 6. What should be implemented next.

| Classification | Description | Impact | Risk | Estimated effort |
| --- | --- | --- | --- | --- |
| CORREGIR | Restore Supabase DB verification by fixing the fetch/TLS/environment blocker. | Enables live truth checks for every operational table and view. | Critical if unresolved because DB reality remains unverifiable. | Small to medium. |
| CORREGIR | Confirm or migrate `scorefriction_evidence` after DB connectivity is restored. | Closes ScoreFriction evidence localization. | Medium because verification flow references it. | Small. |
| CORREGIR | Decide the canonical future of `audits`, `external_reality_weights`, and `systemic_patterns` after live DB verification. | Removes legacy ambiguity. | High because active endpoints and agents reference them. | Medium. |
| CORREGIR | Run authenticated ROOT QA with a valid ROOT actor session. | Proves governance runtime beyond auth boundary. | Critical because ROOT is a canonical observatory. | Small. |
| IMPLEMENTAR | Produce one live closed-loop fixture only after DB verification passes. | Confirms proposal to ledger to outcome to view to console. | Critical because closed loop is the main maturity gate. | Medium. |
| CORREGIR | Convert unresolved legacy consumers either to canonical tables or infrastructure-only boundaries. | Reduces runtime ambiguity. | Medium because accidental deletion could break legacy endpoints. | Medium. |
| CORREGIR | Add a regression gate that fails on public generated dumps returning to `public/generated/sfi`. | Keeps public surface clean. | Low. | Small. |
| CORREGIR | Re-run dead component audit after route/API closure and delete only confirmed dead components. | Reduces repo surface without breaking hidden consumers. | Medium. | Medium. |

## 7. Final system maturity assessment.

| Classification | Assessment |
| --- | --- |
| CONSERVAR | Repository maturity is operational-partial: build, typecheck, route audit, runtime preflight, SFI runtime QA, and convergence QA pass. |
| CORREGIR | Runtime maturity is degraded at the SFI operational-state layer because the console-facing state endpoint reports degraded status. |
| BLOQUEADO POR DEPENDENCIA EXTERNA | Database maturity cannot be declared complete because live DB verification is blocked by Supabase fetch failure. |
| CORREGIR | Closed-loop maturity is partial because the code path exists but live persistence and view confirmation are blocked. |
| CONSERVAR | Public-surface maturity improved because generated SFI exports are no longer exposed in `public/generated/sfi`. |

## 8. Final architecture sentence.

CONSERVAR: SFI is currently a buildable Next.js operational observatory whose canonical runtime is `src/app`, organized around Institute, SFI Console, ROOT, ScoreFriction, WorldSpect, AMV, and a partial closed loop from proposal to execution ledger to outcome, with operational APIs and QA evidence present but final live maturity blocked by Supabase verification and authenticated ROOT proof.
