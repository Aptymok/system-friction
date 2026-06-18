# SFI Operational Patch P06

## Función

P06 activa el Publicador sin hardcodear eventos.

No edita manualmente `data/sfi-operational-events.json`.
No cambia estados a mano.
No publica fuera del sistema.
No toca Supabase.

## Agrega

- `src/lib/sfi/operational/publisher.ts`
- `src/app/api/publisher/draft/route.ts`

## Rutas

Preview sin escribir:

```text
GET /api/publisher/draft
GET /api/publisher/draft?channel=medium_sfi
GET /api/publisher/draft?channel=longitudinal_report
```

Crear evento de borrador persistente:

```text
POST /api/publisher/draft
```

## Prueba PowerShell

```powershell
Invoke-RestMethod "http://localhost:3000/api/publisher/draft" | ConvertTo-Json -Depth 20
```

Después, para guardar el borrador como evento:

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/publisher/draft" -ContentType "application/json" -Body '{"channel":"medium_sfi"}' | ConvertTo-Json -Depth 20
```

Luego revisar:

```text
http://localhost:3000/api/sfi/events
http://localhost:3000/api/sfi/operational-state
```

## Resultado esperado

Debe aparecer un nuevo evento:

```json
{
  "organ": "publisher",
  "kind": "publication_draft",
  "status": "drafted"
}
```

El cuerpo del borrador se genera desde eventos reales persistidos.
