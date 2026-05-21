# EVALUATOR API CONTRACT

Fecha: 2026-05-22  
Fase: FASE 8B - Evaluator API contract

## Objetivo

Definir contratos API requeridos para Evaluator sin implementar runtime de evaluacion.

## Contratos agregados

- `EvaluationRequest`
- `EvaluationResponse`
- `EvaluationStatus`
- `EvaluationArtifactRef`
- `InterventionProposal`

## Estado

Los contratos existen como DTOs tipados.

No existe:

- runtime;
- endpoint funcional;
- upload;
- DB;
- modelos;
- analisis;
- ejecucion de evaluacion.

## Boundary constitucional

Evaluator sigue siendo consumidor.

No controla `FieldState`.

No accede directo a DB.

## Flujo esperado futuro

1. App solicita evaluacion.
2. API valida auth y scopes.
3. Asset entra a cuarentena.
4. Runtime controlado procesa.
5. Resultado produce `EvaluationResponse`.
6. Intervenciones propuestas requieren review cuando aplique.

## Restricciones

- toda evaluacion debe incluir correlationId;
- toda evaluacion debe incluir idempotencyKey;
- artifacts deben declarar sourceState;
- proposals no son observaciones;
- confidence no equivale a verdad.
