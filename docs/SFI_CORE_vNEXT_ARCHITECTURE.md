# SFI-CORE.vNEXT

Objetivo: evolucionar el observatorio actual hacia un sistema operacional longitudinal con memoria, autenticacion, telemetria y capacidad adaptativa, sin convertirlo en SaaS generico ni romper la identidad terminal / observatorio / infraestructura cognitiva.

## 1. Roadmap Tecnico

### Corte 0: preservar el organismo actual

Estado base existente:

- Landing publica en `/`.
- Terminal operacional en `/terminal`.
- Auditoria API en `/api/audit`.
- AMV inicial.
- Sensores IHG / NTI / LDI.
- Memoria visual.
- Topologia reactiva.

Regla: todo vNEXT entra como capas causales sobre estos modulos. No se reemplaza la estetica ni el flujo perceptual.

### Corte 1: persistencia operacional real

Implementar Supabase Postgres como fuente de verdad:

- `profiles`: identidad minima del usuario.
- `nodes`: nodo operacional.
- `intake_sessions` e `intake_responses`: captura inicial desde landing.
- `audits`: auditorias longitudinales.
- `actions`: accion minima verificable y su cumplimiento.
- `memory_facts`: memoria estructurada extraida.
- `events`: log causal de interacciones.

Resultado: cada usuario entra por CTA, crea nodo y deja una primera linea base.

### Corte 2: motor longitudinal

Agregar `LongitudinalEngine`:

- Lee historial.
- Compara narrativa actual contra objetivos, acciones pendientes, loops y auditorias previas.
- Calcula severidad ajustada por recurrencia.
- Modifica preguntas AMV.
- Modifica resolucion minima.

Resultado: el sistema ya no contesta solo por input actual; responde por continuidad.

### Corte 3: AMV operacional

AMV maximo 3 preguntas:

1. Pregunta de friccion primaria.
2. Pregunta de contradiccion o latencia, elegida por sensores.
3. Pregunta de accion minima verificable.

Salida obligatoria:

- lectura operacional;
- patron detectado;
- riesgo;
- una accion concreta;
- criterio de verificacion;
- fecha limite sugerida.

### Corte 4: auth y licenciamiento

Usar Supabase Auth:

- email/password;
- email verification;
- forgot/reset password;
- sesiones JWT seguras;
- RLS en tablas;
- rate limiting en endpoints criticos.

Licencias:

- `subscriptions`;
- `license_entitlements`;
- gating por modulo: base, AMV avanzado, memoria longitudinal, telemetria extendida, laboratorio de nodos.

### Corte 5: ingestion de senales

Crear conectores legales y modulares:

- OAuth/API oficial cuando exista.
- Webhooks propios.
- Importacion manual autorizada.
- GitHub connector por app oficial.
- RSS/Medium si la fuente lo permite.

No scraping ilegal. Toda senal externa entra como `external_signals`.

## 2. Arquitectura Modular

```txt
src/
  app/
    (public)/
      page.tsx
      start/page.tsx
    (auth)/
      login/page.tsx
      register/page.tsx
      forgot/page.tsx
      reset/page.tsx
      verify/page.tsx
    (terminal)/
      terminal/page.tsx
      node/[id]/page.tsx
    api/
      audit/route.ts
      amv/session/route.ts
      amv/respond/route.ts
      intake/route.ts
      actions/[id]/verify/route.ts
      license/route.ts
      telemetry/ingest/route.ts
      telemetry/sources/route.ts
  components/
    landing/
      OperationalCTA.tsx
      IntakeTerminal.tsx
    auth/
      AuthTerminal.tsx
      ResetTerminal.tsx
    terminal/
      ConsoleColumn.tsx
      StateColumn.tsx
      MemoryColumn.tsx
      AMVChat.tsx
      LongitudinalTimeline.tsx
      ActionCommitment.tsx
      SensorTrend.tsx
  lib/
    auth/
      session.ts
      rateLimit.ts
      guards.ts
    db/
      client.ts
      queries.ts
      schema.ts
    agents/
      auditor.ts
      metrics.ts
      longitudinal.ts
      amv.ts
      resolution.ts
    memory/
      extractFacts.ts
      compareHistory.ts
      embeddings.ts
      summarizeNode.ts
    licensing/
      plans.ts
      entitlements.ts
    telemetry/
      connectors/
        github.ts
        medium.ts
        linkedin.ts
        x.ts
        telegram.ts
      ingest.ts
      normalize.ts
```

## 3. Stack Recomendado

- Framework: Next.js App Router.
- Base de datos: Supabase Postgres.
- Auth: Supabase Auth con RLS y sesiones JWT.
- ORM/query layer: Drizzle ORM o consultas tipadas generadas desde Supabase. Recomendacion incremental: empezar con Supabase client tipado y migrar a Drizzle cuando el schema se estabilice.
- Eventos: tabla `events` append-only + canal realtime de Supabase para terminal.
- Embeddings: `pgvector` en Supabase.
- Analisis semantico: Gemini/OpenAI via capa `SemanticProvider`, nunca acoplado directo a componentes.
- Rate limiting: Upstash Redis o Supabase-backed limiter para fase inicial.
- Observabilidad: Sentry para errores, Vercel Analytics/Speed Insights para web, tabla interna `interaction_events` para causalidad SFI.
- Jobs: Vercel Cron o Supabase Edge Functions para ingestion externa y recalculo longitudinal.

Principio: lazy initialization de clientes en servidor para que `next build` no dependa de variables runtime.

## 4. Modelo de Entidades

### User / Profile

Identidad minima. No avatar, no gamificacion.

- `user_id`
- `alias`
- `email`
- `created_at`
- `last_seen_at`

### Node

Unidad operacional longitudinal.

- `node_id`
- `user_id`
- `current_ihg`
- `current_nti`
- `current_ldi`
- `current_severity`
- `active_pattern`
- `last_resolution_at`

### Intake Session

Entrada desde landing.

- `alias`
- `email`
- `objective`
- `current_friction`
- `initial_pattern`
- `initial_severity`

### Audit

Lectura operacional puntual.

- narrativa;
- sensores;
- patron;
- riesgo;
- hard stop;
- accion minima propuesta.

### Action

Compromiso verificable.

- descripcion;
- criterio de cierre;
- fecha limite;
- estado: pending, completed, missed, invalidated.

### Memory Fact

Hecho longitudinal extraido.

- objetivo declarado;
- loop;
- restriccion;
- patron emocional;
- accion no ejecutada;
- cambio de direccion.

### External Signal

Senal ingerida legalmente.

- source;
- provider;
- payload;
- normalized_text;
- semantic_tags;
- signal_strength.

## 5. Schema Base De Datos

El schema incremental esta en:

- `src/lib/supabase/migrations/002_vnext_longitudinal.sql`

Tablas clave:

- `profiles`
- `intake_sessions`
- `intake_responses`
- `actions`
- `memory_facts`
- `interaction_events`
- `licenses`
- `license_entitlements`
- `telemetry_sources`
- `external_signals`
- `memory_vectors`

RLS:

- cada usuario lee y escribe solo sus nodos;
- endpoints server con service role pueden ingerir eventos;
- telemetria externa queda vinculada por `user_id` y `node_id`.

## 6. Flujo AMV

### Entrada

AMV recibe:

- `node_id`
- historial de auditorias;
- acciones pendientes;
- loops recurrentes;
- intake inicial;
- ultima severidad;
- senales externas disponibles.

### Preguntas

Maximo 3:

1. Si no hay memoria: preguntar friccion actual.
2. Si hay accion pendiente vencida: preguntar por incumplimiento observable.
3. Si hay loop: preguntar por evidencia nueva.
4. Si hay contradiccion: preguntar por costo de sostener ambas posiciones.
5. Cerrar siempre con accion minima verificable.

### Salida

```json
{
  "reading": "lectura operacional",
  "pattern": "loop/latencia/contradiccion/dispersion/evitacion",
  "risk": "bajo/medio/alto/hard_stop",
  "minimum_action": "accion concreta",
  "verification_criterion": "como se comprueba",
  "deadline_hours": 24
}
```

## 7. Sistema De Memoria

La memoria no es chat history. Es causalidad estructurada.

Cada auditoria produce:

- hechos persistentes;
- embedding del texto normalizado;
- resumen longitudinal del nodo;
- accion minima;
- evento causal.

La memoria altera:

- severidad: loops repetidos suben riesgo;
- preguntas: no repetir preguntas ya respondidas;
- resoluciones: si una accion fallo, la siguiente debe ser mas pequena;
- topologia: recurrencia y contradiccion modifican visualizacion;
- CTA: usuario recurrente no ve el mismo inicio.

## 8. Algoritmos Sensores

### IHG: Indice Homeostatico General

Mide coherencia declaracion-ejecucion.

Inputs:

- accion minima anterior completada o no;
- divergencia narrativa;
- estabilidad de objetivo;
- historial IHG;
- evidencia de ejecucion.

Formula inicial:

```txt
IHG =
  0.35 * action_completion
+ 0.25 * objective_stability
+ 0.20 * narrative_coherence
+ 0.20 * longitudinal_recovery
- 0.30 * unresolved_loop_penalty
```

Rango: -1 a 1.

### NTI: Nivel de Tension Interna

En vNEXT NTI mide tension, no transparencia.

Inputs:

- contradicciones;
- dispersion narrativa;
- evitacion;
- cambios abruptos;
- intensidad semantica.

Formula inicial:

```txt
NTI =
  contradiction_score * 0.30
+ dispersion_score * 0.25
+ avoidance_score * 0.25
+ abrupt_shift_score * 0.20
```

Rango: 0 a 1. Alto = mas tension.

### LDI: Latencia de Decision

Inputs:

- horas desde accion minima;
- acciones vencidas;
- loop persistente;
- retraso cronico declarado.

Formula inicial:

```txt
LDI =
  hours_since_last_action
+ missed_action_count * 24
+ recurring_loop_count * 12
```

### Severidad

```txt
severity =
  abs(min(IHG, 0)) * 0.35
+ NTI * 0.30
+ normalized_LDI * 0.20
+ loop_score * 0.15
```

Hard stop si:

- severidad > 0.82;
- emergencia declarada;
- accion irreversible aparece con alta tension;
- loop critico + LDI alto.

## 9. Flujo Auth

Rutas:

- `/register`
- `/login`
- `/forgot`
- `/reset`
- `/verify`
- `/logout`

Comportamiento visual:

- panel terminal;
- copy de activacion de nodo;
- no cards corporativas;
- no dashboard SaaS;
- campos minimos.

Seguridad:

- Supabase Auth;
- email verification;
- password reset por token;
- JWT cookies httpOnly via server helpers;
- RLS en todas las tablas;
- rate limit por IP + email para auth;
- validacion Zod en endpoints.

## 10. Sistema Licencias

Productos:

- `observatory_base`: landing, nodo, auditorias limitadas.
- `amv_advanced`: preguntas AMV adaptativas.
- `longitudinal_memory`: memoria causal, comparacion historica, acciones.
- `extended_telemetry`: ingestion externa.
- `node_lab`: simulaciones, laboratorios, exportaciones.

Validacion:

- `getEntitlements(user_id)` en servidor.
- Gating por API y UI.
- UI bloqueada debe sentirse instrumental: “instrumento no activado”, no upsell agresivo.

## 11. Integracion Telemetria

Arquitectura de ingestion:

```txt
Connector -> Raw Signal -> Normalizer -> Semantic Analyzer -> External Signal -> Memory Fact/Event
```

Tipos de conectores:

- OAuth/API oficial.
- Webhook.
- Importacion manual.
- RSS permitido.
- GitHub App.

Campos normalizados:

- `provider`
- `external_id`
- `published_at`
- `raw_text`
- `normalized_text`
- `engagement`
- `semantic_tags`
- `signal_strength`

Reglas:

- no scraping ilegal;
- no ingestion sin consentimiento;
- cada fuente debe declarar alcance;
- los conectores fallan de forma aislada.

## 12. Plan Incremental De Implementacion

### Sprint 1: CTA + persistencia

- Agregar `/start`.
- Crear `OperationalCTA`.
- Crear `IntakeTerminal`.
- Persistir `profile`, `node`, `intake_session`, `intake_responses`.
- Redirigir a `/terminal`.

### Sprint 2: memoria longitudinal

- Implementar `LongitudinalEngine`.
- Guardar `actions`.
- Guardar `memory_facts`.
- Ajustar `/api/audit` para comparar historial real.

### Sprint 3: AMV real

- Crear `/api/amv/session`.
- Crear `/api/amv/respond`.
- Limitar a 3 preguntas.
- Salida obligatoria con accion concreta.

### Sprint 4: auth

- Supabase Auth UI terminal.
- RLS.
- Forgot/reset/verify.
- Proteger `/terminal`.

### Sprint 5: licencias

- Tablas `licenses` y `license_entitlements`.
- `getEntitlements`.
- Bloqueo instrumental por modulo.

### Sprint 6: telemetria externa

- `telemetry_sources`.
- `external_signals`.
- Primer conector legal: GitHub o importacion manual.
- Recalculo longitudinal por job.

## 13. Componentes React / Next Necesarios

Landing:

- `OperationalCTA`
- `IntakeTerminal`
- `SignalConsent`

Auth:

- `AuthTerminal`
- `PasswordResetTerminal`
- `VerificationState`

Terminal:

- `LongitudinalTimeline`
- `ActionCommitment`
- `SensorTrend`
- `MemoryFactList`
- `LicenseGate`
- `TelemetrySourcePanel`

Server:

- route handlers para intake, AMV, audit, license, telemetry.
- server guards para auth/licencia.

## 14. APIs Necesarias

```txt
POST /api/intake
POST /api/audit
GET  /api/node/[id]
POST /api/amv/session
POST /api/amv/respond
POST /api/actions/[id]/verify
GET  /api/license
POST /api/telemetry/sources
POST /api/telemetry/ingest
GET  /api/telemetry/signals
```

## 15. Event System

Todo acto importante genera evento append-only:

- `node.created`
- `intake.completed`
- `audit.created`
- `pattern.detected`
- `hard_stop.triggered`
- `action.created`
- `action.completed`
- `action.missed`
- `amv.question_asked`
- `amv.session_completed`
- `license.changed`
- `telemetry.signal_ingested`

Los eventos permiten reconstruir causalidad y auditar evolucion del sistema.

## 16. Motor Longitudinal

Responsabilidad:

- leer memoria;
- detectar repeticion;
- detectar contradiccion;
- medir accion anterior;
- ajustar sensores;
- decidir pregunta AMV;
- decidir severidad;
- producir resolucion minima.

Interfaz:

```ts
type LongitudinalInput = {
  nodeId: string
  currentNarrative: string
  audits: Audit[]
  actions: Action[]
  memoryFacts: MemoryFact[]
  externalSignals: ExternalSignal[]
}

type LongitudinalOutput = {
  adjustedMetrics: Metrics
  pattern: string
  severity: number
  risk: 'low' | 'medium' | 'high' | 'hard_stop'
  nextQuestion: string
  minimumAction: string
  verificationCriterion: string
}
```

Regla final: si el motor no puede producir una accion concreta, la auditoria es incompleta.

