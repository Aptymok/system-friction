# SFI Evaluator

Dominio: interface consumer / future bridge  
Estado: scaffold-only / blocked until Fase 8 validation  
Direct database access: prohibited

## Responsabilidad

SFI Evaluator sera una app consumidora del Observatorio para evaluar assets contra FieldContext autorizado y producir reportes de observacion mutua, proyecciones e intervenciones propuestas.

## Estado actual

Esta app no es funcional todavia.

No contiene upload real, analisis real, modelos, DB, conexion directa al Observatorio ni runtime de evaluacion.

## Frontera constitucional

Evaluator puede consumir contratos y estados del Observatorio mediante API controlada.

Evaluator no puede acceder directo a DB, controlar FieldState, modificar NodeState, escribir LogRecord sin API autorizada, presentar inferencias como observaciones, procesar uploads productivos sin cuarentena ni operar sin auth, scopes, audit y FieldContext.

## Relacion con la fase actual

FASE 8A solo crea scaffold y contratos locales.

La implementacion funcional queda bloqueada hasta fases posteriores.
