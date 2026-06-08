# ROOT Operation Guide

ROOT coordina observatorios; no los absorbe.

Flujo objetivo:

```txt
ingestion -> evidence -> vector -> event -> logbook -> AMV state -> live dashboard -> ROOT scope overview -> decision or closure
```

Pruebas manuales:

1. `POST /api/scorefriction/ingest`.
2. Confirmar registro en `scorefriction_observations`.
3. Confirmar vector en `scorefriction_vectors`.
4. Confirmar evento en `epistemic_events` con `logbook_id = SCOREFRICTION`.
5. Confirmar `/api/scorefriction/state`.
6. Confirmar `/api/amv/state?scope=scorefriction`.
7. Confirmar `/scorefriction` mostrando estado vivo o degraded honesto.
8. Confirmar ROOT mostrando scope ScoreFriction en el panel Root.
9. Confirmar VISOR apagable con "Salir de VISOR" y apagado al entrar en control.
10. Confirmar `/api/worldspect/state` degraded si no hay fuente suficiente.

Queda degraded a proposito:

- Scopes AMV sin conector vivo.
- WSV sin snapshot valido.
- Cualquier lectura sin evidencia o source coverage.

No se toco:

- Migraciones Supabase.
- Permisos productivos.
- Nuevo chat.
- Rediseño estetico de ROOT.
