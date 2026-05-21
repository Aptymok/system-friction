# SOURCE STATE HELPERS TEST CASES

Fecha: 2026-05-21  
Fase: FASE 7B - Primera migracion segura

## Modulo

`packages/campo-ob/src/index.ts`

Helpers puros agregados:

- `isSourceState(value)`
- `isEvidenceLevel(value)`
- `isCanonicalConfidence(value)`

## Casos esperados

| Caso | Input | Resultado esperado |
| --- | --- | --- |
| Source state observado | `isSourceState('observed')` | `true` |
| Source state declarado | `isSourceState('declared')` | `true` |
| Source state derivado | `isSourceState('derived')` | `true` |
| Source state inferido | `isSourceState('inferred')` | `true` |
| Source state simulado | `isSourceState('simulated')` | `true` |
| Source state fixture | `isSourceState('fixture')` | `true` |
| Source state missing | `isSourceState('missing')` | `true` |
| Source state desconocido | `isSourceState('live')` | `false` |
| Source state no-string | `isSourceState(null)` | `false` |
| Evidence direct | `isEvidenceLevel('direct')` | `true` |
| Evidence behavioral | `isEvidenceLevel('behavioral')` | `true` |
| Evidence statistical | `isEvidenceLevel('statistical')` | `true` |
| Evidence semantic | `isEvidenceLevel('semantic')` | `true` |
| Evidence speculative | `isEvidenceLevel('speculative')` | `true` |
| Evidence none | `isEvidenceLevel('none')` | `true` |
| Evidence desconocido | `isEvidenceLevel('primary')` | `false` |
| Confidence cero | `isCanonicalConfidence(0)` | `true` |
| Confidence uno | `isCanonicalConfidence(1)` | `true` |
| Confidence decimal valido | `isCanonicalConfidence(0.42)` | `true` |
| Confidence negativo | `isCanonicalConfidence(-0.1)` | `false` |
| Confidence mayor que uno | `isCanonicalConfidence(1.1)` | `false` |
| Confidence NaN | `isCanonicalConfidence(Number.NaN)` | `false` |
| Confidence no-number | `isCanonicalConfidence('0.5')` | `false` |

## Invariantes

- No hay imports externos.
- No hay acceso a DB.
- No hay acceso a UI.
- No hay acceso a auth.
- No hay efectos secundarios.
- Las funciones son deterministas para el mismo input.
