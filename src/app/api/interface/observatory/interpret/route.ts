import { NextResponse } from 'next/server';
import { AccessDeniedError, requireAuthenticatedUser } from '@/lib/system/access/server';
import { runMophAgent } from '@/lib/agents/sfiAgents';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(request: Request) {
  try {
    const { user } = await requireAuthenticatedUser();
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const caseId = text(body.caseId);
    const selectedTitle = text(body.selectedTitle);
    const selectedSummary = text(body.selectedSummary);
    if (!caseId) return NextResponse.json({ ok: false, error: 'case_required' }, { status: 400 });

    const service = createServiceSupabaseClient();
    const [{ data: fieldCase }, { data: attractor }, { data: recentEvidence }] = await Promise.all([
      service.from('field_cases').select('id,title,description,status').eq('id', caseId).eq('owner_id', user.id).is('deleted_at', null).single(),
      service.from('sfi_user_attractors').select('label,summary,objective,direction,confidence,perturbation').eq('case_id', caseId).eq('owner_id', user.id).eq('status', 'DECLARED').maybeSingle(),
      service.from('field_case_evidence').select('label,source,reliability,payload,observed_at').eq('case_id', caseId).eq('owner_id', user.id).order('observed_at', { ascending: false }).limit(8),
    ]);

    if (!fieldCase || !attractor) return NextResponse.json({ ok: false, error: 'case_context_unavailable' }, { status: 404 });

    const evidence = (recentEvidence ?? []).map((item) => {
      const payload = item.payload && typeof item.payload === 'object' ? item.payload as Record<string, unknown> : {};
      return [item.label, item.source, payload.note, item.observed_at].filter(Boolean).join(' · ');
    }).join('\n');

    const result = await runMophAgent({
      stuckSystem: [fieldCase.title, fieldCase.description, attractor.summary, selectedTitle, selectedSummary].filter(Boolean).join('\n'),
      objective: attractor.objective,
      attempts: `Dirección observada: ${attractor.direction}`,
      evidence,
      consequence: 'La interpretación se utilizará para elegir una microejecución reversible dentro del observatorio personal.',
      accountId: user.id,
    });

    return NextResponse.json({
      ok: true,
      reading: result.user_friendly_explanation,
      frictionReading: result.friction_reading,
      conversionBreak: result.conversion_break,
      proposedMicroExecution: result.minimal_perturbation,
      nextAction: result.next_action,
      confidence: result.confidence,
      risk: result.risk,
      provider: result.provider,
      warnings: result.warnings,
      persisted: false,
    });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return NextResponse.json({ ok: false, error: error.code }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'field_interpretation_failed' }, { status: 500 });
  }
}
