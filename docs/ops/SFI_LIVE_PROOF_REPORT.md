# SFI Live Proof Report

## 1. Executive verdict

CORREGIR: SFI reached live database proof and live closed-loop proof under the explicit local TLS diagnostic gate `SFI_ALLOW_INSECURE_LOCAL_TLS=true`.

BLOQUEADO POR DEPENDENCIA EXTERNA: SFI is not declared `SFI_LIVE_PROVEN` because authenticated ROOT proof could not be executed without a valid ROOT Supabase session cookie.

CONSERVAR: The live proof fixture is retained in Supabase as audit evidence with `case_id=SFI_LIVE_PROOF_2026-06-20T04-54-44-753Z`.

CONSERVAR: Cleanup is available but was not executed: `node scripts/db/cleanup-sfi-live-proof.mjs SFI_LIVE_PROOF_2026-06-20T04-54-44-753Z`.

## 2. Supabase connectivity result

CORREGIR: `scripts/db/sfi-db-client.mjs` now loads `.env.local` before validation, normalizes the Supabase URL to `origin`, and classifies DB failures as TLS, credentials, network, schema_missing, permissions, or unknown.

CORREGIR: `npm run db:verify:sfi` without the local TLS gate reached deterministic failure classification: `FETCH_BLOCKED`, category `network`, detail `TypeError: fetch failed`.

CONSERVAR: `SFI_ALLOW_INSECURE_LOCAL_TLS=true npm run db:verify:sfi` reached Supabase and returned `ok: true`.

CORREGIR: TLS risk is explicit: `SFI_ALLOW_INSECURE_LOCAL_TLS=true` disables certificate verification only for the Node process and must remain local diagnostics only.

CONSERVAR: Latest passing DB proof artifact: `docs/db/SFI_DB_VERIFY_2026-06-20T05-00-05-845Z.json`.

## 3. Confirmed DB objects

| Classification | Object | Status | Count |
| --- | --- | --- | --- |
| CONSERVAR | `action_proposals` | CONFIRMED_IN_DB | 29 |
| CONSERVAR | `sfi_execution_ledger` | CONFIRMED_IN_DB | 23 |
| CONSERVAR | `sfi_outcomes` | CONFIRMED_IN_DB | 1 |
| CONSERVAR | `sfi_declared_attractors` | CONFIRMED_IN_DB | 0 |
| CONSERVAR | `sfi_amv_memory` | CONFIRMED_IN_DB | 0 |
| CONSERVAR | `vw_sfi_closed_loop_state` | CONFIRMED_IN_DB | 1 |
| CONSERVAR | `vw_sfi_operational_cycle` | CONFIRMED_IN_DB | 1 |
| CONSERVAR | `vw_sfi_stability` | CONFIRMED_IN_DB | 1 |
| CONSERVAR | `vw_sfi_pipeline_loss` | CONFIRMED_IN_DB | 1 |
| CONSERVAR | `vw_sfi_execution_recovery_queue` | CONFIRMED_IN_DB | 15 |
| CONSERVAR | `vw_sfi_evidence_map` | CONFIRMED_IN_DB | 3 |
| CONSERVAR | `vw_sfi_attractor_alignment_queue` | CONFIRMED_IN_DB | 13 |
| CONSERVAR | `worldspect_snapshots` | CONFIRMED_IN_DB | 25 |
| CONSERVAR | `scorefriction_observations` | CONFIRMED_IN_DB | 8 |
| CONSERVAR | `scorefriction_vectors` | CONFIRMED_IN_DB | 8 |
| CONSERVAR | `scorefriction_evidence` | CONFIRMED_IN_DB | 0 |
| CONSERVAR | `scorefriction_proposal_verifications` | CONFIRMED_IN_DB | 0 |

## 4. Missing or blocked DB objects

CONSERVAR: No canonical SFI object in the requested verification list is missing after the local TLS gate is applied.

CONSERVAR: No canonical SFI object in the requested verification list is permission-blocked after the local TLS gate is applied.

CORREGIR: Without the local TLS diagnostic gate, all objects are `FETCH_BLOCKED` by network/fetch failure from this workstation.

## 5. Closed-loop fixture result

CONSERVAR: The live fixture completed successfully and wrote test-safe data only.

| Classification | Step | Result | Evidence |
| --- | --- | --- | --- |
| CONSERVAR | perturbation | PASS | `sfi_field_perturbations.id=4a0ce11d-dec7-4d04-9617-d2a4bf2c5122` |
| CONSERVAR | action_proposal | PASS | `action_proposals.id=1c7bc029-6ab1-461b-b33e-5b87928fae3a`, status `queued` |
| CONSERVAR | sfi_execution_ledger | PASS | `sfi_execution_ledger.id=a9912b6d-0e18-46a1-b696-80bd3b72a755`, status `outcome_recorded` |
| CONSERVAR | sfi_outcomes | PASS | `sfi_outcomes.id=09462e67-886a-48ca-b1cd-79a61f948688`, status `recorded` |
| CONSERVAR | `vw_sfi_closed_loop_state` | PASS | view returned `closed_loop_ratio=0.0588`, bottleneck `execution_to_outcome` |
| CONSERVAR | `/api/sfi/operational-state` | PASS | HTTP 200, `closedLoop.source=vw_sfi_closed_loop_state` |
| CONSERVAR | `/sfi-console` | PASS | HTTP 200, HTML contains SFI Console operational surface |

CONSERVAR: Live fixture artifact: `docs/db/SFI_LIVE_PROOF_2026-06-20T04-54-44-753Z.json`.

CONSERVAR: Live surface artifact: `docs/db/SFI_LIVE_SURFACE_PROOF_2026-06-20T04-58-56-530Z.json`.

## 6. ROOT authorized proof result

CONSERVAR: Unauthenticated ROOT proof passed: `/api/root/state` returned HTTP 401 with `{ ok:false, error:"Unauthorized" }`.

BLOQUEADO POR DEPENDENCIA EXTERNA: Authenticated ROOT proof is `BLOCKED_BY_AUTH_FIXTURE`.

BLOQUEADO POR DEPENDENCIA EXTERNA: Required credential/session is `SFI_ROOT_COOKIE_HEADER` containing a valid authenticated Supabase cookie header for a user whose profile role is `root` or `system`, or whose email matches `SYSTEM_ROOT_EMAIL`.

NO LOCALIZADO: No valid ROOT auth cookie or password fixture was present in `.env.local`; no authenticated ROOT state was faked.

## 7. Legacy table decisions

| Classification | Object | DB status | Count | Decision |
| --- | --- | --- | --- | --- |
| OCULTAR COMO INFRAESTRUCTURA | `audits` | CONFIRMED_IN_DB | 0 | KEEP_AS_INFRASTRUCTURE |
| OCULTAR COMO INFRAESTRUCTURA | `external_reality_weights` | CONFIRMED_IN_DB | 0 | KEEP_AS_INFRASTRUCTURE |
| OCULTAR COMO INFRAESTRUCTURA | `systemic_patterns` | CONFIRMED_IN_DB | 0 | KEEP_AS_INFRASTRUCTURE |

OCULTAR COMO INFRAESTRUCTURA: These tables are confirmed in DB but remain outside the canonical SFI live proof path.

BORRAR: No deletion was performed because live proof passed but authenticated ROOT proof remains blocked.

## 8. QA command results

| Classification | Command | Result |
| --- | --- | --- |
| CONSERVAR | `npm run typecheck` | PASS |
| CONSERVAR | `npm run build` | PASS |
| CONSERVAR | `npm run audit:routes` | PASS |
| CONSERVAR | `npm run audit:dead-components` | PASS |
| CONSERVAR | `npm run preflight:runtime` | PASS, `ok:true`, status `ACTIVE`, 16 checks |
| CONSERVAR | `npm run qa:sfi-runtime` | PASS, `/api/sfi/operational-state` OK and `/api/root/state` auth-blocked |
| CONSERVAR | `npm run qa:sfi-convergence` | PASS, `/api/sfi/operational-state` OK and `/api/root/state` auth-blocked |
| CONSERVAR | `npm run db:verify:sfi` with `SFI_ALLOW_INSECURE_LOCAL_TLS=true` | PASS |
| CORREGIR | `npm run db:verify:sfi` without `SFI_ALLOW_INSECURE_LOCAL_TLS=true` | FAIL, deterministic `FETCH_BLOCKED` network/fetch classification |
| CONSERVAR | `git diff --check` | PASS with CRLF warnings only |

## 9. Remaining blockers

BLOQUEADO POR DEPENDENCIA EXTERNA: Authenticated ROOT state cannot be proven until a valid ROOT Supabase session cookie is supplied through `SFI_ROOT_COOKIE_HEADER`.

CORREGIR: Local TLS trust chain must be fixed so Supabase verification passes without `SFI_ALLOW_INSECURE_LOCAL_TLS=true`.

CORREGIR: `sfi_declared_attractors`, `sfi_amv_memory`, `scorefriction_evidence`, and `scorefriction_proposal_verifications` are confirmed objects but currently have zero rows in the live DB verification.

CORREGIR: The closed-loop view is alive but reports bottleneck `execution_to_outcome`, proving the system is operational but still imbalanced.

## 10. Final maturity sentence

SFI_BLOCKED_BY_AUTH: SFI has live Supabase object proof, live closed-loop fixture proof, live `/api/sfi/operational-state` proof, and live `/sfi-console` proof, but final live maturity remains blocked until an authenticated ROOT actor session proves `/api/root/state` beyond the confirmed unauthenticated 401 boundary.
