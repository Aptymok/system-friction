# SFI Observability Report

CONSERVAR: This report separates measured state, observable runtime state, inferred state, and non-observable state from the current audit run.

## What Can Currently Be Observed

| Classification | Observable item | Evidence |
| --- | --- | --- |
| CONSERVAR | TypeScript correctness can be observed | `npm run typecheck` passed. |
| CONSERVAR | Production build can be observed | `npm run build` passed and generated 103 static pages. |
| CONSERVAR | Route surface can be observed | `npm run audit:routes` passed and updated `docs/audit/ROUTE_AUDIT.md`. |
| CONSERVAR | Dead component candidates can be observed | `npm run audit:dead-components` passed and reported 132 components with 40 unreferenced candidates. |
| CONSERVAR | Runtime preflight can be observed | `npm run preflight:runtime` passed with `ok:true`, `status:"ACTIVE"`, and 16 checks. |
| CONSERVAR | SFI event fallback behavior can be observed | `npm run qa:sfi-runtime` reported `/api/sfi/events` as OK with fallback state. |
| CONSERVAR | AMV API availability can be observed | `npm run qa:sfi-runtime` reported `/api/amv/state` as OK. |
| CONSERVAR | WorldSpect state and vector availability can be observed | `npm run qa:sfi-runtime` reported `/api/worldspect/state` and `/api/worldspect/vector` as OK with latest observation/vector null detections. |
| CONSERVAR | ScoreFriction state availability can be observed | `npm run qa:sfi-runtime` and `npm run qa:sfi-convergence` reported ScoreFriction state as OK. |
| CONSERVAR | Graph state availability can be observed | `npm run qa:sfi-convergence` reported `/api/graph/state?profile=sfi` as OK. |
| CONSERVAR | Public generated SFI export surface can be observed | `public/generated/sfi` contains 0 files after quarantine. |

## What Cannot Currently Be Observed

| Classification | Non-observable item | Evidence |
| --- | --- | --- |
| BLOQUEADO POR DEPENDENCIA EXTERNA | Live Supabase object existence cannot be confirmed by DB verify | `npm run db:verify:sfi` failed with `TypeError: fetch failed` for all checked objects. |
| BLOQUEADO POR DEPENDENCIA EXTERNA | Authenticated ROOT runtime state cannot be observed without ROOT actor session | QA reports `/api/root/state` as BLOCKED/auth required. |
| BLOQUEADO POR DEPENDENCIA EXTERNA | Full live proposal to ledger to outcome cycle cannot be observed in DB | DB verify failed before live persistence confirmation. |
| NO LOCALIZADO | Live availability of `audits`, `external_reality_weights`, and `systemic_patterns` is not localized in compact Supabase inventory | Search evidence found code references but not compact DB inventory confirmation. |

## What Is Inferred

| Classification | Inferred item | Evidence |
| --- | --- | --- |
| CONSERVAR | Closed loop capability is structurally present | Perturbation, execution preparation, outcome recording APIs, and `vw_sfi_closed_loop_state` reader exist. |
| CONSERVAR | SFI Console consumes operational state | `SfiConsoleClient` fetches `/api/sfi/operational-state`; operational reader queries SFI views and tables. |
| CONSERVAR | WorldSpect has a real runtime source registry | `src/lib/worldspect/source-registry.ts` and vector aggregator define source domains and aggregation. |
| CONSERVAR | ScoreFriction has a canonical API flow | `/api/scorefriction/observe`, `/evaluate`, `/propose`, and `/verify` exist. |
| CORREGIR | Legacy database dependencies are active but not confirmed in current DB inventory | code references exist for `audits`, `external_reality_weights`, and `systemic_patterns`. |

## What Is Measured

| Classification | Measured item | Result |
| --- | --- | --- |
| CONSERVAR | `npm run typecheck` | PASS. |
| CONSERVAR | `npm run build` | PASS. |
| CONSERVAR | `npm run audit:routes` | PASS. |
| CONSERVAR | `npm run audit:dead-components` | PASS. |
| CONSERVAR | `npm run preflight:runtime` | PASS. |
| CONSERVAR | `npm run qa:sfi-runtime` | PASS with degraded SFI operational state and auth-blocked ROOT state. |
| CONSERVAR | `npm run qa:sfi-convergence` | PASS with degraded SFI operational state and auth-blocked ROOT state. |
| BLOQUEADO POR DEPENDENCIA EXTERNA | `npm run db:verify:sfi` | FAIL because Supabase fetch failed for every checked object. |
