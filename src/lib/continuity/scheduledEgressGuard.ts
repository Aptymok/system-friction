import { isSfiContinuityConfigured } from '@/lib/sfi/continuityPostgres';
import { NextResponse } from 'next/server';

export const SFI_SCHEDULED_EGRESS_GUARD_CONTRACT = 'SFI-SCHEDULED-EGRESS-GUARD-1.1' as const;

export type ScheduledEgressLane = 'GENERAL' | 'WORLD_OBSERVATION';

export function scheduledEgressEnabled() {
  return (process.env.SFI_SCHEDULED_EGRESS_MODE ?? 'restricted').trim().toLowerCase() === 'enabled';
}

export function worldObservationScheduledEnabled() {
  return (process.env.SFI_WORLD_OBSERVATION_MODE ?? 'enabled').trim().toLowerCase() !== 'disabled';
}

export function scheduledEgressGuardResponse(input: {
  allowContinuityFallback?: boolean;
  authorizedManualOverride?: boolean;
  lane?: ScheduledEgressLane;
} = {}) {
  const lane = input.lane ?? 'GENERAL';

  // World observation is intentionally decoupled from the general Supabase automation
  // cost circuit. The daily World lane is bounded by its collectors/row limits and is
  // enabled unless it is explicitly disabled. This permission does not propagate to
  // institutional cycles, predictive runs, reports, publication or other cron writers.
  if (lane === 'WORLD_OBSERVATION' && worldObservationScheduledEnabled()) return null;

  if (scheduledEgressEnabled()) return null;
  if (input.authorizedManualOverride === true) return null;
  if (input.allowContinuityFallback && isSfiContinuityConfigured()) return null;

  const worldDisabled = lane === 'WORLD_OBSERVATION';
  return NextResponse.json({
    ok: true,
    status: worldDisabled ? 'WORLD_OBSERVATION_DISABLED' : 'EGRESS_RESTRICTED',
    contract: SFI_SCHEDULED_EGRESS_GUARD_CONTRACT,
    lane,
    reason: worldDisabled ? 'SFI_WORLD_OBSERVATION_MODE_DISABLED' : 'SFI_SCHEDULED_EGRESS_MODE_NOT_ENABLED',
    writesPerformed: false,
    boundary: worldDisabled
      ? 'World observation is independently bounded and was explicitly disabled. No observation or downstream World/Jr persistence is inferred.'
      : 'General scheduled Supabase-backed automation fails closed by default. The independently bounded World observation lane does not enable any other scheduled persistence, RETURN, learning, publication or mutation.',
  }, {
    status: 200,
    headers: { 'Cache-Control': 'no-store' },
  });
}
