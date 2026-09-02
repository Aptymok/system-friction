import { SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY } from './convergedRegistry';

export const SFI_EXECUTION_RECORD_VERSION = 'SFI-EXECUTION-RECORD-1.0' as const;

export type SfiExecutionInfrastructureState = 'OPERATIONAL' | 'GATED' | 'DEGRADED' | 'MISSING';
export type SfiExecutionWorkState = 'IDLE' | 'RUNNING' | 'WAITING_EVIDENCE' | 'WAITING_HUMAN' | 'WAITING_RETURN' | 'FAILED' | 'COMPLETE' | 'NOT_OBSERVED';
export type SfiExecutionEpistemicState = 'SUFFICIENT' | 'PARTIAL' | 'CONTRADICTED' | 'INSUFFICIENT' | 'NOT_OBSERVED';
export type SfiExecutionAuthorityState = 'ALLOWED' | 'ANALYSIS_ONLY' | 'APPROVAL_REQUIRED' | 'BLOCKED' | 'NOT_OBSERVED';

type Row = Record<string, unknown>;
export type SfiExecutionObjectRef = { kind: string; id: string; label: string | null };
export type SfiObservedScalar<T> = { value: T | null; observation: 'OBSERVED' | 'NOT_OBSERVED' };

export type SfiExecutionInference = {
  epistemicClass: 'INFERENCE' | 'NOT_OBSERVED';
  status: string | null;
  summary: string | null;
  observations: string[];
  hypotheses: string[];
  contradictions: string[];
  missingEvidence: string[];
  recommendations: string[];
  confidence: number | null;
  generatedAt: string | null;
};

export type SfiExecutionContextCoverage = {
  evidenceAvailable: number | null;
  evidenceDelivered: number | null;
  hypothesesAvailable: number | null;
  hypothesesDelivered: number | null;
  contradictionsAvailable: number | null;
  contradictionsDelivered: number | null;
  promptSourceCharacters: number | null;
  promptCharacters: number | null;
  maxPromptCharacters: number | null;
  promptBounded: boolean | null;
  partial: boolean | null;
};

export type SfiExecutionRecord = {
  recordVersion: typeof SFI_EXECUTION_RECORD_VERSION;
  eventId: string;
  executionId: string | null;
  agentId: string;
  eventName: 'SFI_AGENT_EXECUTED' | 'SFI_AGENT_SKIPPED';
  executed: boolean;
  occurredAt: string | null;
  contractVersion: string | null;
  requestSource: string | null;
  requestedBy: string | null;
  purpose: string | null;
  anchors: SfiExecutionObjectRef[];
  targets: SfiExecutionObjectRef[];
  governanceContext: Row | null;
  epistemicBoundary: string | null;
  evidence: {
    before: number | null;
    after: number | null;
    delta: number | null;
    admissionBoundary: 'CONTEXT_IS_NOT_AUTOMATICALLY_EVIDENCE';
  };
  contextCoverage: SfiExecutionContextCoverage;
  interpretation: SfiExecutionInference;
  governance: {
    disposition: string | null;
    risk: string | null;
    reasons: string[];
    policyId: string | null;
  };
  authority: SfiExecutionAuthorityState;
  telemetry: {
    provider: SfiObservedScalar<string>;
    model: SfiObservedScalar<string>;
    inputTokens: SfiObservedScalar<number>;
    outputTokens: SfiObservedScalar<number>;
    providerCost: SfiObservedScalar<number>;
    latencyMs: SfiObservedScalar<number>;
  };
  errors: { deterministic: string | null; llm: string | null };
};

export type SfiAgentExecutionState = {
  agentId: string;
  agentName: string;
  infrastructure: SfiExecutionInfrastructureState;
  work: SfiExecutionWorkState;
  epistemic: SfiExecutionEpistemicState;
  authority: SfiExecutionAuthorityState;
  latestInteractionAt: string | null;
  latestInteractionObservation: 'OBSERVED' | 'NOT_OBSERVED';
  latestExecutionAt: string | null;
  latestExecutionId: string | null;
  latestManualExecutionAt: string | null;
  latestInferenceAt: string | null;
  latestInferenceExecutionId: string | null;
  latestInferenceSummary: string | null;
  contextCoverage: SfiExecutionContextCoverage | null;
  warning: string | null;
};

const asRow = (value: unknown): Row => value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
const text = (value: unknown, max = 8_000): string | null => typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
const number = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const bool = (value: unknown): boolean | null => typeof value === 'boolean' ? value : null;
const iso = (value: unknown): string | null => {
  const source = text(value, 120);
  if (!source) return null;
  const parsed = new Date(source);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
};
const strings = (value: unknown, max = 16): string[] => Array.isArray(value)
  ? value.map((item) => text(item, 2_000)).filter((item): item is string => Boolean(item)).slice(0, max)
  : [];
const observed = <T extends string | number>(value: T | null): SfiObservedScalar<T> => value === null
  ? { value: null, observation: 'NOT_OBSERVED' }
  : { value, observation: 'OBSERVED' };

function refs(value: unknown): SfiExecutionObjectRef[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.flatMap((candidate) => {
    const source = asRow(candidate);
    const kind = text(source.kind, 80);
    const id = text(source.id, 500);
    if (!kind || !id || seen.has(`${kind}:${id}`)) return [];
    seen.add(`${kind}:${id}`);
    return [{ kind, id, label: text(source.label ?? source.title, 500) }];
  }).slice(0, 24);
}

function inference(payload: Row): SfiExecutionInference {
  const insight = asRow(asRow(payload.metadata).agentInsight);
  if (text(insight.epistemicClass, 60) !== 'INFERENCE') {
    return {
      epistemicClass: 'NOT_OBSERVED', status: null, summary: null, observations: [], hypotheses: [], contradictions: [],
      missingEvidence: [], recommendations: [], confidence: null, generatedAt: null,
    };
  }
  return {
    epistemicClass: 'INFERENCE',
    status: text(insight.status, 80),
    summary: text(insight.summary, 2_000),
    observations: strings(insight.observations, 10),
    hypotheses: strings(insight.hypotheses, 10),
    contradictions: strings(insight.contradictions, 10),
    missingEvidence: strings(insight.missingEvidence, 10),
    recommendations: strings(insight.recommendations, 10),
    confidence: number(insight.confidence),
    generatedAt: iso(insight.generatedAt),
  };
}

function coverage(payload: Row): SfiExecutionContextCoverage {
  const metadata = asRow(payload.metadata);
  const llmRuntime = asRow(metadata.llmRuntime);
  const refsCoverage = asRow(asRow(asRow(metadata.refs).contextCoverage).llm);
  const runtimeCoverage = asRow(llmRuntime.contextCoverage);
  const source = Object.keys(refsCoverage).length ? refsCoverage : runtimeCoverage;
  const evidenceAvailable = number(source.evidenceAvailable);
  const evidenceDelivered = number(source.evidenceDelivered);
  const hypothesesAvailable = number(source.hypothesesAvailable);
  const hypothesesDelivered = number(source.hypothesesDelivered);
  const contradictionsAvailable = number(source.contradictionsAvailable);
  const contradictionsDelivered = number(source.contradictionsDelivered);
  const promptSourceCharacters = number(source.promptSourceCharacters ?? llmRuntime.promptSourceCharacters);
  const promptCharacters = number(source.promptCharacters ?? llmRuntime.promptCharacters);
  const maxPromptCharacters = number(source.maxPromptCharacters ?? llmRuntime.maxPromptCharacters);
  const promptBounded = bool(source.promptBounded ?? llmRuntime.promptBounded);
  const truncated = promptBounded === true
    || (evidenceAvailable !== null && evidenceDelivered !== null && evidenceDelivered < evidenceAvailable)
    || (hypothesesAvailable !== null && hypothesesDelivered !== null && hypothesesDelivered < hypothesesAvailable)
    || (contradictionsAvailable !== null && contradictionsDelivered !== null && contradictionsDelivered < contradictionsAvailable);
  const sufficientlyObservedToSayNotPartial = promptBounded === false && evidenceAvailable !== null && evidenceDelivered !== null;
  return {
    evidenceAvailable, evidenceDelivered, hypothesesAvailable, hypothesesDelivered, contradictionsAvailable, contradictionsDelivered,
    promptSourceCharacters, promptCharacters, maxPromptCharacters, promptBounded,
    partial: truncated ? true : sufficientlyObservedToSayNotPartial ? false : null,
  };
}

function authority(payload: Row): SfiExecutionAuthorityState {
  const disposition = text(asRow(payload.aiGovernance).disposition, 100);
  if (disposition === 'BLOCK') return 'BLOCKED';
  if (disposition === 'ALLOW_ANALYSIS_ONLY') return 'ANALYSIS_ONLY';
  if (disposition === 'ALLOW_INTERNAL') return 'ALLOWED';
  return 'NOT_OBSERVED';
}

export function deriveExecutionEpistemicState(record: SfiExecutionRecord): SfiExecutionEpistemicState {
  if (record.interpretation.epistemicClass !== 'INFERENCE') return 'NOT_OBSERVED';
  if (record.interpretation.missingEvidence.length > 0 && (record.contextCoverage.evidenceAvailable ?? 0) === 0) return 'INSUFFICIENT';
  if (record.contextCoverage.partial === true || record.interpretation.missingEvidence.length > 0 || record.interpretation.contradictions.length > 0) return 'PARTIAL';
  // SFI does not certify SUFFICIENT merely because the model omitted a missing-evidence warning.
  return 'NOT_OBSERVED';
}

export function deriveExecutionWorkState(record: SfiExecutionRecord | null): SfiExecutionWorkState {
  if (!record) return 'NOT_OBSERVED';
  if (record.eventName === 'SFI_AGENT_EXECUTED' && record.executed) return 'COMPLETE';
  if (record.authority === 'BLOCKED') return 'NOT_OBSERVED';
  if (record.errors.deterministic || record.errors.llm) return 'FAILED';
  return 'NOT_OBSERVED';
}

export function projectExecutionRecordFromEvent(event: unknown): SfiExecutionRecord | null {
  const source = asRow(event);
  const eventName = text(source.event_name ?? source.eventName, 120);
  if (eventName !== 'SFI_AGENT_EXECUTED' && eventName !== 'SFI_AGENT_SKIPPED') return null;
  const payload = asRow(source.payload);
  const metadata = asRow(payload.metadata);
  const llmRuntime = asRow(metadata.llmRuntime);
  const agentId = text(asRow(source.source).sourceId, 300) ?? text(payload.agentId, 300);
  const eventId = text(source.event_id ?? source.eventId ?? source.id, 500);
  if (!agentId || !eventId) return null;
  const before = number(payload.evidenceBefore);
  const after = number(payload.evidenceAfter);
  const governance = asRow(payload.aiGovernance);

  return {
    recordVersion: SFI_EXECUTION_RECORD_VERSION,
    eventId,
    executionId: text(payload.executionId, 500),
    agentId,
    eventName,
    executed: eventName === 'SFI_AGENT_EXECUTED',
    occurredAt: iso(source.occurred_at ?? source.occurredAt ?? source.created_at),
    contractVersion: text(payload.executionContractVersion, 200),
    requestSource: text(payload.requestSource, 300),
    requestedBy: text(payload.requestedBy, 500),
    purpose: text(payload.purpose, 5_000),
    anchors: refs(payload.anchors),
    targets: refs(payload.targets),
    governanceContext: Object.keys(asRow(payload.governanceContext)).length ? asRow(payload.governanceContext) : null,
    epistemicBoundary: text(payload.epistemicBoundary, 4_000),
    evidence: {
      before,
      after,
      delta: before !== null && after !== null ? after - before : null,
      admissionBoundary: 'CONTEXT_IS_NOT_AUTOMATICALLY_EVIDENCE',
    },
    contextCoverage: coverage(payload),
    interpretation: inference(payload),
    governance: {
      disposition: text(governance.disposition, 120),
      risk: text(governance.risk, 120),
      reasons: strings(governance.reasons, 20),
      policyId: text(payload.aiGovernancePolicyId, 200),
    },
    authority: authority(payload),
    telemetry: {
      provider: observed(text(payload.llmProvider, 300)),
      model: observed(text(payload.llmModel, 500)),
      inputTokens: observed(number(llmRuntime.observedInputTokens)),
      outputTokens: observed(number(llmRuntime.observedOutputTokens)),
      providerCost: observed(number(llmRuntime.observedProviderCost)),
      latencyMs: observed(number(llmRuntime.observedLatencyMs)),
    },
    errors: {
      deterministic: text(payload.deterministicError, 4_000),
      llm: text(payload.llmError, 4_000),
    },
  };
}

export async function readExecutionRecords(input?: { agentId?: string; executionId?: string; limit?: number }) {
  const { streamRecentEpistemicEvents } = await import('@/lib/events/eventStore');
  const readLimit = Math.max(1, Math.min(500, input?.limit ?? 200));
  const stream = await streamRecentEpistemicEvents(readLimit);
  const records = (stream.data ?? [])
    .map(projectExecutionRecordFromEvent)
    .filter((record): record is SfiExecutionRecord => Boolean(record))
    .filter((record) => !input?.agentId || record.agentId === input.agentId)
    .filter((record) => !input?.executionId || record.executionId === input.executionId);
  return {
    generatedAt: new Date().toISOString(),
    source: 'epistemic_events',
    readLimit,
    exhaustive: false as const,
    warnings: [
      ...('warnings' in stream && Array.isArray(stream.warnings) ? stream.warnings.map(String) : []),
      'Execution history is a bounded projection over canonical events; absence outside the read window is not proof of non-existence.',
    ],
    records,
  };
}

export async function readAgentExecutionStates() {
  const { readObservedSfiCognitiveRuntime } = await import('./observedRuntime');
  const [runtime, executionRead] = await Promise.all([
    readObservedSfiCognitiveRuntime(),
    readExecutionRecords({ limit: 500 }),
  ]);
  const byAgent = new Map<string, SfiExecutionRecord[]>();
  for (const execution of executionRead.records) {
    const list = byAgent.get(execution.agentId) ?? [];
    list.push(execution);
    byAgent.set(execution.agentId, list);
  }

  const states: SfiAgentExecutionState[] = SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.map((agent) => {
    const runtimeAgent = runtime.agents.find((item) => item.id === agent.id);
    const records = (byAgent.get(agent.id) ?? []).sort((a, b) => (b.occurredAt ?? '').localeCompare(a.occurredAt ?? ''));
    const latest = records[0] ?? null;
    const latestManual = records.find((record) => record.requestSource === 'ROOT_MANUAL') ?? null;
    const latestInference = records.find((record) => record.interpretation.epistemicClass === 'INFERENCE') ?? null;
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
      // No generic interaction timestamp is fabricated from an execution event.
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
  });

  return {
    generatedAt: new Date().toISOString(),
    source: 'epistemic_events + observed cognitive runtime',
    executionRecordVersion: SFI_EXECUTION_RECORD_VERSION,
    exhaustive: false as const,
    warnings: executionRead.warnings,
    states,
  };
}
