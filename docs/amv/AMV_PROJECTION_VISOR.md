# AMV Projection Visor

La proyeccion vive en `src/lib/amv/core/amvProjectionEngine.ts` y responde por `POST /api/amv/projection`.

Contrato duro:

- `sandboxOnly: true`
- `feedsRegime: false`
- `executesIntervention: false`

La salida puede alimentar `ScenarioMatrixPanel` y `AmvProjectionVisor`, pero no modifica regimen, cierre, atractor ni persistencia.
