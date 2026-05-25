# THREAT MODEL

Fecha: 2026-05-21  
Fase: FASE 3A - Threat Model + Zero Trust documental

## Objetivo

Identificar activos criticos, actores, superficies de ataque y trust boundaries del Observatorio SFI antes de implementar enforcement runtime.

Este documento no implementa controles. Define el mapa de riesgo para fases posteriores.

## Activos criticos

| Activo | Descripcion | Riesgo principal |
|---|---|---|
| Identidad de usuario | Sesiones, cookies, perfiles, roles. | Suplantacion, escalamiento de privilegios. |
| Roles root/system | Capacidades administrativas y bypass. | Abuso de privilegio, acciones no auditadas. |
| Service role Supabase | Llave con privilegios elevados. | Exfiltracion, escritura no autorizada, bypass RLS. |
| `nodes` | Nodo constitutivo del usuario/agente. | Lectura cruzada, ownership roto. |
| `sfi_assets` y logbook | Activos operativos y bitacora. | Manipulacion de evidencia, perdida de trazabilidad. |
| `cognitive_event_stream` | Ledger de eventos del campo. | Eventos falsos, replay, corrupcion de lineage. |
| WorldSpect snapshots | Fuente de contexto medido o estado missing. | Dato vivo fingido, snapshot obsoleto. |
| APIs internas | Comandos, persistencia, admin, cron, webhooks. | Entrada sin schema/auth, abuso de endpoint. |
| Webhooks | Stripe, WhatsApp y futuros conectores. | Payload falso, replay, falta de firma. |
| Cron/jobs | Wake, publish, worldspec, recompute futuro. | Ejecucion no autorizada o repetida. |
| localStorage | Cache local de nodo/snapshots. | Confusion con estado verdadero, manipulacion cliente. |
| CognitiveTwin | Pipeline experimental de inferencias. | Falsa conciencia, inferencias sin lineage, fuga de datos. |
| Secretos | `.env`, tokens, DB URLs, API keys. | Exposicion, persistencia en repo, uso indebido. |

## Actores

| Actor | Capacidades esperadas | Amenazas |
|---|---|---|
| Usuario anonimo | Ver contenido publico. | Probar endpoints, abuso de formularios. |
| Usuario autenticado | Acceder a su nodo y assets. | Intentar leer/escribir nodos ajenos. |
| Root/system | Administrar, observar metricas globales. | Accion sin auditoria, error de alto impacto. |
| Servicio externo legitimo | Enviar webhook firmado o dato externo. | Replay, payload mal formado. |
| Atacante externo | Sin confianza. | Credential stuffing, endpoint probing, payload injection. |
| App futura | Consumir APIs controladas. | Saltarse API y acceder a DB directa. |
| Agente experimental | Proponer/inferir. | Escribir decision como verdad sin evidencia. |
| Operador tecnico | Mantener sistema. | Exponer secreto, ejecutar cambio sin rollback. |

## Superficies de ataque

- `src/app/api`: superficie HTTP monolitica actual.
- Rutas que usan `createKernelRoute`: parsean body y delegan sin auth/schema suficientes.
- `field/persist`: multiplexor amplio de escrituras.
- Admin routes: root checks basicos, alto impacto.
- Webhooks: requieren verificacion de firma y replay protection.
- Cron routes: requieren identidad de scheduler, idempotencia y secreto.
- Supabase service client: requiere aislamiento server-only y menor superficie.
- Browser/localStorage: no confiable para verdad del campo.
- OAuth/read-only social ingestion: scopes, tokens y consentimiento.
- Python services/CognitiveTwin: aislamiento, datos sensibles y outputs inferidos.
- Archivos `.env` y logs locales.

## Trust boundaries

| Boundary | Cruza desde | Hacia | Control requerido |
|---|---|---|---|
| Browser -> API | UI, localStorage, usuario | `services/api`/Next APIs actuales | AuthN, AuthZ, schema, rate limit. |
| Public webhook -> API | Stripe/WhatsApp/futuras fuentes | webhook handlers | Firma, timestamp, replay protection. |
| Cron scheduler -> API | Scheduler externo | cron handlers | Cron secret, idempotency key, audit log. |
| API -> DB | Server runtime | Supabase/Postgres | Least privilege, RLS, repository boundary. |
| Agent -> Field | Agent proposals | Field event store | Policy decision, epistemic class, lineage. |
| Integration -> Field | External data | Source events | Source verification, checksum, source health. |
| Demo/test -> App | Fixtures | UI/demo | `fixture`/`simulated`, no datos reales. |
| Experimental -> Core | CognitiveTwin/kernel experimental | contracts/core | Quarantine, no DB direct, no truth writes. |

## Rutas criticas actuales

- `/terminal`: dashboard/campo actual; no debe confiar en localStorage como verdad.
- `/api/node/bootstrap`: hidrata NodeState; critico para ownership.
- `/api/field/persist`: multiplexer de escrituras; alto riesgo hasta dividir comandos.
- `/api/sfi/assets`: assets y logbook; requiere ownership fuerte.
- `/api/sfi/assets/[asset_id]/measurements`: mediciones; requiere schema e idempotencia.
- `/api/worldspect/global`: debe declarar `missing` si no hay dato medido.
- `/api/telemetry/ingest`: actualmente via kernel generico; requiere reescritura.
- `/api/webhooks/stripe`: requiere firma Stripe real.
- `/api/whatsapp/webhook`: requiere verificacion de proveedor.
- `/api/cron/*`: requiere scheduler identity.
- `/api/admin/*`: requiere MFA/policy/audit en fase posterior.

## Service role exposure

Riesgo: service role permite bypass de RLS si se usa en handlers amplios o cerca de inputs no validados.

Controles futuros:

- encapsular service role en `packages/db`/repos server-only;
- prohibir uso desde apps;
- registrar toda escritura privilegiada;
- minimizar endpoints que importan service client;
- rotar secretos y revisar historial.

## Webhooks

Riesgos:

- payload falso;
- replay de evento valido;
- falta de idempotencia;
- ausencia de raw body verification;
- mezcla con comando interno.

Controles futuros:

- verificar firma;
- validar timestamp;
- idempotency key por event id externo;
- schema validation antes de persistir;
- audit log separado.

## Cron

Riesgos:

- ejecucion por atacante;
- job repetido;
- orden incorrecto;
- efectos laterales no auditados.

Controles futuros:

- cron secret o identidad de scheduler;
- idempotency key;
- lock operacional;
- registros de inicio/fin/error;
- degradacion parcial si falla.

## localStorage como fuente no confiable

localStorage puede servir como cache visual o experiencia local. No debe producir verdad canonica.

Reglas:

- no usar localStorage para `FieldState` canonico;
- marcarlo como `local_only` o cache;
- reconciliar contra API antes de persistir;
- nunca usarlo como evidencia directa.

## Agente experimental

Riesgos:

- accion automatizada sin policy;
- inferencias presentadas como observacion;
- self-healing/self-repair sin aprobacion;
- simulacion confundida con dato real.

Controles futuros:

- quarantine por defecto;
- eventos epistemicos obligatorios;
- no escribir directamente en DB;
- policy gate antes de cualquier comando.

## CognitiveTwin cuarentena

CognitiveTwin queda en cuarentena hasta cumplir:

- contrato IO;
- lineage;
- confidence;
- checksum;
- tests de no-conciencia;
- aislamiento de datos;
- source classes `inferred`/`simulated` cuando corresponda.

## Secretos

Riesgos:

- `.env.production` contiene valores sensibles en el workspace;
- logs locales pueden exponer URLs o tokens;
- service role puede quedar disponible fuera de server boundary.

Controles futuros:

- rotacion de secretos;
- gestor de secretos;
- revision de historial Git;
- policy de no commit de env;
- secret scanning en CI.

