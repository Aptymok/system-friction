import crypto from 'crypto';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export type GovernanceStatus = 'active' | 'blind' | 'degraded';

export type GovernanceRuntimeState = {
  governanceKey: 'SFI_ROOT';
  status: GovernanceStatus;
  blindMode: boolean;
  acpLastSeenAt: string | null;
  acpTimeoutHours: number;
  acpExpired: boolean;
  sourceState: 'observed' | 'inferred' | 'missing';
  eventId: string | null;
  warning: string | null;
};

type EpistemicEventRow = {
  id: string;
  event_id: string;
  event_name: string;
  logbook_id: string;
  epistemic_class: string;
  confidence: number | string | null;
  payload: Record<string, unknown> | null;
  occurred_at: string | null;
  created_at: string;
};

const GOVERNANCE_KEY = 'SFI_ROOT' as const;
const DEFAULT_ACP_TIMEOUT_HOURS = 48;
const SCHEMA_VERSION = '2026-05-27.sfi-governance-d1';

function nowIso() {
  return new Date().toISOString();
}

function hashPayload(payload: unknown) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function hoursSince(iso: string | null, now: Date) {
  if (!iso) return Number.POSITIVE_INFINITY;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return Number.POSITIVE_INFINITY;
  return (now.getTime() - t) / 36e5;
}

function stateFromEvent(row: EpistemicEventRow | null): GovernanceRuntimeState {
  const now = new Date();
  const payload = row?.payload ?? {};
  const acpTimeoutHours = Number(payload.acpTimeoutHours ?? DEFAULT_ACP_TIMEOUT_HOURS);
  const acpLastSeenAt = typeof payload.acpLastSeenAt === 'string'
    ? payload.acpLastSeenAt
    : row?.occurred_at ?? row?.created_at ?? null;
  const acpExpired = hoursSince(acpLastSeenAt, now) > acpTimeoutHours;
  const forcedBlind = payload.blindMode === true || row?.event_name === 'governance.blind_mode.entered';
  const blindMode = forcedBlind || acpExpired;
  const status: GovernanceStatus = blindMode ? 'blind' : row ? 'active' : 'degraded';

  return {
    governanceKey: GOVERNANCE_KEY,
    status,
    blindMode,
    acpLastSeenAt,
    acpTimeoutHours,
    acpExpired,
    sourceState: row ? 'observed' : 'missing',
    eventId: row?.id ?? null,
    warning: row ? null : 'governance_event_missing',
  };
}

export async function readGovernanceRuntime(): Promise<GovernanceRuntimeState> {
  const service = createServiceSupabaseClient();
  const { data, error } = await service
    .from('epistemic_events')
    .select('id,event_id,event_name,logbook_id,epistemic_class,confidence,payload,occurred_at,created_at')
    .in('event_name', ['governance.acp.seen', 'governance.blind_mode.entered', 'governance.acp.returned'])
    .eq('logbook_id', 'BR')
    .order('occurred_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return {
      governanceKey: GOVERNANCE_KEY,
      status: 'degraded',
      blindMode: true,
      acpLastSeenAt: null,
      acpTimeoutHours: DEFAULT_ACP_TIMEOUT_HOURS,
      acpExpired: true,
      sourceState: 'missing',
      eventId: null,
      warning: `governance_read_failed:${error.message}`,
    };
  }

  return stateFromEvent(data as EpistemicEventRow | null);
}

export async function recordAcpSeen(actorId: string | null, actorEmail: string | null) {
  const service = createServiceSupabaseClient();
  const previous = await readGovernanceRuntime();
  const occurredAt = nowIso();
  const eventId = `governance:acp:seen:${occurredAt}`;
  const payload = {
    governanceKey: GOVERNANCE_KEY,
    acpLastSeenAt: occurredAt,
    acpTimeoutHours: DEFAULT_ACP_TIMEOUT_HOURS,
    blindMode: false,
    actorEmail,
    previous,
  };
  const checksum = hashPayload(payload);

  const { data: event, error: eventError } = await service
    .from('epistemic_events')
    .insert({
      event_id: eventId,
      event_name: previous.blindMode ? 'governance.acp.returned' : 'governance.acp.seen',
      logbook_id: 'BR',
      epistemic_class: 'observed',
      schema_version: SCHEMA_VERSION,
      source: { sourceId: 'SFI_RUNTIME', sourceType: 'governance' },
      actor_id: actorId,
      node_id: null,
      confidence: 1,
      payload,
      checksum,
      lineage: previous.eventId ? [previous.eventId] : [],
      uncertainty: null,
      occurred_at: occurredAt,
    })
    .select('id')
    .single();

  if (eventError) {
    return { ok: false as const, error: 'governance_event_insert_failed', details: eventError.message };
  }

  const nextState = stateFromEvent({
    id: event.id,
    event_id: eventId,
    event_name: previous.blindMode ? 'governance.acp.returned' : 'governance.acp.seen',
    logbook_id: 'BR',
    epistemic_class: 'observed',
    confidence: 1,
    payload,
    occurred_at: occurredAt,
    created_at: occurredAt,
  });

  if (previous.status !== nextState.status || previous.blindMode !== nextState.blindMode) {
    await service.from('logbook_regime').insert({
      event_id: event.id,
      regime_key: GOVERNANCE_KEY,
      previous_state: previous.status,
      next_state: nextState.status,
      phi_campo: null,
      causal_factor: previous.blindMode ? 'ACP_RETURNED' : 'ACP_SEEN',
      payload: { previous, next: nextState },
    });
  }

  return { ok: true as const, data: nextState };
}
