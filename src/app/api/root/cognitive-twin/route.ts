import { NextResponse } from 'next/server';
import { requireRootActor, auditRootAction } from '@/lib/root/server';
import { readCognitiveTwinState } from '@/core/cognitive-twin/readState';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function compactTimestamp(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`;
}

export async function GET() {
  const gate = await requireRootActor('root.cognitive-twin.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  return NextResponse.json({ ok: true, state: await readCognitiveTwinState() }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const gate = await requireRootActor('root.cognitive-twin.decision-candidate.create');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });

  const situation = typeof body.situation === 'string' ? body.situation.trim() : '';
  const generalRule = typeof body.generalRule === 'string' ? body.generalRule.trim() : '';
  if (!situation || !generalRule) {
    return NextResponse.json({ ok: false, error: 'situation_and_generalRule_required' }, { status: 400 });
  }

  const requiredEvidence = Array.isArray(body.requiredEvidence)
    ? body.requiredEvidence.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim())
    : [];
  const evidenceRefs = Array.isArray(body.evidenceRefs)
    ? body.evidenceRefs.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim())
    : [];

  const db = createServiceSupabaseClient();
  const decisionId = `APT-DECISION-${compactTimestamp()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
  const result = await db.from('sfi_cognitive_twin_decisions').insert({
    decision_id: decisionId,
    situation,
    rejected_condition: typeof body.rejectedCondition === 'string' ? body.rejectedCondition.trim() || null : null,
    correct_state: typeof body.correctState === 'string' ? body.correctState.trim() || null : null,
    general_rule: generalRule,
    required_evidence: requiredEvidence,
    evidence_refs: evidenceRefs,
    status: 'CANDIDATE',
    created_by: gate.ctx.user.id,
  }).select('*').single();

  if (result.error) return NextResponse.json({ ok: false, error: 'decision_candidate_insert_failed', details: result.error.message }, { status: 503 });

  const audit = await auditRootAction({
    actorId: gate.ctx.user.id,
    action: 'root.cognitive-twin.decision-candidate.create',
    target: decisionId,
    payload: { decisionId, evidenceRefs, requiredEvidence },
    request,
  });

  return NextResponse.json({ ok: true, decision: result.data, audit });
}
