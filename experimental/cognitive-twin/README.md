# CognitiveTwin Experimental Quarantine

Fecha: 2026-05-21  
Fase: FASE 7C - Cuarentena formal de experimental

## Estado

CognitiveTwin queda en cuarentena experimental.

Este directorio no contiene runtime funcional. Es un marcador formal para declarar que el material actual relacionado con CognitiveTwin no pertenece al core productivo del Observatorio SFI.

## Ubicaciones actuales observadas

- `services/python/cognitive_twin`
- `src/app/api/cognitive-twin/route.ts`
- `src/agents/cognitive-twin.ts`

## Prohibiciones

CognitiveTwin no puede:

- escribir DB directamente;
- usar service role;
- operar como endpoint productivo;
- analizar uploads productivos;
- consumir datos vivos sin contrato;
- producir `FieldState` o `NodeState`;
- emitir inferencias sin lineage;
- emitir resultados sin confidence;
- usar primera persona subjetiva;
- presentarse como conciencia, identidad viva o agente autonomo.

## IO contract requerido

Antes de reentrar debe declarar:

- input schema versionado;
- output schema versionado;
- source descriptor;
- epistemic class;
- evidence level;
- confidence;
- checksum;
- lineage;
- idempotency key;
- correlation id;
- error shape;
- audit event.

## Lineage requerido

Toda salida debe indicar:

- fuente original;
- transformaciones aplicadas;
- eventos padre;
- modelo o regla usada;
- timestamp;
- checksum del payload;
- incertidumbre conocida.

## Confidence requerido

Toda inferencia debe declarar `confidence` en rango `0..1`.

Si no hay evidencia suficiente, debe emitir `missing`, `simulated` o `inferred` segun corresponda. Nunca debe elevar una inferencia a `observed`.

## Reentrada

La reentrada al campo solo puede evaluarse cuando cumpla `docs/COGNITIVE_TWIN_REENTRY_CRITERIA.md`.
