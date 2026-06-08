# AMV Field Operators

## Objetivo

Definir operadores de campo como lectura y control de contrato. Un operador no es UI, no es dashboard y no ejecuta acciones externas.

El vocabulario fuente vive en `src/lib/amv/core/fieldOperatorTypes.ts`.

## Operadores

`attractor`, `ejector`, `stochastic_projection`, `intervention`, `perturbation`, `regime_shift`, `threshold`, `signal`, `pattern`, `cluster`, `phenomenon`, `debt`, `rce`, `latency`, `coherence`, `dissonance`, `coupling`, `decoupling`, `contamination`, `verification`, `closure`, `memory`, `simulation`.

## Reglas fuertes

- `stochastic_projection` siempre queda sandbox hasta aprobacion humana explicita.
- `intervention` formula plan; no ejecuta nada externo.
- `attractor` orienta ruta; no ejecuta.
- `ejector` puede bloquear cierre fuerte cuando hay riesgo, contaminacion o falta de soporte.
- `simulation` no alimenta regimen.

## Uso por spec

Los instrumentos y paneles pueden declarar `fieldOperators` para exponer que operadores aplican a una lectura:

```ts
fieldOperators: ['attractor', 'verification', 'closure']
```

Esto no crea una pantalla ni habilita ejecucion. Solo hace explicito el contrato de lectura.
