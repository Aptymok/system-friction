import 'server-only';

import { streamRecentEpistemicEvents } from '@/lib/events/eventStore';
import { SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY } from './convergedRegistry';
import {
  deriveExecutionEpistemicState,
  deriveExecutionWorkState,
  projectExecutionRecordFromEvent,
  type SfiAgentExecutionState,
  type SfiExecutionInfrastructureState,
  type SfiExecutionRecord,
} from './executionRecords';
import { deriveGenAiAssuranceMetrics } from './genAiAssurance';
import { readObservedSfiCognitiveRuntime } from './observedRuntime';

export const SFI_AGENT_DOSSIER_READ_CONTRACT = 'SFI-AGENT-DOSSIER-READ-1.0' as const;

function warningsFromStream(stream: Awaited<ReturnType<typeof streamRecentEpistemicEvents>>) {
  return 'warnings' in stream && Array.isArray(stream.warnings) ? stream.warnings.map(String) : [];
}

function stateForAgent(
  agentId: string,
  runtime: Awaited<ReturnType<typeof readObservedSfiCognitiveRuntime>>,
  records: SfiExecutionRecord[],
): SfiAgentExecutionState | null {
  const agent = SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.find((item) => item.id === agentId);
  if (!agent) return null;
  const runtimeAgent = runtime.agents.find((item) => item.id === agent.id);
  const ordered = [...records].sort((a, b) => (b.occurredAt ?? '').localeCompare(a.occurredAt ?? ''));
  const latest = ordered[0] ?? null;
  const latestManual = ordered.find((record) => record.requestSource === 'ROOT_MANUAL') ?? null;
  const latestInference = ordered.find((record) => record.interpretation.epistemicClass === 'INFERENCE') ?? null;
  const infrastructure = (runtimeAgent?.status ?? 'missing').toUpperCase() as SfiExecutionInfrastructureState;
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
    latestExecutionAt: latest?.occurredAt ?? null,
    latestExecutionId: latest?.executionId ?? null,
    latestManualExecutionAt: latestManual?.occurredAt ?? null,
    latestInferenceAt: latestInference?.interpretation.generatedAt ?? latestInference?.occurredAt ?? null,
    latestInferenceExecutionId: latestInference?.executionId ?? null,
    latestInferenceSummary: latestInference?.interpretation.summary ?? null,
    contextCoverage: latest?.contextCoverage ?? null,
    warning: latest ? null : 'No execution is visible inside the bounded event window; work and epistemic state remain NOT_OBSERVED.',
  };
}

export async function readAgentExecutionDossier(input: {
  agentId: string;
  executionId?: string;
  historyLimit?: number;
}) {
  const historyLimit = Math.max(1, Math.min(200, input.historyLimit ?? 80));
  // One bounded canonical event read feeds state, history and assurance.
  // 500 is retained because state must not become false-negative merely because
  // the selected agent is sparse inside the most recent historyLimit events.
  const eventReadLimit = 500;
  const [runtime, eventRead] = await Promise.all([
    readObservedSfiCognitiveRuntime(),
    streamRecentEpistemicEvents(eventReadLimit),
  ]);
  const allRecords = (eventRead.data ?? [])
    .map(projectExecutionRecordFromEvent)
    .filter((record): record is SfiExecutionRecord => Boolean(record));
  const agentRecords = allRecords.filter((record) => record.agentId === input.agentId);
  const history = agentRecords
    .filter((record) => !input.executionId || record.executionId === input.executionId)
    .slice(0, historyLimit);
  const streamWarnings = warningsFromStream(eventRead);
  const state = stateForAgent(input.agentId, runtime, agentRecords);
  const assurance = deriveGenAiAssuranceMetrics(agentRecords, eventRead.data ?? [], { agentId: input.agentId });

  return {
    contractVersion: SFI_AGENT_DOSSIER_READ_CONTRACT,
    generatedAt: new Date().toISOString(),
    source: 'epistemic_events + observed cognitive runtime',
    eventReadLimit,
    historyLimit,
    exhaustive: false as const,
    state,
    history,
    assurance,
    warnings: [
      ...streamWarnings,
      'State, history and GenAI assurance are projections of the same bounded canonical event read; no second ledger read is performed for this dossier.',
    ],
    boundary: {
      oneCanonicalEventReadPerDossier: true,
      absenceOutsideWindowMeansNonExistence: false,
      telemetryIsEvidence: false,
      modelConfidenceIsTruthProbability: false,
    },
  };
}
