# REPO FORENSIC AUDIT

Fecha: 2026-05-21  
Modo: FASE 0 · inventario forense sin cambios de codigo  
Objetivo: clasificar el repo actual antes de migrar hacia una base limpia del Observatorio SFI conforme a CAMPO-OB / MIHM.

## Dictamen ejecutivo

El repo actual es una aplicacion Next.js monolitica con App Router, Supabase/Postgres, UI de observatorio, APIs operacionales, agentes experimentales y servicios Python en un mismo paquete. No es monorepo todavia. La base util existe, pero mezcla superficies de confianza distintas: UI cliente, service-role Supabase, rutas API con contexto usuario, rutas API sin auth via `createKernelRoute`, memoria local en proceso, persistencia remota, simuladores y lenguaje de agente.

La migracion limpia debe salvar el nucleo trazable: auth, contexto usuario/nodo, assets SFI, logbook, eventos persistidos, snapshots WorldSpect medidos y componentes UI que representen estados verificables. Debe aislar o reescribir todo lo que aparenta autonomia viva, self-healing, simulacion cognitiva, cron/webhooks sin firma, memoria global en proceso o inferencias no trazables.

Principio operativo aplicado: nada se salva por inercia; nada se destruye por ansiedad.

## Estructura actual observada

- `src/app`: Next.js App Router. Contiene paginas, route groups y APIs.
- `src/app/(terminal)/terminal`: entrada actual del dashboard/campo SFI.
- `src/app/api`: 50+ route handlers. Mezcla APIs productivas, admin, cron, webhooks, simuladores y endpoints experimentales.
- `src/observatory`: dominio principal del observatorio: UI, field, worldspect, social, persistence, operational memory.
- `src/runtime`: Supabase runtime, kernel experimental y capas de planificacion/simulacion/ejecucion.
- `src/lib`: auth, server helpers, Supabase migrations, telemetry, memory, safety, licensing, validation.
- `src/agents`: agentes TS experimentales o de dominio.
- `src/experimental`: kernel/store/tools experimentales con self-healing y metakernel.
- `services/python`: servicios Python, principalmente `cognitive_twin` y `cognitive_orchestrator`.
- `docs`: documentos de arquitectura, QA y politicas.

## Framework detectado

- Next.js `^16.2.6`
- React `^19.2.6`
- TypeScript strict
- Tailwind CSS
- Supabase JS / SSR
- Zustand
- Stripe
- Recharts
- Servicios Python separados sin integracion productiva robusta

## Observacion de seguridad inmediata

Existe archivo `.env.production` con variables sensibles y cadenas de conexion. No se copian valores aqui. Antes de cualquier migracion: rotar secretos, sacarlos del repo, revisar historial Git y mover configuracion a un gestor de secretos.

## Tabla forense de procesos y modulos

| Nombre | Ruta | Funcion actual | Dependencias | Produce | Consume | Supabase | Auth | UI | IA/agente | Estado | Justificacion | Riesgo migracion | Prioridad |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Terminal page | `src/app/(terminal)/terminal/page.tsx` | Entrada cliente de `/terminal`; hidrata nodo, assets, modo local/remoto y renderiza `SfiFieldShell`. | React, Zustand, `SfiFieldShell`, `/api/node/bootstrap`, localStorage. | Estado UI, modo `local_only`/`supabase`, migracion local best-effort. | Auth session via API, `sfi_local_node`, assets. | Indirecto | Indirecto | Si | No directo | MIGRAR | Es la entrada actual del observatorio, pero debe renombrarse/consolidarse como dashboard constitutivo. | Medio | P0 |
| Observatory root | `src/observatory` | Dominio principal: field, components, worldspect, social, persistence, hooks, store. | React, Zustand, APIs internas, Supabase adapter. | Eventos de campo, drafts, snapshots, diagnosticos, UI operacional. | Nodo, assets, metricas, patrones, APIs. | Parcial | Parcial | Si | Parcial | MIGRAR | Contiene el producto real, pero esta mezclado con UI, persistencia y simulacion. Separar packages. | Alto | P0 |
| Field shell | `src/observatory/components/field/SfiFieldShell.tsx` | Superficie principal interactiva del campo SFI. | APIs `liturgia`, `bitacora`, `media`, `calendar`, `sfi/assets`, WorldSpect. | Comandos, persistencias, acciones UI, snapshots. | NodeId, assets, localNode, estados UI. | Indirecto | Indirecto | Si | Parcial | MIGRAR | Es nucleo del dashboard, pero demasiado acoplado. Requiere contratos API claros. | Alto | P0 |
| Terminal components legacy | `src/observatory/components/terminal` | Columnas, timeline, sidebar, AMV chat, memory, console. | React, APIs `amv`, `audit`, `link`, `social/post`, Supabase browser en sidebar. | Mensajes UI, auditorias, publicaciones. | Node store, endpoints. | Parcial | Parcial | Si | Si | AISLAR | No son la entrada actual principal; rescatar solo piezas utiles tras trazabilidad. | Medio | P2 |
| Runtime Supabase | `src/runtime/supabase` | Clientes Supabase server/service/browser y normalizacion URL. | `@supabase/ssr`, cookies Next. | Clientes DB/auth. | Env vars, cookies. | Si | Si | No | No | SALVAR | Base necesaria, aunque debe endurecer manejo de errores y secretos. | Bajo | P0 |
| Production backend context | `src/lib/server/productionBackend.ts` | Obtiene usuario, perfil, root bypass, service client y nodo propietario. | Supabase server/service, NextResponse. | Contexto `{user, profile, node, isRoot}`. | Cookies/auth, tablas `profiles`, `nodes`. | Si | Si | No | No | MIGRAR | Patron central valioso; debe moverse a package API/core con zero trust. | Medio | P0 |
| Auth actions | `src/lib/auth` | Registro, login, reset, logout y rate limit en memoria. | Supabase auth, Zod, Next server actions. | Sesiones, redirects. | Formularios, cookies. | Si | Si | No | No | MIGRAR | Util pero rate limit en memoria no es resiliente. | Medio | P0 |
| Proxy auth | `src/proxy.ts` | Headers basicos, cache, proteccion `/root`, `/user`, setup-profile. | Supabase SSR, Next proxy. | Redirects, headers. | Cookies, perfiles. | Si | Si | No | No | MIGRAR | Buen inicio; falta politica completa para APIs/cron/webhooks. | Medio | P0 |
| Supabase migrations | `src/lib/supabase/migrations` | Esquema SQL amplio: nodos, eventos, memoria, WorldSpect, cognitive tables, SFI assets. | Supabase/Postgres. | Tablas, indices, RLS. | N/A | Si | Parcial via RLS | No | Parcial | MIGRAR | Es el mapa de datos mas importante; debe depurarse por bounded contexts. | Alto | P0 |
| API routes | `src/app/api` | Superficie HTTP monolitica para auth, SFI, telemetry, cron, social, admin, IA. | NextResponse, Supabase, runtime kernel, observatory modules. | JSON, DB writes, eventos. | UI, webhooks, cron, forms. | Mixto | Mixto | No | Mixto | REESCRIBIR | Hay endpoints productivos junto a placeholders sin validacion. Requiere gateway/contratos. | Alto | P0 |
| Kernel route helper | `src/runtime/api/createKernelRoute.ts` | Crea POST genérico que parsea body, llama `assertEvent` y `handleEvent`. | `assertEvent`, `handleEvent`. | Resultado `systemTick`. | Body arbitrario, `metrics`. | Indirecto | No | No | Si | REESCRIBIR | No valida firma, schema, usuario, origen, replay ni tipo real. Incompatible con zero trust. | Alto | P0 |
| Runtime kernel | `src/runtime/kernel` | Bootstrap self-healing dev, system tick con planner/simulator/gate/executor. | Supabase, runtime layers, experimental metakernel. | Gate logs, actions, observations. | Metrics, intents. | Si | Parcial | No | Si | AISLAR | Ideas utiles, pero mezcla autonomia, self-healing y ejecucion sin contratos robustos. | Alto | P1 |
| Runtime layers | `src/runtime/layers` | Intent, Planner, Simulator, Gate, Executor, Observer. | Supabase auth helpers, metrics. | Planes, simulaciones, gate logs, observations. | Intents, metrics, ERW. | Si | Parcial | No | Si | AISLAR | Evaluar como motor experimental, no como nucleo constitutivo. | Alto | P1 |
| Experimental kernel | `src/experimental/kernel` | Metakernel, self-healing, route scanner, self-repair, memory, orchestrator. | FS/runtime, experimental stores. | Cambios/autodiagnosticos potenciales. | Rutas, estado local. | Parcial | No claro | No | Si | CLAUSURAR | Choca con zero trust y resiliencia operacional si no hay sandbox, auditoria y aprobacion humana. | Alto | P1 |
| Safety module | `src/lib/safety` | Backups, hard limits, rollback manager, counters. | FS, memoria local. | Backups locales, contadores `.evolution-counters`. | Rutas de modulo. | No | No | No | Si indirecto | AISLAR | Concepto util, implementacion no confiable para produccion; tiene self-modification counters. | Medio | P2 |
| Telemetry lib | `src/lib/telemetry` | Schemas/connectors/tracker de telemetria. | Validacion, conectores. | Señales/normalizaciones. | Inputs UI/conectores. | Parcial | No claro | No | No | MIGRAR | Debe ser package independiente con fuente, consentimiento, schema y evidencia. | Medio | P0 |
| Telemetry ingest route | `src/app/api/telemetry/ingest/route.ts` | POST via `createKernelRoute("telemetry_ingest")`. | Runtime kernel. | Resultado tick, no ingestion directa clara. | Body arbitrario. | Indirecto | No | No | Si | REESCRIBIR | Nombre promete ingestion, pero no persiste evento trazable directamente ni valida schema. | Alto | P0 |
| Memory lib | `src/lib/memory` | Extrae facts y guarda vectores con embedding null. | Supabase service. | `memory_facts`, `memory_vectors`. | Audit result, content. | Si | No directo | No | Parcial | MIGRAR | Util si se etiqueta evidencia/confianza; embedding null debe declararse incompleto. | Medio | P1 |
| Node bootstrap | `src/app/api/node/bootstrap/route.ts` | Hidrata usuario, perfil, nodo, audits, facts, actions, licencia, assets. | `getServerUserContext`, entitlements, `loadSfiAssets`. | JSON dashboard constitutivo. | Sesion Supabase. | Si | Si | No | No | SALVAR | Es el endpoint constitutivo mas claro del observatorio. Endurecer y versionar contrato. | Medio | P0 |
| Field persist | `src/app/api/field/persist/route.ts` | Multiplexor de persistencia para field events, logbook, WorldSpect, drafts, social, runtime status. | Supabase service, auth context, social ingestion. | `cognitive_event_stream`, `sfi_logbook`, snapshots, drafts, social events. | Body `action`, node_id, payloads. | Si | Si parcial | No | Parcial | REESCRIBIR | Hace demasiado. Dividir por comandos/eventos con schemas, idempotencia y source descriptors. | Alto | P0 |
| SFI assets API | `src/app/api/sfi/assets` | Lista/crea activos SFI; valida acceso por root/licencia; escribe logbook. | Supabase, entitlements, `sfiAssets`. | `sfi_assets`, `sfi_logbook`. | Usuario, target_system, objective, state_vector. | Si | Si | No | No | SALVAR | Buen candidato a core API. Requiere versionado e invariantes de ownership. | Medio | P0 |
| SFI measurements API | `src/app/api/sfi/assets/[asset_id]/measurements` | Inserta mediciones de asset y logbook. | Supabase, ownership. | `sfi_measurements`, `sfi_logbook`. | Asset id, measurement payload. | Si | Si | No | No | SALVAR | Operacional y trazable si se refuerza schema. | Medio | P0 |
| `cognitive_event_stream` | Tabla en `src/lib/supabase/migrations/01_full_script.sql` | Ledger de eventos cognitivos/campo con `node_id`, `stream_type`, `event_name`, payload, correlation, sequence. | Supabase/Postgres. | Secuencia de eventos. | Field persist, auth threshold, liturgia, social. | Si | Via DB/API | No | Parcial | SALVAR | Es pieza constitutiva si se convierte en event store trazable con schemas e idempotencia. | Alto | P0 |
| WorldSpectrum local/domain | `src/observatory/worldspect` | Detecta triggers, construye lecturas locales, consulta ultimo snapshot global. | Field patterns, source descriptors, Supabase service. | Lecturas WorldSpect, descriptors, nextMeasurementAt. | Comandos, MIHM state, snapshots. | Parcial | No directo | No | Parcial | MIGRAR | Alineado con "no fingir dato vivo" cuando marca `LOCAL_CONTEXT` y `limited`. | Medio | P0 |
| WorldSpectrum route | `src/app/api/world-spectrum/route.ts` | POST via kernel route. | `createKernelRoute`. | Resultado tick. | Body arbitrario. | Indirecto | No | No | Si | REESCRIBIR | No coincide con cliente `WorldSpectrum.getGlobalEntropy()` que espera GET/fuentes. | Alto | P1 |
| WorldSpect global route | `src/app/api/worldspect/global/route.ts` | Devuelve ultimo snapshot global y proxima ventana. | Supabase service. | Estado `measured/missing`. | `world_spectrum_snapshots`. | Si | No | No | No | SALVAR | Buen patron: no mide si no hay dato, declara missing. Requiere control de acceso segun politica. | Bajo | P0 |
| Cron jobs | `src/app/api/cron/*`, `src/app/api/cron-agent` | Readiness WorldSpect, wake/publish via kernel, cron-agent en memoria. | Kernel route, operational storage. | Respuestas cron, memoria local. | HTTP GET/POST. | Mixto | No claro | No | Si | AISLAR | Deben tener firma, scheduler externo, idempotencia y auditoria antes de produccion. | Alto | P1 |
| Webhooks | `src/app/api/webhooks/stripe`, `src/app/api/whatsapp/webhook` | POST via kernel route. | `createKernelRoute`. | Resultado tick, no verificacion visible. | Webhook body. | Indirecto | No | No | Si | REESCRIBIR | Webhooks sin firma/verificacion son incompatibles con zero trust. | Alto | P0 |
| Admin APIs | `src/app/api/admin/*` | Override/freeze/EWR/ingest patterns; root checks por perfil. | Supabase server. | Cambios admin, ERW reset/delete. | Sesion root. | Si | Si | Parcial | Parcial | AISLAR | Mantener fuera del dashboard constitutivo hasta endurecer auditoria, MFA/role policy y logs. | Alto | P1 |
| Operational memory | `src/observatory/operational` | Analisis heuristico de input y almacenamiento global en memoria de proceso. | Crypto, memoria global. | Readings, objetivos, logs, calendario. | Texto/archivo, acciones UI. | No | No | No | Parcial | AISLAR | Util para prototipo, no resiliente: se pierde en reinicio y puede fingir estado estable. | Medio | P1 |
| CognitiveTwin API shim | `src/app/api/cognitive-twin/route.ts` | Analiza input con `observatory/operational/analysis`; no invoca servicio Python. | Operational analysis/storage. | Reading, vector, log en memoria. | FormData texto/archivo. | No | No visible | No | Si nominal | AISLAR | Nombre induce a creer que CognitiveTwin corre; declara `available_not_invoked`, pero debe renombrarse o aislarse. | Medio | P1 |
| CognitiveTwin Python | `services/python/cognitive_twin` | Pipeline amplio de ingestion, normalizacion, inferencias, memoria, simulator, dashboard. | SQLAlchemy, Whisper, PyPDF2, pandas, plotly, sklearn, sentence-transformers. | Tablas locales, inferencias debiles, patrones, dashboard HTML. | Archivos txt/md/pdf/json/log/audio/eml. | Parcial en `epistemic_event_store`; local DB por default | No | No | Si | AISLAR | No asumir utilidad. Mantener como package experimental hasta probar trazabilidad y outputs. | Alto | P1 |
| Cognitive orchestrator Python | `services/python/cognitive_orchestrator` | Orquestador cognitivo separado con posible Supabase client. | Python, Supabase opcional. | Persistencia/orquestacion no integrada. | Inputs desconocidos. | Parcial | No claro | No | Si | AISLAR | No hay contrato operacional con Next. | Alto | P2 |
| Agents TS | `src/agents` | AMV, auditor, longitudinal, world-spectrum, pattern engine, etc. | Supabase, runtime, fetch APIs. | Analisis, audits, weights, world variables. | Nodos, audits, prompts. | Parcial | Parcial | No | Si | AISLAR | Revisar uno por uno; algunos pueden migrar como dominio puro, otros son placeholders. | Alto | P1 |
| Social ingestion | `src/observatory/social` | Draft pipeline, OAuth read-only ingestion, manual return, social resonance. | Supabase service, external APIs X/LinkedIn. | social tokens/posts/resonance/external signals. | Tokens, manual inputs, posts. | Si | Si indirecto | No | Parcial | MIGRAR | Valioso si mantiene read-only, consentimiento y source descriptors. | Alto | P1 |
| External social connectors | `src/lib/telemetry/connectors`, `src/observatory/social/socialReadOnlyIngestion.ts` | Conectores oficiales/OAuth previstos; no scraping segun comentario. | External APIs. | `telemetry_sources`, `social_resonance_events`, `external_signals`. | OAuth tokens. | Si | Si | No | No | MIGRAR | Debe vivir como app independiente o integration package con scopes minimos. | Alto | P1 |
| Public/auth pages | `src/app/(auth)`, `src/app/(public)`, `src/components/auth` | Login/register/setup, landing/start, gates/subscription. | Supabase browser/server, UI. | Sesiones, perfiles. | User input. | Si | Si | Si | No | MIGRAR | Necesario, pero separar de observatorio core. | Medio | P0 |
| Root dashboard | `src/app/root`, `src/observatory/components/root` | Paneles root, activacion operacional, EWR, global metrics. | Admin APIs, operational APIs. | Admin actions, diagnostics. | Root user, APIs. | Parcial | Si | Si | Parcial | AISLAR | Debe quedar como consola admin separada del observatorio principal. | Alto | P1 |
| Laboratory UI | `src/observatory/laboratory`, `components/laboratory` | Visualizacion Atlas/laboratory y modos de grafo. | Field/laboratory types. | UI/graphs. | Patterns, clusters. | No claro | No | Si | No | MIGRAR | Puede ser modulo visual independiente consumiendo APIs controladas. | Medio | P2 |
| Python misc services | `services/python/*.py` | World spectrum, Monte Carlo, lyrics/audio features, MIHM extract. | Python libs desconocidas. | Analisis CLI/servicio. | Archivos/inputs. | No claro | No | No | Si/parcial | AISLAR | No integrados en runtime estable. Evaluar por contrato de IO. | Medio | P2 |

## CognitiveTwin: evaluacion especifica

### Entradas observadas

- `services/python/cognitive_twin/ingest.py` acepta archivos `.txt`, `.md`, `.pdf`, `.json`, `.log`, `.wav`, `.mp3`, `.eml`.
- `src/app/api/cognitive-twin/route.ts` acepta `FormData` con `text` y/o `file`, pero no llama al servicio Python.
- El pipeline Python `TwinOrchestrator.process_raw_input(user_id, file_path)` procesa archivos locales via `DataIngestor`.
- `epistemic_event_store.py` acepta eventos programaticos con `node_id`, `signal_type`, `evidence_level`, `source_module`, payload, confianza y lineage.

### Salidas observadas

- Modelos SQLAlchemy locales: `raw_observations`, `structured_observations`, `weak_inferences`, `validated_patterns`, `episodes`, `causal_relations`, `cognitive_states`, `feedback`, `system_logs`.
- `twin_simulator.py` produce respuestas textuales simuladas basadas en perfil e invariantes, con frases que podrian confundirse con voz subjetiva.
- `dashboard.py` produce HTML Plotly si existen observaciones.
- `epistemic_event_store.py` escribe `epistemic_events` en Supabase con checksum y tipos de evidencia.
- La API Next actual produce solo un `OperationalReading` heuristico y `cognitiveVector`; declara `cognitiveTwinService: available_not_invoked`.

### Trazabilidad

Parcial. La mejor pieza es `epistemic_event_store.py`, porque distingue `observed`, `declared`, `inferred`, `simulated`, `projected`, `derived`, niveles de evidencia y checksum. El resto del pipeline Python produce inferencias y patrones con confianza, pero no se observa contrato uniforme de lineage, invalidacion, idempotencia ni vinculacion segura con `node_id`/usuario.

La API Next llamada `cognitive-twin` no tiene trazabilidad persistente: registra en memoria de proceso via `logOperationalEvent`, no en Supabase, y no invoca el servicio Python.

### Utilidad de inferencias

Potencial, no comprobada. Hay modulos para contradiccion, drift, latency, semantic pressure, execution gap y epistemic boundary, pero varios motores parecen heuristicas simples/placeholders. No se debe asumir valor operacional sin pruebas con fixtures, metricas, lineage y revision humana.

### Autonomia modular

Puede operar como modulo autonomo solo despues de empaquetarlo como servicio o package separado con:

- contrato de entrada/salida versionado;
- event store epistemico obligatorio;
- prohibicion de respuestas en primera persona subjetiva;
- modo read-only por defecto;
- jobs idempotentes;
- tests de no simulacion;
- adaptador explicito hacia Observatorio SFI.

### Dictamen CognitiveTwin

Estado recomendado: AISLAR como package experimental.  
No clausurar todavia porque contiene una semilla valiosa de epistemic event store.  
No migrar al core todavia porque no hay prueba de trazabilidad suficiente ni contrato estable.

Condicion de reentrada al campo: solo podra publicar eventos derivados/inferidos con `signal_type`, `evidence_level`, `confidence`, `parent_event_id`/`inference_chain`, checksum, schema version y revision de permisos por nodo.

## API routes: clasificacion por confianza

### Candidatas a core tras endurecer

- `GET /api/node/bootstrap`
- `GET|POST /api/sfi/assets`
- `POST /api/sfi/assets/[asset_id]/measurements`
- `GET /api/worldspect/global`
- auth pages/actions existentes

### Reescritura obligatoria

- Todas las rutas que usan `createKernelRoute` para eventos externos o telemetry: `telemetry/ingest`, `world-spectrum`, `webhooks/stripe`, `whatsapp/webhook`, `cron/wake-agent`, `cron/publish`, `actions`, `audit`, `amv`, `license`, `link`, `mihm`, etc.
- `POST /api/field/persist` por ser multiplexor de demasiadas responsabilidades.

### Aislar antes de migrar

- `api/admin/*`
- `api/cognitive-twin`
- `api/project-manager`
- `api/social/calendar`
- `api/cron-agent`
- rutas operational memory en memoria de proceso

## Datos constitutivos recomendados para el Observatorio SFI

Estos datos si tienen vocacion de formar el nucleo:

- `nodes`
- `profiles`
- `sfi_assets`
- `sfi_measurements`
- `sfi_interventions`
- `sfi_outputs`
- `sfi_logbook`
- `cognitive_event_stream`
- `world_spectrum_snapshots`
- `interaction_events`
- `memory_facts`
- `memory_vectors`, solo cuando embeddings reales y lineage existan
- `licenses` / `license_entitlements`, si se mantiene modelo comercial
- `epistemic_events`, si se adopta el modelo del CognitiveTwin con rigor

Datos que requieren cuarentena:

- tablas cognitive extensas no alimentadas por contratos claros;
- `scheduler_jobs` sin scheduler operacional definido;
- `module_health`, `orchestrator_state`, `replay_state`, `event_projections` hasta que exista event sourcing real;
- social tokens/posts/resonance hasta revisar consentimiento, scopes y cifrado.

## Riesgos principales de migracion

1. Confundir estado derivado de cliente con dato vivo persistido.
2. Migrar rutas `createKernelRoute` sin controles de auth/firma.
3. Preservar lenguaje de agente que parezca conciencia o intencion propia.
4. Llevar self-healing/self-repair al core sin sandbox ni aprobacion humana.
5. Mantener service-role demasiado cerca de handlers amplios.
6. Depender de memoria global en proceso para objetivos, calendario o logs.
7. Migrar CognitiveTwin por nombre, no por evidencia operacional.
8. Exponer secretos ya presentes en archivos de entorno versionables.

## Plan de migracion limpia en 6 pasos

1. Crear monorepo con packages separados: `apps/observatory-dashboard`, `packages/core-domain`, `packages/api-contracts`, `packages/db`, `packages/auth`, `packages/events`, `packages/ui`, `packages/experimental-cognitive-twin`.
2. Definir event store constitutivo: `cognitive_event_stream` + `epistemic_events` con schemas versionados, source descriptors, idempotency keys, correlation IDs y niveles de evidencia.
3. Migrar primero `node/bootstrap`, `sfi/assets`, measurements/logbook y `worldspect/global` como APIs v1 con auth fuerte y tests.
4. Reescribir `field/persist` en comandos pequenos: `field-events`, `logbook-events`, `worldspect-snapshots`, `social-returns`, `runtime-status`.
5. Aislar `runtime/kernel`, `experimental/kernel`, cron/webhooks y CognitiveTwin detras de feature flags y adapters read-only hasta pruebas de trazabilidad.
6. Clausurar temporalmente todo endpoint sin contrato, firma, schema o fuente verificable; reintroducir solo con auditoria, logs y rollback operacional.

## Clausuras temporales recomendadas

- Self-healing y self-repair del kernel experimental.
- Webhooks via `createKernelRoute` hasta implementar verificacion Stripe/WhatsApp.
- Telemetry ingest via kernel generico.
- WorldSpectrum POST via kernel generico.
- CognitiveTwin como nombre de API productiva.
- Memoria global en proceso para calendarios/objetivos si se presenta como persistida.

## Decision final FASE 0

Base a salvar: Supabase runtime, contexto usuario/nodo, SFI assets, logbook, `cognitive_event_stream`, WorldSpect global medido, auth y partes del UI de observatorio.

Base a migrar con cuidado: `src/observatory`, `src/lib/telemetry`, `src/lib/memory`, social read-only, laboratory UI.

Base a aislar: runtime kernel, agents, admin panels, operational memory, CognitiveTwin Python, cron jobs.

Base a reescribir: API gateway, `createKernelRoute`, `field/persist`, telemetry ingest, webhooks.

Base a clausurar temporalmente: self-healing/self-repair y cualquier modulo que simule agencia no trazable.
