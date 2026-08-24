import 'server-only';

import { randomUUID } from 'crypto';
import { appendEpistemicEvent } from '@/lib/events/eventStore';
import { sha256 } from '@/lib/operational/common';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { getLatestWorldSpectSnapshot, snapshotRowToApiData } from '@/lib/worldspect/snapshotStore';
import { createKernelContext } from '@/lib/sfi/cognitive-runtime/createKernelContext';
import { executeCognitiveCycle } from '@/lib/sfi/cognitive-runtime/cognitiveCycle';
import { SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY } from '@/lib/sfi/cognitive-runtime/convergedRegistry';

export const SFI_UNIVERSAL_SIGNAL_CONTRACT = 'SFI-UNIVERSAL-SIGNAL-1.0';
export const SFI_UNIVERSAL_CYCLE_CONTRACT = 'SFI-UNIVERSAL-REASONING-CYCLE-1.0';

export const SFI_SIGNAL_KINDS = [
  'url', 'web_page', 'text', 'audio', 'video', 'image', 'document', 'dataset', 'json', 'csv',
  'conversation', 'email', 'code', 'api_response', 'sensor', 'event', 'organization', 'person', 'place',
  'composite', 'unknown',
] as const;

export type SfiSignalKind = typeof SFI_SIGNAL_KINDS[number];

type RecordValue = Record<string, unknown>;

type HypothesisInput = {
  statement: string;
  confidence?: number;
  role?: 'primary' | 'rival';
};

type OpenUniversalCycle = RecordValue & {
  eventId: string;
  occurredAt: string | null;
  cycleId?: string;
  objectKey?: string;
  objectHash?: string;
  question?: string | null;
  objective?: string | null;
};

export type UniversalSignalInput = {
  kind?: SfiSignalKind | string;
  name?: string;
  mimeType?: string;
  sourceUrl?: string;
  assetRef?: string;
  content?: unknown;
  extracted?: RecordValue;
  metadata?: RecordValue;
  provenance?: RecordValue;
  observedAt?: string;
};

export type UniversalCycleInput = {
  signal: UniversalSignalInput;
  question?: string;
  objective?: string;
  declaredFunction?: string;
  systemType?: string;
  context?: RecordValue;
  declaredTarget?: unknown;
  declaredExclusions?: unknown[];
  invariants?: unknown[];
  constraints?: unknown[];
  hypotheses?: HypothesisInput[];
  requestedAgents?: string[];
  llmAugmentation?: boolean;
};

function record(value: unknown): RecordValue {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : {};
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function strings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()) : [];
}

function clamp01(value: unknown, fallback = 0.5) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : fallback;
}

function normalizeKind(value: unknown): SfiSignalKind {
  const candidate = typeof value === 'string' ? value.trim().toLowerCase() : 'unknown';
  return (SFI_SIGNAL_KINDS as readonly string[]).includes(candidate) ? candidate as SfiSignalKind : 'unknown';
}

function safeObservedAt(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.valueOf()) ? parsed.toISOString() : null;
}

export function normalizeUniversalSignal(input: UniversalSignalInput) {
  const kind = normalizeKind(input.kind);
  const name = text(input.name);
  const sourceUrl = text(input.sourceUrl);
  const assetRef = text(input.assetRef);
  const mimeType = text(input.mimeType);
  const normalized = {
    contract: SFI_UNIVERSAL_SIGNAL_CONTRACT,
    kind,
    name,
    mimeType,
    sourceUrl,
    assetRef,
    content: input.content ?? null,
    extracted: record(input.extracted),
    metadata: record(input.metadata),
    provenance: record(input.provenance),
    observedAt: safeObservedAt(input.observedAt),
  };
  const objectHash = sha256(normalized);
  const objectKey = sourceUrl
    ? `url:${sourceUrl.toLowerCase()}`
    : name
      ? `${kind}:${name.toLowerCase()}`
      : assetRef
        ? `${kind}:asset:${assetRef.toLowerCase()}`
        : `${kind}:hash:${objectHash}`;
  return { ...normalized, objectHash, objectKey };
}

export function buildClarifyingQuestions(input: UniversalCycleInput) {
  const signal = normalizeUniversalSignal(input.signal);
  const questions: string[] = [];
  if (!text(input.declaredFunction)) {
    if (signal.kind === 'audio') questions.push('¿Qué es este audio dentro del problema: canción, conversación, registro ambiental, evidencia técnica u otra cosa?');
    else if (signal.kind === 'video') questions.push('¿Qué función tiene este video dentro del problema: pieza artística, campaña, evidencia, contenido social, prueba u otra?');
    else if (signal.kind === 'image') questions.push('¿Qué función tiene esta imagen dentro del problema: objeto visual, evidencia, campaña, referencia, diseño u otra?');
    else if (signal.kind === 'unknown') questions.push('¿Qué clase de objeto o sistema es esta señal?');
  }
  if (!text(input.question) && !text(input.objective)) questions.push('¿Qué quieres entender, decidir o cambiar a partir de esta señal?');
  return questions;
}

function requiresWorldContext(input: UniversalCycleInput) {
  const declaredFunction = text(input.declaredFunction) ?? '';
  const question = text(input.question) ?? '';
  const objective = text(input.objective) ?? '';
  const systemType = text(input.systemType) ?? '';
  const context = `${declaredFunction} ${question} ${objective} ${systemType}`.toLowerCase();
  return /world|global|cultur|market|mercad|launch|release|lanz|timing|momento|audience|public|social|memetic|geopolit|econom|climat|trend|tendenc|external field|campo externo/.test(context);
}

function methodPlan(input: UniversalCycleInput) {
  const signal = normalizeUniversalSignal(input.signal);
  const declaredFunction = (text(input.declaredFunction) ?? '').toLowerCase();
  const question = `${text(input.question) ?? ''} ${text(input.objective) ?? ''}`.toLowerCase();
  const systemType = (text(input.systemType) ?? '').toLowerCase();
  const methods = new Set<string>([
    'SFI_INFERENCE',
    'DIOL_SF',
    'MIHM_V3',
    'MINIMAL_FIELD_PERTURBATION',
    'OBSERVATION_AND_RESULT_CONTRAST',
    'CONFIGURATION_AND_RESPONSE_LIBRARY',
  ]);
  if (requiresWorldContext(input)) methods.add('WSV');
  if (signal.kind === 'audio' || /song|music|canci|sonor|audio/.test(declaredFunction)) methods.add('FAD');
  if (signal.kind === 'conversation' || systemType === 'human' || /person|human|relaci|conduct|conversation/.test(`${declaredFunction} ${question}`)) methods.add('MOP_H');
  if (/persist|platform|carrier|transmission|señal|signal|publica|repost|distribu/.test(`${declaredFunction} ${question}`)) methods.add('MOP_S');
  if (signal.kind === 'composite' || /audio.*video|video.*imagen|imagen.*texto|cross.media|transdimensional|identidad visual/.test(`${declaredFunction} ${question}`)) methods.add('TRANSDIMENSIONAL_COHERENCE');
  return {
    theoryBoundary: 'SFT is treated as a theory candidate/in-development layer; operational conclusions remain evidence-bound to SFI methods and protocols.',
    methods: [...methods],
    worldContext: requiresWorldContext(input) ? 'RELEVANT' : 'NOT_REQUIRED',
    terms: {
      attractor: 'Dynamic region inferred from observed system behavior; not automatically an operator preference.',
      ejector: 'Repelling region inferred from dynamics.',
      declaredTarget: 'Operator-declared desired state; kept distinct from an inferred attractor.',
      declaredExclusion: 'Operator-declared unacceptable state; kept distinct from an inferred ejector.',
    },
  };
}

function agentPlan(input: UniversalCycleInput) {
  const requested = strings(input.requestedAgents);
  const available = SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.map((agent) => agent.id);
  const requestedValid = requested.filter((id) => available.includes(id));
  return {
    totalAvailable: available.length,
    available,
    requested: requestedValid.length ? requestedValid : available,
    note: 'Agents execute roles inside methods; agent output is not epistemic authority and cannot promote itself to canonical state.',
  };
}

export async function readUniversalOpenCycles(limit = 80) {
  const db = createServiceSupabaseClient();
  const [events, worldHypotheses, proposals] = await Promise.all([
    db.from('epistemic_events')
      .select('event_id,event_name,epistemic_class,payload,occurred_at,lineage')
      .in('event_name', ['SFI_UNIVERSAL_SIGNAL_INGESTED', 'SFI_UNIVERSAL_CYCLE_OPENED', 'SFI_UNIVERSAL_RETURN_RECORDED', 'SFI_UNIVERSAL_CYCLE_CLOSED'])
      .order('sequence', { ascending: false })
      .limit(Math.max(20, Math.min(300, limit * 4))),
    db.from('world_hypotheses')
      .select('*')
      .in('status', ['OPEN', 'AWAITING_OUTCOME'])
      .limit(Math.max(10, Math.min(100, limit))),
    db.from('action_proposals')
      .select('*')
      .limit(Math.max(10, Math.min(100, limit))),
  ]);

  const universalRows = Array.isArray(events.data) ? events.data : [];
  const closedCycleIds = new Set<string>();
  for (const row of universalRows) {
    if (row.event_name !== 'SFI_UNIVERSAL_CYCLE_CLOSED') continue;
    const payload = record(row.payload);
    const cycleId = text(payload.cycleId);
    if (cycleId) closedCycleIds.add(cycleId);
  }
  const universal: OpenUniversalCycle[] = universalRows
    .filter((row) => row.event_name === 'SFI_UNIVERSAL_CYCLE_OPENED')
    .map((row): OpenUniversalCycle => ({
      ...record(row.payload),
      eventId: String(row.event_id ?? ''),
      occurredAt: typeof row.occurred_at === 'string' ? row.occurred_at : null,
    }))
    .filter((row) => typeof row.cycleId === 'string' && !closedCycleIds.has(row.cycleId))
    .slice(0, limit);

  const proposalRows = Array.isArray(proposals.data) ? proposals.data : [];
  const pendingProposals = proposalRows.filter((row) => !['accepted', 'rejected', 'superseded'].includes(String(row.status ?? '').toLowerCase()));

  return {
    universal,
    worldHypotheses: worldHypotheses.data ?? [],
    pendingProposals,
    warnings: [
      events.error ? `epistemic_events:${events.error.message}` : null,
      worldHypotheses.error ? `world_hypotheses:${worldHypotheses.error.message}` : null,
      proposals.error ? `action_proposals:${proposals.error.message}` : null,
    ].filter((value): value is string => Boolean(value)),
  };
}

export function matchOpenCycles(objectKey: string, openCycles: Awaited<ReturnType<typeof readUniversalOpenCycles>>) {
  const sameObject = openCycles.universal.filter((cycle) => cycle.objectKey === objectKey);
  return {
    blocking: sameObject,
    related: [],
    independentCounts: {
      universal: Math.max(0, openCycles.universal.length - sameObject.length),
      worldHypotheses: Array.isArray(openCycles.worldHypotheses) ? openCycles.worldHypotheses.length : 0,
      governanceProposals: openCycles.pendingProposals.length,
    },
    rule: sameObject.length
      ? 'An earlier cycle for the same object is still open. Review/close/return it before opening a new cycle, or explicitly continueWithOpenCycles=true.'
      : 'No blocking open cycle was found for the same object key.',
  };
}

export async function persistUniversalSignal(input: UniversalCycleInput, actorId: string, tenantId: string) {
  const signal = normalizeUniversalSignal(input.signal);
  const event = await appendEpistemicEvent({
    eventName: 'SFI_UNIVERSAL_SIGNAL_INGESTED',
    epistemicClass: 'declared',
    confidence: 1,
    payload: {
      actorId,
      tenantId,
      signal,
      question: text(input.question),
      objective: text(input.objective),
      declaredFunction: text(input.declaredFunction),
      systemType: text(input.systemType),
      context: record(input.context),
      declaredTarget: input.declaredTarget ?? null,
      declaredExclusions: Array.isArray(input.declaredExclusions) ? input.declaredExclusions : [],
      invariants: Array.isArray(input.invariants) ? input.invariants : [],
      constraints: Array.isArray(input.constraints) ? input.constraints : [],
      epistemicBoundary: 'The supplied object and operator declarations are persisted as declared input. Extracted, derived, inferred and simulated states remain separate.',
    },
    occurredAt: new Date().toISOString(),
    source: { sourceId: actorId, sourceType: 'external_signal_intake' },
    logbookId: `signal:${signal.objectHash}`,
    lineage: [],
  });
  return { signal, event };
}

export async function runUniversalCognitiveCycle(input: UniversalCycleInput, actorId: string, tenantId: string) {
  const signal = normalizeUniversalSignal(input.signal);
  const cycleId = randomUUID();
  const taskId = randomUUID();
  const logbookId = `universal-cycle:${cycleId}`;
  const useWorldContext = requiresWorldContext(input);
  const worldSnapshot = useWorldContext ? await getLatestWorldSpectSnapshot() : null;
  const context = createKernelContext(cycleId, logbookId, 'SFI_TASK_REQUESTED');
  context.taskId = taskId;
  context.evidence.push({
    id: signal.objectHash,
    source: 'UniversalSignalGateway',
    confidence: 1,
    payload: {
      epistemicClass: 'declared',
      signal,
      actorId,
      tenantId,
      question: text(input.question),
      objective: text(input.objective),
      declaredFunction: text(input.declaredFunction),
      context: record(input.context),
    },
  });
  context.hypotheses.push(...(Array.isArray(input.hypotheses) ? input.hypotheses : [])
    .filter((item) => Boolean(text(item?.statement)))
    .map((item) => ({ id: randomUUID(), statement: String(item.statement).trim(), confidence: clamp01(item.confidence, 0.5) })));
  context.metadata = {
    actorId,
    tenantId,
    question: text(input.question),
    objective: text(input.objective),
    declaredFunction: text(input.declaredFunction),
    systemType: text(input.systemType),
    signal,
    universalSignalContract: SFI_UNIVERSAL_SIGNAL_CONTRACT,
    universalCycleContract: SFI_UNIVERSAL_CYCLE_CONTRACT,
    methods: methodPlan(input),
    declaredTarget: input.declaredTarget ?? null,
    declaredExclusions: Array.isArray(input.declaredExclusions) ? input.declaredExclusions : [],
    invariants: Array.isArray(input.invariants) ? input.invariants : [],
    constraints: Array.isArray(input.constraints) ? input.constraints : [],
    worldSpect: worldSnapshot ? snapshotRowToApiData(worldSnapshot) : null,
    worldContextUsed: useWorldContext,
    requestedAgents: agentPlan(input).requested,
    llmAugmentation: input.llmAugmentation === true,
    epistemicBoundary: 'Observed/declaration/derived/inferred/simulated states remain distinct. Rival hypotheses are not collapsed by narrative coherence.',
  };

  const opened = await appendEpistemicEvent({
    eventName: 'SFI_UNIVERSAL_CYCLE_OPENED',
    epistemicClass: 'derived',
    confidence: 1,
    payload: {
      cycleId, taskId, objectKey: signal.objectKey, objectHash: signal.objectHash, actorId, tenantId,
      question: text(input.question), objective: text(input.objective), methodPlan: methodPlan(input), agentPlan: agentPlan(input),
      worldSnapshotId: worldSnapshot?.id ?? null,
      worldContextUsed: useWorldContext,
    },
    occurredAt: new Date().toISOString(),
    source: { sourceId: 'universal_signal_gateway', sourceType: 'cognitive_runtime' },
    logbookId,
    lineage: [signal.objectHash],
  });

  const result = await executeCognitiveCycle(context);
  const openedEventId = opened.ok ? String(opened.data.event_id) : null;
  const completedEvent = await appendEpistemicEvent({
    eventName: 'SFI_UNIVERSAL_COGNITIVE_CYCLE_EXECUTED',
    epistemicClass: 'derived',
    confidence: result.completed ? 1 : 0.5,
    payload: {
      cycleId,
      taskId,
      objectKey: signal.objectKey,
      objectHash: signal.objectHash,
      completed: result.completed,
      executedAgents: result.executedAgents,
      missingAgents: result.missingAgents,
      hypotheses: result.context.hypotheses,
      contradictions: result.context.contradictions,
      predictions: result.context.predictions,
      risks: result.context.risks,
      opportunities: result.context.opportunities,
      simulations: result.context.simulations,
      metadata: result.context.metadata,
    },
    occurredAt: new Date().toISOString(),
    source: { sourceId: 'sfi_cognitive_runtime', sourceType: 'cognitive_cycle' },
    logbookId,
    lineage: [signal.objectHash, openedEventId].filter((value): value is string => Boolean(value)),
  });

  return {
    signal,
    cycleId,
    taskId,
    logbookId,
    methodPlan: methodPlan(input),
    agentPlan: agentPlan(input),
    worldSnapshot: worldSnapshot ? snapshotRowToApiData(worldSnapshot) : null,
    result,
    opened,
    completedEvent,
  };
}

export async function recordUniversalReturn(input: { cycleId: string; objectKey?: string; outcome: unknown; evidenceRefs?: string[]; classification?: string; notes?: string }, actorId: string, tenantId: string) {
  return appendEpistemicEvent({
    eventName: 'SFI_UNIVERSAL_RETURN_RECORDED',
    epistemicClass: 'observed',
    confidence: 1,
    payload: {
      cycleId: input.cycleId,
      objectKey: input.objectKey ?? null,
      actorId,
      tenantId,
      outcome: input.outcome,
      classification: text(input.classification),
      notes: text(input.notes),
      evidenceRefs: Array.isArray(input.evidenceRefs) ? input.evidenceRefs : [],
      instruction: 'Return must be contrasted against preregistered prediction, rival hypotheses, invariants, secondary effects and stop conditions before sedimentation.',
    },
    occurredAt: new Date().toISOString(),
    source: { sourceId: actorId, sourceType: 'external_return' },
    logbookId: `universal-cycle:${input.cycleId}`,
    lineage: Array.isArray(input.evidenceRefs) ? input.evidenceRefs : [],
  });
}

export async function closeUniversalCycle(input: { cycleId: string; objectKey?: string; reason: string; evidenceRefs?: string[] }, actorId: string, tenantId: string) {
  return appendEpistemicEvent({
    eventName: 'SFI_UNIVERSAL_CYCLE_CLOSED',
    epistemicClass: 'derived',
    confidence: 1,
    payload: {
      cycleId: input.cycleId,
      objectKey: input.objectKey ?? null,
      actorId,
      tenantId,
      reason: input.reason,
      evidenceRefs: Array.isArray(input.evidenceRefs) ? input.evidenceRefs : [],
      closureBoundary: 'Closure means the methodological question has sufficient disposition; it does not mean the observed system is permanently resolved.',
    },
    occurredAt: new Date().toISOString(),
    source: { sourceId: actorId, sourceType: 'external_cycle_closure' },
    logbookId: `universal-cycle:${input.cycleId}`,
    lineage: Array.isArray(input.evidenceRefs) ? input.evidenceRefs : [],
  });
}

export function describeUniversalSignalContract(input: UniversalCycleInput) {
  return {
    signal: normalizeUniversalSignal(input.signal),
    clarifyingQuestions: buildClarifyingQuestions(input),
    methodPlan: methodPlan(input),
    agentPlan: agentPlan(input),
  };
}
