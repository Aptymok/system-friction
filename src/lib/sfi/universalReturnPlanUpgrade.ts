import 'server-only';

import { appendEpistemicEvent } from '@/lib/events/eventStore';
import { SFI_UNIVERSAL_RETURN_PLAN_RECORDED, SFI_UNIVERSAL_COGNITIVE_CHECKPOINT } from '@/lib/sfi/cognitive-runtime/cognitiveCycle';
import type { KernelContext } from '@/lib/sfi/cognitive-runtime/kernelContext';
import {
  resolveUniversalReturnCapability,
  SFI_UNIVERSAL_RETURN_CAPABILITY_CONTRACT,
} from '@/lib/sfi/universalReturnCapabilityResolver';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

type Row = Record<string, unknown>;

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function needsAiUpgrade(plan: Row) {
  const state = text(plan.acquisitionState)?.toUpperCase();
  const capability = row(plan.capabilityResolution);
  const capabilityContract = text(capability.contract);
  return state === 'CAPABILITY_RESOLUTION_REQUIRED'
    || (Boolean(capabilityContract) && capabilityContract !== SFI_UNIVERSAL_RETURN_CAPABILITY_CONTRACT);
}

async function latestCheckpointContext(cycleId: string): Promise<KernelContext | null> {
  const db = createServiceSupabaseClient();
  const result = await db.from('epistemic_events')
    .select('payload')
    .eq('event_name', SFI_UNIVERSAL_COGNITIVE_CHECKPOINT)
    .eq('logbook_id', `universal-cycle:${cycleId}`)
    .order('sequence', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (result.error || !result.data) return null;
  const context = row(row(result.data.payload).context) as unknown as KernelContext;
  return context && context.cycleId === cycleId ? context : null;
}

export async function runUniversalReturnPlanUpgrade(input: { limit?: number; cycleId?: string } = {}) {
  const db = createServiceSupabaseClient();
  const result = await db.from('epistemic_events')
    .select('sequence,event_id,payload,logbook_id')
    .eq('event_name', SFI_UNIVERSAL_RETURN_PLAN_RECORDED)
    .order('sequence', { ascending: false })
    .limit(500);
  if (result.error) return { ok: false as const, processed: 0, results: [], error: result.error.message };

  const requestedCycleId = text(input.cycleId);
  const latestByCycle = new Map<string, Row>();
  for (const value of result.data ?? []) {
    const event = row(value);
    const payload = row(event.payload);
    const cycleId = text(payload.cycleId);
    if (!cycleId || latestByCycle.has(cycleId)) continue;
    latestByCycle.set(cycleId, event);
  }

  const candidates = [...latestByCycle.entries()]
    .filter(([cycleId]) => !requestedCycleId || cycleId === requestedCycleId)
    .filter(([, event]) => needsAiUpgrade(row(row(event.payload).plan)))
    .slice(0, Math.max(1, Math.min(10, input.limit ?? 4)));

  const results: Row[] = [];
  for (const [cycleId, event] of candidates) {
    const payload = row(event.payload);
    const plan = row(payload.plan);
    const context = await latestCheckpointContext(cycleId);
    if (!context) {
      results.push({ cycleId, state: 'RETURN_PLAN_CONTEXT_UNAVAILABLE', planEventId: text(event.event_id) });
      continue;
    }

    try {
      const capability = await resolveUniversalReturnCapability(plan, context);
      const resolvedPlan = {
        ...plan,
        contract: 'SFI-UNIVERSAL-RETURN-PLAN-1.1',
        acquisitionState: capability.decision,
        responsibility: capability.humanInputRequired ? 'ROOT_OR_AUTHORIZED_OPERATOR' : 'SFI',
        humanInputRequired: capability.humanInputRequired,
        requiredHumanInput: capability.requiredHumanInput,
        capabilityResolution: capability,
        resolvedAt: new Date().toISOString(),
        next: capability.decision === 'SFI_CAN_ACQUIRE'
          ? `Acquire the observation through ${capability.capabilityId}, persist an evidence-linked RETURN, then CONTRAST.`
          : 'Obtain only the minimum source/access/observation listed in requiredHumanInput, persist an evidence-linked RETURN, then CONTRAST.',
      };
      const supersededEventId = text(event.event_id);
      const appended = await appendEpistemicEvent({
        eventName: SFI_UNIVERSAL_RETURN_PLAN_RECORDED,
        epistemicClass: 'derived',
        confidence: 1,
        occurredAt: new Date().toISOString(),
        source: { sourceId: 'sfi_universal_return_plan_upgrade', sourceType: 'ai_governed_return_capability_upgrade' },
        logbookId: `universal-cycle:${cycleId}`,
        lineage: [cycleId, supersededEventId].filter((item): item is string => Boolean(item)),
        payload: {
          cycleId,
          taskId: text(payload.taskId) ?? context.taskId ?? null,
          plan: resolvedPlan,
          supersedesReturnPlanEventId: supersededEventId,
          canonicalPromotionAllowed: false,
          migration: 'LEGACY_HEURISTIC_OR_UNRESOLVED_PLAN_TO_AI_GOVERNED_VALIDATED_1_1',
          epistemicBoundary: 'This migration changes execution ownership metadata only. It cannot create RETURN, evidence acceptance, CONTRAST, closure, learning or canon.',
        },
      });
      results.push({
        cycleId,
        state: appended.ok ? 'RETURN_PLAN_AI_UPGRADED' : 'RETURN_PLAN_AI_UPGRADE_PERSIST_FAILED',
        previousEventId: supersededEventId,
        eventId: appended.ok ? String(appended.data.event_id ?? '') : null,
        acquisitionState: capability.decision,
        humanInputRequired: capability.humanInputRequired,
        capabilityId: capability.capabilityId,
        provider: capability.provider,
        model: capability.model,
        error: appended.ok ? null : appended.error,
      });
    } catch (error) {
      results.push({ cycleId, state: 'RETURN_PLAN_AI_UPGRADE_FAILED', error: error instanceof Error ? error.message : String(error) });
    }
  }

  return {
    ok: results.every((item) => !String(item.state ?? '').endsWith('_FAILED') && item.state !== 'RETURN_PLAN_AI_UPGRADE_PERSIST_FAILED'),
    processed: results.length,
    requestedCycleId: requestedCycleId ?? null,
    results,
    rule: 'Legacy capability routing is superseded by AI-governed selection constrained to the declared SFI capability inventory. No observation or RETURN is created by this upgrade.',
  };
}
