# SFI Operational Patch P05

## Función

P05 convierte eventos persistidos en patrones longitudinales.

## Agrega

- `src/lib/sfi/operational/patterns.ts`
- reemplaza `src/app/api/sfi/operational-state/route.ts`

## Qué cambia

`/api/sfi/operational-state` ahora devuelve:

- `patterns`
- `attractors`
- `institutionalMemory`
- `patternCount`
- `canFeedRegime`
- `canSupportAttractor`

## Estado esperado

Después de P05:

```json
{
  "patch": "P05",
  "systemRegime": "operational_seeded",
  "canFeedRegime": true,
  "canSupportAttractor": true
}
```

si ya existe al menos una señal viva y eventos de gobernanza/mercado.

## Prueba

```powershell
npm run typecheck
npm run build
npm run dev
```

Abrir:

```text
http://localhost:3000/api/sfi/operational-state
```

## Siguiente parche

P06: `/api/scorefriction/intake`

Convertirá una señal viva en:

- observation
- vector
- narrative
- operational event
- publication draft
