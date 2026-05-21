# API ROUTE INVENTORY

Fecha: 2026-05-22
Fase: FASE 10C - Route inventory security map

## Objetivo

Clasificar rutas API actuales por:

- dominio;
- riesgo;
- ownership;
- writes;
- estado arquitectonico;
- accion requerida.

## Clasificacion de riesgo

- LOW → lectura controlada o route paralela endurecida.
- MEDIUM → write controlado pero requiere endurecimiento.
- HIGH → mezcla dominios, kernel generico o writes amplios.
- CRITICAL → acceso amplio, admin, webhooks o ingestion sin endurecimiento completo.

| route | method | domain | current risk | auth requirement | writes DB? | uses createKernelRoute? | owner domain | action | phase target |
|---|---|---|---|---|---|---|---|---|---|
| /api/signals | POST | FIELD CORE | MEDIUM | ownership required | yes | no | FIELD CORE | keep + harden | 11+ |
| /api/signals/read | GET | FIELD CORE | LOW | ownership required | no | no | FIELD CORE | keep | 11 |
| /api/field/state | GET | FIELD CORE | LOW | ownership required | no | no | FIELD CORE | keep | 11 |
| /api/field/events | POST | FIELD CORE | MEDIUM | auth required | yes | no | FIELD CORE | harden | 11 |
| /api/field/persist | POST | FIELD CORE | HIGH | mixed | yes | partial | FIELD CORE | rewrite | 12+ |
| /api/node/bootstrap | GET | FIELD CORE + SECURITY | MEDIUM | ownership required | reads | no | SECURITY CORE | migrate contracts | 11 |
| /api/worldspect/global | GET | INTEGRATION CORE | MEDIUM | unclear | reads | partial | INTEGRATION CORE | rewrite | 12 |
| /api/world-spectrum | POST/GET | INTEGRATION CORE | HIGH | unclear | mixed | yes | INTEGRATION CORE | quarantine/rewrite | 12+ |
| /api/cognitive-twin | POST | AGENT EXPERIMENTAL | HIGH | auth unclear | memory only | no | AGENT CORE experimental | quarantine | 12+ |
| /api/liturgia/amv | POST | AGENT CORE | HIGH | mixed | yes | partial | AGENT CORE | rewrite | 12+ |
| /api/amv/session | POST | AGENT LEGACY | HIGH | unclear | mixed | yes | AGENT LEGACY | quarantine | 12+ |
| /api/amv/respond | POST | AGENT LEGACY | HIGH | unclear | mixed | yes | AGENT LEGACY | quarantine | 12+ |
| /api/telemetry/ingest | POST | INTEGRATION CORE | HIGH | unclear | yes | yes | INTEGRATION CORE | rewrite | 12 |
| /api/telemetry/sources | GET/POST | INTEGRATION CORE | MEDIUM | auth required | yes | partial | INTEGRATION CORE | harden | 12 |
| /api/webhooks/stripe | POST | INTEGRATION CORE | CRITICAL | signature required | yes | yes | SECURITY + INTEGRATION | rewrite | 12 |
| /api/whatsapp/webhook | POST | INTEGRATION CORE | CRITICAL | verification required | yes | yes | SECURITY + INTEGRATION | rewrite | 12 |
| /api/cron/worldspect | POST | INTEGRATION CORE | HIGH | cron secret expected | possible | partial | INTEGRATION CORE | harden | 12 |
| /api/cron/wake-agent | POST | AGENT CORE | HIGH | cron secret expected | yes | yes | AGENT CORE | rewrite | 12+ |
| /api/cron/publish | POST | AGENT CORE | HIGH | cron secret expected | yes | yes | AGENT CORE | rewrite | 12+ |
| /api/cron-agent | POST | AGENT EXPERIMENTAL | HIGH | unclear | memory/global | no | AGENT EXPERIMENTAL | quarantine | 12+ |
| /api/admin/* | mixed | SECURITY CORE | CRITICAL | root/admin required | yes | partial | SECURITY CORE | isolate + audit | 12 |
| /api/subscription | GET/POST | SECURITY CORE | MEDIUM | auth required | yes | partial | SECURITY CORE | harden | 12 |

## Observaciones estructurales

### createKernelRoute

Rutas que aun usan createKernelRoute deben considerarse de riesgo elevado hasta:

- separar schemas;
- separar authz;
- separar ingestion;
- separar webhooks;
- separar cron;
- agregar idempotency formal.

### FIELD CORE

Routes nuevas paralelas:

- /api/signals
- /api/signals/read
- /api/field/state

Representan direccion constitucional correcta:

- read-only separado;
- reducers puros;
- eventos trazables;
- epistemologia explicita.

### AGENT EXPERIMENTAL

CognitiveTwin y AMV legacy permanecen experimentales.

No deben considerarse fuentes de verdad operacional.

### INTEGRATION CORE

Webhooks y cron representan superficie critica.

Deben endurecerse antes de:

- ingestion externa real;
- aplicaciones consumidoras;
- integraciones institucionales.
