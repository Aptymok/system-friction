# AMV Dashboard Generation Policy

Un dashboard AMV solo puede generarse como UI cuando el contrato trae:

- scope;
- pregunta ontologica;
- objeto observable;
- EvidenceTrust permitido;
- fuentes;
- emptyState honesto;
- outputModes;
- ArchiveLayer;
- prohibiciones;
- criterio de cierre.

Endpoint: `POST /api/amv/dashboard/generate`.

Si falta algo, la respuesta debe ser `spec_only`. No se genera UI.

Ejemplo de prueba:

```json
{
  "scope": "scorefriction",
  "ontologicalQuestion": "Que patron cultural persiste?",
  "observableObject": "cultural_wave_case",
  "evidenceTrust": ["verified", "declared"],
  "sources": ["scorefriction_observations"],
  "emptyState": "Contrato observable disponible. Sin estado vivo suficiente.",
  "outputModes": ["dashboard"],
  "archiveLayer": "living_observatory",
  "prohibitions": ["No fingir observacion"],
  "closureCriteria": "Existe observacion, vector y evento de bitacora."
}
```
