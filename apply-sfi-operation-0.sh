#!/usr/bin/env bash
set -euo pipefail

# SFI -- Operacion 0: aplica el fix de registry.ts y coloca los documentos de reconciliacion.
# Correr desde la raiz del repo (system-friction/), donde esta package.json.

if [ ! -f "package.json" ] || ! grep -q "system-friction-terminal" package.json; then
  echo "Error: corre este script desde la raiz del repo (system-friction/)." >&2
  exit 1
fi

mkdir -p src/lib/sfi/cognitive-runtime
mkdir -p docs/system

echo "-> Escribiendo src/lib/sfi/cognitive-runtime/registry.ts"
cat > src/lib/sfi/cognitive-runtime/registry.ts <<'SFI_EOF_REGISTRY_9f2a1'
import type { SfiRegisteredCognitiveAgent, SfiRuntimeModeState } from './types';

const worldVectorTables = ['world_vector_observations', 'worldspect_snapshots'];
const evidenceTables = ['epistemic_events', 'root_evidence_entries', 'sfi_evidence_ledger'];
const memoryTables = ['sfi_amv_memory', 'sfi_graph_nodes', 'graph_nodes'];
const predictionTables = ['sfi_predictive_runs', 'sfi_predictive_learning_events'];
const governanceTables = ['action_proposals', 'logbook_mutations', 'root_audit_events'];
export const SFI_FIELD_TABLES = ['field_cases', 'field_moph_runs', 'field_participant_windows'];

export const SFI_COGNITIVE_AGENT_REGISTRY: SfiRegisteredCognitiveAgent[] = [
  {
    id: 'meta_orchestrator',
    name: 'MetaOrchestratorAgent',
    purpose: 'Plan the minimum cognitive task graph required to answer a systemic question.',
    domain: 'governance',
    layer: 'decide',
    listensTo: ['sfi.question.received', 'SFI_TASK_REQUESTED'],
    emits: ['SFI_TASK_CREATED'],
    readsMemory: ['epistemic_events', 'sfi_amv_memory', 'sfi_graph_nodes', 'sfi_predictive_runs'],
    writesMemory: ['epistemic_events'],
    confidenceModel: { method: 'contract_coverage', calibration: 'requires downstream reality calibration' },
    authorityLevel: 'advisor',
    simulationAllowed: false,
    humanApprovalRequired: false,
    sourceTables: [...evidenceTables, ...memoryTables, ...predictionTables],
    route: '/api/root/cognitive-runtime',
    operationalMode: false,
    missingCapability: false,
  },
  {
    id: 'temporal_resolver',
    name: 'TemporalResolverAgent',
    purpose: 'Resolve the time coordinate, T0 cutoff, return window, and observable outcome horizon.',
    domain: 'temporal',
    layer: 'reconstruct',
    listensTo: ['SFI_TASK_CREATED', 'phenomenon.registered', 'prediction.created'],
    emits: ['SFI_TEMPORAL_COORDINATE_RESOLVED'],
    readsMemory: ['epistemic_events', 'sfi_predictive_runs', 'field_returns'],
    writesMemory: ['epistemic_events'],
    confidenceModel: { method: 'timestamp_coverage', calibration: 'prediction outcome windows' },
    authorityLevel: 'analyst',
    simulationAllowed: false,
    humanApprovalRequired: false,
    sourceTables: ['epistemic_events', 'sfi_predictive_runs', 'field_returns'],
    route: null,
    operationalMode: false,
    missingCapability: false,
  },
  {
    id: 'evidence_hunter',
    name: 'EvidenceHunterAgent',
    purpose: 'Identify missing evidence required by a task without fabricating observations.',
    domain: 'evidence',
    layer: 'observe',
    listensTo: ['SFI_TASK_CREATED', 'SFI_TEMPORAL_COORDINATE_RESOLVED'],
    emits: ['SFI_EVIDENCE_REQUIREMENT_DECLARED'],
    readsMemory: ['root_evidence_entries', 'sfi_evidence_ledger', 'epistemic_events'],
    writesMemory: ['epistemic_events'],
    confidenceModel: { method: 'source_presence_and_lineage', calibration: 'evidence ledger verification' },
    authorityLevel: 'observer',
    simulationAllowed: false,
    humanApprovalRequired: false,
    sourceTables: evidenceTables,
    route: '/api/root/evidence',
    operationalMode: false,
    missingCapability: false,
  },
  {
    id: 'historical_scout',
    name: 'HistoricalScoutAgent',
    purpose: 'Declare historical sources needed for reconstruction from INEGI, DOF, papers, news, archives, and datasets.',
    domain: 'evidence',
    layer: 'reconstruct',
    listensTo: ['SFI_TASK_CREATED', 'SFI_EVIDENCE_REQUIREMENT_DECLARED'],
    emits: ['SFI_HISTORICAL_SOURCE_SET_DECLARED'],
    readsMemory: ['root_evidence_entries', 'sfi_reference_cases', 'epistemic_events'],
    writesMemory: ['epistemic_events'],
    confidenceModel: { method: 'source_manifest_completeness', calibration: 'reference case outcomes' },
    authorityLevel: 'observer',
    simulationAllowed: false,
    humanApprovalRequired: false,
    sourceTables: ['root_evidence_entries', 'sfi_reference_cases', 'epistemic_events'],
    route: null,
    operationalMode: false,
    missingCapability: true,
  },
  {
    id: 'phenotype_resolver',
    name: 'PhenotypeResolverAgent',
    purpose: 'Match historical configurations by structure, not by surface similarity.',
    domain: 'evidence',
    layer: 'reconstruct',
    listensTo: ['SFI_HISTORICAL_SOURCE_SET_DECLARED', 'SFI_CONTEXT_COORDINATE_BUILT'],
    emits: ['SFI_PHENOTYPE_RESOLVED'],
    readsMemory: ['sfi_phenomena', 'sfi_reference_cases', 'sfi_graph_nodes', 'graph_nodes'],
    writesMemory: ['epistemic_events'],
    confidenceModel: { method: 'configuration_overlap', calibration: 'closed reference cases' },
    authorityLevel: 'analyst',
    simulationAllowed: false,
    humanApprovalRequired: false,
    sourceTables: ['sfi_phenomena', 'sfi_reference_cases', 'sfi_graph_nodes', 'graph_nodes'],
    route: null,
    operationalMode: false,
    missingCapability: true,
  },
  {
    id: 'context_builder',
    name: 'ContextBuilderAgent',
    purpose: 'Build temporal coordinates with actors, forces, constraints, vectors, and tensions.',
    domain: 'evidence',
    layer: 'reconstruct',
    listensTo: ['SFI_TEMPORAL_COORDINATE_RESOLVED', 'SFI_PHENOTYPE_RESOLVED'],
    emits: ['SFI_CONTEXT_COORDINATE_BUILT'],
    readsMemory: ['epistemic_events', 'sfi_graph_nodes', 'field_cases'],
    writesMemory: ['epistemic_events'],
    confidenceModel: { method: 'field_slot_completeness', calibration: 'post outcome reconstruction review' },
    authorityLevel: 'analyst',
    simulationAllowed: false,
    humanApprovalRequired: false,
    sourceTables: ['epistemic_events', 'sfi_graph_nodes', 'field_cases'],
    route: null,
    operationalMode: false,
    missingCapability: true,
  },
  {
    id: 'social_field_simulator',
    name: 'SocialFieldSimulator',
    purpose: 'Estimate social state S=f(P,C,T,I) when population, trust, cultural trend, and interaction evidence exists.',
    domain: 'simulation',
    layer: 'simulate',
    listensTo: ['SFI_CONTEXT_COORDINATE_BUILT'],
    emits: ['SFI_SOCIAL_FIELD_SIMULATED'],
    readsMemory: ['epistemic_events', 'sfi_graph_nodes', 'field_cases'],
    writesMemory: ['epistemic_events'],
    confidenceModel: { method: 'bounded_variable_coverage', calibration: 'observed social return' },
    authorityLevel: 'analyst',
    simulationAllowed: true,
    humanApprovalRequired: false,
    sourceTables: ['epistemic_events', 'sfi_graph_nodes', 'field_cases'],
    route: null,
    operationalMode: false,
    missingCapability: true,
  },
  {
    id: 'economic_field_simulator',
    name: 'EconomicFieldSimulator',
    purpose: 'Estimate economic state E=f(K,L,R,M) from capital, labor, resources, and market evidence.',
    domain: 'simulation',
    layer: 'simulate',
    listensTo: ['SFI_CONTEXT_COORDINATE_BUILT'],
    emits: ['SFI_ECONOMIC_FIELD_SIMULATED'],
    readsMemory: ['epistemic_events', 'root_evidence_entries', 'field_cases'],
    writesMemory: ['epistemic_events'],
    confidenceModel: { method: 'bounded_variable_coverage', calibration: 'observed economic return' },
    authorityLevel: 'analyst',
    simulationAllowed: true,
    humanApprovalRequired: false,
    sourceTables: ['epistemic_events', 'root_evidence_entries', 'field_cases'],
    route: null,
    operationalMode: false,
    missingCapability: true,
  },
  {
    id: 'policy_simulator',
    name: 'PolicySimulator',
    purpose: 'Estimate policy state P=f(G,R,B,A) before any governed intervention is approved.',
    domain: 'simulation',
    layer: 'simulate',
    listensTo: ['SFI_CONTEXT_COORDINATE_BUILT', 'SFI_GOVERNANCE_REVIEW_REQUESTED'],
    emits: ['SFI_POLICY_FIELD_SIMULATED'],
    readsMemory: ['action_proposals', 'root_audit_events', 'epistemic_events'],
    writesMemory: ['epistemic_events'],
    confidenceModel: { method: 'governance_constraint_coverage', calibration: 'decision audit outcomes' },
    authorityLevel: 'analyst',
    simulationAllowed: true,
    humanApprovalRequired: false,
    sourceTables: ['action_proposals', 'root_audit_events', 'epistemic_events'],
    route: null,
    operationalMode: false,
    missingCapability: true,
  },
  {
    id: 'cultural_simulator',
    name: 'CulturalSimulator',
    purpose: 'Estimate cultural state C=f(N,S,A,T) from narrative, symbols, attention, and transmission.',
    domain: 'simulation',
    layer: 'simulate',
    listensTo: ['SFI_CONTEXT_COORDINATE_BUILT', 'world_vector.observed'],
    emits: ['SFI_CULTURAL_FIELD_SIMULATED'],
    readsMemory: ['world_vector_observations', 'worldspect_snapshots', 'sfi_amv_memory'],
    writesMemory: ['epistemic_events'],
    confidenceModel: { method: 'world_vector_alignment', calibration: 'prediction calibration residuals' },
    authorityLevel: 'analyst',
    simulationAllowed: true,
    humanApprovalRequired: false,
    sourceTables: [...worldVectorTables, 'sfi_amv_memory'],
    route: null,
    operationalMode: false,
    missingCapability: true,
  },
  {
    id: 'psychological_simulator',
    name: 'PsychologicalSimulator',
    purpose: 'Estimate psychological state Psi=f(D,F,M,R) with explicit desire, fear, memory, and reward evidence.',
    domain: 'simulation',
    layer: 'simulate',
    listensTo: ['SFI_CONTEXT_COORDINATE_BUILT', 'moph.session.observed'],
    emits: ['SFI_PSYCHOLOGICAL_FIELD_SIMULATED'],
    readsMemory: ['sfi_moph_sessions', 'sfi_amv_memory', 'epistemic_events'],
    writesMemory: ['epistemic_events'],
    confidenceModel: { method: 'declared_object_and_trace_coverage', calibration: 'MOP-H return checks' },
    authorityLevel: 'analyst',
    simulationAllowed: true,
    humanApprovalRequired: false,
    sourceTables: ['sfi_moph_sessions', 'sfi_amv_memory', 'epistemic_events'],
    route: null,
    operationalMode: false,
    missingCapability: true,
  },
  {
    id: 'trajectory_agent',
    name: 'TrajectoryAgent',
    purpose: 'Compare baseline, observed drift, and possible trajectory loss without changing source data.',
    domain: 'temporal',
    layer: 'project',
    listensTo: ['SFI_CONTEXT_COORDINATE_BUILT', 'SFI_FIELD_SIMULATION_COMPLETED'],
    emits: ['SFI_TRAJECTORY_ASSESSED'],
    readsMemory: ['sfi_predictive_runs', 'sfi_predictive_learning_events', 'epistemic_events'],
    writesMemory: ['epistemic_events'],
    confidenceModel: { method: 'time_series_and_residual_coverage', calibration: 'prediction outcome residuals' },
    authorityLevel: 'analyst',
    simulationAllowed: true,
    humanApprovalRequired: false,
    sourceTables: predictionTables,
    route: null,
    operationalMode: false,
    missingCapability: false,
  },
  {
    id: 'reality_calibration',
    name: 'RealityCalibrationAgent',
    purpose: 'Return every prediction to observed outcome, error, model adjustment, and next prediction readiness.',
    domain: 'evidence',
    layer: 'learn',
    listensTo: ['prediction.outcome.recorded', 'SFI_TRAJECTORY_ASSESSED'],
    emits: ['SFI_REALITY_CALIBRATED'],
    readsMemory: ['sfi_predictive_runs', 'sfi_predictive_learning_events', 'epistemic_events'],
    writesMemory: ['sfi_predictive_learning_events', 'epistemic_events'],
    confidenceModel: { method: 'absolute_error', calibration: 'model weight update audit' },
    authorityLevel: 'analyst',
    simulationAllowed: false,
    humanApprovalRequired: false,
    sourceTables: predictionTables,
    route: '/api/predictive-engine/runs/[id]/outcome',
    operationalMode: false,
    missingCapability: false,
  },
  {
    id: 'risk_agent',
    name: 'RiskAgent',
    purpose: 'Identify downside, missing evidence, and governance blockers before action.',
    domain: 'governance',
    layer: 'decide',
    listensTo: ['SFI_TRAJECTORY_ASSESSED', 'SFI_POLICY_FIELD_SIMULATED'],
    emits: ['SFI_RISK_DECLARED'],
    readsMemory: ['action_proposals', 'sfi_evidence_ledger', 'root_audit_events'],
    writesMemory: ['epistemic_events'],
    confidenceModel: { method: 'blocker_count_and_severity', calibration: 'decision audit outcomes' },
    authorityLevel: 'advisor',
    simulationAllowed: true,
    humanApprovalRequired: false,
    sourceTables: governanceTables,
    route: null,
    operationalMode: false,
    missingCapability: false,
  },
  {
    id: 'opportunity_agent',
    name: 'OpportunityAgent',
    purpose: 'Identify upside windows only after evidence and risk states are declared.',
    domain: 'governance',
    layer: 'decide',
    listensTo: ['SFI_RISK_DECLARED', 'SFI_TRAJECTORY_ASSESSED'],
    emits: ['SFI_OPPORTUNITY_DECLARED'],
    readsMemory: ['sfi_graph_nodes', 'sfi_amv_memory', 'action_proposals'],
    writesMemory: ['epistemic_events'],
    confidenceModel: { method: 'evidence_supported_windowing', calibration: 'observed return windows' },
    authorityLevel: 'advisor',
    simulationAllowed: true,
    humanApprovalRequired: false,
    sourceTables: ['sfi_graph_nodes', 'sfi_amv_memory', 'action_proposals'],
    route: null,
    operationalMode: false,
    missingCapability: false,
  },
  {
    id: 'multi_stakeholder_bootstrap',
    name: 'MultiStakeholderBootstrapAgent',
    purpose: 'Simulate operator, participant, and system divergence before a governed intervention proceeds.',
    domain: 'governance',
    layer: 'decide',
    listensTo: ['SFI_OPPORTUNITY_DECLARED', 'SFI_RISK_DECLARED'],
    emits: ['SFI_MULTI_STAKEHOLDER_SIMULATED'],
    readsMemory: ['action_proposals', 'field_cases', 'sfi_moph_sessions', 'epistemic_events'],
    writesMemory: ['epistemic_events'],
    confidenceModel: { method: 'stakeholder_divergence_delta', calibration: 'post intervention outcomes' },
    authorityLevel: 'advisor',
    simulationAllowed: true,
    humanApprovalRequired: true,
    sourceTables: ['action_proposals', 'field_cases', 'sfi_moph_sessions', 'epistemic_events'],
    route: null,
    operationalMode: false,
    missingCapability: true,
  },
  {
    id: 'project_execution_manager',
    name: 'ProjectExecutionManagerAgent',
    purpose: 'Manage coherence across objectives, dependencies, agents, missing evidence, and risk.',
    domain: 'governance',
    layer: 'act',
    listensTo: ['SFI_TASK_CREATED', 'SFI_MULTI_STAKEHOLDER_SIMULATED', 'root.action.completed'],
    emits: ['SFI_PROJECT_EXECUTION_STATE_DECLARED'],
    readsMemory: ['action_proposals', 'logbook_mutations', 'root_audit_events', 'epistemic_events'],
    writesMemory: ['epistemic_events'],
    confidenceModel: { method: 'dependency_and_blocker_coverage', calibration: 'audit closure rate' },
    authorityLevel: 'advisor',
    simulationAllowed: true,
    humanApprovalRequired: true,
    sourceTables: governanceTables,
    route: null,
    operationalMode: false,
    missingCapability: true,
  },
];

export const SFI_COGNITIVE_RUNTIME_MODES: Array<Omit<SfiRuntimeModeState, 'status' | 'readsMemory' | 'writesMemory' | 'warning'>> = [
  {
    id: 'passive_field_observation',
    name: 'Passive Field Observation Layer',
    principle: 'Observe does not modify.',
    emits: ['SFI_FIELD_STATE_OBSERVED'],
  },
];

export const SFI_LAYER_QUESTIONS: Record<SfiRegisteredCognitiveAgent['layer'], string> = {
  observe: 'What is happening?',
  reconstruct: 'What historical context is missing?',
  simulate: 'What changes if a variable changes?',
  understand: 'What connections exist?',
  project: 'What trajectory is forming?',
  decide: 'Should it be done?',
  act: 'How does it execute under governance?',
  learn: 'What returned from reality?',
};

export const SFI_RUNTIME_SOURCE_TABLES = [
  ...new Set(SFI_COGNITIVE_AGENT_REGISTRY.flatMap((agent) => agent.sourceTables).concat(SFI_FIELD_TABLES)),
].sort();

SFI_EOF_REGISTRY_9f2a1

echo "-> Escribiendo docs/system/operation-0-reconciliation.md"
cat > docs/system/operation-0-reconciliation.md <<'SFI_EOF_RECON_9f2a1'
# SFI — Operation 0: Topology Reconciliation
Status: capa de reconciliación — se lee antes de crear cualquier agente nuevo
Anclado a: `Aptymok/system-friction@aa0339f` (main, 2026-07-21T23:38:45-06:00)
Fuente de verdad: `src/lib/sfi/cognitive-runtime/registry.ts` (17 agentes declarados)
Este documento no reemplaza el registro. Lo explica. Si el registro cambia, este
documento queda desactualizado por definición — no se mantiene a mano, se regenera.

## 1. Propósito

Determinar qué existe realmente antes de expandir. Evitar duplicación funcional.
Ningún agente se declara sin que su contrato (`purpose`, `domain`, `listensTo`,
`emits`, `readsMemory`, `writesMemory`, `authorityLevel`, `sourceTables`) exista
primero como dato tipado en `registry.ts`.

## 2. Estado actual del sistema (capas verificadas)

- **ROOT** — `src/app/root`, consola soberana (`RootSovereignConsole`), gating por
  `requireRootActor`.
- **Cognitive Runtime** — nuevo desde `aa0339f`: registro de contratos + runtime que
  prueba tablas en vivo contra Supabase (no confía en lo declarado) + vista ROOT
  (`/root?view=cognitive-runtime`).
- **Event Graph** — `packages/events/src/schema.ts`, clases epistémicas
  (`observed/declared/derived/inferred/simulated/fixture/missing`), tabla
  `epistemic_events`.
- **Evidence Graph** — `root_evidence_entries`, `sfi_evidence_ledger`,
  `sfi_phenomenon_evidence`.
- **Prediction Registry** — `sfi_predictive_runs`, `sfi_predictive_learning_events`,
  motor de calibración con estados `ACTIVE/SHADOW/FROZEN/RETIRED`
  (`src/lib/predictive-engine/calibration.ts`).
- **Governance** — `action_proposals`, `logbook_mutations`, `root_audit_events`, reglas
  R12-mod/R16/R17/R18/R19.
- **Studio** — `src/lib/studio/cultural-lab/agents/` (8 agentes reales, pipeline propio).
- **MIHM / AMV** — `packages/mihm-core`, `src/lib/amv/agents/`.
- **FIELD** — ciclo operacional cerrado end-to-end ya en producción
  (`docs/field/FIELD_OPERATIONAL_CYCLE_V1.md`): T0 → MOP-H → hipótesis → intervención →
  retorno → MIHM parcial → lección, con sellado SHA-256.

## 3. Mapeo arquitectura → implementación

| Concepto de la especificación | Implementación real |
|---|---|
| "Phenomenon Memory" | Evidence Graph + Event Graph (`epistemic_events`, `sfi_evidence_ledger`) |
| "Agent Runtime" | Cognitive Runtime (`registry.ts` + `runtime.ts`) |
| "Ciclo científico permanente" | `/field` — ya operativo, no pendiente |
| "Calibración de realidad" | `predictive-engine/calibration.ts` — más riguroso que lo descrito en la spec original |
| "Observatorios UI" | `/root`, `/studio`, `/observatory`, `/field`, `/world-vector` |

## 4. Capacidades existentes (derivado de `registry.ts`, 17 agentes)

**EXISTE** — `missingCapability: false`, contrato respaldado por tablas reales y, en
7 casos, ruta API activa:

| Agente | Layer | Ruta API | Estado estructural |
|---|---|---|---|
| `meta_orchestrator` | decide | `/api/root/cognitive-runtime` | OPERACIONAL |
| `evidence_hunter` | observe | `/api/root/evidence` | OPERACIONAL |
| `temporal_resolver` | reconstruct | — | OPERACIONAL (corregido, ver abajo) |
| `trajectory_agent` | project | — | OPERACIONAL |
| `reality_calibration` | learn | `/api/predictive-engine/runs/[id]/outcome` | OPERACIONAL |
| `risk_agent` | decide | — | OPERACIONAL |
| `opportunity_agent` | decide | — | OPERACIONAL |

**Corrección aplicada y verificada** (commit local, pendiente de push):
`temporal_resolver` declaraba `field_events` como `sourceTable` — tabla inexistente en
las 43 migraciones. Se reemplazó por `field_returns` (tabla real:
`verification_window`, `expected_at`, `returned_at` — coincide con "return window and
observable outcome horizon", el propósito declarado del agente). También se corrigió la
constante compartida `SFI_FIELD_TABLES` (`'field_events'` → `'field_moph_runs'`, usada
por el modo `passive_field_observation`). Archivo completo corregido:
`src/lib/sfi/cognitive-runtime/registry.ts`.

Verificación ejecutada sobre el repo con el fix aplicado:
- `npm run check:boundaries` → pasa, `cognitive-runtime` no cruza dominios.
- `npm run typecheck` (`tsc --noEmit`) → 0 errores.
- `npm run build` (Next.js 16 / Turbopack) → compila, typecheck interno y
  page-data collection completos sin errores; `/api/root/cognitive-runtime` queda
  registrada como ruta dinámica (`ƒ`), confirmando que no se evalúa contra Supabase
  en build-time.
- `npm run audit:routes` → la ruta y los tres archivos de `cognitive-runtime/` quedan
  indexados correctamente.
- Cross-check estructural de las 17 declaraciones contra `supabase/migrations/`:
  **0 referencias a tablas inexistentes** (antes del fix: 1).

**GATED** — `missingCapability: true`. Contrato declarado, sin persistencia ni lógica
que lo respalde todavía. No son "por hacer" genéricos: cada uno tiene su propio contrato
tipado esperando implementación, lo que evita que se construyan como piezas sueltas:

`historical_scout` · `phenotype_resolver` · `context_builder` ·
`social_field_simulator` · `economic_field_simulator` · `policy_simulator` ·
`cultural_simulator` · `psychological_simulator` · `multi_stakeholder_bootstrap` ·
`project_execution_manager`

**AUSENTE** — sin contrato declarado ni en el registro ni en el código:
`ContradictionAgent` (de la spec original) no tiene entrada propia; su función parcial
vive dentro de `MissingEvidence` (11 archivos, sin agente dedicado). No se agrega al
registro en esta pasada — es candidato para la siguiente fase, no para esta.

## 5. Duplicaciones detectadas

Confirmado en la pasada anterior: `interventionAgent.ts` en `lib/amv/agents/` vs
`lib/studio/cultural-lab/agents/` **no es duplicado real** — dominios distintos
(gate de gobernanza vs generador de candidatos narrativos). Coincidencia de nombre,
no de función. Recomendación pendiente: renombrar, no fusionar.
Sin duplicaciones nuevas introducidas por el commit `aa0339f` — no crea persistencia
paralela ni una segunda definición de agente ya existente en otro dominio.

## 6. Superficies que no deben crearse

- Otra página de "agentes" fuera de `/root?view=cognitive-runtime`. Esa vista ya es la
  superficie canónica del Cognitive Runtime.
- Un grafo de evidencia nuevo. Ya existe: `epistemic_events` + `sfi_evidence_ledger` +
  `root_evidence_entries`.
- Tablas `field_*` nuevas para los simuladores de campo `GATED`. Cuando se implementen,
  deben leer de `field_cases`/`field_moph_runs` existentes, no crear un esquema paralelo.
- Un segundo orquestador. `meta_orchestrator` ya está declarado y conectado a
  `SFI_TASK_CREATED`; no emitir agentes que se llamen entre sí directamente (regla del
  documento de arquitectura original, §16: el evento es el lenguaje común, no la llamada
  directa).

## 6bis. Límite de esta verificación

Todo lo anterior es verificación **estructural**: código, tipos, build, y esquema de
migraciones. No es verificación de **producción**. Este entorno no tiene
`SUPABASE_SERVICE_ROLE_KEY` ni `DATABASE_URL` (`.env.local`/`.env.production` están en
`.gitignore`, no llegan al clon), y el acceso de red de este entorno no incluye el host
de Supabase — no hay forma de que `probeTable()` corra contra la base real desde aquí.

Por eso no se reporta un cuadro `ROOT Cognitive Runtime Health` con números de
`Operational/Gated/Warnings/Missing` en vivo — sería inventar exactamente el tipo de
dato que este documento existe para no inventar. Lo que sí se puede afirmar: si las
tablas responden en producción igual que en el esquema de migraciones, los 7 agentes
`EXISTE` deberían leer `operational`, no `degraded` — el fix eliminó la única causa
estructural conocida de un `warning`.

Para obtener el health real:
```
npm run build && npm run start
# en otra terminal, autenticado como ACP:
curl -s http://localhost:3000/api/root/cognitive-runtime | jq .runtime
```
o apuntar `QA_HOST` del script existente (`npm run qa:sfi-runtime`) a un despliegue
con credenciales reales.

## 7. Próxima fase autorizada

1. Corregir `field_events` en `registry.ts` (una línea, antes de que se acumule como
   deuda silenciosa detrás de un estado "degraded" que nadie investigará después).
2. De los 10 agentes `GATED`, priorizar **Historical Reconstruction**
   (`historical_scout`, `phenotype_resolver`, `context_builder`) — es la única fila sin
   ninguna pieza real subyacente, ya confirmado en dos auditorías independientes
   (manual y por registro).
3. Los cinco simuladores de campo no se implementan como bloque: cada uno depende de
   qué variables (`bounded_variable_coverage`, `governance_constraint_coverage`, etc.)
   tengan evidencia real disponible hoy en `field_cases`/`world_vector_observations`.
   Implementar el que tenga más cobertura de evidencia primero, no por orden de la spec.

SFI_EOF_RECON_9f2a1

echo "-> Escribiendo docs/system/SFI_TOPOLOGY_RECONCILIATION_V1.md"
cat > docs/system/SFI_TOPOLOGY_RECONCILIATION_V1.md <<'SFI_EOF_TOPOLOGY_9f2a1'
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

SFI_EOF_TOPOLOGY_9f2a1

if [ -d "node_modules" ]; then
  echo "-> Verificando boundaries (check:boundaries)"
  npm run check:boundaries
  echo "-> Verificando tipos (typecheck, ~1 min)"
  npm run typecheck
  echo "-> Verificando rutas (audit:routes)"
  npm run audit:routes
else
  echo "Aviso: no encontre node_modules/ -- salteo la verificacion automatica."
  echo "Corre 'npm install' y despues 'npm run check:boundaries && npm run typecheck' manualmente."
fi

echo ""
echo "Listo. Archivos escritos:"
echo "  - src/lib/sfi/cognitive-runtime/registry.ts   (fix: field_events -> field_moph_runs / field_returns)"
echo "  - docs/system/operation-0-reconciliation.md   (documento vivo, derivado del registry)"
echo "  - docs/system/SFI_TOPOLOGY_RECONCILIATION_V1.md   (auditoria manual inicial, contexto historico)"
echo ""
echo "Pendiente -- esto SI requiere credenciales reales de Supabase, este script no lo corre:"
echo "  npm run build && npm run start"
echo "  curl -s http://localhost:3000/api/root/cognitive-runtime | jq .runtime"
echo ""
echo "Para revisar el cambio antes de commitear:"
echo "  git status"
echo "  git diff -- src/lib/sfi/cognitive-runtime/registry.ts"
echo ""
echo "Para commitear:"
echo "  git add src/lib/sfi/cognitive-runtime/registry.ts docs/system/operation-0-reconciliation.md docs/system/SFI_TOPOLOGY_RECONCILIATION_V1.md"
echo "  git commit -m \"fix(cognitive-runtime): field_events -> field_moph_runs/field_returns; docs: Operation 0 reconciliation\""
