import 'server-only';

import { appendEpistemicEvent } from '@/lib/events/eventStore';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import {
  executeCognitiveCycle,
  SFI_UNIVERSAL_COGNITIVE_CHECKPOINT,
  SFI_UNIVERSAL_RETURN_PLAN_RECORDED,
} from '@/lib/sfi/cognitive-runtime/cognitiveCycle';
import type { KernelContext } from '@/lib/sfi/cognitive-runtime/kernelContext';
import { hydrateUniversalCycleInput } from '@/lib/sfi/universalObservationHydrator';
import { synthesizeUniversalCycleWithAi } from '@/lib/sfi/universalAiSynthesis';
import { runUniversalCognitiveCycle, type UniversalCycleInput } from '@/lib/sfi/universalSignalCycle';

const SYSTEM_ACTOR = 'sfi_universal_continuation';
const EVENT_SCAN_LIMIT = 500;
const CONTINUATION_AGENT_BUDGET = 8;
const MAX_SYNTHESIS_ATTEMPTS_PER_COMPLETION = 3;

type Row = Record<string, unknown>;

type LifecycleEvent = {
  sequence: number;
  eventId: string;
  eventName: string;
  payload: Row;
  logbookId: string | null;
};

type CycleTrack = {
  cycleId: string;
  resume: LifecycleEvent | null;
  checkpoint: LifecycleEvent | null;
  cognitive: LifecycleEvent | null;
  synthesis: LifecycleEvent | null;
  syntheses: LifecycleEvent[];
  returnPlan: LifecycleEvent | null;
  returnEvent: LifecycleEvent | null;
  closed: LifecycleEvent | null;
};

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function stringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim())
    : [];
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function eventRow(value: unknown): LifecycleEvent | null {
  const item = row(value);
  const payload = row(item.payload);
  const cycleId = text(payload.cycleId);
  const eventName = text(item.event_name);
  if (!cycleId || !eventName) return null;
  return {
    sequence: numberValue(item.sequence),
    eventId: text(item.event_id) ?? '',
    eventName,
    payload,
    logbookId: text(item.logbook_id),
  };
}

function later(a: LifecycleEvent | null, b: LifecycleEvent | null) {
  return (a?.sequence ?? 0) > (b?.sequence ?? 0);
}

function completedCognitive(event: LifecycleEvent | null) {
  return Boolean(event && event.payload.completed === true);
}

function synthesisStatus(event: LifecycleEvent | null) {
  return text(row(event?.payload.synthesis).status)?.toUpperCase() ?? null;
}

function synthesisComplete(event: LifecycleEvent | null) {
  return synthesisStatus(event) === 'COMPLETE';
}

function currentSynthesisAttempts(track: CycleTrack) {
  if (!track.cognitive) return 0;
  return track.syntheses.filter((event) => later(event, track.cognitive)).length;
}

function returnPlanState(event: LifecycleEvent | null) {
  return text(row(event?.payload.plan).acquisitionState)?.toUpperCase() ?? null;
}

function progressSequence(track: CycleTrack) {
  return Math.max(
    track.resume?.sequence ?? 0,
    track.checkpoint?.sequence ?? 0,
    track.cognitive?.sequence ?? 0,
    track.synthesis?.sequence ?? 0,
    track.returnPlan?.sequence ?? 0,
    track.returnEvent?.sequence ?? 0,
  );
}

function signalFromObjectKey(payload: Row): UniversalCycleInput['signal'] {
  const objectKey = text(payload.objectKey) ?? '';
  const objectHash = text(payload.objectHash) ?? undefined;
  if (objectKey.startsWith('url:')) {
    return { kind: 'url', sourceUrl: objectKey.slice(4), objectHash, content: null, extracted: {}, provenance: {} };
  }
  const separator = objectKey.indexOf(':');
  const kind = separator > 0 ? objectKey.slice(0, separator) : 'unknown';
  const name = separator > 0 ? objectKey.slice(separator + 1) : objectKey || undefined;
  return { kind, name, objectHash, content: null, extracted: {}, provenance: {} };
}

async function readTracks() {
  const db = createServiceSupabaseClient();
  const result = await db.from('epistemic_events')
    .select('sequence,event_id,event_name,payload,logbook_id')
    .in('event_name', [
      'SFI_UNIVERSAL_CYCLE_RESUMED',
      SFI_UNIVERSAL_COGNITIVE_CHECKPOINT,
      'SFI_UNIVERSAL_COGNITIVE_CYCLE_EXECUTED',
      'SFI_UNIVERSAL_AI_SYNTHESIS_COMPLETED',
      SFI_UNIVERSAL_RETURN_PLAN_RECORDED,
      'SFI_UNIVERSAL_RETURN_RECORDED',
      'SFI_UNIVERSAL_CYCLE_CLOSED',
    ])
    .order('sequence', { ascending: false })
    .limit(EVENT_SCAN_LIMIT);
  if (result.error) return { ok: false as const, tracks: [] as CycleTrack[], error: result.error.message };

  const map = new Map<string, CycleTrack>();
  for (const value of result.data ?? []) {
    const event = eventRow(value);
    if (!event) continue;
    let track = map.get(text(event.payload.cycleId)!);
    if (!track) {
      track = {
        cycleId: text(event.payload.cycleId)!,
        resume: null,
        checkpoint: null,
        cognitive: null,
        synthesis: null,
        syntheses: [],
        returnPlan: null,
        returnEvent: null,
        closed: null,
      };
      map.set(track.cycleId, track);
    }
    if (event.eventName === 'SFI_UNIVERSAL_CYCLE_RESUMED' && !track.resume) track.resume = event;
    else if (event.eventName === SFI_UNIVERSAL_COGNITIVE_CHECKPOINT && !track.checkpoint) track.checkpoint = event;
    else if (event.eventName === 'SFI_UNIVERSAL_COGNITIVE_CYCLE_EXECUTED' && !track.cognitive) track.cognitive = event;
    else if (event.eventName === 'SFI_UNIVERSAL_AI_SYNTHESIS_COMPLETED') {
      track.syntheses.push(event);
      if (!track.synthesis) track.synthesis = event;
    } else if (event.eventName === SFI_UNIVERSAL_RETURN_PLAN_RECORDED && !track.returnPlan) track.returnPlan = event;
    else if (event.eventName === 'SFI_UNIVERSAL_RETURN_RECORDED' && !track.returnEvent) track.returnEvent = event;
    else if (event.eventName === 'SFI_UNIVERSAL_CYCLE_CLOSED' && !track.closed) track.closed = event;
  }
  return { ok: true as const, tracks: [...map.values()], error: null as string | null };
}

function checkpointContext(event: LifecycleEvent | null): KernelContext | null {
  if (!event) return null;
  const context = row(event.payload.context) as unknown as KernelContext;
  if (!context || typeof context.cycleId !== 'string' || !context.cycleId) return null;
  return context;
}

function synthesisInput(context: KernelContext, lineageRefs: string[]) {
  const metadata = row(context.metadata);
  return {
    cycleId: context.cycleId,
    actorId: SYSTEM_ACTOR,
    tenantId: text(metadata.tenantId) ?? 'sfi',
    question: text(metadata.question),
    objective: text(metadata.objective),
    caseClass: text(metadata.caseClass),
    signal: {
      kind: text(metadata.signalType) ?? text(row(metadata.signal).kind) ?? 'unknown',
      name: text(metadata.objectKey) ?? text(row(metadata.signal).name),
      sourceUrl: text(row(metadata.signal).sourceUrl),
      objectHash: text(metadata.objectHash) ?? text(row(metadata.signal).objectHash),
      extracted: {
        measurements: row(metadata.materialMeasurements),
        epistemicPartition: row(metadata.materialEpistemicPartition),
        unresolved: metadata.materialUnresolved ?? null,
      },
      provenance: {
        hydratedFromEventId: text(metadata.hydrationEventId),
      },
    },
    deterministicOutputs: {
      hypotheses: context.hypotheses,
      contradictions: context.contradictions,
      predictions: context.predictions,
      risks: context.risks,
      opportunities: context.opportunities,
      simulations: context.simulations,
    },
    runtimeMetadata: context.metadata,
    lineageRefs,
  };
}

async function appendCognitiveCompletion(context: KernelContext, result: Awaited<ReturnType<typeof executeCognitiveCycle>>, lineage: string[]) {
  return appendEpistemicEvent({
    eventName: 'SFI_UNIVERSAL_COGNITIVE_CYCLE_EXECUTED',
    epistemicClass: 'derived',
    confidence: result.completed ? 1 : 0.5,
    occurredAt: new Date().toISOString(),
    source: { sourceId: SYSTEM_ACTOR, sourceType: 'durable_cycle_continuation' },
    logbookId: context.logbookId,
    lineage,
    payload: {
      cycleId: context.cycleId,
      taskId: context.taskId ?? null,
      resumed: true,
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
      continuation: 'DURABLE_CHECKPOINT_RESUME',
    },
  });
}

async function synthesizeIfNeeded(track: CycleTrack, context: KernelContext, completionEventId: string | null) {
  const latestCompletion = completionEventId ? null : track.cognitive;
  const synthesisIsCurrent = !completionEventId && latestCompletion && track.synthesis && later(track.synthesis, latestCompletion);
  if (synthesisIsCurrent && synthesisComplete(track.synthesis)) {
    return { status: 'SYNTHESIS_ALREADY_COMPLETE' as const, eventId: track.synthesis?.eventId ?? null, attempts: currentSynthesisAttempts(track) };
  }

  const attempts = completionEventId ? 0 : currentSynthesisAttempts(track);
  if (synthesisIsCurrent && attempts >= MAX_SYNTHESIS_ATTEMPTS_PER_COMPLETION) {
    return {
      status: 'SYNTHESIS_DEGRADED_RETRY_EXHAUSTED' as const,
      eventId: track.synthesis?.eventId ?? null,
      attempts,
      nonBlocking: true,
    };
  }

  const refs = [track.resume?.eventId, track.checkpoint?.eventId, completionEventId ?? track.cognitive?.eventId]
    .filter((item): item is string => Boolean(item));
  const synthesis = await synthesizeUniversalCycleWithAi(synthesisInput(context, refs));
  return {
    status: synthesis.status,
    eventId: synthesis.eventId,
    attempts: attempts + 1,
    nonBlocking: synthesis.status !== 'COMPLETE',
  };
}

async function latestReturnPlanForContext(track: CycleTrack, context: KernelContext) {
  if (track.returnPlan) return track.returnPlan;
  const db = createServiceSupabaseClient();
  const result = await db.from('epistemic_events')
    .select('sequence,event_id,event_name,payload,logbook_id')
    .eq('event_name', SFI_UNIVERSAL_RETURN_PLAN_RECORDED)
    .eq('logbook_id', context.logbookId)
    .order('sequence', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (result.error || !result.data) return null;
  return eventRow(result.data);
}

function normalizedBlob(values: unknown[]) {
  return values
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .map((value) => typeof value === 'string' ? value : '')
    .filter(Boolean)
    .join(' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function minimumHumanReturnInput(plan: Row, context: KernelContext) {
  const metadata = row(context.metadata);
  const blob = normalizedBlob([
    plan.expectedSignals,
    plan.contradictionSignals,
    plan.unresolved,
    plan.sourceRequirement,
    metadata.question,
    metadata.objective,
    metadata.objectKey,
  ]);
  const requests: string[] = [];

  if (/timestamp|marca temporal|semantica|semantic|field definition|definicion de campo|orden de eventos/.test(blob)) {
    requests.push('Definición autoritativa de los campos temporales relevantes y el orden real de sus eventos en el sistema fuente.');
  }
  if (/audit|auditoria|lineage|trazabilidad|event history|historial de eventos|source system|sistema fuente/.test(blob)) {
    requests.push('Historial o traza autoritativa de eventos para una muestra mínima de casos anómalos y controles normales, sin datos personales innecesarios.');
  }
  if (/\bsla\b|business hours|horario laboral|pause|exclusion|exclusion rule/.test(blob)) {
    requests.push('Definición vigente del SLA, calendario, pausas y exclusiones aplicables, sólo si esas reglas forman parte de la hipótesis que se quiere contrastar.');
  }
  if (/recurr|repeat|repet|template|plantilla|routine|rutina/.test(blob)) {
    requests.push('Muestra minimizada que permita distinguir plantillas/rutina de demanda operacional realmente repetida.');
  }

  if (!requests.length) {
    const expected = stringList(plan.expectedSignals).slice(0, 3);
    requests.push(expected.length
      ? `Fuente, acceso u observación autoritativa que permita comprobar: ${expected.join(' | ')}.`
      : 'Fuente, acceso u observación material necesaria para producir un RETURN verificable.');
  }
  return [...new Set(requests)];
}

function resolveReturnCapability(plan: Row, context: KernelContext) {
  const metadata = row(context.metadata);
  const signal = row(metadata.signal);
  const signalType = (text(metadata.signalType) ?? text(signal.kind) ?? '').toLowerCase();
  const sourceUrl = text(signal.sourceUrl);
  const blob = normalizedBlob([
    plan.expectedSignals,
    plan.contradictionSignals,
    plan.unresolved,
    plan.sourceRequirement,
    metadata.question,
    metadata.objective,
    metadata.objectKey,
    signalType,
  ]);
  const internalMaterial = ['dataset', 'csv', 'document', 'api_response'].includes(signalType)
    || /internal|interno|xlsx|dataset|archivo|tickets|mesa de ayuda|sistema fuente|source system/.test(blob);
  const authoritySensitive = /authoritative|autoritativ|semantica|semantic|audit|auditoria|lineage|trazabilidad|field definition|definicion de campo|\bsla\b|timestamp|marca temporal/.test(blob);
  const futureObservation = /future|futuro|next observation|proxima observacion|intervention|intervencion|observed return|return observado/.test(blob);

  if (internalMaterial || authoritySensitive) {
    return {
      contract: 'SFI-UNIVERSAL-RETURN-CAPABILITY-1.0',
      state: 'HUMAN_SOURCE_OR_AUTHORIZATION_REQUIRED',
      sourceClass: 'AUTHORITATIVE_INTERNAL_OR_CONTROLLED_SOURCE',
      capabilityId: null,
      humanInputRequired: true,
      requiredHumanInput: minimumHumanReturnInput(plan, context),
      reason: 'The required observation depends on authoritative semantics, source-system lineage or controlled material that is not present in the authorized SFI runtime. SFI must not infer or fabricate it.',
      rawSourceRequired: false,
      rawRowsRequired: false,
      authorizationAlternative: 'Authorized read access to the authoritative source is sufficient; a raw dataset re-upload is not required.',
    };
  }

  if (sourceUrl && /^https?:\/\//i.test(sourceUrl) && !futureObservation) {
    return {
      contract: 'SFI-UNIVERSAL-RETURN-CAPABILITY-1.0',
      state: 'DIRECT_SOURCE_AVAILABLE_BUT_RETURN_OBSERVATION_REQUIRES_EXPLICIT_LINKAGE',
      sourceClass: 'PUBLIC_DIRECT_SOURCE',
      capabilityId: 'universal_evidence_acquisition_v1',
      humanInputRequired: true,
      requiredHumanInput: minimumHumanReturnInput(plan, context),
      reason: 'SFI can retrieve the public source, but existing calibration rules require an explicit persisted observation linked to the prediction before it can become RETURN.',
      rawSourceRequired: false,
      rawRowsRequired: false,
      authorizationAlternative: null,
    };
  }

  return {
    contract: 'SFI-UNIVERSAL-RETURN-CAPABILITY-1.0',
    state: 'MATERIAL_OBSERVATION_REQUIRED',
    sourceClass: futureObservation ? 'REAL_WORLD_FUTURE_OBSERVATION' : 'UNRESOLVED_SOURCE_CLASS',
    capabilityId: null,
    humanInputRequired: true,
    requiredHumanInput: minimumHumanReturnInput(plan, context),
    reason: 'No existing authorized capability can produce the required material observation without external source access or an explicit observed outcome.',
    rawSourceRequired: false,
    rawRowsRequired: false,
    authorizationAlternative: 'Authorize an existing source connector or provide the minimum observed outcome with evidence references.',
  };
}

async function resolveReturnPlanIfNeeded(track: CycleTrack, context: KernelContext) {
  if (track.returnEvent) {
    return { state: 'RETURN_ALREADY_RECORDED' as const, eventId: track.returnEvent.eventId, plan: null };
  }

  const planEvent = await latestReturnPlanForContext(track, context);
  if (!planEvent) {
    return { state: 'RETURN_PLAN_MISSING' as const, eventId: null, plan: null };
  }

  const plan = row(planEvent.payload.plan);
  const acquisitionState = text(plan.acquisitionState)?.toUpperCase();
  if (acquisitionState !== 'CAPABILITY_RESOLUTION_REQUIRED') {
    return {
      state: plan.humanInputRequired === true ? 'HUMAN_INPUT_REQUIRED' as const : 'RETURN_PLAN_ALREADY_RESOLVED' as const,
      eventId: planEvent.eventId,
      plan,
    };
  }

  const capability = resolveReturnCapability(plan, context);
  const resolvedPlan = {
    ...plan,
    acquisitionState: capability.state,
    responsibility: capability.humanInputRequired ? 'ROOT_OR_AUTHORIZED_OPERATOR' : 'SFI',
    humanInputRequired: capability.humanInputRequired,
    requiredHumanInput: capability.requiredHumanInput,
    capabilityResolution: capability,
    resolvedAt: new Date().toISOString(),
    next: capability.humanInputRequired
      ? 'Obtain only the minimum source/access/observation listed in requiredHumanInput, persist the observed RETURN with evidence refs, then CONTRAST.'
      : plan.next,
  };

  const event = await appendEpistemicEvent({
    eventName: SFI_UNIVERSAL_RETURN_PLAN_RECORDED,
    epistemicClass: 'derived',
    confidence: 1,
    occurredAt: new Date().toISOString(),
    source: { sourceId: SYSTEM_ACTOR, sourceType: 'return_capability_resolver' },
    logbookId: context.logbookId,
    lineage: [planEvent.eventId, context.cycleId].filter(Boolean),
    payload: {
      cycleId: context.cycleId,
      taskId: text(planEvent.payload.taskId) ?? context.taskId ?? null,
      plan: resolvedPlan,
      supersedesReturnPlanEventId: planEvent.eventId,
      canonicalPromotionAllowed: false,
      epistemicBoundary: 'Capability resolution changes execution ownership only. It does not create RETURN, evidence acceptance, CONTRAST, closure or learning.',
    },
  });

  return {
    state: capability.humanInputRequired ? 'HUMAN_INPUT_REQUIRED' as const : 'RETURN_CAPABILITY_RESOLVED' as const,
    eventId: event.ok ? String(event.data.event_id ?? '') || null : null,
    plan: resolvedPlan,
  };
}

async function finalizeCompletedTrack(track: CycleTrack, context: KernelContext, completionEventId: string | null) {
  const synthesis = await synthesizeIfNeeded(track, context, completionEventId);
  const returnResolution = await resolveReturnPlanIfNeeded(track, context);
  return {
    cycleId: track.cycleId,
    state: returnResolution.state === 'HUMAN_INPUT_REQUIRED'
      ? 'HUMAN_INPUT_REQUIRED' as const
      : 'COGNITIVE_RUNTIME_COMPLETED' as const,
    completionEventId: completionEventId ?? track.cognitive?.eventId ?? null,
    synthesis,
    returnPlan: returnResolution.plan,
    returnPlanEventId: returnResolution.eventId,
    returnState: returnResolution.state,
  };
}

async function continueCheckpoint(track: CycleTrack) {
  const context = checkpointContext(track.checkpoint);
  if (!context) return { cycleId: track.cycleId, state: 'CHECKPOINT_CONTEXT_INVALID' as const };

  if (track.closed && later(track.closed, track.checkpoint)) {
    return { cycleId: track.cycleId, state: 'CYCLE_ALREADY_CLOSED' as const };
  }

  const checkpointCompleted = track.checkpoint?.payload.completed === true;
  const currentCompletion = track.cognitive && later(track.cognitive, track.checkpoint) && completedCognitive(track.cognitive);
  let completionEventId = currentCompletion ? track.cognitive?.eventId ?? null : null;
  let result: Awaited<ReturnType<typeof executeCognitiveCycle>> | null = null;

  if (!currentCompletion) {
    result = checkpointCompleted
      ? await executeCognitiveCycle(context, { maxAgentsPerInvocation: 1, continuationSource: SYSTEM_ACTOR })
      : await executeCognitiveCycle(context, { maxAgentsPerInvocation: CONTINUATION_AGENT_BUDGET, continuationSource: SYSTEM_ACTOR });
    if (result.completed) {
      const completion = await appendCognitiveCompletion(
        context,
        result,
        [track.resume?.eventId, track.checkpoint?.eventId].filter((item): item is string => Boolean(item)),
      );
      completionEventId = completion.ok ? String(completion.data.event_id ?? '') || null : null;
    }
  }

  const effectiveContext = result?.context ?? context;
  if (!(result?.completed ?? currentCompletion ?? checkpointCompleted)) {
    return {
      cycleId: track.cycleId,
      state: 'CHECKPOINTED_CONTINUATION' as const,
      executedAgents: result?.executedAgents ?? [],
      missingAgents: result?.missingAgents ?? [],
    };
  }

  return finalizeCompletedTrack(track, effectiveContext, completionEventId);
}

async function continueCompletedTrack(track: CycleTrack) {
  const context = checkpointContext(track.checkpoint);
  if (!context) return { cycleId: track.cycleId, state: 'COMPLETED_CONTEXT_UNAVAILABLE' as const };
  return finalizeCompletedTrack(track, context, null);
}

async function bootstrapLegacyResume(track: CycleTrack) {
  if (!track.resume) return { cycleId: track.cycleId, state: 'NO_RESUME_EVENT' as const };
  const payload = track.resume.payload;
  const tenantId = text(payload.tenantId) ?? 'sfi';
  const rawInput: UniversalCycleInput = {
    signal: signalFromObjectKey(payload),
    question: text(payload.question) ?? undefined,
    objective: text(payload.objective) ?? undefined,
    context: {},
  };
  const hydration = await hydrateUniversalCycleInput(rawInput, tenantId, { resumeCycleId: track.cycleId });
  if (!hydration.hydrated) {
    return { cycleId: track.cycleId, state: 'LEGACY_RESUME_HYDRATION_REQUIRED' as const, hydrationBasis: hydration.basis };
  }
  const preparedInput: UniversalCycleInput = {
    ...hydration.input,
    context: {
      ...row(hydration.input.context),
      observationHydration: {
        contract: hydration.contract,
        hydrated: hydration.hydrated,
        basis: hydration.basis,
        eventId: hydration.eventId,
      },
      durableContinuation: {
        bootstrapFromResumeEventId: track.resume.eventId,
        maxAgentsPerInvocation: CONTINUATION_AGENT_BUDGET,
        rule: 'Reuse the same cycle and canonical structured result. Do not reload or persist raw dataset rows.',
      },
    },
  };

  const cycle = await runUniversalCognitiveCycle(preparedInput, SYSTEM_ACTOR, tenantId, {
    resumeCycleId: track.cycleId,
    resumeReason: 'DURABLE_RUNTIME_CONTINUATION',
    resumeLineageEventId: track.resume.eventId,
  });

  return {
    cycleId: track.cycleId,
    state: cycle.result.completed ? 'LEGACY_RESUME_COMPLETED' as const : 'LEGACY_RESUME_CHECKPOINTED' as const,
    completed: cycle.result.completed,
    executedAgents: cycle.result.executedAgents,
    missingAgents: cycle.result.missingAgents,
    checkpointingEnabled: true,
  };
}

function completedTrackNeedsWork(track: CycleTrack) {
  if (!track.cognitive || !completedCognitive(track.cognitive) || track.returnEvent) return false;
  const synthesisCurrent = track.synthesis && later(track.synthesis, track.cognitive);
  const synthesisNeedsRetry = !synthesisCurrent
    || (!synthesisComplete(track.synthesis) && currentSynthesisAttempts(track) < MAX_SYNTHESIS_ATTEMPTS_PER_COMPLETION);
  const planState = returnPlanState(track.returnPlan);
  const returnPlanNeedsResolution = !track.returnPlan || planState === 'CAPABILITY_RESOLUTION_REQUIRED';
  return Boolean(synthesisNeedsRetry || returnPlanNeedsResolution);
}

export async function runUniversalCycleContinuation(input: { limit?: number; cycleId?: string } = {}) {
  const scan = await readTracks();
  if (!scan.ok) return { ok: false as const, processed: 0, results: [], error: scan.error };
  const limit = Math.max(1, Math.min(5, input.limit ?? 2));
  const requestedCycleId = text(input.cycleId);
  const candidates = scan.tracks
    .filter((track) => !requestedCycleId || track.cycleId === requestedCycleId)
    .filter((track) => {
      if (track.closed && (!track.resume || later(track.closed, track.resume))) return false;
      if (track.returnEvent) return false;
      const unfinishedCheckpoint = track.checkpoint && (!track.cognitive || later(track.checkpoint, track.cognitive) || !completedCognitive(track.cognitive));
      const legacyInterruptedResume = track.resume && (!track.cognitive || later(track.resume, track.cognitive)) && (!track.checkpoint || !later(track.checkpoint, track.resume));
      return Boolean(unfinishedCheckpoint || legacyInterruptedResume || completedTrackNeedsWork(track));
    })
    .sort((a, b) => {
      const delta = progressSequence(a) - progressSequence(b);
      return delta || a.cycleId.localeCompare(b.cycleId);
    })
    .slice(0, requestedCycleId ? 1 : limit);

  const results: unknown[] = [];
  for (const track of candidates) {
    try {
      const checkpointIsUsable = track.checkpoint && (!track.resume || later(track.checkpoint, track.resume));
      if (checkpointIsUsable && (!track.cognitive || !completedCognitive(track.cognitive) || later(track.checkpoint, track.cognitive))) {
        results.push(await continueCheckpoint(track));
      } else if (track.resume && (!track.cognitive || later(track.resume, track.cognitive)) && (!track.checkpoint || !later(track.checkpoint, track.resume))) {
        results.push(await bootstrapLegacyResume(track));
      } else if (track.cognitive && completedCognitive(track.cognitive)) {
        results.push(await continueCompletedTrack(track));
      }
    } catch (error) {
      results.push({ cycleId: track.cycleId, state: 'CONTINUATION_FAILED', error: error instanceof Error ? error.message : String(error) });
    }
  }

  return {
    ok: results.every((item) => row(item).state !== 'CONTINUATION_FAILED'),
    processed: results.length,
    requestedCycleId: requestedCycleId ?? null,
    results,
    schedulingPolicy: requestedCycleId
      ? 'TARGETED_SAME_CYCLE_RECOVERY'
      : 'FAIR_OLDEST_PROGRESS_FIRST_ROUND_ROBIN',
    rule: 'Same-cycle cognition, bounded synthesis recovery and RETURN ownership resolution are continued from durable state. No new Case, raw source reprocessing, RETURN fabrication, closure or learning promotion is performed.',
  };
}
