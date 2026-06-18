# SFI Operational Patch P03

## Función

P03 convierte los eventos operacionales de memoria temporal a persistencia local.

## Agrega

- `src/lib/sfi/operational/events.ts`
- `src/app/api/sfi/events/route.ts`
- `src/app/api/sfi/operational-state/route.ts`
- `data/sfi-operational-events.json`

## Estado esperado

- `/api/sfi/events` devuelve `persistent_local_event_log_p03`
- `/api/sfi/operational-state` devuelve `patch: P03`
- `systemRegime` cambia a `persistent_local_degraded`

## Comando de prueba

```powershell
npm run typecheck
npm run build
npm run dev
```

## Rutas

```text
http://localhost:3000/api/sfi/events
http://localhost:3000/api/sfi/operational-state
http://localhost:3000/scorefriction-operational
```

## POST de prueba

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/sfi/events" -ContentType "application/json" -Body '{"organ":"evaluator","kind":"signal","title":"Prueba MIHM persistida","summary":"Evento de prueba escrito por P03.","risk":"low","status":"observed"}'
```

## Límite

P03 persiste localmente. En Vercel/serverless, el filesystem puede no ser persistente. P04 debe conectar adaptadores reales y P05/P06 puede migrar a Supabase cuando el contrato de eventos esté estable.
