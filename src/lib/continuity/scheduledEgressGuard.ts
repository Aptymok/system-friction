import { isSfiContinuityConfigured } from '@/lib/sfi/continuityPostgres';
import { NextResponse } from 'next/server';

export const SFI_SCHEDULED_EGRESS_GUARD_CONTRACT = 'SFI-SCHEDULED-EGRESS-GUARD-1.0' as const;

export function scheduledEgressEnabled() {
  return (process.env.SFI_SCHEDULED_EGRESS_MODE ?? 'restricted').trim().toLowerCase() === 'enabled';
}

export function scheduledEgressGuardResponse(input: { allowContinuityFallback?: boolean; authorizedManualOverride?: boolean } = {}) {
  if (scheduledEgressEnabled()) return null;
  if (input.authorizedManualOverride === true) return null;
  if (input.allowContinuityFallback && isSfiContinuityConfigured()) return null;
  return NextResponse.json({
    ok: true,
    status: 'EGRESS_RESTRICTED',
    contract: SFI_SCHEDULED_EGRESS_GUARD_CONTRACT,
    reason: 'SFI_SCHEDULED_EGRESS_MODE_NOT_ENABLED',
    writesPerformed: false,
    boundary: 'Scheduled Supabase-backed automation fails closed by default. Re-enabling requires an explicit runtime setting; no scheduled observation, persistence, RETURN, learning, or mutation is inferred while restricted.',
  }, {
    status: 200,
    headers: { 'Cache-Control': 'no-store' },
  });
}
