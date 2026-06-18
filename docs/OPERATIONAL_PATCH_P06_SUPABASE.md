# SFI Operational Patch P06 Supabase Primary

## Función

P06 cambia la persistencia operacional real:

- Primario: `public.epistemic_events`
- Fallback: `data/sfi-operational-events.json`

No crea tabla nueva.
No usa JSON local como fuente productiva principal.
No toca `scorefriction_observations` todavía.

## Archivos modificados

- `src/lib/sfi/operational/events.ts`
- `src/app/api/sfi/events/route.ts`
- `src/app/api/sfi/operational-state/route.ts`

## Prueba local

```powershell
npm run typecheck
npm run build
npm run dev
```

Revisar:

```text
http://localhost:3000/api/sfi/events
http://localhost:3000/api/sfi/operational-state
```

Debe aparecer:

```json
{
  "patch": "P06",
  "storage": {
    "primary": "supabase.epistemic_events",
    "supabaseOk": true
  }
}
```

Si `supabaseOk` es false, falta variable real en `.env.local` o RLS/Service Role.

## POST de prueba

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/sfi/events" -ContentType "application/json" -Body '{"organ":"scorefriction","kind":"signal","title":"Prueba Supabase P06","summary":"Evento escrito en epistemic_events desde SFI operational P06.","risk":"low","status":"observed"}' | ConvertTo-Json -Depth 20
```

## Siguiente

P07 conecta ScoreFriction intake real:

- `scorefriction_observations`
- `scorefriction_vectors`
- evento espejo en `epistemic_events`
