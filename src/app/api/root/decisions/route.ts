import { NextResponse } from 'next/server';
import { decideActionProposal, normalizeProposalState } from '@/lib/governance/proposalLifecycle';
import { auditRootAction, requireRootActor } from '@/lib/root/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Row = Record<string, unknown>;
function text(value: unknown, fallback = '') { return typeof value === 'string' && value.trim() ? value.trim() : fallback; }
function rec(value: unknown): Row { return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}; }
function strings(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []; }

function canonicalFdreRow(value: unknown) {
  const row = rec(value);
  const raw = rec(rec(row.memory_delta).raw);
  const content = rec(raw.content);
  return {
    id: String(row.id ?? ''),
    memory_key: text(raw.memoryKey),
    status: text(content.memoryStatus, text(content.status, text(content.lifecycleStatus, 'CANDIDATE'))),
    content,
    evidence_refs: strings(raw.evidenceRefs),
    created_by: raw.createdBy ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.created_at ?? null,
  };
}

async function readQueue(service: any) {
  const [proposals, decisions, runs, fdre] = await Promise.all([
    service.from('action_proposals').select('*').order('created_at', { ascending: false }).limit(100),
    service.from('sfi_cognitive_twin_decisions').select('*').order('created_at', { ascending: false }).limit(100),
    service.from('sfi_cognitive_twin_runs').select('id,task_id,status,objective,input_snapshot,output_envelope,evidence_refs,limitations,provider,model,role,created_at').eq('role', 'report_agent').order('created_at', { ascending: false }).limit(100),
    service.from('sfi_amv_memory')
      .select('id,module,memory_delta,created_at')
      .eq('module', 'institutionalEventPipeline')
      .like('memory_delta->raw->>memoryKey', 'FDRE:%')
      .order('created_at', { ascending: false }).limit(250),
  ]);
  const reportRows = (runs.data ?? []).filter((row: Row) => {
    const approval = rec(rec(row.output_envelope).approval_queue);
    return ['queued_for_approval','waiting_evidence'].includes(text(approval.status).toLowerCase());
  });
  const proposalRows = (proposals.data ?? []).filter((row: Row) => {
    const state = normalizeProposalState(row.status);
    return ['proposed', 'waiting_evidence', 'conflicted'].includes(state) && row.approval_required !== false;
  });
  const decisionRows = (decisions.data ?? []).filter((row: Row) => ['CANDIDATE','WAITING_EVIDENCE'].includes(text(row.status).toUpperCase()));
  const latestFdre = new Map<string, ReturnType<typeof canonicalFdreRow>>();
  for (const item of [...(fdre.data ?? [])].reverse()) {
    const normalized = canonicalFdreRow(item);
    if (normalized.memory_key) latestFdre.set(normalized.memory_key, normalized);
  }
  const fdreRows = [...latestFdre.values()].filter((row) => {
    const lifecycle = text(rec(row.content).lifecycleStatus, 'CAPTURED');
    return !['INSTITUTIONALIZED','FOUNDER_RESERVED','REJECTED','OBSOLETE'].includes(lifecycle);
  });
  return {
    proposals: proposalRows,
    founderRules: decisionRows,
    reports: reportRows,
    fdre: fdreRows,
    warnings: [proposals.error?.message, decisions.error?.message, runs.error?.message, fdre.error?.message].filter(Boolean),
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
  if (!kind || !id || !['accept','deny','request_evidence'].includes(decision)) return NextResponse.json({ ok: false, error: 'invalid_decision' }, { status: 400 });

  let write: any = null;
  if (kind === 'proposal') {
    const current = await gate.ctx.service.from('action_proposals').select('*').eq('id', id).single();
    if (current.error || !current.data) return NextResponse.json({ ok: false, error: current.error?.message ?? 'proposal_not_found' }, { status: 404 });
    write = await decideActionProposal({ proposalId: id, actorId: gate.ctx.user.id, decision: decision as 'accept' | 'deny' | 'request_evidence', note, currentRow: current.data as Row });
    if (!write.ok) return NextResponse.json(write, { status: 409 });
  } else if (kind === 'founder_rule') {
    const status = decision === 'accept' ? 'APPROVED' : decision === 'deny' ? 'REJECTED' : 'WAITING_EVIDENCE';
    write = await gate.ctx.service.from('sfi_cognitive_twin_decisions').update({ status, approved_by: decision === 'accept' ? gate.ctx.user.id : null, approved_at: decision === 'accept' ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq('id', id).select('*').single();
  } else if (kind === 'report') {
    const current = await gate.ctx.service.from('sfi_cognitive_twin_runs').select('*').eq('id', id).single();
    if (current.error || !current.data) return NextResponse.json({ ok: false, error: current.error?.message ?? 'report_not_found' }, { status: 404 });
    const envelope = rec(current.data.output_envelope);
    const approval = rec(envelope.approval_queue);
    const approvalStatus = decision === 'accept' ? 'approved_for_human_use' : decision === 'deny' ? 'rejected' : 'waiting_evidence';
    const nextEnvelope = { ...envelope, approval_queue: { ...approval, status: approvalStatus, founderDecision: decision, founderNote: note, decidedAt: new Date().toISOString(), decidedBy: gate.ctx.user.id, executionBoundary: 'Approval does not publish, contact, execute or make the report true.' } };
    write = await gate.ctx.service.from('sfi_cognitive_twin_runs').update({ status: decision === 'accept' ? 'APPROVED' : decision === 'deny' ? 'REJECTED' : 'WAITING_EVIDENCE', output_envelope: nextEnvelope }).eq('id', id).select('*').single();
  } else if (kind === 'fdre') {
    return NextResponse.json({ ok: false, error: 'fdre_requires_contextual_review', details: 'FDRE transfer decisions require transferClass + lifecycle review in /root/institutionalization; a one-click accept would overstate institutionalization.' }, { status: 409 });
  }

  if (!write) return NextResponse.json({ ok: false, error: 'unknown_decision_kind' }, { status: 400 });
  if (write.error) return NextResponse.json({ ok: false, error: 'decision_write_failed', details: write.error.message }, { status: 500 });
  const audit = await auditRootAction({ actorId: gate.ctx.user.id, action: `founder_decision_queue.${decision}`, target: `${kind}:${id}`, payload: { kind, id, decision, note }, request });
  if (!audit.ok) return NextResponse.json(audit, { status: 500 });
  return NextResponse.json({ ok: true, decision: write.data ?? write, audit });
}
