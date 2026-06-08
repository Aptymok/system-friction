# ROOT Phase 15-17 Observational Evidence Python Contract

## Objetivo

Cerrar el bloque observacional de AMV para ROOT sin crear dashboards nuevos:

1. Modos observacionales AMV.
2. Capa comun de evidencia y archivo.
3. Contrato de integracion con Python Cognitive Twin / Cognitive Orchestrator.

## Archivos creados

| Archivo | Funcion |
| --- | --- |
| `src/lib/amv/core/observationModes.ts` | Modos `audit`, `mihm`, `worldspect`, `focus`. |
| `src/lib/amv/core/focusVariableTypes.ts` | Variables focales comunes. |
| `src/lib/amv/core/observableObjectTypes.ts` | Objetos observables comunes. |
| `src/lib/amv/core/observationOutputTypes.ts` | Forma comun de salida observacional. |
| `src/lib/amv/core/evidenceTypes.ts` | Evidence Trust y records. |
| `src/lib/amv/core/evidencePolicy.ts` | Reglas de decision, visibilidad y regimen. |
| `src/lib/amv/core/archiveLayerPolicy.ts` | Politica Archivo / Vivo / Atractor / Sandbox / Auditoria. |
| `src/lib/amv/core/pythonBridgeContract.ts` | Tipos TS para contrato Python. |
| `src/lib/amv/agents/evidenceAgent.ts` | Evaluador puro de evidencia. |
| `src/lib/amv/agents/cognitiveTwinBridgeAgent.ts` | Respuesta degradada sin invocar Python. |
| `docs/amv/AMV_OBSERVATIONAL_MODES.md` | Documento de modos. |
| `docs/amv/AMV_EVIDENCE_LAYER.md` | Documento de evidencia. |
| `docs/amv/AMV_PYTHON_COGNITIVE_TWIN_CONTRACT.md` | Documento de frontera Python. |

## Archivos modificados

| Archivo | Cambio |
| --- | --- |
| `src/lib/amv/core/instrumentTypes.ts` | Instrumentos y paneles pueden declarar modos, objetos, focus variables, trust y capas. |
| `src/lib/amv/core/dashboardSpecTypes.ts` | Dashboard specs pueden declarar el mismo contrato observacional. |
| `src/lib/amv/scopes/root/rootDashboardSpec.ts` | ROOT declara los cuatro modos y sus paneles reducen evidencia/modo por uso. |
| `docs/amv/AMV_SCOPE_CONTRACT.md` | Actualizado con contrato observacional. |
| `docs/amv/AMV_INSTRUMENT_TEMPLATE.md` | Actualizado con ejemplo de modos/evidencia. |

## Modos disponibles

- `audit`
- `mihm`
- `worldspect`
- `focus`

## Evidence Trust

- `verified`: puede sostener decision fuerte.
- `declared`: lectura operativa si tiene operador y timestamp.
- `inferred`: visible solo si cambia ruta, riesgo o cierre.
- `simulated`: no alimenta regimen.
- `sandbox`: no alimenta regimen.
- `audit`: no gobierna experiencia principal.
- `unknown`: no se promueve.

## Contrato Python

El contrato TypeScript define:

- `CognitiveTwinRequest`
- `CognitiveTwinResponse`
- `EpistemicEventPayload`
- `CognitiveGraphPayload`
- `PythonBridgeStatus`
- `DegradedPythonResult`

Estado actual: `available_not_invoked`.

No se ejecuto Python. No se importo `services/python`. No se toco Supabase schema ni migraciones.

## Como declara evidencia un scope

Un instrumento declara:

```ts
observationModes: ['audit', 'mihm', 'worldspect', 'focus'],
observableObjects: ['persona', 'senal', 'evidencia', 'decision', 'accion'],
focusVariables: ['riesgo', 'latencia', 'deuda', 'ejecucion'],
evidenceTrust: ['verified', 'declared', 'inferred'],
archiveLayers: ['sfi_archive', 'living_observatory', 'attractor', 'sandbox', 'technical_audit'],
```

Un panel puede declarar un subconjunto:

```ts
observationMode: 'focus',
observableObjects: ['decision', 'accion', 'evidencia'],
focusVariables: ['riesgo', 'ejecucion'],
evidenceTrust: ['verified', 'declared', 'inferred'],
```

## Riesgos

- El contrato Python aun no valida schemas en runtime.
- La API `cognitive-twin` existente sigue siendo shim y no invoca Python.
- `declared` depende de que los productores aporten operador y timestamp.
- `inferred` requiere disciplina de UI: no debe mostrarse si no cambia ruta, riesgo o cierre.
- Las capas de archivo aun son politica AMV; no mueven datos ni reclasifican persistencia.
