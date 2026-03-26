# SystemFriction v2 — Architecture

**Versión:** 2.0.0
**Fecha:** 2026-03-26
**Autor:** Aptymok (Juan Antonio)

---

## Postulado Central

> La fricción sistémica es la resistencia estructural al cambio que genera un sistema cognitivo bajo condiciones de tensión (interna + externa). El motor MIHM cuantifica esta fricción y permite proyectar escenarios de evolución deterministas por seed.

---

## Estructura del Monorepo

```
system-friction/
├── docs/                    # Documentación de arquitectura y migración
├── legacy/                  # Snapshot histórico + inbox de JS heredado
├── apps/
│   ├── ios/                 # SwiftUI App (principal, iOS-first)
│   └── web/                 # Landing + "Inicio de Plática" (Vite + React)
├── packages/
│   ├── sf-core/             # Tipos + trazabilidad + storage
│   ├── sf-engine/           # Motor MIHM/SystemFriction (math + métricas)
│   ├── sf-agents/           # Debate APTYMOK + selección 3 escenarios
│   └── sf-ui/               # (opcional) componentes UI compartidos web
├── infra/
│   ├── groq-proxy/          # Serverless proxy para Groq (opcional)
│   └── ci/                  # Config CI
└── tests/                   # Tests integrados / e2e
```

---

## Capas del sistema

### 1. sf-core (base de tipos y trazabilidad)
- Tipos: `CognitiveSnapshot`, `Scenario`, `ScenarioSet`, `AgentVote`, `ActionPlan`, `TickGoal`
- Trazabilidad: `hash(inputs)`, `engine_version`, `seed`, `timestamp`
- Storage: IndexedDB (web) / CoreData (iOS)

### 2. sf-engine (motor matemático)
- `simulate(snapshot, params, seed, T, dt)` → `{trajectory, metrics}`
- Métricas: IHG (Índice de Homeostasis Global), NTI (Nivel de Tensión Interna), R (Resiliencia), IAD (Índice de Atención Distribuida), ETE (Eficiencia de Transición de Estado)
- Determinismo garantizado por seed
- Sin NaN/Inf (clamps internos)

### 3. sf-agents (debate y selección)
- 4 roles: SHINJI (analítico), REI (empático), SHADOW (crítico), KAWORU (visionario)
- Flujo: generar N escenarios → clustering/deduplicación → votación → selección top-3
- Top-3: consenso + eficiencia + wildcard

### 4. apps/ios (captura cognitiva + UI)
- Speech STT: voz → texto
- Vision: face landmarks (rasgos cognitivos)
- SoundAnalysis: clasificación de audio
- Normalizador: (texto + voz + cara + audio) → `CognitiveSnapshot`
- UI: Dashboard + Salón Eidelon + Laboratorio

### 5. apps/web (landing)
- CTA: "Inicia Plática"
- Explicación MIHM Personal
- Deep link a iOS o embed si aplica

### 6. infra/groq-proxy (opcional)
- Endpoints: `/llm/scenario`, `/llm/debate`
- API key solo en servidor, no en cliente
- Modo degradado si no hay key

---

## Flujo principal (iOS)

```
Captura (texto/voz/cara/audio)
    ↓
Normalizador → CognitiveSnapshot
    ↓
sf-engine.simulate(snapshot, seed) → trajectory + metrics
    ↓
sf-agents.debate(snapshot, trajectory) → ScenarioSet (top-3)
    ↓
Usuario elige escenario
    ↓
sf-engine.generatePlan(scenario) → ActionPlan (TickGoals)
    ↓
Dashboard + Salón Eidelon (narrativa)
```

---

## Decisiones técnicas

| Decisión | Elección | Razón |
|---|---|---|
| Motor en | TypeScript | Compartible web/node; tipado estricto |
| iOS UI | SwiftUI | Apple-native, iOS-first |
| iOS IA | Speech/Vision/SoundAnalysis/CoreML | On-device, privacidad |
| Web | Vite + React | Simple, rápido |
| Groq proxy | Cloudflare Workers / serverless | No exponer API key |
| Storage iOS | CoreData (SQLite) | Robusto, migración de schema |
| Storage web | IndexedDB | Persistencia offline |
| Tests | Vitest (JS) + XCTest (iOS) | Estándar por plataforma |
