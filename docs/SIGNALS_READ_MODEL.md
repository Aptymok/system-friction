# SIGNALS READ MODEL

Fecha: 2026-05-22  
Fase: FASE 9B - Signals read model

## Objetivo

Definir un read model puro para señales reales declaradas almacenadas en `cognitive_event_stream`.

## Alcance

El read model:

- no accede DB;
- no importa Supabase;
- no importa React/Next/UI;
- no calcula `FieldState`.

## Eventos soportados

Solo se aceptan filas con:

- `stream_type = signal`
- `event_name = SIGNAL_DECLARED`

## Datos preservados

- node_id
- event id
- content
- signal_type
- sourceState
- evidenceLevel
- confidence
- payloadHash
- created_at
- idempotencyKey

## Manejo de filas invalidas

Filas invalidas:

- son ignoradas;
- generan warning;
- no interrumpen construccion del modelo.

## Estado epistemico

Este modelo no transforma ni deriva verdad operacional.

Solo normaliza eventos declarados para lectura controlada.
