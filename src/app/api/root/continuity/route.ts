import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { readContinuityDashboard, runContinuityHeartbeat } from '@/lib/continuity/runtime';
import type { ContinuityMode } from '@/lib/continuity/contracts';
import { auditRootAction, requireRootActor } from '@/lib/root/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const modeSchema = z.object({
  action: z.enum(['set_mode', 'heartbeat', 'emergency_halt']),
  mode: z.enum(['NORMAL','FOUNDER_ABSENT_PREP','FOUNDER_ABSENT_ACTIVE','DEGRADED_SAFE','EMERGENCY_HALT','RECOVERY']).optional(),
  reason: z.string().trim().min(1).max(1000).optional(),
  expectedReturnAt: z.string().datetime().optional(),
});

const ALLOWED_TRANSITIONS: Record<ContinuityMode, ContinuityMode[]> = {
  NORMAL: ['FOUNDER_ABSENT_PREP', 'EMERGENCY_HALT'],
  FOUNDER_ABSENT_PREP: ['FOUNDER_ABSENT_ACTIVE', 'NORMAL', 'EMERGENCY_HALT'],
  FOUNDER_ABSENT_ACTIVE: ['DEGRADED_SAFE', 'RECOVERY', 'EMERGENCY_HALT'],
  DEGRADED_SAFE: ['FOUNDER_ABSENT_ACTIVE', 'RECOVERY', 'EMERGENCY_HALT'],
  EMERGENCY_HALT: ['RECOVERY'],
  RECOVERY: ['NORMAL', 'FOUNDER_ABSENT_PREP', 'EMERGENCY_HALT'],
};

export async function GET() {
  const gate = await requireRootActor('continuity.state.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  try {
    return NextResponse.json({ ok: true, ...(await readContinuityDashboard()) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'continuity_state_failed', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const gate = await requireRootActor('continuity.mutate');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  const parsed = modeSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'invalid_continuity_request', details: parsed.error.flatten() }, { status: 400 });

  if (parsed.data.action === 'heartbeat') {
    const result = await runContinuityHeartbeat('founder_manual');
    await auditRootAction({ actorId: gate.ctx.user.id, action: 'continuity.heartbeat.execute', target: result.runId, request, payload: { status: result.status } });
    return NextResponse.json({ ok: true, result });
  }

  const db = createServiceSupabaseClient();
  const { data: current, error } = await db.from('sfi_continuity_state').select('*').eq('id', 'institution').single();
  if (error || !current) return NextResponse.json({ ok: false, error: 'continuity_state_unavailable', details: error?.message }, { status: 503 });

  const nextMode: ContinuityMode = parsed.data.action === 'emergency_halt' ? 'EMERGENCY_HALT' : (parsed.data.mode as ContinuityMode);
  if (!nextMode) return NextResponse.json({ ok: false, error: 'mode_required' }, { status: 400 });
  const allowed = ALLOWED_TRANSITIONS[current.mode as ContinuityMode] ?? [];
  if (!allowed.includes(nextMode)) {
    return NextResponse.json({ ok: false, error: 'invalid_continuity_transition', from: current.mode, to: nextMode, allowed }, { status: 409 });
  }

  const now = new Date().toISOString();
  const patch = {
    mode: nextMode,
    founder_available: nextMode === 'NORMAL' || nextMode === 'FOUNDER_ABSENT_PREP' || nextMode === 'RECOVERY',
    activated_at: ['FOUNDER_ABSENT_ACTIVE','EMERGENCY_HALT'].includes(nextMode) ? now : current.activated_at,
    expected_return_at: parsed.data.expectedReturnAt ?? current.expected_return_at,
    halt_reason: nextMode === 'EMERGENCY_HALT' ? (parsed.data.reason ?? 'Founder emergency halt') : null,
    updated_at: now,
  };
  const update = await db.from('sfi_continuity_state').update(patch).eq('id', 'institution').select('*').single();
  if (update.error) return NextResponse.json({ ok: false, error: 'continuity_transition_failed', details: update.error.message }, { status: 500 });

  await auditRootAction({
    actorId: gate.ctx.user.id,
    action: 'continuity.mode.change',
    target: 'institution',
    request,
    payload: { from: current.mode, to: nextMode, reason: parsed.data.reason ?? null, expectedReturnAt: parsed.data.expectedReturnAt ?? null },
  });
  return NextResponse.json({ ok: true, state: update.data });
}
