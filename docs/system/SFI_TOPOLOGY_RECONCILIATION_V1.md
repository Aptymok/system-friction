# SFI — Topology Reconciliation v1
Status: documento de auditoría — Operación 0
Fecha: 2026-07-21
Anclado a: `Aptymok/system-friction@6211adb4` (main, 2026-07-20T23:06:31-06:00)
Archivos auditados: 1194 · Líneas: 127,566

## 0. Propósito

Este documento no es la especificación de arquitectura. Es la reconciliación entre esa
especificación (tres documentos de trabajo, no versionados en el repo) y el estado real
del código en `main`.

Regla aplicada: **no se declara ausente nada que ya exista bajo otro nombre.** La
especificación describe 16 pipelines y ~18 agentes nuevos. Este documento clasifica cada
uno en tres estados:

- `IMPLEMENTADO` — existe, funcional, con ruta de archivo verificada.
- `PARCIAL` — existe una pieza real que cubre parte de la función descrita.
- `AUSENTE` — no hay rastro en el árbol de archivos.

No se reescribe la especificación. Se corrige contra la evidencia.

---

## 1. Hallazgo principal

El sistema ya opera un ciclo cerrado observación → hipótesis → evidencia →
intervención → medición → aprendizaje. No es aspiracional: está implementado y activo
en `/field` (`docs/field/FIELD_OPERATIONAL_CYCLE_V1.md`, `src/lib/field/operationalCycle.ts`),
con tablas Supabase reales (`field_cases`, `field_hypotheses`, `field_interventions`,
`field_returns`, `field_outcomes`, `field_lessons`) y sellado SHA-256.

Esto significa que el **Principio 8** del documento 3 ("ciclo científico permanente") y
buena parte del **Pipeline 16** (ciclo institucional completo) del documento 1 no son
trabajo pendiente. Son trabajo hecho. El riesgo real no es la ausencia del ciclo — es
que la nueva capa de agentes propuesta lo re-implemente en paralelo sin conectarse a él.

---

## 2. Mapa pipeline por pipeline

| # | Pipeline (spec) | Estado | Evidencia real |
|---|---|---|---|
| 1 | Kernel Layer / MetaOrchestrator | PARCIAL | `packages/sfi-kernel/src/cycle.ts` ya ejecuta el ciclo completo (worldSpect → graph → MIHM → delta → policy → evento → persistencia). No existe selección dinámica de agentes por pregunta (`MetaOrchestratorAgent` real: **AUSENTE**). |
| 2 | Reality Observation / FieldObserver | PARCIAL | `src/lib/world-vector/agents/dailyObservationAgent.ts`, `alertAgent.ts` cubren observación pasiva. No hay agente separado que garantice "nunca interviene" como invariante explícita. |
| 3 | Evidence Intelligence / EvidenceHunter, Contradiction, MissingEvidence | PARCIAL | El modelo de evidencia con clases epistémicas (`observed/declared/derived/inferred/simulated/fixture/missing`) ya existe en `packages/events/src/schema.ts` — más riguroso que lo descrito en la spec. `MissingEvidence` como concepto aparece en 11 archivos (`predictive-engine/governedOutcome.ts`, `rootEjectorDetector.ts`). `ContradictionAgent` y `EvidenceHunterAgent` como agentes dedicados: **AUSENTES**. |
| 4 | PPOI / PhenotypeResolver | PARCIAL | `src/lib/sfi/predictions/agents/{evidenceStateAgent,verificationAgent,returnWindowAgent}.ts` implementan el pipeline de predicción end-to-end (usado por el Public Prediction Ledger). `PhenotypeResolverAgent` (analogía estructural entre casos): **AUSENTE**. |
| 5 | Temporal Intelligence / Cronos | PARCIAL | Existen `longitudinal.ts` (duplicado real en `agents/` y `lib/` — ver §3), `delta-engine`. `TemporalParadoxResolverAgent` explícito: **AUSENTE**. |
| 6 | Historical Reconstruction | AUSENTE | Sin `HistoricalContextScoutAgent` ni `ArchaeologistAgent`. No se encontró equivalente funcional. |
| 7 | Cognitive Twin | IMPLEMENTADO | `experimental/cognitive-twin/`, `services/python/cognitive_twin/`, `cognitiveTwinBridgeAgent.ts`, `cognitive-twin-engineAgent.ts`. Rama madura. |
| 8 | Field Simulation Engine | PARCIAL | `services/python/sfi_engine`, `cognitive_orchestrator`, MIHM core (`packages/mihm-core`). Los simuladores por dominio (social/económico/cultural/psicológico como módulos separados): **AUSENTES** como tal — la lógica vive fusionada en MIHM, no separada por campo. |
| 9 | Generative Strategy | IMPLEMENTADO | `src/lib/studio/cultural-lab/agents/` — 8 agentes reales (`emergenceAgent`, `narrativeAgent`, `projectionAgent`, `simulationAgent`, `worldSpectrumAgent`, etc.), con pipeline propio (`pipeline.ts`). `OpportunityDiscoveryAgent`, `RiskAgent`, `CrossImpactAgent` dedicados: **AUSENTES**. |
| 10 | Attractor / Ejector | IMPLEMENTADO | `attractorAgent.ts`, `ejectorAgent.ts`, `rootEjectorDetector.ts`, `experimental/tools/attractor-agent.ts`. |
| 11 | Governance Consensus | PARCIAL | `governance-realityAgent.ts`, `policy-runtime`, R12-mod/R16/R17/R18/R19 activas. `MultiStakeholderBootstrapAgent` (modelo Operador/Participante/Sistema con divergencia): **AUSENTE**. |
| 12 | Recovery / Self-Healing | PARCIAL | `quarantine/`, referencias a `selfHealing`/`selfRepair`. `ContextualHallucinationSeederAgent` explícito: **AUSENTE**. |
| 13 | Project Execution | PARCIAL | `experimental/project-manager.ts` (duplicado — ver §3), `operationalCycle.ts`. `ProjectExecutionManagerAgent` como coordinador formal: **AUSENTE**. |
| 14 | Learning / Calibration | IMPLEMENTADO | `src/lib/predictive-engine/calibration.ts` — modelo con `weights`, `learningRate`, `verifiedSampleCount`, estados `ACTIVE/SHADOW/FROZEN/RETIRED`. Es una implementación *más* seria que "RealityCalibrationAgent" descrito en la spec. `PersistenceAgent` genérico: PARCIAL vía `world-vector/agents/persistenceAuditAgent.ts` (alcance limitado a auditoría de world-vector, no a fenómenos en general). |
| 15 | UI/UX Observatories | IMPLEMENTADO | `/root`, `/studio`, `/observatory`, `/field`, `/world-vector` existen como superficies reales en `src/app/`, cada una con componentes propios (`src/components/root/`, `src/components/studio/`, etc.). |
| 16 | Ciclo institucional completo | IMPLEMENTADO | Ver §1 — `/field` ya lo ejecuta de punta a punta. |

---

## 3. Corrección al QA_REPORT.txt del propio repo (2026-07-19)

El audit automático interno marcó como "duplicidad potencial" cuatro pares de archivos
por coincidencia de nombre. Verificación manual:

- **`interventionAgent.ts`** (`lib/amv/agents/` vs `lib/studio/cultural-lab/agents/`):
  **no es duplicado.** Son dos funciones distintas — la de AMV evalúa aprobación de un
  plan (`AmvInterventionAgentResult`, gate de gobernanza), la de cultural-lab genera
  candidatos de intervención narrativa (`InterventionCandidate[]`). Coinciden en nombre,
  no en dominio. Recomendación: renombrar (`amvInterventionGate.ts` /
  `culturalInterventionGenerator.ts`) para que el QA automático deje de reportarlo — no
  fusionar.
- **`longitudinal.ts`**, **`maker-mihm.ts`**, **`project-manager.ts`** (pares en
  `agents/` vs `lib/` o `experimental/`): no verificados aquí en detalle — requieren la
  misma comprobación antes de tocarlos. No asumir duplicación real solo por el nombre.

Esto importa porque el documento 3 advierte exactamente sobre este riesgo
("duplicación funcional, agentes huérfanos") — y la primera instancia detectada por la
propia herramienta de auditoría del repo resulta ser un falso positivo. El costo de
fusionar sin verificar habría sido perder el gate de gobernanza de AMV.

---

## 4. La única pieza que falta genuinamente antes de añadir agentes

`src/agents/runtime/agentContract.ts` existe, pero no es el contrato que el documento 3
pide como prerrequisito. Hoy es esto:

```typescript
export type AgentAction = "ANALYZE" | "PUBLISH" | "SCHEDULE" | "OBSERVE" | "STORE_MEMORY" | "REQUEST_APPROVAL";
export interface AgentContext { state: any; user?: any; node?: any; metrics: any; }
export function resolveAction(ctx: AgentContext): AgentAction[] { ... }
```

Es un selector de acciones por umbral (`ldi > 0.85`, `ihg < -0.8`), no un contrato
declarativo. No exige que un agente declare `purpose`, `input_events`, `output_events`,
`memory_writes`, `confidence`, `authority_level` — que es precisamente lo que evitaría
que los ~14 agentes genuinamente ausentes de la tabla en §2 se construyan como piezas
sueltas en lugar de nodos del mismo grafo de eventos que ya existe en
`packages/events/src/schema.ts`.

**Esta es la Operación 0 real**, no una nueva versión de la spec: extender
`agentContract.ts` para que use `SFIEvent`/`EpistemicEventRecord` (ya definidos) como
tipo de entrada/salida obligatorio, y que cada agente nuevo declare su contrato antes de
tener código.

---

## 5. Recomendación de secuencia

1. Verificar los tres pares de archivos restantes en §3 (no asumir).
2. Formalizar el contrato de agente en `src/agents/runtime/agentContract.ts` contra
   `SFIEvent` — un cambio, no un archivo nuevo.
3. Solo entonces: de los 14 agentes marcados `AUSENTE`/`PARCIAL` en §2, priorizar por
   pipeline con menor cobertura real — Historical Reconstruction (§2 fila 6) es la única
   fila sin ninguna pieza existente. Ahí, y no en MetaOrchestrator, está el vacío real.

No se generó código de agentes nuevos en esta pasada. Generar `MetaOrchestratorAgent.ts`
sin el contrato del punto 2 reproduciría el mismo patrón que ya generó los falsos
duplicados de §3.

