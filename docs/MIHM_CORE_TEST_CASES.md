# MIHM CORE TEST CASES

Fecha: 2026-05-21  
Fase: FASE 2C - core matematico MIHM puro

No hay test runner declarado en `package.json`; por eso esta fase documenta casos esperados en lugar de crear `packages/mihm-core/src/index.test.ts`.

## Reglas base

- Todas las funciones son puras y deterministas.
- No hay imports externos.
- Todos los resultados escalares publicos se limitan a `[0, 1]` cuando aplica.
- `deriveRegime` solo depende de `phi`, `degradation` y `operationalCapacity`.

## Casos esperados

| Caso | Entrada | Resultado esperado |
|---|---|---|
| `clamp01` bajo rango | `clamp01(-0.2)` | `0` |
| `clamp01` alto rango | `clamp01(1.4)` | `1` |
| `clamp01` no finito | `clamp01(Number.NaN)` | `0` |
| `capacityLevel` alto | `capacityLevel(0.8)` | `high` |
| `capacityLevel` medio | `capacityLevel(0.5)` | `medium` |
| `capacityLevel` bajo | `capacityLevel(0.25)` | `low` |
| `capacityLevel` critico | `capacityLevel(0.24)` | `critical` |
| `deriveRegime` estable | `deriveRegime(0.7, 0.2, 0.8)` | `stable` |
| `deriveRegime` vigilancia | `deriveRegime(0.45, 0.2, 0.8)` | `watch` |
| `deriveRegime` critico por phi | `deriveRegime(0.2, 0.1, 0.9)` | `critical` |
| `deriveRegime` critico por degradacion | `deriveRegime(0.9, 0.8, 0.9)` | `critical` |
| `deriveRegime` critico por capacidad | `deriveRegime(0.9, 0.1, 0.2)` | `critical` |

## Caso compuesto

Nodo:

```ts
const node = {
  id: 'node-a',
  type: 'field',
  vector: { ihg: 0.8, nti: 0.2, ldi: 0.1 },
};
```

Expectativas:

- `qualifyNode(node).vector.phi` queda dentro de `[0, 1]`.
- `qualifyNode(node).qualified` es `true`.
- `degradeNode(node, 0, 100)` devuelve `0`.
- `operationalCapacity(node, 0.1, 0.8, 0.8)` queda dentro de `[0, 1]`.
- `deriveRegime(0.7, 0.1, 0.7)` devuelve `stable`.

