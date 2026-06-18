# SFI Operational Patch P04

## Función

P04 agrega adaptadores de lectura segura para conectar el estado operacional con órganos reales existentes.

No modifica auth.
No modifica Supabase.
No destruye rutas existentes.
No publica.
No entrega motor generador.

## Agrega

- `src/lib/sfi/operational/adapters.ts`
- `src/app/api/sfi/adapters/route.ts`

## Qué hace

`/api/sfi/adapters` intenta leer, en modo seguro:

### ScoreFriction

- `/api/scorefriction/state`
- `/api/scorefriction/worldspect`
- `/api/worldspect/state`

### Evaluator / MIHM

- `/api/mihm/state`
- `/api/mihm`
- `/api/sfi-engine/evaluate`

### AMV + Gemelo Cognitivo

- `/api/amv/state`
- `/api/amv`
- `/api/cognitive-twin`
- `/api/twin/state`

Si alguna ruta responde JSON, registra evento `adapter_observation`.
Si ninguna responde, registra evento `adapter_degraded`.

## Rutas de prueba

```text
http://localhost:3000/api/sfi/adapters
http://localhost:3000/api/sfi/events
http://localhost:3000/api/sfi/operational-state
```

## Estado esperado

Después de abrir `/api/sfi/adapters`, `/api/sfi/events` debe mostrar nuevos eventos de adaptador.

## Límite

P04 no fuerza contratos. Sólo detecta qué órganos ya responden y qué órganos necesitan una ruta estable.

## Siguiente parche

P05 debe crear contratos estables:

- `/api/scorefriction/state`
- `/api/mihm/state`
- `/api/amv/state`

Cada uno debe devolver un formato normalizado que `operational-state` pueda leer sin degradación.
