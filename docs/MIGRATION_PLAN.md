# MIGRATION PLAN

Fecha: 2026-05-21  
Fase: FASE 7A - Migration Plan operacional

## Objetivo

Definir el orden exacto de migracion desde `src` actual hacia el monorepo SFI sin mover codigo todavia.

Este plan no ejecuta migracion. Establece secuencia, riesgos, rollback, pruebas, owner domain y criterio de corte.

## Principios operativos

- No mover codigo sin contrato estable.
- No migrar runtime experimental antes de aislarlo.
- No permitir acceso directo de apps futuras a DB.
- No cortar `/terminal` hasta que consuma contratos equivalentes.
- No convertir estado cliente en verdad canonica.
- No salvar procesos por inercia ni clausurar sin criterio.

## Orden de migracion

| Orden | Proceso | Ruta actual | Destino objetivo | Estado | Owner domain | Criterio de corte |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Contratos canonicos | `packages/api-contracts`, `packages/campo-ob`, `packages/events` | Mantener/expandir contratos | SALVAR | FIELD CORE + API CORE | Typecheck y boundary check limpios; DTOs versionados. |
| 2 | Node bootstrap contract | `src/app/api/node/bootstrap/route.ts` | `services/api` + contrato `NodeBootstrapResponseV1` | SALVAR | FIELD CORE + SECURITY CORE | Respuesta legacy compatible y contrato v1 validado. |
| 3 | Source health read models | `worldspect/global`, `runtime_status`, sources sociales | `services/api` queries + `packages/sources` | MIGRAR | INTEGRATION CORE | Queries read-only devuelven `SourceHealthDTO` sin inventar dato vivo. |
| 4 | Field events | `src/app/api/field/persist/route.ts` action `field_event` | comando `field-events.create` | REESCRIBIR | FIELD CORE | Idempotency key, ownership y event contract funcionando en paralelo. |
| 5 | Logbook events | `field/persist`, `sfi_logbook`, `sfi/assets` | comando `logbook-events.create` | SALVAR/MIGRAR | FIELD CORE | Ownership de asset validado; logbook conserva historial. |
| 6 | WorldSpect snapshots | `field/persist`, `worldspect/global` | `worldspect-snapshots` | MIGRAR | FIELD CORE + INTEGRATION CORE | Snapshot sin fuente queda `missing`, no medido. |
| 7 | SFI assets y measurements | `src/app/api/sfi/assets` | API v1 en gateway | SALVAR | FIELD CORE + SECURITY CORE | Crear/listar/medir asset con auth y logbook equivalente. |
| 8 | Media drafts | `field/persist` action `social_draft` | `media-drafts.upsert` | MIGRAR | AGENT CORE + FIELD CORE | Upsert compatible, sin acoplar UI a persistencia. |
| 9 | Social returns | `field/persist`, `src/observatory/social` | comandos manuales + ingestion read-only | MIGRAR | INTEGRATION CORE | Manual y OAuth separados, source descriptors y consent claros. |
| 10 | Terminal consumer boundary | `src/app/(terminal)/terminal`, `src/observatory` | consumidor `FieldState`, `NodeState`, `Logs`, `SourceHealth` | MIGRAR | INTERFACE CORE | UI no calcula verdad; conserva compatibilidad visual. |
| 11 | Auth/context hardening | `src/lib/auth`, `src/lib/server/productionBackend.ts`, `src/runtime/supabase` | `packages/security` + API guards | MIGRAR | SECURITY CORE | AuthN/AuthZ por request, least privilege, audit logs. |
| 12 | Webhooks y cron | `src/app/api/webhooks`, `src/app/api/cron*` | integration handlers firmados | REESCRIBIR | INTEGRATION CORE + SECURITY CORE | Firma, replay protection, idempotencia y source verification. |
| 13 | Agent memory | `src/lib/memory`, `src/app/api/liturgia/amv` | `services/agent` + event contracts | MIGRAR/AISLAR | AGENT CORE | Inferencias con confidence, lineage y no-conciencia. |
| 14 | Runtime kernel | `src/runtime/kernel`, `src/runtime/layers` | experimental service/package | AISLAR | AGENT CORE | Feature flag, no write productivo, audit y schemas. |
| 15 | CognitiveTwin | `services/python/cognitive_twin`, `src/app/api/cognitive-twin` | paquete experimental en cuarentena | AISLAR | AGENT CORE experimental | Solo reentra con IO contract, fixtures, lineage y revision humana. |
| 16 | Experimental self-healing | `src/experimental`, `src/lib/safety` | clausura o sandbox futuro | CLAUSURAR | SECURITY CORE + AGENT CORE | No autoparcheo ni self-repair productivo. |

## Procesos SALVAR

| Proceso | Ruta | Riesgo | Rollback | Pruebas requeridas | Owner domain | Criterio de corte |
| --- | --- | --- | --- | --- | --- | --- |
| Node bootstrap | `src/app/api/node/bootstrap/route.ts` | Medio: endpoint constitutivo con muchas fuentes. | Mantener handler legacy activo; adapter reversible. | Contract test, auth session, usuario sin nodo, asset list, memory facts. | FIELD + SECURITY | Nueva respuesta versionada cubre campos actuales sin ruptura. |
| SFI assets | `src/app/api/sfi/assets` | Medio: ownership/licensing. | Volver a handler actual. | Crear/listar asset, root access, user access, invalid payload. | FIELD + SECURITY | API v1 registra asset y logbook de forma equivalente. |
| SFI measurements | `src/app/api/sfi/assets/[asset_id]/measurements` | Medio: integridad por asset. | Mantener ruta actual. | Asset owner, non-owner denied, measurement schema, logbook emitted. | FIELD | Measurement queda trazada con checksum/source. |
| `cognitive_event_stream` | DB table via migrations | Alto: ledger compartido por muchas rutas. | No alterar tabla hasta adapter paralelo. | Adapter legacy, idempotency simulation, sequence integrity. | FIELD | Eventos nuevos tienen schema versionado y lineage. |
| `sfi_logbook` | DB table + helpers | Medio: bitacora de assets. | Mantener inserts legacy. | Log creation, asset ownership, replay duplicate. | FIELD | LogRecord canonico mapea historial existente. |
| WorldSpect global | `src/app/api/worldspect/global/route.ts` | Bajo: ya declara `missing`. | Volver a query actual. | No snapshot, snapshot medido, source health. | INTEGRATION + FIELD | Nunca presenta missing como dato vivo. |
| Supabase runtime | `src/runtime/supabase` | Bajo/medio: clientes sensibles. | Mantener modulo actual hasta package listo. | Server client, browser client, service client isolation. | SECURITY + INTEGRATION | Service role encapsulado server-only. |

## Procesos AISLAR

| Proceso | Ruta | Riesgo | Rollback | Pruebas requeridas | Owner domain | Criterio de corte |
| --- | --- | --- | --- | --- | --- | --- |
| Runtime kernel | `src/runtime/kernel`, `src/runtime/layers` | Alto: plan/simulacion/ejecucion mezclados. | Feature flag off; no writes. | No-write test, schema validation, audit trail. | AGENT | Solo corre en experimental sin afectar FieldState. |
| CognitiveTwin Python | `services/python/cognitive_twin` | Alto: inferencias no probadas. | Mantener fuera del runtime. | Fixture IO, lineage, checksum, no first-person subjectivity. | AGENT experimental | Publica solo eventos inferidos con confidence y lineage. |
| CognitiveTwin API shim | `src/app/api/cognitive-twin/route.ts` | Medio: nombre promete servicio no invocado. | Renombrar/ocultar ruta en fase futura. | FormData rejected/accepted, no file analysis claim. | AGENT experimental | No se presenta como twin funcional. |
| Admin APIs | `src/app/api/admin/*` | Alto: acciones privilegiadas. | Mantener separadas del dashboard principal. | Root-only, audit log, denied user. | SECURITY | Admin vive en consola separada. |
| Cron jobs | `src/app/api/cron*` | Alto: mutacion sin identidad robusta. | Scheduler off. | Cron secret, replay protection, idempotency. | INTEGRATION + SECURITY | No mutan sin source identity. |
| Agents TS | `src/agents` | Alto: mezcla dominio e IA. | Mantener fuera de core. | Per-agent IO contract y no DB direct test. | AGENT | Cada agente clasificado antes de migrar. |
| Operational memory | `src/observatory/operational` | Medio: memoria en proceso. | No usar como persistencia. | Restart loss test, sourceState labels. | AGENT | Solo cache/derived, nunca canonico. |

## Procesos CLAUSURAR

| Proceso | Ruta | Riesgo | Rollback | Pruebas requeridas | Owner domain | Criterio de corte |
| --- | --- | --- | --- | --- | --- | --- |
| Self-healing/self-repair | `src/experimental/kernel`, `src/lib/safety` | Alto: autoparcheo incompatible con zero trust. | Mantener codigo inerte o remover en fase autorizada. | No execution path, no file write path. | SECURITY | Ningun runtime productivo puede invocarlo. |
| Generic kernel routes externos | `createKernelRoute` usado en telemetry/webhooks/cron | Alto: body arbitrario, sin firma uniforme. | Mantener solo mientras no haya reemplazo; bloquear nuevos usos. | Route inventory, schema/firma tests en reemplazo. | INTEGRATION + SECURITY | Webhooks/cron migrados a handlers especificos. |
| Telemetry ingest generico | `src/app/api/telemetry/ingest/route.ts` | Alto: nombre no corresponde a ingestion trazable. | Desactivar write productivo hasta nuevo ingest. | SourceEvent schema, idempotency, source verification. | INTEGRATION | Ingestion real existe y pasa audit. |
| World-spectrum POST generico | `src/app/api/world-spectrum/route.ts` | Alto: mismatch con cliente/semantica. | Usar `worldspect/global` read-only. | Contract query, missing snapshot. | INTEGRATION | No expone POST generico a kernel. |
| Memoria global como verdad | `src/observatory/operational/storage.ts` | Medio: se pierde en restart. | Etiquetar como local/cache. | Restart test, no canonical read. | AGENT | No alimenta FieldState canonico. |

## Procesos REESCRIBIR

| Proceso | Ruta | Riesgo | Rollback | Pruebas requeridas | Owner domain | Criterio de corte |
| --- | --- | --- | --- | --- | --- | --- |
| API gateway | `src/app/api` monolitico | Alto: dominios mezclados. | Mantener rutas Next hasta gateway paralelo. | Contract tests, authz, route category tests. | API + SECURITY | Cada ruta tiene dominio unico. |
| Field persist | `src/app/api/field/persist/route.ts` | Alto: multiplexor critico. | Legacy endpoint activo hasta consumidores migrados. | Command tests por grupo, idempotency, ownership. | FIELD + INTEGRATION | Todos los comandos pequenos cubren acciones legacy. |
| Webhooks | `src/app/api/webhooks`, `src/app/api/whatsapp/webhook` | Alto: source verification. | No procesar mutaciones externas. | Signature, timestamp, replay, payload hash. | INTEGRATION + SECURITY | Webhook no usa handler generico. |
| Rate limit | `src/lib/auth/rateLimit.ts` | Medio: memoria local. | Mantener limit actual mientras se agrega durable store. | Repeated attempts, restart persistence. | SECURITY | Rate limit durable o externalizado. |
| UI metric truth | `pulseEngine`, `useTelemetryPulse`, `nodeStore.metrics` | Alto: UI calcula verdad. | Marcar como visual/local. | No canonical write, visual_estimate label. | INTERFACE + FIELD | Metricas canonicas vienen de FieldState. |

## Rollback general

Todo corte debe cumplir:

- handler legacy permanece disponible hasta que consumidor nuevo pase pruebas;
- migracion se activa por ruta paralela o feature flag;
- writes nuevos usan idempotency key para evitar duplicados;
- si falla validacion, UI vuelve a endpoint legacy;
- no se modifica schema DB sin migracion reversible;
- logs de auditoria permiten identificar comandos emitidos por nueva ruta;
- se mantiene compatibilidad de respuesta publica durante una ventana definida.

## Pruebas requeridas por capa

| Capa | Pruebas minimas |
| --- | --- |
| Contracts | Typecheck, boundary check, shape tests de DTOs. |
| Security | AuthN/AuthZ por request, denied access, role/root behavior, service role isolation. |
| Field | Idempotency, ownership, event emission, canonical state derivation, missing/source labels. |
| Integration | Signature verification, replay protection, source health, payload hash. |
| Interface | `/terminal` renderiza con legacy y con adapter, no calcula truth canonica. |
| Agent | No first-person consciousness claim, confidence/lineage required, no DB direct. |
| DB | RLS, migrations reversible, sequence integrity, duplicate prevention. |

## Criterio de corte por proceso

Un proceso puede cortarse del legacy cuando:

- tiene contrato versionado;
- owner domain declarado;
- pruebas minimas pasan;
- rollback documentado y probado;
- no introduce imports prohibidos por boundaries;
- no cambia respuesta publica sin compatibilidad;
- no da acceso directo a DB a apps consumidoras;
- no presenta datos simulados o missing como observados;
- reporte de fase registra comandos y resultados.

## Primer corte recomendado

El primer corte real debe ser read-only:

1. `node/bootstrap` contract adapter.
2. `SourceHealthDTO` para `worldspect/global` y runtime diagnostics.
3. Adapter de `/terminal` hacia read model canonico.

No se recomienda iniciar por `field/persist`, webhooks, cron ni CognitiveTwin. Esos procesos tienen mayor blast radius y requieren enforcement de seguridad antes de corte productivo.

## No-goals FASE 7A

- No mover codigo.
- No modificar `src`.
- No cambiar rutas productivas.
- No tocar DB.
- No tocar Supabase/auth.
- No tocar `/terminal`.
- No implementar gateway.
- No implementar Evaluator.
