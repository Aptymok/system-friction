# SFI Operational Patch P02

## Función

P02 convierte la membrana operacional de P01 en un estado con eventos. P01 declaraba órganos. P02 registra lo que ocurrió, aunque todavía sea en memoria local.

## Qué agrega

- `src/lib/operational/events.ts`
  - contrato de eventos operacionales.
  - seed inicial con P01, caso Edwing, decisión de gobernanza, necesidad ScoreFriction y publicador.
  - store en memoria para pruebas locales.

- `src/lib/operational/state.ts`
  - reducer central que construye el estado operacional desde órganos + eventos.

- `src/app/api/sfi/events/route.ts`
  - `GET`: lista eventos.
  - `POST`: registra evento en memoria.

- `src/app/api/sfi/operational-state/route.ts`
  - ahora devuelve eventos, última observación, última decisión, última oportunidad y último borrador.

- `src/app/api/market/opportunities/route.ts`
  - registra oportunidades como eventos.

- `src/app/api/governance/access-request/route.ts`
  - registra decisiones de acceso como eventos.

- `src/app/scorefriction-operational/page.tsx`
  - muestra eventos recientes y último estado operacional.

## Qué NO hace todavía

- No persiste en Supabase.
- No publica en Medium/LinkedIn.
- No ejecuta automatización diaria real.
- No conecta todavía la última medición real de ScoreFriction, MIHM o AMV.

## Rutas a probar

```txt
http://localhost:3000/scorefriction-operational
http://localhost:3000/api/sfi/operational-state
http://localhost:3000/api/sfi/events
http://localhost:3000/api/market/opportunities
http://localhost:3000/api/governance/access-request
```

## Prueba manual de oportunidad

```powershell
Invoke-RestMethod -Method POST "http://localhost:3000/api/market/opportunities" -ContentType "application/json" -Body '{"actor":"Edwing","interest":"promover SFI","requested_asset":"motor generador SFI","opportunity_type":"promoter"}'
```

## Prueba manual de gobernanza

```powershell
Invoke-RestMethod -Method POST "http://localhost:3000/api/governance/access-request" -ContentType "application/json" -Body '{"actor":"Edwing","asset":"motor generador SFI","purpose":"promoción externa","requested_access":"CORE_ACCESS"}'
```

## Criterio de éxito

`/api/sfi/operational-state` debe mostrar:

- `patch: P02`
- `eventCount > 0`
- `latestOpportunity` con Edwing.
- `latestDecision` con decisión de no transferir núcleo.
- `latestPublication` como borrador, no publicación automática.

## Siguiente parche

P03 debe persistir eventos en Supabase o storage local controlado y conectar adaptadores reales:

- ScoreFriction último estado diario.
- MIHM último output.
- AMV última propuesta/decisión.
- bitácora persistente.
