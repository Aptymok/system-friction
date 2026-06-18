# DEGRADED REMEDIATION PLAN

Este documento recopila los módulos, endpoints y dependencias identificadas como degradadas en la matriz QA existente (`docs/qa/SFI_FINAL_QA_MATRIX.md`). Solo incluye elementos clasificados como degradados, dependencias faltantes, tablas faltantes, endpoints incompletos, fallbacks activos, datos simulados y observaciones de rutas potencialmente huérfanas.

| Archivo | Dependencia | Causa | Impacto | Acción correctiva | Prioridad |
|---|---|---|---|---|---|
| `src/scorefriction/components/panels/PanelLongitudinalTension.tsx` | `snapshots` / historial de vectores | La vista depende de persistencia histórica de snapshots que no está garantizada o está degradada. | Panel `Tension Longitudinal` muestra datos degradados, reduce confianza en la línea de tiempo del campo. | Validar la ingesta y persistencia de snapshots históricos; asegurar que la fuente de datos de líneas de tiempo esté plena y actualizada. | P1 |
| `src/scorefriction/components/panels/PanelChronology.tsx` | Evidence ledger / `sfi_evidence_ledger` | Depende de registro observacional ordenado y almacenado; la evidencia puede faltar o estar incompleta. | `Cronologia Viva` se muestra degradada y puede perder orden real de eventos. | Corregir el pipeline de evidencia, asegurar orden de ingestión y disponibilidad de `sfi_evidence_ledger`. | P1 |
| `src/app/api/worldspect/vector/route.ts` | `worldspect_snapshots` / ingestión WorldSpect | Si no hay snapshot real disponible, retorna bootstrapped / `worldspect_unavailable`. | Panel de World Spectrum y cualquier consumidor externo reciben vectores degradados o bootstrap. | Poblar snapshots reales de WorldSpect, reparar el ingest pipeline y validar `worldspect_snapshots`. | P1 |
| `src/app/api/sfi-engine/evaluate/route.ts` | `SFI_ENGINE_URL` / servicio Python externo | El endpoint cae en fallback a TS cuando no está conectado un engine Python. | Evaluación MIHM/SFI se ofrece degradada; resultados operativos menos fiables. | Configurar `SFI_ENGINE_URL`, desplegar/poner en marcha el servicio Python y verificar la conexión. | P1 |
| `src/app/api/sfi-engine/montecarlo/route.ts` | `SFI_ENGINE_URL` / servicio Python externo | Monte Carlo devuelve warning `montecarlo_python_result_missing` si falta el resultado Python. | Proyección estocástica degradada; modelo Monte Carlo no es completo. | Completar y habilitar el servicio Python para entregar resultados de Monte Carlo reales. | P2 |
| `src/app/api/sfi/evidence/route.ts` | Tabla Supabase `sfi_evidence_ledger` | Escritura opcional falla si la tabla no existe o Supabase no está listo; `stored=false`. | El ledger de evidencia no persiste correctamente, lo que degrada trazabilidad y análisis. | Aplicar migración de Supabase para `sfi_evidence_ledger` y verificar permisos/estructura. | P1 |
| `src/app/api/moph/session/route.ts` | Tabla Supabase `sfi_moph_sessions` | Fallback en memoria cuando la tabla o el servicio no están disponibles. | Persistencia de sesiones MOP-H degradada; datos históricos pueden perderse. | Crear o validar la tabla `sfi_moph_sessions`; asegurar que la persistencia Supabase funcione. | P1 |
| `src/app/api/phenomena/route.ts` | Tabla Supabase `sfi_phenomena` | El motor de fenómenos recurre a almacenamiento en memoria si la tabla no está lista. | `/api/phenomena` se degrada; lista de fenómenos no es persistente ni confiable. | Aplicar migración de `sfi_phenomena` y garantizar acceso Supabase. | P1 |
| `src/app/api/scorefriction/observe/route.ts` | Tablas Supabase `scorefriction_observations`, `scorefriction_vectors` | Observaciones ScoreFriction sólo persisten si las tablas están presentes y el servicio responde. | Registro observacional degradado; las observaciones de caso y vectores pueden quedar sin persistencia. | Validar/applicar las tablas requeridas y reparar conectividad con Supabase. | P1 |
| `src/app/api/scorefriction/proto-attractors/route.ts` | Tabla Supabase `scorefriction_proto_attractors` | Lista degradada cuando no hay filas o la base de datos no retorna datos. | Panel de proto-attractores muestra estado degradado o vacío. | Asegurar existencia de la tabla y alimentar datos reales de observaciones/vectores. | P1 |
| `src/app/api/scorefriction/proto-attractors/detect/route.ts` | Tablas `scorefriction_observations`, `scorefriction_vectors`, `scorefriction_proto_attractors`, `worldspect_snapshots` | Detección degrada si faltan observaciones, vectores o snapshot WorldSpect. | Generación de proto-attractores degradada; detector no produce valores útiles. | Aplicar migraciones necesarias y garantizar ingest de observaciones, vectores y WorldSpect. | P1 |
| `src/app/api/scorefriction/proposals/route.ts` | Tablas `action_proposals`, `scorefriction_cultural_hypotheses` | Dependencia de hipótesis activas y propuestas preexistentes; puede devolver estados degradados. | Propuestas operativas incompletas o vacías en `/api/scorefriction/proposals`. | Alimentar hipótesis y propuestas reales; revisar el modelo de datos de `action_proposals`. | P2 |
| `src/app/api/scorefriction/verifications/route.ts` | Tabla `scorefriction_proposal_verifications` | Lectura degradada si no hay verificaciones o si la tabla falta. | Verificaciones ScoreFriction incompletas; no se muestra evidencia de validación. | Crear/migrar `scorefriction_proposal_verifications` y poblar datos verificados. | P2 |
| `src/app/api/scorefriction/python/analyze/route.ts` | Python runtime / `python/scorefriction/requirements.txt` | El bridge Python declara `python_not_available` cuando el runtime o dependencias faltan. | Análisis MIHM Python degradado o no disponible; la ruta devuelve error 503. | Instalar y configurar el runtime Python, dependencias de `python/scorefriction/requirements.txt` y el bridge. | P1 |

## Observaciones adicionales

- Fallbacks activos detectados:
  - `typescript-fallback` en `src/lib/sfi-engine/client.ts` cuando falta `SFI_ENGINE_URL`.
  - Almacenamiento en memoria en `src/lib/moph/session-store.ts` y `src/lib/phenomena/phenomenon-engine.ts` cuando Supabase no responde.
  - Bootstrapped/empty WorldSpect snapshot en `src/lib/worldspect/vector-store.ts` si no hay datos reales.

- Tablas faltantes clave (según degradaciones detectadas):
  - `sfi_evidence_ledger`
  - `sfi_moph_sessions`
  - `sfi_phenomena`
  - `scorefriction_observations`
  - `scorefriction_vectors`
  - `scorefriction_proto_attractors`
  - `scorefriction_proposal_verifications`
  - `action_proposals`
  - `scorefriction_cultural_hypotheses`
  - `worldspect_snapshots`

- Dependencias faltantes clave:
  - `SFI_ENGINE_URL` y el servicio Python de evaluación SFI.
  - Runtime Python para ScoreFriction MIHM y el bridge en `src/app/api/scorefriction/python/analyze/route.ts`.
  - Supabase con los esquemas y tablas necesarias.

- Rutas huérfanas:
  - No se identificaron rutas huérfanas explícitas en la matriz QA existente; la lista actual se concentra en los endpoints degradados documentados.
