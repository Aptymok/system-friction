import { NextResponse } from 'next/server';
import { classifyProposalDecisionBoundary, isRootDecisionClass } from '@/lib/governance/rootDecisionBoundary';
import { decideActionProposal, normalizeProposalState } from '@/lib/governance/proposalLifecycle';
import { auditRootAction, requireRootActor } from '@/lib/root/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Row = Record<string, unknown>;
function text(value: unknown, fallback = '') { return typeof value === 'string' && value.trim() ? value.trim() : fallback; }

function normalizeDecisionClass(value: unknown) {
  const candidate = text(value).toUpperCase().replaceAll('-', '_').replaceAll(' ', '_');
  return isRootDecisionClass(candidate) ? candidate : null;
}

function founderRuleDecisionClass(row: Row) {
  return normalizeDecisionClass(row.root_decision_class ?? row.decision_class ?? row.decision_kind);
}

async function readQueue(service: any) {
  const [proposals, decisions] = await Promise.all([
    service.from('action_proposals').select('*').order('created_at', { ascending: false }).limit(160),
    service.from('sfi_cognitive_twin_decisions').select('*').order('created_at', { ascending: false }).limit(100),
  ]);

  const proposalRows = (proposals.data ?? []).filter((row: Row) => {
    const state = normalizeProposalState(row.status);
    return ['proposed', 'conflicted'].includes(state)
      && classifyProposalDecisionBoundary(row) !== 'OPERATIONAL_WORK';
  }).map((row: Row) => ({ ...row, rootDecisionClass: classifyProposalDecisionBoundary(row) }));

  const founderRules = (decisions.data ?? []).filter((row: Row) => {
    const state = text(row.status).toUpperCase();
    return state === 'CANDIDATE' && Boolean(founderRuleDecisionClass(row));
  }).map((row: Row) => ({ ...row, rootDecisionClass: founderRuleDecisionClass(row) }));

  return {
    proposals: proposalRows,
    founderRules,
    reports: [],
    fdre: [],
    operationalReview: {
      reportsAreSovereignDecisions: false,
      evidenceClassificationIsSovereignDecision: false,
      routineClosureIsSovereignDecision: false,
      executionWithinExistingAuthorityIsSovereignDecision: false,
      learningCandidateCaptureIsSovereignDecision: false,
      note: 'Operational objects remain observable outside the sovereign decision queue. Learning promotion uses the dedicated learning quarantine decision surface.',
    },
    warnings: [proposals.error?.message, decisions.error?.message].filter(Boolean),
  };
}

export async function GET() {
  const gate = await requireRootActor('founder_decision_queue.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  return NextResponse.json({ ok: true, queue: await readQueue(gate.ctx.service) }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const gate = await requireRootActor('founder_decision_queue.decide');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  const body = await request.json().catch(() => ({})) as Row;
  const kind = text(body.kind);
  const id = text(body.id);
  const decision = text(body.decision).toLowerCase();
  const note = text(body.note) || null;
  if (!kind || !id || !['accept','deny'].includes(decision)) {
    return NextResponse.json({
      ok: false,
      error: 'invalid_decision',
      allowed: ['accept', 'deny'],
      details: 'ROOT decides the institutional change. Evidence acquisition and classification remain SFI-owned work.',
    }, { status: 400 });
  }

  let write: any = null;
  let decisionClass: string | null = null;

  if (kind === 'proposal') {
    const current = await gate.ctx.service.from('action_proposals').select('*').eq('id', id).single();
    if (current.error || !current.data) return NextResponse.json({ ok: false, error: current.error?.message ?? 'proposal_not_found' }, { status: 404 });
    decisionClass = classifyProposalDecisionBoundary(current.data as Row);
    if (decisionClass === 'OPERATIONAL_WORK') {
      return NextResponse.json({
        ok: false,
        error: 'operational_work_is_not_a_root_decision',
        details: 'Este objeto debe continuar dentro de la autoridad operativa existente. ROOT no acepta ni rechaza trabajo rutinario.',
      }, { status: 409 });
    }
    write = await decideActionProposal({
      proposalId: id,
      actorId: gate.ctx.user.id,
      decision: decision as 'accept' | 'deny',
      note,
      currentRow: current.data as Row,
    });
    if (!write.ok) return NextResponse.json(write, { status: 409 });
  } else if (kind === 'founder_rule') {
    const current = await gate.ctx.service.from('sfi_cognitive_twin_decisions').select('*').eq('id', id).single();
    if (current.error || !current.data) return NextResponse.json({ ok: false, error: current.error?.message ?? 'founder_rule_not_found' }, { status: 404 });
    decisionClass = founderRuleDecisionClass(current.data as Row);
    if (!decisionClass) {
      return NextResponse.json({ ok: false, error: 'founder_rule_missing_sovereign_decision_class' }, { status: 409 });
    }
    const status = decision === 'accept' ? 'APPROVED' : 'REJECTED';
    write = await gate.ctx.service.from('sfi_cognitive_twin_decisions').update({
      status,
      approved_by: decision === 'accept' ? gate.ctx.user.id : null,
      approved_at: decision === 'accept' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq('id', id).select('*').single();
  } else if (kind === 'report') {
    return NextResponse.json({
      ok: false,
      error: 'report_is_not_a_sovereign_decision',
      details: 'Un reporte puede existir, leerse y usarse bajo su autoridad vigente sin aprobación ROOT. Publicación/canon/acción externa son decisiones separadas si cambian autoridad.',
    }, { status: 409 });
  } else if (kind === 'fdre') {
    return NextResponse.json({
      ok: false,
      error: 'candidate_capture_is_not_a_sovereign_decision',
      details: 'Capturar/revisar un candidato no exige ROOT. Sólo una promoción explícita a aprendizaje institucional puede entrar a la cola soberana.',
    }, { status: 409 });
  }

  if (!write) return NextResponse.json({ ok: false, error: 'unknown_decision_kind' }, { status: 400 });
  if (write.error) return NextResponse.json({ ok: false, error: 'decision_write_failed', details: write.error.message }, { status: 500 });
  const audit = await auditRootAction({
    actorId: gate.ctx.user.id,
    action: `founder_decision_queue.${decision}`,
    target: `${kind}:${id}`,
    payload: { kind, id, decision, note, decisionClass },
    request,
  });
  if (!audit.ok) return NextResponse.json(audit, { status: 500 });
  return NextResponse.json({ ok: true, decisionClass, decision: write.data ?? write, audit });
}
