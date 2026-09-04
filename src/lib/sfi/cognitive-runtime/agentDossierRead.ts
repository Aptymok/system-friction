import 'server-only';

import { streamRecentEpistemicEvents } from '@/lib/events/eventStore';
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

export const SFI_AGENT_DOSSIER_READ_CONTRACT = 'SFI-AGENT-DOSSIER-READ-1.1' as const;

const freshnessHours = Math.max(1, Number(process.env.SFI_AGENT_EXECUTION_FRESHNESS_HOURS ?? 24));
const freshnessMs = freshnessHours * 60 * 60 * 1000;

function warningsFromStream(stream: Awaited<ReturnType<typeof streamRecentEpistemicEvents>>) {
  return 'warnings' in stream && Array.isArray(stream.warnings) ? stream.warnings.map(String) : [];
}

function fresh(value: string | null) {
  if (!value) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && Date.now() - parsed <= freshnessMs;
}

function stateForAgent(
  agentId: string,
  records: SfiExecutionRecord[],
  streamWarnings: string[],
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
  else if (streamWarnings.length) infrastructure = 'DEGRADED';
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
    warning: latest
      ? streamWarnings[0] ?? null
      : streamWarnings[0] ?? 'No execution is visible inside the bounded event window; work and epistemic state remain NOT_OBSERVED.',
  };
}

export async function readAgentExecutionDossier(input: {
  agentId: string;
  executionId?: string;
  historyLimit?: number;
}) {
  const historyLimit = Math.max(1, Math.min(200, input.historyLimit ?? 80));
  // Exactly one bounded canonical event read feeds infrastructure posture,
  // execution state, history and assurance for the selected agent.
  const eventReadLimit = 500;
  const eventRead = await streamRecentEpistemicEvents(eventReadLimit);
  const allRecords = (eventRead.data ?? [])
    .map(projectExecutionRecordFromEvent)
    .filter((record): record is SfiExecutionRecord => Boolean(record));
  const agentRecords = allRecords.filter((record) => record.agentId === input.agentId);
  const history = agentRecords
    .filter((record) => !input.executionId || record.executionId === input.executionId)
    .slice(0, historyLimit);
  const streamWarnings = warningsFromStream(eventRead);
  const state = stateForAgent(input.agentId, agentRecords, streamWarnings);
  const assurance = deriveGenAiAssuranceMetrics(agentRecords, eventRead.data ?? [], { agentId: input.agentId });

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
    warnings: [
      ...streamWarnings,
      'Infrastructure posture, state, history and GenAI assurance reuse the same bounded canonical event read; no secondary runtime/event probe is performed for this dossier.',
    ],
    boundary: {
      canonicalEventReadsPerDossier: 1,
      duplicateCanonicalEventReads: 0,
      absenceOutsideWindowMeansNonExistence: false,
      telemetryIsEvidence: false,
      modelConfidenceIsTruthProbability: false,
    },
  };
}
