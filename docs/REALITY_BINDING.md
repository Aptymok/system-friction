# REALITY BINDING

Fecha: 2026-05-22  
Fase: FASE 9A - Real signal intake minimo

## Objetivo

Definir el primer flujo minimo de entrada de dato real declarado por usuario.

## Principio

No todo dato es verdad.

Pero toda verdad operacional debe tener:

- entrada;
- fuente;
- clase epistemica;
- confianza;
- trazabilidad.

## Flujo inicial

1. Usuario autenticado declara señal.
2. Sistema valida ownership.
3. Sistema valida idempotency.
4. Sistema registra evento en `cognitive_event_stream`.
5. Evento queda marcado como:

- `sourceState = declared`
- `evidenceLevel = direct`
- `confidence = 0.7`

## Alcance actual

FASE 9A no implementa:

- ingestion externa;
- IA;
- analisis;
- Evaluator;
- world sources;
- FieldState derivado;
- dashboards live.

## Endpoint paralelo

`POST /api/signals`

La ruta:

- no reemplaza `field/persist`;
- no toca `/terminal`;
- no modifica clientes existentes.

## Garantias

- no DB directa desde apps;
- ownership requerido;
- idempotency obligatoria;
- errores sanitizados;
- payload hash estable;
- eventos trazables.
