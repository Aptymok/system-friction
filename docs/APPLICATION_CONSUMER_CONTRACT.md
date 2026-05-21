# APPLICATION CONSUMER CONTRACT

Fecha: 2026-05-21  
Fase: FASE 6A - Consumer Contract para apps futuras

## Principio

Las aplicaciones futuras son consumidoras del Observatorio SFI. No acceden directamente a base de datos, secretos, tablas Supabase, storage interno ni rutas privadas.

Todo acceso ocurre mediante APIs controladas del Observatorio, con contrato explicito, capacidades declaradas, autenticacion por request, autorizacion por scope y auditoria.

## Contrato canonico

El contrato base vive en:

- `packages/api-contracts/src/index.ts`

Tipos principales:

- `ObservatoryConsumerContract`
- `AppIdentity`
- `AppScope`
- `ReadCapability`
- `WriteCapability`

Propiedades obligatorias:

- `directDatabaseAccess: false`
- `accessPath: 'observatory-api'`
- `evaluatorEnabled: false`

## Regla de acceso

Una app futura puede:

- consumir `FieldStateDTO`;
- consumir `NodeStateDTO`;
- consumir `LogEntryDTO`;
- consumir `SourceHealthDTO`;
- leer eventos autorizados;
- enviar comandos solo si su `WriteCapability` lo permite;
- presentar vistas propias sin calcular verdad canonica.

Una app futura no puede:

- importar `packages/db`;
- leer Supabase directamente;
- usar service role;
- consultar tablas internas;
- modificar auth;
- reusar secretos del Observatorio;
- calcular regimen, degradacion o capacidad operativa como verdad canonica;
- escribir eventos sin idempotency key, correlacion y autorizacion.

## Apps normadas

| App | `AppScope` | Estado | Lecturas permitidas iniciales | Escrituras permitidas iniciales | Restriccion principal |
| --- | --- | --- | --- | --- | --- |
| evaluator | `evaluator` | bloqueada hasta Fase 8 | ninguna en runtime productivo | ninguna | No se implementa ni habilita antes de Fase 8. |
| diagnostico organizacional | `organizational-diagnosis` | futura | `field-state:read`, `node-state:read`, `logs:read`, `risk-state:read` | `annotations:write` bajo autorizacion | No accede a DB ni calcula diagnostico canonico sin trazabilidad. |
| intake documental | `document-intake` | futura | `source-health:read`, `logs:read` | `commands:write`, `source-events:write` | No persiste documentos fuera de comandos autorizados. |
| observacion personal | `personal-observation` | futura | `field-state:read`, `node-state:read`, `logs:read` | `annotations:write` | No usa localStorage como memoria canonica. |
| curaduria editorial | `editorial-curation` | futura | `logs:read`, `events:read`, `proposals:read` | `annotations:write`, `proposals:write` | No convierte inferencias editoriales en hechos observados. |
| monitoreo institucional | `institutional-monitoring` | futura | `field-state:read`, `source-health:read`, `events:read`, `risk-state:read` | ninguna por defecto | No conecta fuentes externas sin contrato de integracion. |
| laboratorio experimental | `experimental-lab` | cuarentena | fixtures y datos simulados | ninguna productiva | No toca DB ni datos productivos. |
| demo publica | `public-demo` | demostrativa | fixtures declarados | ninguna | No muestra dato vivo ni privado. |

## Ejemplo correcto

```ts
const contract: ObservatoryConsumerContract = {
  contractVersion: '2026-05-21.phase-6a',
  app: {
    appId: 'public-demo',
    displayName: 'Demo publica',
    scope: 'public-demo',
    owner: 'sfi',
    environment: 'demo',
  },
  reads: ['field-state:read', 'source-health:read'],
  writes: [],
  directDatabaseAccess: false,
  accessPath: 'observatory-api',
  evaluatorEnabled: false,
};
```

## Ejemplo incorrecto

```ts
// Prohibido: una app futura no puede leer DB directamente.
import { repository } from 'packages/db';
```

## Evaluator

`evaluator` queda bloqueado hasta Fase 8.

Antes de Fase 8 no debe:

- ejecutarse como runtime;
- calcular evaluaciones productivas;
- escribir resultados;
- consumir datos vivos;
- inferir estado del campo;
- presentarse como modulo funcional.

En esta fase solo queda nombrado como `AppScope` y restringido por `evaluatorEnabled: false`.

## Frontera constitucional

Las apps futuras observan el Observatorio. No sustituyen al Observatorio. No calculan verdad del campo. No acceden a la base de datos.
