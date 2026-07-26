# Cognitive Runtime — Validation Report
Ámbito: resultados de verificación — estructural y en vivo. No decisiones de
arquitectura (`ADR-000-cognitive-runtime.md`), no explicación de qué archivo cambió
(`IMPLEMENTATION-NOTES.md`).

## Validation Window

| | |
|---|---|
| Repository | `Aptymok/system-friction` |
| Commit base | `aa0339f` (2026-07-21T23:38:45-06:00) |
| Static validation | ejecutada sobre clon local + clon limpio de verificación |
| Live validation | `generatedAt: 2026-07-24T14:06:11Z`, contra Supabase real del usuario |
| Environment (static) | sandbox efímero, Node 22, sin credenciales de producción |
| Environment (live) | `npm run build && npm run start` local del usuario, con credenciales reales |

## Contexto auditado

- **ROOT** — `src/app/root`, consola soberana (`RootSovereignConsole`), gating por
  `requireRootActor`.
- **Cognitive Runtime** — registro de contratos + runtime que prueba tablas en vivo
  contra Supabase (no confía en lo declarado) + vista ROOT
  (`/root?view=cognitive-runtime`).
- **Event Graph** — `packages/events/src/schema.ts`, clases epistémicas
  (`observed/declared/derived/inferred/simulated/fixture/missing`), tabla
  `epistemic_events`.
- **Evidence Graph** — `root_evidence_entries`, `sfi_evidence_ledger`,
  `sfi_phenomenon_evidence`.
- **Prediction Registry** — `sfi_predictive_runs`, `sfi_predictive_learning_events`,
  motor de calibración con estados `ACTIVE/SHADOW/FROZEN/RETIRED`.
- **Governance** — `action_proposals`, `logbook_mutations`, `root_audit_events`.
- **Studio** — `src/lib/studio/cultural-lab/agents/` (8 agentes reales).
- **MIHM / AMV** — `packages/mihm-core`, `src/lib/amv/` (~95 archivos).
- **FIELD** — ciclo operacional cerrado end-to-end ya en producción, sellado SHA-256.

**Mapeo spec original → implementación real:**

| Concepto de la spec original | Implementación real |
|---|---|
| "Phenomenon Memory" | Evidence Graph + Event Graph |
| "Agent Runtime" | Cognitive Runtime (`registry.ts` + `runtime.ts`) |
| "Ciclo científico permanente" | `/field` — ya operativo |
| "Calibración de realidad" | `predictive-engine/calibration.ts` — más riguroso que la spec original |
| "Observatorios UI" | `/root`, `/studio`, `/observatory`, `/field`, `/world-vector` |

## Clasificación de los 17 agentes (derivada de `registry.ts`)

**EXISTE** (`missingCapability: false`) — 7: `meta_orchestrator`, `evidence_hunter`,
`temporal_resolver`, `trajectory_agent`, `reality_calibration`, `risk_agent`,
`opportunity_agent`.

**GATED** (`missingCapability: true`) — 10: `historical_scout`, `phenotype_resolver`,
`context_builder`, `social_field_simulator`, `economic_field_simulator`,
`policy_simulator`, `cultural_simulator`, `psychological_simulator`,
`multi_stakeholder_bootstrap`, `project_execution_manager`.

**AUSENTE** — sin contrato declarado: `ContradictionAgent` (spec original). Función
parcial dentro de `MissingEvidence`, sin agente dedicado.

**Duplicaciones evaluadas:** `interventionAgent.ts` en `lib/amv/agents/` vs
`lib/studio/cultural-lab/agents/` — no es duplicado real, dominios distintos.
Coincidencia de nombre, no de función.

---

## Evidence A — Static Validation
*(equivalente a `epistemicClass: 'derived'` en el vocabulario del propio sistema —
inferida del código y el esquema, sin observar el sistema corriendo)*

- `npm run check:boundaries` → pasa; `cognitive-runtime` no cruza dominios.
- `npm run typecheck` (`tsc --noEmit`) → 0 errores, antes y después de las tres
  correcciones (`field_events` ×2, extracción de `probeTable`).
- `npm run build` (Next.js 16 / Turbopack) → compila completo; `/api/root/cognitive-
  runtime` queda como ruta dinámica (`ƒ`) — no se evalúa contra Supabase en
  build-time.
- `npm run audit:routes` → ruta y archivos de `cognitive-runtime/` indexados
  correctamente.
- `runtime-preflight` → `ACTIVE`, 15/15 archivos runtime críticos presentes.
- `next lint` → falla por un problema de invocación del CLI, preexistente, no
  relacionado con estos cambios. Fuera de alcance.
- Cross-check de las 17 declaraciones contra las 43 migraciones reales: **0**
  referencias a tablas inexistentes tras el fix (antes: 1).

Todo lo anterior, repetido y confirmado contra un clon limpio del commit base antes
de entregar cada corrección — no solo contra el árbol de trabajo local.

## Evidence B — Runtime Validation
*(equivalente a `epistemicClass: 'observed'` — el sistema corriendo, contra datos
reales)*

`status` global: `degraded`. 7 agentes `operational`, 10 `gated` — coincide
exactamente, uno a uno, con la clasificación estática de arriba. 0 agentes con
`missingTables`/`warnings` — el fix se sostiene en producción, no solo contra el
esquema de migraciones.

`degraded` no es un error: es la lectura honesta de que 10 de 17 agentes declarados
no tienen lógica de ejecución todavía.

### Observation V-001 — Event Graph

```
Observado:
  epistemic_events existe y responde (probes.ok = true en las 17 declaraciones).
  eventGraph.recentEvents = [] (consulta sin filtro por nombre de evento, logbookId='default').

Conclusión:
  La infraestructura está operacional.
  El Runtime nunca ejecutó un ciclo cognitivo completo.
```

Este fue el hallazgo que disparó ADR-001/ADR-002 — no es un bullet menor, es la
observación que expuso que el problema no era de esquema sino de acoplamiento entre
AMV y el Runtime (namespaces de `logbookId` distintos y no relacionados).

### Observation V-002 — Layer `understand`

```
Observado:
  layer: understand
  agents: []   (al momento de esta medición)

Consecuencia arquitectónica:
  ADR-001 — resuelto asignando la Understanding Layer de AMV a este layer,
  pendiente de registrarse en código (ADR-004).
```

---

## Confidence

Lectura cualitativa del estado actual, no una medición — cada nivel está anclado a
evidencia ya mostrada arriba, no es una cifra suelta:

- **Consistencia de arquitectura** ★★★★★ — ADR-000/001/002/003 revisados en varias
  rondas, contradicciones detectadas y resueltas (re-taxonomía de layers rechazada
  con evidencia, tensión de `decision_record` resuelta sin tocar AMV).
- **Consistencia de implementación** ★★★★☆ — no ★★★★★: dos bugs de `field_events`
  y un acoplamiento de `probeTable` se encontraron y corrigieron durante esta
  auditoría, no estaban limpios desde el origen.
- **Verificación estática** ★★★★★ — típecheck, build, boundaries, route audit,
  cross-check de esquema, preflight: todo en verde, validado contra clon limpio.
- **Verificación en vivo** ★★★☆☆ — un único snapshot, un único punto en el tiempo.
  Confirma que la estructura no miente, pero `recentEvents: []` significa cero
  evidencia de comportamiento bajo uso real todavía.
- **Madurez operacional** ★★☆☆☆ — 10 de 17 agentes sin lógica de ejecución, cero
  ciclos cognitivos ejecutados nunca, integración AMV decidida pero no implementada.

## Revalidation Criteria

Repetir esta medición después de:

- Implementación de ADR-004 (`AMVReading`) y ADR-007 (`logbookId`).
- Integración de `PhenomenonRelay`.
- Registro en código de la Understanding Layer de AMV.

Cambios observables esperados — condiciones concretas, no "hay que volver a medir":

- `runtime.layers.find(l => l.id === 'understand').agents.length > 0`
- `runtime.eventGraph.recentEvents.length > 0`
- Eventos de AMV y del Runtime compartiendo el mismo `logbookId` por ciclo (hoy:
  `'default'` vs `AMV:<scope>`, sin relación entre ambos).
