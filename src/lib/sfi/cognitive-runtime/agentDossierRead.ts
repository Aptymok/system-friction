import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY } from './convergedRegistry';
import { SFI_AGENT_EXECUTION_MAP } from './agentExecutionMap';
import {
  deriveExecutionEpistemicState,
  deriveExecutionWorkState,
  projectExecutionRecordFromEvent,
  type SfiAgentExecutionState,
  type SfiExecutionInfrastructureState,
  type SfiExecutionRecord,
} from './executionRecords';
import { deriveGenAiAssuranceMetrics } from './genAiAssurance';

export const SFI_AGENT_DOSSIER_READ_CONTRACT = 'SFI-AGENT-DOSSIER-READ-1.2' as const;

const freshnessHours = Math.max(1, Number(process.env.SFI_AGENT_EXECUTION_FRESHNESS_HOURS ?? 24));
const freshnessMs = freshnessHours * 60 * 60 * 1000;
const EXECUTION_EVENT_NAMES = ['SFI_AGENT_EXECUTED', 'SFI_AGENT_SKIPPED'] as const;
const ASSURANCE_EVENT_NAMES = ['SFI_UNIVERSAL_RETURN_CONTRASTED', 'SFI_EXPLICIT_QUALITY_OBSERVATION'] as const;

type Row = Record<string, unknown>;

function fresh(value: string | null) {
  if (!value) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && Date.now() - parsed <= freshnessMs;
}

function stateForAgent(
  agentId: string,
  records: SfiExecutionRecord[],
  warnings: string[],
): SfiAgentExecutionState | null {
  const agent = SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.find((item) => item.id === agentId);
  if (!agent) return null;
  const ordered = [...records].sort((a, b) => (b.occurredAt ?? '').localeCompare(a.occurredAt ?? ''));
  const latest = ordered[0] ?? null;
  const latestExecuted = ordered.find((record) => record.eventName === 'SFI_AGENT_EXECUTED' && record.executed) ?? null;
  const latestManual = ordered.find((record) => record.requestSource === 'ROOT_MANUAL') ?? null;
  const latestInference = ordered.find((record) => record.interpretation.epistemicClass === 'INFERENCE') ?? null;
  const executorBound = typeof SFI_AGENT_EXECUTION_MAP[agent.id] === 'function';
  let infrastructure: SfiExecutionInfrastructureState;
  if (agent.missingCapability || !executorBound) infrastructure = 'MISSING';
  else if (warnings.length) infrastructure = 'DEGRADED';
  else if (fresh(latestExecuted?.occurredAt ?? null)) infrastructure = 'OPERATIONAL';
  else infrastructure = 'GATED';

  const currentAuthority = latest && latest.authority !== 'NOT_OBSERVED'
    ? latest.authority
    : agent.humanApprovalRequired ? 'APPROVAL_REQUIRED' : 'NOT_OBSERVED';

  return {
    agentId: agent.id,
    agentName: agent.name,
    infrastructure,
    work: deriveExecutionWorkState(latest),
    epistemic: latest ? deriveExecutionEpistemicState(latest) : 'NOT_OBSERVED',
    authority: currentAuthority,
    latestInteractionAt: null,
    latestInteractionObservation: 'NOT_OBSERVED',
    latestExecutionAt: latestExecuted?.occurredAt ?? null,
    latestExecutionId: latestExecuted?.executionId ?? null,
    latestManualExecutionAt: latestManual?.occurredAt ?? null,
    latestInferenceAt: latestInference?.interpretation.generatedAt ?? latestInference?.occurredAt ?? null,
    latestInferenceExecutionId: latestInference?.executionId ?? null,
    latestInferenceSummary: latestInference?.interpretation.summary ?? null,
    contextCoverage: latest?.contextCoverage ?? null,
    warning: latest ? warnings[0] ?? null : warnings[0] ?? 'No execution is visible inside the bounded execution-event window; work and epistemic state remain NOT_OBSERVED.',
  };
}

export async function readAgentExecutionDossier(input: {
  agentId: string;
  executionId?: string;
  historyLimit?: number;
  includeAssurance?: boolean;
}) {
  const db = createServiceSupabaseClient();
  const historyLimit = Math.max(1, Math.min(200, input.historyLimit ?? 80));
  const eventReadLimit = 500;
  const executionRead = await db.from('epistemic_events')
    .select('event_id,event_name,epistemic_class,confidence,payload,occurred_at,source')
    .in('event_name', [...EXECUTION_EVENT_NAMES])
    .order('sequence', { ascending: false })
    .limit(eventReadLimit);
  const executionWarnings = executionRead.error ? [`epistemic_events:execution:${executionRead.error.message}`] : [];
  const executionEvents = (executionRead.data ?? []) as Row[];
  const allRecords = executionEvents
    .map(projectExecutionRecordFromEvent)
    .filter((record): record is SfiExecutionRecord => Boolean(record));
  const agentRecords = allRecords.filter((record) => record.agentId === input.agentId);
  const history = agentRecords
    .filter((record) => !input.executionId || record.executionId === input.executionId)
    .slice(0, historyLimit);
  const state = stateForAgent(input.agentId, agentRecords, executionWarnings);

  let assurance: ReturnType<typeof deriveGenAiAssuranceMetrics> | null = null;
  let assuranceWarnings: string[] = [];
  let assuranceReadCount = 0;
  if (input.includeAssurance) {
    const assuranceRead = await db.from('epistemic_events')
      .select('event_id,event_name,epistemic_class,payload,occurred_at')
      .in('event_name', [...ASSURANCE_EVENT_NAMES])
      .order('sequence', { ascending: false })
      .limit(eventReadLimit);
    assuranceReadCount = 1;
    assuranceWarnings = assuranceRead.error ? [`epistemic_events:assurance:${assuranceRead.error.message}`] : [];
    assurance = deriveGenAiAssuranceMetrics(agentRecords, assuranceRead.data ?? [], { agentId: input.agentId });
  }

  return {
    contractVersion: SFI_AGENT_DOSSIER_READ_CONTRACT,
    generatedAt: new Date().toISOString(),
    source: 'epistemic_events',
    eventReadLimit,
    historyLimit,
    exhaustive: false as const,
    state,
    history,
    assurance,
    warnings: [...executionWarnings, ...assuranceWarnings],
    readPlan: {
      executionEventReads: 1,
      assuranceEventReads: assuranceReadCount,
      overlappingEventNames: 0,
      duplicateEventReads: 0,
    },
    boundary: {
      executionAndAssuranceEventSetsDisjoint: true,
      duplicateCanonicalEventReads: 0,
      absenceOutsideWindowMeansNonExistence: false,
      telemetryIsEvidence: false,
      modelConfidenceIsTruthProbability: false,
    },
  };
}
