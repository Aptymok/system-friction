import { streamRecentEpistemicEvents } from '@/lib/events/eventStore';
import { SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY } from './convergedRegistry';
import { readObservedSfiCognitiveRuntime } from './observedRuntime';

export const SFI_EXECUTION_RECORD_VERSION = 'SFI-EXECUTION-RECORD-1.0' as const;

export type SfiExecutionInfrastructureState = 'OPERATIONAL' | 'GATED' | 'DEGRADED' | 'MISSING';
export type SfiExecutionWorkState = 'IDLE' | 'RUNNING' | 'WAITING_EVIDENCE' | 'WAITING_HUMAN' | 'WAITING_RETURN' | 'FAILED' | 'COMPLETE' | 'NOT_OBSERVED';
export type SfiExecutionEpistemicState = 'SUFFICIENT' | 'PARTIAL' | 'CONTRADICTED' | 'INSUFFICIENT' | 'NOT_OBSERVED';
export type SfiExecutionAuthorityState = 'ALLOWED' | 'ANALYSIS_ONLY' | 'APPROVAL_REQUIRED' | 'BLOCKED' | 'NOT_OBSERVED';

export type SfiExecutionObjectRef = {
  kind: string;
  id: string;
  label: string | null;
};

export type SfiObservedScalar<T> = {
  value: T | null;
  observation: 'OBSERVED' | 'NOT_OBSERVED';
};

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
  governanceContext: Record<string, unknown> | null;
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
  errors: {
    deterministic: string | null;
    llm: string | null;
  };
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

type Row = Record<string, unknown>;

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function stringValue(value: unknown, max = 8_000): string | null {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
}

function finiteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function booleanValue(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function iso(value: unknown): string | null {
  const text = stringValue(value, 120);
  if (!text) return null;
  const parsed = new Date(text);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

function strings(value: unknown, max = 16): string[] {
  return Array.isArray(value)
    ? value.map((item) => stringValue(item, 2_000)).filter((item): item is string => Boolean(item)).slice(0, max)
    : [];
}

function sourceId(value: unknown): string | null {
  return stringValue(row(value).sourceId, 300);
}

function objectRefs(value: unknown): SfiExecutionObjectRef[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: SfiExecutionObjectRef[] = [];
  for (const candidate of value) {
    const item = row(candidate);
    const kind = stringValue(item.kind, 80);
    const id = stringValue(item.id, 500);
    if (!kind || !id) continue;
    const key = `${kind}:${id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ kind, id, label: stringValue(item.label, 500) });
    if (result.length >= 24) break;
  }
  return result;
}

function observedScalar<T extends string | number>(value: T | null): SfiObservedScalar<T> {
  return value === null
    ? { value: null, observation: 'NOT_OBSERVED' }
    : { value, observation: 'OBSERVED' };
}

function inferenceFromPayload(payload: Row): SfiExecutionInference {
  const metadata = row(payload.metadata);
  const insight = row(metadata.agentInsight);
  const epistemicClass = stringValue(insight.epistemicClass, 60);
  if (epistemicClass !== 'INFERENCE') {
    return {
      epistemicClass: 'NOT_OBSERVED',
      status: null,
      summary: null,
      observations: [],
      hypotheses: [],
      contradictions: [],
      missingEvidence: [],
      recommendations: [],
      confidence: null,
      generatedAt: null,
    };
  }
  return {
    epistemicClass: 'INFERENCE',
    status: stringValue(insight.status, 80),
    summary: stringValue(insight.summary, 2_000),
    observations: strings(insight.observations, 10),
    hypotheses: strings(insight.hypotheses, 10),
    contradictions: strings(insight.contradictions, 10),
    missingEvidence: strings(insight.missingEvidence, 10),
    recommendations: strings(insight.recommendations, 10),
    confidence: finiteNumber(insight.confidence),
    generatedAt: iso(insight.generatedAt),
  };
}

function coverageFromPayload(payload: Row): SfiExecutionContextCoverage {
  const metadata = row(payload.metadata);
  const refs = row(metadata.refs);
  const contextCoverage = row(refs.contextCoverage);
  const llm = row(contextCoverage.llm);
  const llmRuntime = row(metadata.llmRuntime);
  const runtimeCoverage = row(llmRuntime.contextCoverage);
  const source = Object.keys(llm).length ? llm : runtimeCoverage;

  const evidenceAvailable = finiteNumber(source.evidenceAvailable);
  const evidenceDelivered = finiteNumber(source.evidenceDelivered);
  const hypothesesAvailable = finiteNumber(source.hypothesesAvailable);
  const hypothesesDelivered = finiteNumber(source.hypothesesDelivered);
  const contradictionsAvailable = finiteNumber(source.contradictionsAvailable);
  const contradictionsDelivered = finiteNumber(source.contradictionsDelivered);
  const promptSourceCharacters = finiteNumber(source.promptSourceCharacters ?? llmRuntime.promptSourceCharacters);
  const promptCharacters = finiteNumber(source.promptCharacters ?? llmRuntime.promptCharacters);
  const maxPromptCharacters = finiteNumber(source.maxPromptCharacters ?? llmRuntime.maxPromptCharacters);
  const promptBounded = booleanValue(source.promptBounded ?? llmRuntime.promptBounded);
  const partial = promptBounded === true
    || (evidenceAvailable !== null && evidenceDelivered !== null && evidenceDelivered < evidenceAvailable)
    || (hypothesesAvailable !== null && hypothesesDelivered !== null && hypothesesDelivered < hypothesesAvailable)
    || (contradictionsAvailable !== null && contradictionsDelivered !== null && contradictionsDelivered < contradictionsAvailable)
      ? true
      : promptBounded === false && evidenceAvailable !== null && evidenceDelivered !== null
        ? false
        : null;

  return {
    evidenceAvailable,
    evidenceDelivered,
    hypothesesAvailable,
    hypothesesDelivered,
    contradictionsAvailable,
    contradictionsDelivered,
    promptSourceCharacters,
    promptCharacters,
    maxPromptCharacters,
    promptBounded,
    partial,
  };
}

function authorityFromPayload(payload: Row): SfiExecutionAuthorityState {
  const governance = row(payload.aiGovernance);
  const disposition = stringValue(governance.disposition, 100);
  if (disposition === 'BLOCK') return 'BLOCKED';
  if (disposition === 'ALLOW_ANALYSIS_ONLY') return 'ANALYSIS_ONLY';
  if (disposition === 'ALLOW_INTERNAL') return 'ALLOWED';
  return 'NOT_OBSERVED';
}

function epistemicState(record: SfiExecutionRecord): SfiExecutionEpistemicState {
  const inference = record.interpretation;
  if (inference.epistemicClass !== 'INFERENCE') return 'NOT_OBSERVED';
  if (inference.missingEvidence.length > 0 && (record.contextCoverage.evidenceAvailable ?? 0) === 0) return 'INSUFFICIENT';
  if (record.contextCoverage.partial === true || inference.missingEvidence.length > 0) return 'PARTIAL';
  if (inference.contradictions.length > 0) return 'CONTRADICTED';
  // Absence of a missing-evidence marker is not enough to certify sufficiency.
  return 'NOT_OBSERVED';
}

function workState(record: SfiExecutionRecord | null): SfiExecutionWorkState {
  if (!record) return 'NOT_OBSERVED';
  if (record.eventName === 'SFI_AGENT_EXECUTED' && record.executed) return 'COMPLETE';
  if (record.errors.deterministic || record.errors.llm) return 'FAILED';
  if (record.authority === 'BLOCKED') return 'FAILED';
  return 'NOT_OBSERVED';
}

export function projectExecutionRecordFromEvent(event: unknown): SfiExecutionRecord | null {
  const source = row(event);
  const eventName = stringValue(source.event_name ?? source.eventName, 120);
  if (eventName !== 'SFI_AGENT_EXECUTED' && eventName !== 'SFI_AGENT_SKIPPED') return null;
  const payload = row(source.payload);
  const metadata = row(payload.metadata);
  const llmRuntime = row(metadata.llmRuntime);
  const agentId = sourceId(source.source) ?? stringValue(payload.agentId, 300);
  const eventId = stringValue(source.event_id ?? source.eventId ?? source.id, 500);
  if (!agentId || !eventId) return null;

  const inputTokens = finiteNumber(llmRuntime.observedInputTokens);
  const outputTokens = finiteNumber(llmRuntime.observedOutputTokens);
  const providerCost = finiteNumber(llmRuntime.observedProviderCost);
  const latencyMs = finiteNumber(llmRuntime.observedLatencyMs);
  const evidenceBefore = finiteNumber(payload.evidenceBefore);
  const evidenceAfter = finiteNumber(payload.evidenceAfter);
  const governance = row(payload.aiGovernance);
  const interpretation = inferenceFromPayload(payload);

  return {
    recordVersion: SFI_EXECUTION_RECORD_VERSION,
    eventId,
    executionId: stringValue(payload.executionId, 500),
    agentId,
    eventName,
    executed: eventName === 'SFI_AGENT_EXECUTED',
    occurredAt: iso(source.occurred_at ?? source.occurredAt ?? source.created_at),
    contractVersion: stringValue(payload.executionContractVersion, 200),
    requestSource: stringValue(payload.requestSource, 300),
    requestedBy: stringValue(payload.requestedBy, 500),
    purpose: stringValue(payload.purpose, 5_000),
    anchors: objectRefs(payload.anchors),
    targets: objectRefs(payload.targets),
    governanceContext: Object.keys(row(payload.governanceContext)).length ? row(payload.governanceContext) : null,
    epistemicBoundary: stringValue(payload.epistemicBoundary, 4_000),
    evidence: {
      before: evidenceBefore,
      after: evidenceAfter,
      delta: evidenceBefore !== null && evidenceAfter !== null ? evidenceAfter - evidenceBefore : null,
      admissionBoundary: 'CONTEXT_IS_NOT_AUTOMATICALLY_EVIDENCE',
    },
    contextCoverage: coverageFromPayload(payload),
    interpretation,
    governance: {
      disposition: stringValue(governance.disposition, 120),
      risk: stringValue(governance.risk, 120),
      reasons: strings(governance.reasons, 20),
      policyId: stringValue(payload.aiGovernancePolicyId, 200),
    },
    authority: authorityFromPayload(payload),
    telemetry: {
      provider: observedScalar(stringValue(payload.llmProvider, 300)),
      model: observedScalar(stringValue(payload.llmModel, 500)),
      inputTokens: observedScalar(inputTokens),
      outputTokens: observedScalar(outputTokens),
      providerCost: observedScalar(providerCost),
      latencyMs: observedScalar(latencyMs),
    },
    errors: {
      deterministic: stringValue(payload.deterministicError, 4_000),
      llm: stringValue(payload.llmError, 4_000),
    },
  };
}

export async function readExecutionRecords(input?: { agentId?: string; executionId?: string; limit?: number }) {
  const limit = Math.max(1, Math.min(500, input?.limit ?? 200));
  const stream = await streamRecentEpistemicEvents(limit);
  const records = (stream.data ?? [])
    .map(projectExecutionRecordFromEvent)
    .filter((record): record is SfiExecutionRecord => Boolean(record))
    .filter((record) => !input?.agentId || record.agentId === input.agentId)
    .filter((record) => !input?.executionId || record.executionId === input.executionId);
  return {
    generatedAt: new Date().toISOString(),
    source: 'epistemic_events',
    warnings: 'warnings' in stream && Array.isArray(stream.warnings) ? stream.warnings.map(String) : [],
    records,
  };
}

export async function readAgentExecutionStates() {
  const [runtime, executionRead] = await Promise.all([
    readObservedSfiCognitiveRuntime(),
    readExecutionRecords({ limit: 500 }),
  ]);
  const byAgent = new Map<string, SfiExecutionRecord[]>();
  for (const record of executionRead.records) {
    const list = byAgent.get(record.agentId) ?? [];
    list.push(record);
    byAgent.set(record.agentId, list);
  }

  const states: SfiAgentExecutionState[] = SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.map((agent) => {
    const runtimeAgent = runtime.agents.find((item) => item.id === agent.id);
    const records = (byAgent.get(agent.id) ?? []).sort((a, b) => (b.occurredAt ?? '').localeCompare(a.occurredAt ?? ''));
    const latest = records[0] ?? null;
    const latestManual = records.find((record) => record.requestSource === 'ROOT_MANUAL') ?? null;
    const latestInference = records.find((record) => record.interpretation.epistemicClass === 'INFERENCE') ?? null;
    const infrastructure = (runtimeAgent?.status ?? 'missing').toUpperCase() as SfiExecutionInfrastructureState;
    const authority = latest?.authority
      ?? (agent.humanApprovalRequired ? 'APPROVAL_REQUIRED' : 'NOT_OBSERVED');

    return {
      agentId: agent.id,
      agentName: agent.name,
      infrastructure,
      work: workState(latest),
      epistemic: latest ? epistemicState(latest) : 'NOT_OBSERVED',
      authority,
      // An execution request is not silently re-labelled as a generic human interaction.
      latestInteractionAt: null,
      latestInteractionObservation: 'NOT_OBSERVED',
      latestExecutionAt: latest?.occurredAt ?? null,
      latestExecutionId: latest?.executionId ?? null,
      latestManualExecutionAt: latestManual?.occurredAt ?? null,
      latestInferenceAt: latestInference?.interpretation.generatedAt ?? latestInference?.occurredAt ?? null,
      latestInferenceExecutionId: latestInference?.executionId ?? null,
      latestInferenceSummary: latestInference?.interpretation.summary ?? null,
      contextCoverage: latest?.contextCoverage ?? null,
      warning: latest
        ? null
        : 'No existe una ejecución reciente dentro de la ventana leída; interacción y estado de trabajo permanecen NOT_OBSERVED.',
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    source: 'epistemic_events + observed cognitive runtime',
    executionRecordVersion: SFI_EXECUTION_RECORD_VERSION,
    warnings: executionRead.warnings,
    states,
  };
}
