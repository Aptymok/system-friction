# CODEX CONSOLIDATION REPORT

Generated: 2026-06-20

## 1. rutas conservadas

- CONSERVAR `/`: HOME / INSTITUTO. Entrada publica institucional; navegacion principal limpiada hacia observatorios canonicos.
- CONSERVAR `/sfi-console`: SFI CONSOLE. Tablero operativo central; ahora consume `/api/sfi/operational-state`.
- CONSERVAR `/root`: ROOT. UI existente conectada a APIs reales `src/app/api/root/*`, AMV, WorldSpect y ScoreFriction; requiere auth en QA.
- CONSERVAR `/scorefriction`: SCOREFRICTION. Superficie canonica del observatorio cultural.
- CONSERVAR `/world-vector`: WORLDSPECT. Ruta runtime existente para vector externo; se conserva como alias publico disponible porque no existe `/worldspect` en `src/app`.
- CONSERVAR `/repository`: Archivo institucional.
- CONSERVAR `/moph`, `/instruments`, `/surfaces`, `/contact`: secundarias institucionales no duplican la consola.
- CONSERVAR rutas auth `/login`, `/register`, `/forgot`, `/reset`, `/setup-profile`, `/verify`, `/logout`, `/unauthorized`, `/user`.

## 2. rutas ocultas

- OCULTAR como producto final `public/generated/sfi/*`: 110 artefactos generados fueron movidos a `_sfi_exports/public-quarantine-20260620/generated-sfi`; `public/generated/sfi` queda vacio.
- OCULTAR `apps/*` como infraestructura. No hay prueba en build de que sean la superficie runtime principal.
- OCULTAR `python/scorefriction/*` como legado/infrastructura frente a `services/python/*`.
- OCULTAR rutas experimentales de observatorio que no son canonicas (`/cluster-atlas`, `/cognitive-twin-engine`, `/governance-reality`, `/signal-vane`) como secundarias/legacy, no como producto final.

## 3. rutas fusionadas

- FUSIONAR navegacion HOME hacia Instituto, SFI Console, ROOT, ScoreFriction, WorldSpect, AMV, Closed Loop / Evidencia y Archivo.
- FUSIONAR AMV en `/root`; no se creo dashboard AMV paralelo.
- FUSIONAR Closed Loop / Evidencia en `/sfi-console`; no se creo ruta nueva.
- FUSIONAR `/api/sfi/console-state` bajo `/api/sfi/operational-state` como frontera canonica, conservando el endpoint anterior como compatibilidad.

## 4. endpoints conservados

- CONSERVAR root: `/api/root/state`, `/api/root/me`, `/api/root/evidence`, `/api/root/neural-graph/live`, `/api/root/self-observability`, `/api/root/self-reconstruction/*`, `/api/root/mutations/*`.
- CONSERVAR scorefriction canonico: `/api/scorefriction/observe`, `/api/scorefriction/evaluate`, `/api/scorefriction/propose`, `/api/scorefriction/verify`, `/api/scorefriction/operational-cycle`, `/api/scorefriction/execution-state`.
- CONSERVAR worldspect: `/api/worldspect/state`, `/api/worldspect/vector`, `/api/worldspect/operational-state`, `/api/worldspect/evidence-trace`, `/api/worldspect/attractors`, `/api/worldspect/opportunities`, `/api/worldspect/ingest-payload`, `/api/cron/worldspect`.
- CONSERVAR AMV: `/api/amv/state`, `/api/amv/chat`, `/api/amv/session`, `/api/amv/memory`, `/api/amv/graph`, `/api/amv/save-reading`, `/api/amv/learning/append`.
- CONSERVAR SFI closed loop: `/api/sfi/operational-state`, `/api/sfi/events`, `/api/sfi/attractors`, `/api/sfi/perturbations`, `/api/sfi/recovery-queue/*`, `/api/sfi/proposals/*`, `/api/sfi/execution/[id]/record-outcome`, `/api/sfi/operational-snapshot`.
- CONSERVAR health/qa: `/api/system/health`, `/api/runtime/health`, `/api/sfi-engine/health`.

## 5. endpoints fusionados

- IMPLEMENTAR `/api/sfi/operational-state`: alias canonico que reutiliza `readOperationalConsoleState()` y expone `decision: IMPLEMENTAR`.
- IMPLEMENTAR `/api/sfi/events`: frontera localizada por QA y docs operativos, conectada a `src/lib/sfi/operational/events` con persistencia Supabase y fallback local existente.
- FUSIONAR `/api/sfi/console-state` como compatibilidad hacia el mismo lector de estado.
- FUSIONAR flujo ScoreFriction como observe -> evaluate -> propose -> verify; endpoints lab/media/python quedan como soporte o legacy boundary, no flujo canonico.
- FUSIONAR execution/outcome en SFI Console por `action_proposals -> sfi_execution_ledger -> sfi_outcomes`.

## 6. tablas usadas

- CONSERVAR `action_proposals`.
- CONSERVAR `sfi_execution_ledger`.
- CONSERVAR `sfi_outcomes`.
- CONSERVAR `vw_sfi_closed_loop_state`.
- CONSERVAR `vw_sfi_operational_cycle`, `vw_sfi_stability`, `vw_sfi_pipeline_loss`, `vw_sfi_execution_recovery_queue`, `vw_sfi_evidence_map`, `vw_sfi_attractor_alignment_queue`.
- CONSERVAR `vw_worldspect_real`, `vw_scorefriction_real`.
- CONSERVAR `sfi_declared_attractors`.
- CONSERVAR `sfi_amv_memory` como persistencia primaria del log operacional SFI, con fallback local en `data/sfi-operational-events.json`.
- CONSERVAR ScoreFriction tablas localizadas por inventario: `scorefriction_observations`, `scorefriction_vectors`, `scorefriction_evidence`, `scorefriction_proposal_verifications`.
- CONSERVAR WorldSpect tablas localizadas por inventario: `worldspect_snapshots`.

## 7. tablas no localizadas

- CORREGIR `audits`: existe en migracion historica `src/lib/supabase/migrations/01_full_script.sql`, pero no queda confirmada por `supabase_inventory_compact.txt` en esta auditoria.
- CORREGIR `external_reality_weights`: referida por `src/agents/GlobalLearningAgent.ts` y admin reset; no confirmada en inventario compacto.
- CORREGIR `systemic_patterns`: referida por `src/agents/patternengine.ts` y `/api/admin/ingest-patterns`; no confirmada en inventario compacto.
- CORREGIR verificacion remota: `npm run db:verify:sfi` carga `.env.local`, pero Supabase responde `TypeError: fetch failed` en esta maquina.

## 8. componentes borrados

- BORRAR de superficie publica 110 archivos bajo `public/generated/sfi/*`; preservados como evidencia en `_sfi_exports/public-quarantine-20260620/generated-sfi`.
- No se borraron componentes React en esta pasada porque `docs/audit/DEAD_SURFACES_REPORT.md` es advisory y varios no confirmados estan encadenados por imports indirectos o legacy protegido.

## 9. componentes no confirmados como muertos

- CORREGIR antes de borrar: `src/components/auth/LoginModal.tsx`, `src/components/auth/LoginNeuralAccess.tsx`, `src/components/auth/SignupModal.tsx`, `src/components/auth/WorldSpectrumModal.tsx`.
- CORREGIR antes de borrar: `src/components/worldspect/WorldSpectEvidenceTracePanel.tsx`.
- CORREGIR antes de borrar: componentes AMV no referenciados en `src/observatory/components/amv/*`.
- CORREGIR antes de borrar: componentes ROOT no referenciados como `EWRControl.tsx`, `GlobalMetricsView.tsx`, `LiturgiaDiagnosticPanel.tsx`, `NodeClusterSurface.tsx`, `OperationalActivationPanel.tsx`.
- CORREGIR antes de borrar: componentes terminal no referenciados en `src/observatory/components/terminal/*`.
- CORREGIR antes de borrar: ScoreFriction legacy UI no referenciada como `ScoreFrictionOperationalObservatory.tsx`, `ScoreFrictionShell.tsx`, `ScoreFrictionWideClient.tsx`.

## 10. comandos ejecutados

- `npm run typecheck`: PASS antes y despues de patches.
- `npm run build`: PASS antes y despues de patches.
- `npm run audit:routes`: PASS, actualizo `docs/audit/ROUTE_AUDIT.md`.
- `npm run audit:dead-components`: PASS, actualizo `docs/audit/DEAD_SURFACES_REPORT.md`.
- `npm run preflight:runtime`: inicialmente `DEGRADED_BLOCKING` por falta de `src/app/api/sfi/operational-state/route.ts`; despues PASS `ACTIVE`.
- `npm run qa:sfi-runtime`: ejecutado de nuevo tras correcciones; `/api/amv/state`, `/api/worldspect/state`, `/api/worldspect/vector`, `/api/sfi/events`, `/api/scorefriction/state` quedan OK; `/api/sfi/operational-state` queda DEGRADED honesto; `/api/root/state` queda 401 por auth.
- `npm run qa:sfi-convergence`: ejecutado con servidor local; `/api/graph/state?profile=sfi`, `/api/worldspect/state`, `/api/scorefriction/state` quedan OK; `/api/sfi/operational-state` queda DEGRADED; ROOT 401 por auth.
- `npm run db:verify:sfi`: ejecutado; ahora carga `.env.local`, pero falla por `TypeError: fetch failed`.

## 11. resultado de build/typecheck

- CONSERVAR build: `npm run build` PASS con Next.js 16.2.9.
- CONSERVAR typecheck: `npm run typecheck` PASS.
- IMPLEMENTAR preflight runtime: `npm run preflight:runtime` PASS tras crear `/api/sfi/operational-state`.
- CORREGIR degradacion operacional: `readOperationalConsoleState()` ahora aborta lecturas Supabase lentas y responde estado degradado en tiempo de QA.
- CORREGIR degradacion WorldSpect/ScoreFriction/AMV/Graph: consultas Supabase usan abortos y devuelven contrato OK o degradado sin timeouts QA.

## 12. pendientes criticos

- CORREGIR conectividad Supabase/TLS local: los errores `SELF_SIGNED_CERT_IN_CHAIN`, `AbortError` y `TypeError: fetch failed` impiden confirmar datos remotos aunque el build pase.
- CONSERVAR degradacion rapida: `/api/worldspect/state`, `/api/worldspect/vector`, `/api/scorefriction/state`, `/api/amv/state` ya responden dentro del timeout QA; pendiente solo recuperar datos remotos cuando Supabase/TLS quede sano.
- CORREGIR tablas no localizadas `audits`, `external_reality_weights`, `systemic_patterns` mediante migracion explicita o remocion de dependencias legacy.
- CORREGIR limpieza fina de rutas experimentales y componentes advisory solo despues de confirmar consumidores reales.
