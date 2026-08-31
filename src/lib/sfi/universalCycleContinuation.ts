import 'server-only';

import { appendEpistemicEvent } from '@/lib/events/eventStore';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { executeCognitiveCycle, SFI_UNIVERSAL_COGNITIVE_CHECKPOINT } from '@/lib/sfi/cognitive-runtime/cognitiveCycle';
import type { KernelContext } from '@/lib/sfi/cognitive-runtime/kernelContext';
import { hydrateUniversalCycleInput } from '@/lib/sfi/universalObservationHydrator';
import { synthesizeUniversalCycleWithAi } from '@/lib/sfi/universalAiSynthesis';
import { runUniversalCognitiveCycle, type UniversalCycleInput } from '@/lib/sfi/universalSignalCycle';

const SYSTEM_ACTOR = 'sfi_universal_continuation';
const EVENT_SCAN_LIMIT = 500;

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
  closed: LifecycleEvent | null;
};

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
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
      track = { cycleId: text(event.payload.cycleId)!, resume: null, checkpoint: null, cognitive: null, synthesis: null, closed: null };
      map.set(track.cycleId, track);
    }
    if (event.eventName === 'SFI_UNIVERSAL_CYCLE_RESUMED' && !track.resume) track.resume = event;
    else if (event.eventName === SFI_UNIVERSAL_COGNITIVE_CHECKPOINT && !track.checkpoint) track.checkpoint = event;
    else if (event.eventName === 'SFI_UNIVERSAL_COGNITIVE_CYCLE_EXECUTED' && !track.cognitive) track.cognitive = event;
    else if (event.eventName === 'SFI_UNIVERSAL_AI_SYNTHESIS_COMPLETED' && !track.synthesis) track.synthesis = event;
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
      kind: text(metadata.signalType) ?? 'unknown',
      name: text(metadata.objectKey),
      objectHash: text(metadata.objectHash),
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

async function synthesizeIfMissing(track: CycleTrack, context: KernelContext, completionEventId: string | null) {
  const latestCompletion = track.cognitive;
  const synthesisIsCurrent = latestCompletion && track.synthesis && later(track.synthesis, latestCompletion);
  if (synthesisIsCurrent) return { status: 'SYNTHESIS_ALREADY_CURRENT' as const, eventId: track.synthesis?.eventId ?? null };
  const refs = [track.resume?.eventId, track.checkpoint?.eventId, completionEventId].filter((item): item is string => Boolean(item));
  const synthesis = await synthesizeUniversalCycleWithAi(synthesisInput(context, refs));
  return { status: synthesis.status, eventId: synthesis.eventId };
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
      : await executeCognitiveCycle(context, { maxAgentsPerInvocation: 4, continuationSource: SYSTEM_ACTOR });
    if (result.completed) {
      const completion = await appendCognitiveCompletion(context, result, [track.resume?.eventId, track.checkpoint?.eventId].filter((item): item is string => Boolean(item)));
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

  const synthesis = await synthesizeIfMissing(track, effectiveContext, completionEventId);
  return {
    cycleId: track.cycleId,
    state: 'COGNITIVE_RUNTIME_COMPLETED' as const,
    completionEventId,
    synthesis,
    returnPlan: row(effectiveContext.metadata).returnPlan ?? null,
  };
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

export async function runUniversalCycleContinuation(input: { limit?: number } = {}) {
  const scan = await readTracks();
  if (!scan.ok) return { ok: false as const, processed: 0, results: [], error: scan.error };
  const limit = Math.max(1, Math.min(5, input.limit ?? 2));
  const candidates = scan.tracks
    .filter((track) => {
      if (track.closed && (!track.resume || later(track.closed, track.resume))) return false;
      const unfinishedCheckpoint = track.checkpoint && (!track.cognitive || later(track.checkpoint, track.cognitive) || !completedCognitive(track.cognitive));
      const legacyInterruptedResume = track.resume && (!track.cognitive || later(track.resume, track.cognitive)) && (!track.checkpoint || !later(track.checkpoint, track.resume));
      const synthesisMissing = track.cognitive && completedCognitive(track.cognitive) && (!track.synthesis || later(track.cognitive, track.synthesis));
      return Boolean(unfinishedCheckpoint || legacyInterruptedResume || synthesisMissing);
    })
    .sort((a, b) => Math.max(b.resume?.sequence ?? 0, b.checkpoint?.sequence ?? 0, b.cognitive?.sequence ?? 0) - Math.max(a.resume?.sequence ?? 0, a.checkpoint?.sequence ?? 0, a.cognitive?.sequence ?? 0))
    .slice(0, limit);

  const results: unknown[] = [];
  for (const track of candidates) {
    try {
      const checkpointIsUsable = track.checkpoint && (!track.resume || later(track.checkpoint, track.resume));
      if (checkpointIsUsable) results.push(await continueCheckpoint(track));
      else if (track.resume && (!track.cognitive || later(track.resume, track.cognitive))) results.push(await bootstrapLegacyResume(track));
      else if (track.cognitive && completedCognitive(track.cognitive)) {
        const context = checkpointContext(track.checkpoint);
        results.push(context
          ? { cycleId: track.cycleId, state: 'SYNTHESIS_RECOVERY', synthesis: await synthesizeIfMissing(track, context, track.cognitive.eventId) }
          : { cycleId: track.cycleId, state: 'SYNTHESIS_CONTEXT_UNAVAILABLE' });
      }
    } catch (error) {
      results.push({ cycleId: track.cycleId, state: 'CONTINUATION_FAILED', error: error instanceof Error ? error.message : String(error) });
    }
  }

  return {
    ok: results.every((item) => row(item).state !== 'CONTINUATION_FAILED'),
    processed: results.length,
    results,
    rule: 'Only unfinished same-cycle cognitive work is resumed. No new Case, raw source reprocessing, RETURN fabrication, closure or learning promotion is performed.',
  };
}
