# TERMINAL READ MODEL ADAPTER

Fecha: 2026-05-22
Fase: FASE 9F - Terminal read model adapter

## Objetivo

Definir adapter puro para futura lectura canónica de /terminal.

## Alcance

El adapter:

- no llama APIs;
- no accede DB;
- no usa localStorage;
- no calcula FieldState;
- no importa React/Next/Supabase.

## Responsabilidad

Normalizar:

- FieldStateDTO
- NodeStateDTO
- Logs
- SourceHealth

Para consumo posterior por terminal.

## Warnings

El adapter genera warnings cuando:

- falta FieldState;
- falta NodeState.

La UI futura no debe inferir verdad localmente cuando esos estados faltan.

## Restriccion critica

FASE 9F no modifica /terminal.

Solo define contrato de lectura canónica futura.
