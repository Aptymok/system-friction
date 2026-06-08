# ROOT Full Ecosystem Assembly Report

## Scopes

Registrados en AMV: `governance-reality`, `scorefriction`, `cluster-atlas`, `signal-vane`, `cognitive-twin-engine`.

ROOT permanece como scope existente. No se creo otro AMV.

## Rutas

- `/governance-reality`
- `/scorefriction` usa la ruta existente y monta el dashboard AMV scoped.
- `/cluster-atlas`
- `/signal-vane`
- `/cognitive-twin-engine`
- `/api/amv/graph`
- `/api/amv/projection`
- `/api/amv/python-bridge`
- `/api/amv/export`
- `/api/amv/save-reading`
- `/api/amv/upload-contract`

## Componentes

- `ScopedDashboardShell` consume specs AMV existentes.
- `AmvGraphField`
- `AmvProjectionVisor`
- `ScenarioMatrixPanel`
- `JsonExportButton`
- `SaveReadingButton`
- `ObjectUploadContractPanel`
- `AuditMihmUploadPanel`
- `UseCaseLauncher`
- `ReportTemplateSelector`
- `NoMamesInsightPanel`

## Agentes

Cada instrumento tiene descriptor en `src/lib/amv/agents/*Agent.ts`. Ninguno ejecuta fuera de AMV ni escribe DB.

## Contratos

Se agregaron contratos de grafo, proyeccion, Python bridge, WorldSpect bridge, MIHM bridge, acceso, permisos, export, save-reading, upload, reportes y casos de uso.

## Skeleton

Los scopes especificos delegan en `ecosystemInstrumentFactory.ts` para mantener runtime unico y evitar duplicar AMV.

## Degraded / Safe

Sin contexto visible, las lecturas quedan degradadas. Proyeccion es `sandboxOnly`. Save-reading no simula persistencia. Upload queda `blocked_requires_schema`.

## Legacy Vivo

No se borro legacy. Consumidores vivos:

- `/api/amv/respond`: `AMVChat.tsx`.
- `/api/amv/field-response`: `SfiCognitiveCanvasTerminal.tsx`.
- `/api/liturgia/amv`: campo, ontology y panel liturgia ROOT.

## Que No Se Toco

No Supabase schema. No migrations. No Python execution. No import directo a `services/python`. No chats separados. No fuentes inventadas. No MOP-H privado expuesto.

## Faltante Para Produccion

- Persistencia autorizada para readings.
- Storage/schema para uploads reales.
- Tests contractuales por endpoint.
- Autorizacion por cuenta/scope conectada a auth real.
- Reentrada Cognitive Twin solo si cumple cuarentena y criterios documentados.

## Riesgos

- Worktree ya contenia cambios AMV/ROOT sin trackear.
- Legacy sigue activo por consumidores reales.
- ScoreFriction no puede tener dos `page.tsx` para la misma ruta; se uso la ruta existente.

## Siguiente PR

Agregar tests de contrato para `/api/amv/*`, conectar permisos reales por cuenta y evaluar migracion de consumidores legacy hacia AMV scoped sin borrar rutas antiguas.
