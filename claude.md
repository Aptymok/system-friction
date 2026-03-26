# CLAUDE.md — SystemFriction v2 (Rebuild Total desde 0, Modular + Tests + iOS-first)

**Autor:** Aptymok (Juan Antonio)  
**Fecha:** 2026-03-26  
**Objetivo:** Reconstruir SystemFriction desde cero con arquitectura limpia, modular y vendible.
**Resultado final:** Producto funcional con:
- Motor MIHM/SystemFriction (math + métricas + escenarios)
- Extracción cognitiva multimodal (texto/voz/cara/audio)
- Debate real entre agentes (APTYMOK: SHINJI/REI/SHADOW/KAWORU)
- Selección de 3 escenarios (consenso/eficiencia/wildcard)
- Plan de acciones por micro-tics (objetivos → micro objetivos → criterios de “cubierto”)
- Interfaz gráfica (iOS SwiftUI) + Landing Web (inicio de plática)
- Turbo opcional Groq vía proxy (sin exponer API keys)

---

## 0) Reglas de Oro (NO negociables)
1) **Build desde 0 (rebuild real)**: NO parches “encima” del caos. Extrae lo útil, pero re-escribe modular.  
2) **Cada módulo debe compilar + pasar tests antes de avanzar** (ciclo: implementar → probar → commit).  
3) **Trazabilidad radical**: cada salida (escenario/acción) debe guardar:
   - inputs (snapshot), método, seed, versión del motor, timestamp, hashes.
4) **iOS-first**: el consumo principal es iPhone (SwiftUI) usando frameworks Apple IA:
   - Speech (voz → texto), Vision (cara/landmarks), SoundAnalysis (audio).  
   - Core ML / MLX para IA local.
5) **Groq = turbo opcional**: SI se usa, debe ser vía proxy (serverless) para no exponer llaves en iOS.
6) **Duplicados**: NO borrar historia; mover a `/legacy/` y documentar migración. El código activo no depende de legacy.

---

## 1) Modo de ejecución (Claude Code)
**Tu comportamiento (Claude) debe ser “ingeniero principal”**:
- Planifica, crea estructura, implementa módulo, ejecuta tests, repara, commit.
- Haz commits pequeños y descriptivos.
- Antes de tocar: crea branch nuevo `v2-rebuild` (o repo nuevo si se indica).
- Ejecuta comandos reales para verificar (no “asumas” que compila).

**Permisos**: solicita permiso cuando sea necesario (editar archivos, ejecutar comandos).
**Siempre**: `git status` y `git diff` antes de commit.

---

## 2) Input del usuario (Aptymok) y fuente de JS
El usuario puede:
A) Proporcionarte `.js` directamente (te los pega o los sube).  
B) Pedirte que los obtengas desde el repo actual (GitHub) como “legacy”.

**Regla**: cualquier JS heredado se coloca en:
`/legacy/js_inbox/` y se migra por módulos, nunca directo al core.

---

## 3) Estructura objetivo del nuevo sistema (monorepo limpio)
Crea esta estructura EXACTA:

system-friction/
├── CLAUDE.md
├── README.md
├── docs/
│   ├── architecture.md
│   ├── migration_notes.md
│   └── security_privacy.md
├── legacy/                         # snapshot del repo viejo + duplicados
│   ├── repo_snapshot/
│   └── js_inbox/
├── apps/
│   ├── ios/                        # SwiftUI App (principal)
│   └── web/                        # Landing + módulo “Inicio de plática”
├── packages/
│   ├── sf-core/                    # Tipos + trazabilidad + storage
│   ├── sf-engine/                  # MIHM/SystemFriction math + métricas + simulación
│   ├── sf-agents/                  # Debate APTYMOK + consenso 3 escenarios
│   └── sf-ui/                      # (opcional) componentes UI compartidos web
├── infra/
│   ├── groq-proxy/                 # serverless proxy para Groq (opcional)
│   └── ci/                         # config CI si aplica
└── tests/                          # tests integrados / e2e si aplica

---

## 4) Tecnología (debe ser esta, salvo imposibilidad)
### iOS (principal)
- SwiftUI para UI.
- Speech framework para STT (voz → texto).
- Vision framework para face landmarks (cara/rasgos).
- SoundAnalysis framework para eventos/clasificación de audio.
- Core ML para modelos locales (on-device).
- MLX (si se usa) para LLM/IA local en ecosistema Apple.

### Web (Landing + “Inicio de plática”)
- Vite + React (simple) o HTML estático si es más rápido.
- Debe tener CTA: **“Inicia Plática”** y explicar MIHM Personal.

### Groq (turbo opcional)
- Integración vía proxy (Cloudflare Worker / serverless).
- El cliente iOS/web nunca guarda API key.

---

## 5) Fases obligatorias (orden estricto, no saltar)
> Cada fase termina con: tests pasando + commit.

### Fase A — Snapshot + extracción (sin romper nada)
1) Clona/abre repo actual (si estás dentro, haz snapshot).
2) Crea `legacy/repo_snapshot/` con copia del estado actual.
3) Escribe `docs/migration_notes.md` con:
   - qué existía (MIHM v2/v3, server.py, salón, etc.)
   - qué se rescata conceptualmente
   - qué se depreca (duplicados/AGS obsoleto) sin borrar.
4) NO migres aún código al core: solo inventario.

**Done**: Existe `legacy/` + `migration_notes.md`.

### Fase B — Bootstrap del monorepo + CI mínimo
1) Crea estructura de carpetas.
2) Inicializa:
   - app iOS (Xcode project) en `apps/ios/`
   - landing web en `apps/web/`
   - paquetes (sf-core, sf-engine, sf-agents)
3) Agrega scripts básicos:
   - `make test` o equivalente
   - `make lint` si aplica
4) Agrega un CI mínimo (opcional) o al menos un script local de verificación.

**Done**: `apps/ios` compila (proyecto vacío) + `apps/web` levanta + test runner listo.

### Fase C — sf-core (tipos + trazabilidad + storage)
Implementa `packages/sf-core`:
- Tipos:
  - CognitiveSnapshot
  - Scenario
  - ScenarioSet (N escenarios)
  - AgentVote
  - ActionPlan
  - TickGoal
- Trazabilidad:
  - hash de inputs
  - versionado del motor
  - seed determinista
- Storage:
  - iOS: CoreData/SQLite (elige 1 y documenta)
  - web: almacenamiento simple (local storage/IndexedDB) si aplica

**Tests obligatorios**:
- serialización estable
- hash estable
- migración de schema (si aplica)

**Done**: tests de sf-core pasan + commit.

### Fase D — sf-engine (MIHM/SystemFriction math)
Implementa `packages/sf-engine`:
- Simulador determinista por seed:
  - simulate(snapshot, params, seed, T, dt) -> trajectory + metrics
- Métricas mínimas:
  - IHG, NTI, R
  - IAD, ETE
  - energía por ciclos de atención (proxy)
  - (opcional) Lyapunov/estabilidad (si no rompe MVP)

**Tests obligatorios**:
- determinismo (mismo seed → mismas salidas)
- no NaNs/Inf
- rangos básicos (clamps/sanity checks)
- performance: T pequeño debe correr rápido

**Done**: tests de sf-engine pasan + commit.

### Fase E — sf-agents (debate APTYMOK + 3 escenarios)
Implementa `packages/sf-agents`:
- 4 roles: SHINJI/REI/SHADOW/KAWORU
- Debate:
  1) Generar N escenarios por motor:
     - motor matemático (sf-engine)
     - motor local IA (si disponible) o heurístico
     - motor turbo (Groq) si proxy disponible
  2) Clustering/similitud y deduplicación
  3) Votación/argumentos por rol
  4) Selección final de 3 escenarios:
     - consenso
     - eficiencia
     - wildcard (diverso)

**Tests obligatorios**:
- determinismo por seed
- diversidad mínima del wildcard
- formato de salida validado

**Done**: tests de sf-agents pasan + commit.

### Fase F — iOS: captura cognitiva multimodal (Apple frameworks)
En `apps/ios/`:
1) Implementa módulos Swift:
   - Speech STT: flujo permisos + transcripción.
   - Vision face landmarks: permisos cámara + landmarks básicos.
   - SoundAnalysis: eventos/clasificación.
2) Normalizador:
   - convierte (texto + voz + cara + audio) -> CognitiveSnapshot

**Pruebas**:
- unit tests al normalizador con datos simulados
- (manual) run en dispositivo para permisos y captura

**Done**: compila + unit tests + commit.

### Fase G — UI iOS (Salón Eidelon + Dashboard + Laboratorio)
Implementa en SwiftUI:
- Dashboard inicial:
  - métricas en vivo
  - gráficas (trayectorias)
  - timeline
- Salón Eidelon (chat):
  - conversación local + registro
  - prospección al pasado = timeline narrativo generado desde snapshots
- Laboratorio:
  - ejecutar simulación
  - ver debate y top-3 escenarios
  - elegir escenario
  - generar plan por tics (TickGoals)

**Pruebas**:
- UI tests mínimos (flujo “capturar→simular→escenarios→plan”)

**Done**: funciona end-to-end local (sin Groq) + commit.

### Fase H — Web Landing (Inicio de plática + renta)
En `apps/web/`:
- Landing minimalista con:
  - CTA: “Inicia Plática”
  - explicación: qué es SystemFriction
  - “MIHM Personal” (renta) y cómo instalar/usar
- Embebible:
  - botón que abre el Salón (si hay web)
  - o deep link a iOS (si aplica)

**Done**: build web ok + commit.

### Fase I — Groq turbo (proxy) + “debate 3 motores”
En `infra/groq-proxy/`:
- endpoint `/llm/scenario` y `/llm/debate`
- rate limit básico
- logs de trazabilidad
- variables de entorno para API key
- documentación: cómo habilitar/deshabilitar

**Tests**:
- contract tests (request/response)
- “si no hay key, responde modo degradado” (no romper producto)

**Done**: proxy funcionando + app iOS consume sin exponer key + commit.

---

## 6) Política de duplicados (sin drama, sin perder historia)
- Todo duplicado se mueve a `legacy/` y se documenta en `docs/migration_notes.md`.
- Una vez que el módulo nuevo funciona:
  - el archivo legacy se marca como deprecated
  - NO se importa desde el core nuevo
- Solo al final (v1.0) se decide si se elimina legacy o se mantiene como archivo histórico.

---

## 7) Definition of Done (v1 vendible mínimo)
v1 está listo cuando:
1) iOS app: captura (texto/voz/cara/audio) -> snapshot -> sim -> 3 escenarios -> plan por tics.
2) Dashboard: métricas + gráficas + timeline.
3) Salón Eidelon: chat operativo (local) + narrativa basada en evidencia (snapshots).
4) Web landing: “Inicio de plática” + explicación + guía de instalación + ruta a MIHM Personal.
5) Groq turbo opcional: si está apagado, todo sigue funcionando.

---

## 8) Primer comando que debes ejecutar (Claude)
1) Crea y cambia a branch:
   - `git checkout -b v2-rebuild`
2) Crea estructura objetivo
3) Escribe `docs/architecture.md` y `docs/migration_notes.md`
4) Bootstrapea `apps/ios` y `apps/web`
5) Implementa Fase C (sf-core) y corre tests

**No avances** si tests no pasan.

---

## 9) Checklist de commits (obligatorio)
- Commit A: legacy snapshot + migration notes
- Commit B: estructura monorepo + bootstrap apps
- Commit C: sf-core + tests
- Commit D: sf-engine + tests
- Commit E: sf-agents + tests
- Commit F: iOS capture modules + tests
- Commit G: SwiftUI UI (dashboard/salón/lab) + UI tests
- Commit H: web landing
- Commit I: groq-proxy + integración opcional

Cada commit: mensaje claro + `git diff` limpio.

---

## 10) Instrucción final
Claude: sigue este documento paso a paso. Si algo falta (dependencia, permisos, build), detente, reporta el bloqueo y propón la solución más simple.

FIN.
