# SFI Cognitive Runtime — Changelog
Ámbito: histórico únicamente. No arquitectura (`ADR-000-cognitive-runtime.md`), no
detalle técnico (`IMPLEMENTATION-NOTES.md`), no evidencia de validación
(`VALIDATION-REPORT.md`).

## 2026-07-21 — Cognitive Runtime nace en el repo

Commit `aa0339f`. `agentContract.ts` extendido sobre `SFIEvent`,
`registry.ts`/`runtime.ts`/`types.ts` nuevos (17 agentes declarados), API
`/api/root/cognitive-runtime` gated por ROOT, vista nueva en la consola soberana.

## Sin fecha exacta — Operación 0: reconciliación de topología

Auditoría del repo completo contra los documentos de especificación de arquitectura
original. Hallazgo principal: la mayoría de los 16 pipelines descritos ya existían
bajo otros nombres — el trabajo pendiente no era "crear agentes", era mapear qué
existía contra qué se había especificado.

## Sin fecha exacta — Corrección 1: `field_events`

`temporal_resolver` declaraba una tabla inexistente en las 43 migraciones reales.
Corregido a `field_moph_runs`/`field_returns` según corresponde. Validado con
typecheck, build, boundaries, route audit — contra clon limpio.

## 2026-07-24 — Primera verificación en vivo

El usuario ejecutó el fix contra su instancia real de Supabase.
`generatedAt: 2026-07-24T14:06:11Z`. Resultado: 7 agentes `operational`, 10
`gated`, coincidencia exacta con la clasificación estática. `eventGraph` vacío
(Observation V-001) y layer `understand` sin agentes (Observation V-002) —
estos dos hallazgos dispararon la siguiente fase.

## Sin fecha exacta — Corrección 2: segundo `field_events`

Encontrado en `runtime.ts` (lógica del modo `passive_field_observation`), no
capturado por la corrección 1. No rompía nada en producción, misma clase de
defecto. Corregido y validado.

## Sin fecha exacta — ADR-001: AMV, split funcional

Decisión: AMV se divide en Understanding/Decision/Intervention Layer sin mover
código físico. Solo la Understanding Layer se registra como `understand`. Puente
`PhenomenonRelay` traduce hacia el Runtime. `governance-realityAgent` migra
conceptualmente al Runtime. `logbookId` se resuelve como convención compartida, sin
migración de esquema.

## Sin fecha exacta — ADR-002: escritor único de memoria institucional

Enmienda a ADR-001: AMV pierde la escritura directa a `epistemic_events`. Se
generaliza a regla de sistema, no solo sobre AMV.

## Sin fecha exacta — ADR-003: definición formal de "agente"

Cuatro propiedades conjuntas (contrato, autoridad, emisión única, responsabilidad
declarada). Verificado contra los 17 agentes reales: los 17 emiten exactamente un
evento cada uno, sin excepción.

## Sin fecha exacta — Corrección 3: extracción de `probeTable()`

`runtime.ts` dejó de importar el cliente de Supabase directamente. Nuevo archivo
`tableProbe.ts`. Refactor puro, sin cambio de comportamiento. Validado.

## Sin fecha exacta — Consolidación en cuatro documentos

`ADR-000` (decisiones), `IMPLEMENTATION-NOTES` (cambios de código),
`VALIDATION-REPORT` (evidencia), `CHANGELOG` (este documento). Reemplaza el
documento único `operation-0-reconciliation.md` de las primeras iteraciones.

## Estado al cierre de este changelog

Arquitectura: congelada (ADR-000/001/002/003). Implementación: 7/17 agentes
operacionales, 10/17 gated, 0 ciclos cognitivos ejecutados nunca. Próximo trabajo de
implementación real: Historical Reconstruction (`historical_scout`,
`phenotype_resolver`, `context_builder` — la única fila sin ninguna pieza real
detrás en tres auditorías independientes) o la agenda ADR-004→008, según prioridad
que se decida fuera de este documento.
