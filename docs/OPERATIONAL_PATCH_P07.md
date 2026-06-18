# SFI Operational Patch P07

## Función

P07 crea intake real de ScoreFriction.

Escribe en:

- `scorefriction_observations`
- `scorefriction_vectors`
- `epistemic_events` vía evento operacional espejo

No crea tablas nuevas.
No usa JSON local como fuente principal.
No publica.

## Archivos

- `src/lib/scorefriction/intake.ts`
- `src/app/api/scorefriction/intake/route.ts`

## Prueba local

Con `npm run dev` activo:

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/scorefriction/intake" -ContentType "application/json" -Body '{
  "case_id": "SFI-OP-001",
  "object": "System Friction Institute",
  "source_name": "manual_upload",
  "territory": "MX",
  "evidence_type": "institutional_signal",
  "reliability_score": 0.72,
  "provenance_notes": "Primer intake real P07 desde eventos operacionales SFI.",
  "domain": "institutional_cultural",
  "signal": "persistencia institucional longitudinal",
  "wsv": {
    "cultural": 0.62,
    "affective": 0.58,
    "institutional": 0.74
  },
  "narrative": "SFI deja de operar como maqueta local y registra una primera observación real en ScoreFriction: institución, evidencia, vector y evento operativo quedan vinculados."
}' | ConvertTo-Json -Depth 20
```

Después revisar:

```text
http://localhost:3000/api/scorefriction/state
http://localhost:3000/api/sfi/operational-state
http://localhost:3000/api/sfi/events
```

## Resultado esperado

ScoreFriction debe dejar de mostrar:

```text
scorefriction_observations: 0
scorefriction_vectors_missing
```

y debe existir un evento:

```text
kind: scorefriction_intake
```
