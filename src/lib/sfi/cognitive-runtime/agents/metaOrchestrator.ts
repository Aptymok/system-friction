import type { KernelContext } from '../kernelContext';
import { buildTaskGraph } from '../taskGraphBuilder';
import {
  selectCognitiveAutomations,
  type CognitiveAutomationSelectionMode,
} from '../automationSelector';

export interface CognitiveTaskPlan {
  taskId: string;
  requiredAgents: string[]; // compatibility name: these IDs now denote cognitive automations
  executionOrder: string[];
  missingInputs: string[];
  readiness: number;
  selectionMode: CognitiveAutomationSelectionMode;
  selectionReasons: Record<string, string[]>;
}

type Row = Record<string, unknown>;
function row(value: unknown): Row { return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}; }
function rows(value: unknown): Row[] { return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : []; }
function confidence(value: unknown, fallback = 0.6) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : fallback;
}

function materializeAcquiredSourceClaims(context: KernelContext) {
  const caseContext = row(context.metadata?.caseContext);
  const acquired = row(caseContext.acquiredWebEvidence);
  const sources = rows(acquired.sources);
  if (!sources.length) return 0;
  const existing = new Set(context.evidence.map((item) => item.id));
  let added = 0;
  for (const source of sources.slice(0, 24)) {
    const url = typeof source.url === 'string' ? source.url : null;
    const sourceId = typeof source.id === 'string' && source.id.trim()
      ? `web:${source.id.trim()}`
      : url
        ? `web:${url}`
        : null;
    if (!sourceId || existing.has(sourceId)) continue;
    context.evidence.push({
      id: sourceId,
      source: 'UniversalWebSourceClaim',
      confidence: confidence(source.reliability, 0.6),
      payload: {
        ...source,
        epistemicClass: 'source_claim',
        acquisitionEventId: acquired.eventId ?? null,
        acquisitionSatisfied: acquired.satisfied ?? null,
        epistemicBoundary: 'Imported web material is a SOURCE_CLAIM available for corroboration/contradiction. It is not accepted evidence or truth by acquisition alone.',
      },
    });
    existing.add(sourceId);
    added += 1;
  }
  return added;
}

/**
 * Complete in-process cognitive topology. Registry IDs are compatibility
 * identifiers for punctual cognitive automations, not autonomous institutional
 * actors. Automations mutate KernelContext and persist runtime traces only; they
 * do not publish, contact, spend, grant access or perform irreversible external
 * actions. Governed external action remains outside this cycle and subject to
 * the Cognitive Twin / ACP authority gate.
 *
 * The orchestration plan itself is operational metadata, never evidence. Public
 * sources already acquired by the evidence lane are materialized separately as
 * SOURCE_CLAIM evidence so all downstream agents can actually compare them.
 */
export function MetaOrchestratorAgent(context: KernelContext): KernelContext {
  const importedSourceClaims = materializeAcquiredSourceClaims(context);
  const missingInputs: string[] = [];
  if (!context.evidence.length) missingInputs.push('evidence');
  if (!context.hypotheses.length && context.metadata?.studioAction === 'verify') missingInputs.push('hypothesis');

  const selection = selectCognitiveAutomations(context);
  const requiredAgents = selection.automationIds;
  const executionOrder = ['meta_orchestrator', ...requiredAgents];
  const plan: CognitiveTaskPlan = {
    taskId: context.taskId ?? crypto.randomUUID(),
    requiredAgents,
    executionOrder,
    missingInputs,
    readiness: 0,
    selectionMode: selection.mode,
    selectionReasons: selection.reasons,
  };

  const availableSignals = context.evidence.length + context.hypotheses.length + context.simulations.length + context.predictions.length;
  const minimumSignalTarget = Math.max(2, Math.min(8, requiredAgents.length));
  const readiness = Math.min(availableSignals / minimumSignalTarget, 1);
  plan.readiness = readiness;

  const taskGraph = buildTaskGraph(plan);
  context.metadata = {
    ...context.metadata,
    cognitivePlan: plan,
    taskGraph,
    metaOrchestrator: {
      executed: true,
      executionKind: 'cognitive_automation',
      epistemicClass: 'DERIVED_OPERATIONAL_PLAN',
      selectionMode: selection.mode,
      selectionReasons: selection.reasons,
      readiness,
      missingInputs,
      selectedAutomations: executionOrder.length,
      importedSourceClaimsMaterialized: importedSourceClaims,
      taskGraphNodes: taskGraph.nodes.length,
      taskGraphEdges: taskGraph.edges.length,
      externalExecutionAllowed: false,
      authorityEscalationAllowed: false,
      orchestrationPlanAddedAsEvidence: false,
      epistemicBoundary: 'The orchestration plan is derived operational metadata and is not evidence. Only previously acquired external sources are materialized as SOURCE_CLAIM for downstream comparison.',
      executedAt: new Date().toISOString(),
    },
  };

  return context;
}
