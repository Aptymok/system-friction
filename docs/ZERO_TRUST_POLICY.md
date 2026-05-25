# ZERO TRUST POLICY

Fecha: 2026-05-21  
Fase: FASE 3A - politica documental Zero Trust

## Principio

No implicit trust.

Ningun actor, app, servicio, webhook, cron, componente UI, agente experimental o fuente externa es confiable por ubicacion, nombre, ruta o intencion declarada.

## Politicas base

### AuthN por request

Cada request debe identificar al actor o fuente:

- usuario autenticado;
- servicio interno autorizado;
- webhook firmado;
- scheduler autorizado;
- fixture/demo marcado.

No se hereda confianza de una sesion anterior sin validacion actual.

### AuthZ por request

Cada accion debe validar:

- actor;
- recurso;
- nodo/asset owner;
- rol/capability;
- intencion de escritura;
- impacto operacional.

### Least privilege

- Apps no acceden a DB.
- UI no usa service role.
- Service role solo vive server-side y en repositorios controlados.
- Agent Core no escribe directo a DB.
- Ingestion no declara verdad del campo sin pasar por API/policy.

### Idempotency

Toda operacion con efectos laterales debe aceptar o generar idempotency key.

Aplica a:

- webhooks;
- cron jobs;
- field events;
- logbook entries;
- source events;
- agent proposals que se conviertan en comandos.

### Schema validation

Todo input externo o cross-boundary debe validarse antes de uso.

Minimo:

- tipo de evento;
- version de contrato;
- payload;
- actor/source;
- timestamps;
- confidence y epistemic class cuando aplique.

### Replay protection

Webhooks y cron deben tener proteccion contra replay:

- firma;
- timestamp;
- nonce/event id;
- ventana de aceptacion;
- registro de event ids procesados.

### Source verification

Toda fuente debe declarar:

- `sourceId`;
- tipo de fuente;
- estado de fuente;
- firma o metodo de verificacion cuando exista;
- freshness;
- confidence;
- uncertainty.

### Audit logs

Toda accion sensible debe emitir audit log:

- actor;
- accion;
- recurso;
- policy decision;
- timestamp;
- correlation id;
- checksum si hay payload relevante;
- resultado.

Audit logs no son decoracion. Son parte de la operacion.

## Politicas por dominio

### Interface Core

- Puede observar.
- Puede enviar comandos.
- No calcula verdad.
- No persiste verdad.
- No confia en localStorage.

### API Core

- Valida schema.
- Aplica authN/authZ.
- Enruta comandos.
- No acepta payloads ambiguos.

### Field Core

- Produce FieldState/NodeState/Logs.
- Distingue observed/declared/derived/inferred/simulated/fixture/missing.
- No acepta escrituras sin policy.

### Agent Core

- Propone, no decide por defecto.
- Toda inferencia lleva confidence y lineage.
- Toda simulacion se marca como simulated.
- CognitiveTwin queda en cuarentena hasta pruebas.

### Integration Core

- Verifica fuentes.
- No escribe directo al campo.
- No convierte ausencia de dato en dato inventado.

### DB Core

- Encapsula repositorios.
- Protege service role.
- Requiere audit para escrituras privilegiadas.

## Criterios de rechazo

Un request o evento debe rechazarse si:

- no tiene actor/fuente verificable;
- no pasa schema validation;
- intenta saltarse API hacia DB;
- intenta escribir sin idempotency key cuando aplica;
- usa clase epistemica incompatible;
- no tiene ownership valido;
- es replay;
- intenta presentar `simulated` como `observed`;
- depende de localStorage como evidencia directa.

