# SFI Observatory Connection Audit

Fecha: 2026-06-08

## 1. Que existe ya

- AMV core: runtime scoped, specs, EvidenceTrust, ArchiveLayer, FieldOperators, OutputModes y registry por scope.
- Scopes AMV: `root`, `scorefriction`, `governance-reality`, `cluster-atlas`, `signal-vane`, `cognitive-twin-engine`.
- Dashboards contractuales: `ScopedDashboardShell` y `AmvPanelRenderer`.
- ScoreFriction: ingestion real, normalizacion, vectores, prototipos, verificaciones y eventos epistemicos.
- ROOT: consola operativa, VISOR, twin state, WSV/MIHM translators y attractor/field state translators.

## 2. Que esta solo como contrato/spec

- Governance Reality, Cluster Atlas, Signal Vane, Cognitive Twin Engine y Root AMV tienen dashboard spec pero no conector vivo por scope.
- Dashboard generation policy existia conceptualmente; ahora queda en `dashboardGenerationPolicy.ts` y `dashboardFactory.ts`.

## 3. Que ya tiene endpoint

- AMV runtime: `/api/amv`.
- AMV state: `/api/amv/state`.
- ScoreFriction ingest/evaluate/observe/propose/verify/evidence/audio.
- ScoreFriction state: `/api/scorefriction/state`.
- Twin state: `/api/twin/state`.
- WorldSpect state: `/api/worldspect/state`.

## 4. Que ya lee base de datos

- ScoreFriction state lee `scorefriction_observations`, `scorefriction_vectors`, `scorefriction_prototypes`, `scorefriction_verifications` y `epistemic_events`.
- WSV state lee `worldspect_snapshots`.
- Twin state conserva su lectura existente y ahora agrega overview AMV.

## 5. Que solo pinta plantilla

- Scopes AMV sin conector vivo siguen mostrando contrato observable con estado degradado.
- Los paneles AMV ya no dicen activo si no hay lectura viva.

## 6. Que llega a ROOT

- `/api/twin/state` incluye `amvScopes`.
- `RootObservatoryIndex` muestra scopes, evidencia, degradacion, sandbox, regimen, atractor y warnings.

## 7. Que no llega a ROOT

- WSV llega como translator existente y endpoint independiente, pero no se promueve automaticamente a regimen.
- Scopes sin conector no llegan como vivos; llegan como degradados.

## 8. Que llega a bitacora

- ScoreFriction ingest ya registra eventos en `epistemic_events` con `logbookId = SCOREFRICTION`.
- `saveAmvReadingToLogbook` permite guardar lectura AMV por scope con routing policy.

## 9. Que no llega a bitacora

- La UI de `RootLogbookConsole` todavia no escribe entradas desde botones productivos.
- VISOR no persiste registros y no debe hacerlo.

## 10. Que esta degradado

- Cualquier scope sin conector vivo.
- WSV sin snapshot con fecha, fuente y confianza.
- ScoreFriction si faltan observaciones, vectores o evento de bitacora.

## 11. Que puede alimentar regimen

- ScoreFriction solo si existe observacion real y source coverage mayor a cero.
- Otros scopes no alimentan regimen hasta tener conector vivo.

## 12. Que debe quedarse en sandbox

- Simulated/sandbox evidence.
- Dashboard generation requests que no cumplan contrato AMV completo.
- Scopes sin fuentes reales.

## 13. Archivos cambiados para cerrar el flujo

- `src/lib/amv/core/amvScopeStateTypes.ts`
- `src/lib/amv/core/amvStateBuilder.ts`
- `src/app/api/amv/state/route.ts`
- `src/lib/amv/scopes/scorefriction/scorefrictionStateConnector.ts`
- `src/app/api/scorefriction/state/route.ts`
- `src/observatory/components/amv/ScopedDashboardShell.tsx`
- `src/observatory/components/amv/AmvPanelRenderer.tsx`
- `src/lib/root/rootScopeOverview.ts`
- `src/observatory/components/root/RootObservatoryIndex.tsx`
- `src/app/api/twin/state/route.ts`
- `src/lib/amv/core/logbookRoutingPolicy.ts`
- `src/lib/amv/core/saveAmvReadingToLogbook.ts`
- `src/observatory/components/root/RootLogbookConsole.tsx`
- `src/lib/worldspect/worldspectStateBuilder.ts`
- `src/app/api/worldspect/state/route.ts`
- `src/lib/amv/scopes/root/rootWsvConnector.ts`
- `src/app/(observatory)/observatories/page.tsx`
- `src/observatory/components/amv/ObservatoryOfObservatories.tsx`
- `src/observatory/components/amv/ObservatoryScopeCard.tsx`
- `src/lib/amv/core/dashboardGenerationPolicy.ts`
- `src/lib/amv/core/dashboardFactory.ts`
- `src/app/api/amv/dashboard/generate/route.ts`
