# EPISTEMIC EVENT CONTRACT

Fecha: 2026-05-21  
Fase: FASE 2D - eventos epistemicos y contratos

## Objetivo

Formalizar la forma minima de eventos epistemicos SFI sin implementar runtime, sin conectar base de datos y sin migrar `cognitive_event_stream`.

## Clases epistemicas

### `observed`

Dato observado directamente por una fuente declarada. Requiere fuente, timestamp y confianza asociada.

Ejemplo: un snapshot medido por un servicio de salud de fuentes.

### `declared`

Dato declarado por un usuario, sistema o fuente externa identificada. No implica veracidad factual por si mismo.

Ejemplo: un usuario declara un objetivo operacional.

### `derived`

Dato calculado de forma determinista a partir de datos trazables.

Ejemplo: una capacidad operacional derivada de vector MIHM y degradacion.

### `inferred`

Dato inferido probabilisticamente. Debe incluir confianza, lineage y, cuando aplique, incertidumbre.

Ejemplo: una hipotesis de friccion operacional derivada de multiples eventos.

### `simulated`

Dato producido por simulacion. Nunca debe presentarse como observacion real.

Ejemplo: una proyeccion de resultado si se ejecuta una accion.

### `fixture`

Dato artificial usado para demo, pruebas o documentacion. No puede contaminar estados productivos.

Ejemplo: datos de `apps/demo`.

### `missing`

Ausencia explicita de dato. Es preferible a inventar una medicion.

Ejemplo: `SourceHealth` reporta que no hay snapshot medido vigente.

## Confidence

`confidence` es un numero entre `0` y `1`.

- `0`: sin confianza operacional.
- `1`: maxima confianza dentro del contrato.

La confianza no convierte una inferencia en observacion. Una inferencia con `confidence: 0.9` sigue siendo `inferred`.

## Lineage

`lineage` es una lista de ids de eventos o registros que sostienen el evento actual.

Reglas:

- todo `derived` deberia tener lineage;
- todo `inferred` deberia tener lineage;
- todo `simulated` deberia apuntar al escenario o evento base;
- `declared` puede tener lineage vacio si proviene directamente del actor.

## Checksum

`checksum` identifica la integridad del payload o de la forma canonica del evento.

FASE 2D solo declara el campo. No implementa generacion de checksum.

## Uncertainty

`uncertainty` describe el limite conocido del evento.

Ejemplos:

- `source_unavailable`
- `low_sample_size`
- `semantic_ambiguity`
- `simulated_not_observed`
- `fixture_not_real`

La incertidumbre debe mostrarse en interfaces cuando afecte decision, riesgo o diagnostico.

## Regla constitucional

Un evento epistemico no es verdad por existir. Es una afirmacion trazable con clase, fuente, confianza y limites.

