import { NextResponse } from 'next/server';
import { requireRootActor } from '@/lib/root/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { runMophAgent } from '@/lib/agents/sfiAgents';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_BODY_BYTES = 8_192;

export async function POST(request: Request) {
  // The agent reads service-role institutional memory and can invoke a paid LLM.
  // Restrict this legacy endpoint to ROOT until a tenant-isolated public mode exists.
  const gate = await requireRootActor('root.moph.agent.run');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const length = Number(request.headers.get('content-length'));
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: 'moph_input_too_large' }, { status: 413 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }
  const payload = body as Record<string, unknown>;
  if (JSON.stringify(payload).length > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: 'moph_input_too_large' }, { status: 413 });
  }

  const stuckSystem = typeof payload.stuckSystem === 'string' ? payload.stuckSystem.trim() : '';
  if (stuckSystem.length < 12 || stuckSystem.length > 4_000) {
    return NextResponse.json({ ok: false, error: 'stuck_system_length_invalid' }, { status: 400 });
  }

  // Reuse the existing *global request-admission* counter, shared with /api/ai.
  // This is a request-count ceiling, not a measured USD spending limit.
  let admission: Record<string, unknown> | null = null;
  try {
    const receipt = await createServiceSupabaseClient()
      .rpc('sfi_admit_legacy_ai_request_v1', { p_actor_id: gate.ctx.user.id });
    if (receipt.error || !receipt.data || typeof receipt.data !== 'object' || Array.isArray(receipt.data)) {
      return NextResponse.json({ ok: false, error: 'ai_shared_budget_unavailable' }, { status: 503 });
    }
    admission = receipt.data as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: 'ai_shared_budget_unavailable' }, { status: 503 });
  }
  if (admission.admitted !== true) {
    if (admission.reason === 'GLOBAL_DAILY_QUOTA_REACHED' || admission.reason === 'ACTOR_MINUTE_QUOTA_REACHED') {
      return NextResponse.json({ ok: false, error: 'ai_shared_quota_exceeded', reason: admission.reason }, { status: 429 });
    }
    return NextResponse.json({ ok: false, error: 'ai_shared_budget_unavailable' }, { status: 503 });
  }

  const result = await runMophAgent({
    stuckSystem,
    objective: typeof payload.objective === 'string' ? payload.objective.slice(0, 1_500) : undefined,
    attempts: typeof payload.attempts === 'string' ? payload.attempts.slice(0, 1_500) : undefined,
    evidence: typeof payload.evidence === 'string' ? payload.evidence.slice(0, 1_500) : undefined,
    consequence: typeof payload.consequence === 'string' ? payload.consequence.slice(0, 1_500) : undefined,
    accountId: gate.ctx.user.id,
  });

  return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
}
