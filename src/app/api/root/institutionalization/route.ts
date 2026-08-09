import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { auditRootAction, requireRootActor, requireRootContributor, requireRootViewer } from '@/lib/root/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const TRANSFER_CLASSES = new Set(['TRANSFERIBLE','CONTEXTUAL','EXPERIMENTAL','PERSONAL','FOUNDER_RESERVED','OBSOLETE']);
const LIFECYCLE = new Set(['CAPTURED','EXTRACTED','UNDER_TEST','REPRODUCIBLE','INSTITUTIONALIZED','FOUNDER_RESERVED','REJECTED','OBSOLETE','UNRESOLVED']);
const REPLAY_OUTCOMES = new Set(['REQUIRES_FOUNDER','RESOLVED_WITHOUT_FOUNDER','INCONCLUSIVE']);
const DIMENSIONS = ['CONTINUITY','METHOD','MEMORY','ROLES','AUTHORITY','REPRODUCIBILITY','CORRECTION','EXTERNAL_RECOGNITION'] as const;

type Row = Record<string, unknown>;
function rec(value: unknown): Row { return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}; }
function str(value: unknown) { return typeof value === 'string' && value.trim() ? value.trim() : null; }
function strs(value: unknown) { return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && Boolean(v.trim())).map(v => v.trim()) : []; }
function bool(value: unknown) { return value === true ? true : value === false ? false : null; }

function normalizeEvent(row: Row) {
  const content = rec(row.content);
  return {
    id: String(row.id ?? ''),
    memoryKey: String(row.memory_key ?? ''),
    memoryStatus: String(row.status ?? 'CANDIDATE'),
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
    createdBy: row.created_by ?? null,
    evidenceRefs: strs(row.evidence_refs),
    ...content,
  };
}

function buildSummary(events: Row[]) {
  const lifecycle = (event: Row) => String(event.lifecycleStatus ?? 'CAPTURED');
  const transfer = (event: Row) => String(event.transferClass ?? 'UNRESOLVED');
  const transferCandidates = events.filter(e => ['TRANSFERIBLE','CONTEXTUAL','EXPERIMENTAL'].includes(transfer(e)) && !['INSTITUTIONALIZED','FOUNDER_RESERVED','REJECTED','OBSOLETE'].includes(lifecycle(e))).length;
  const underTest = events.filter(e => ['UNDER_TEST','REPRODUCIBLE'].includes(lifecycle(e))).length;
  const institutionalized = events.filter(e => lifecycle(e) === 'INSTITUTIONALIZED').length;
  const founderReserved = events.filter(e => lifecycle(e) === 'FOUNDER_RESERVED' || transfer(e) === 'FOUNDER_RESERVED').length;
  const unresolved = events.filter(e => ['CAPTURED','EXTRACTED','UNRESOLVED'].includes(lifecycle(e))).length;

  const replayed = events.map(e => rec(e.counterfactualReplay)).filter(r => REPLAY_OUTCOMES.has(String(r.outcome ?? '')));
  const resolvedReplay = replayed.filter(r => ['REQUIRES_FOUNDER','RESOLVED_WITHOUT_FOUNDER'].includes(String(r.outcome))).length;
  const requiresFounder = replayed.filter(r => r.outcome === 'REQUIRES_FOUNDER').length;
  const founderDependency = resolvedReplay ? requiresFounder / resolvedReplay : null;

  const vector = DIMENSIONS.map(dimension => {
    const related = events.filter(e => strs(e.institutionalDimensions).includes(dimension));
    let status = 'MISSING';
    if (related.some(e => lifecycle(e) === 'INSTITUTIONALIZED')) status = 'INSTITUTIONALIZED';
    else if (related.some(e => ['UNDER_TEST','REPRODUCIBLE'].includes(lifecycle(e)))) status = 'UNDER_TEST';
    else if (related.length) status = 'CANDIDATE';
    return { dimension, status, eventCount: related.length };
  });

  return { total: events.length, transferCandidates, underTest, institutionalized, founderReserved, unresolved, replayed: replayed.length, founderDependency, vector };
}

async function readState(service: any) {
  const [memory, decisions, experiment] = await Promise.all([
    service.from('sfi_cognitive_twin_memory')
      .select('id,memory_key,memory_type,status,content,evidence_refs,source_kind,source_ref,created_by,created_at,updated_at')
      .eq('memory_type', 'DECISION')
      .like('memory_key', 'FDRE:%')
      .order('created_at', { ascending: false })
      .limit(250),
    service.from('sfi_cognitive_twin_decisions')
      .select('id,decision_id,situation,rejected_condition,correct_state,general_rule,required_evidence,evidence_refs,status,approved_by,approved_at,created_by,created_at,updated_at')
      .order('created_at', { ascending: false })
      .limit(200),
    service.from('sfi_institutional_experiments')
      .select('*')
      .eq('experiment_key', 'SFI-INSTITUTIONAL-30D-001')
      .maybeSingle(),
  ]);

  const warnings = [memory.error?.message, decisions.error?.message, experiment.error?.message].filter(Boolean);
  const events = (memory.data ?? []).map((row: Row) => normalizeEvent(row));
  return {
    ok: !memory.error,
    events,
    decisions: decisions.data ?? [],
    experiment: experiment.data ?? null,
    summary: buildSummary(events as Row[]),
    warnings,
    epistemicBoundary: 'Founder dependency is calculated only from persisted counterfactual replay outcomes. Missing replay evidence remains MISSING, never zero.',
  };
}

export async function GET() {
  const gate = await requireRootViewer('institutionalization.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  return NextResponse.json(await readState(gate.ctx.service), { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as Row;
  const action = str(body.action) ?? 'capture';

  if (action === 'review') {
    const gate = await requireRootActor('institutionalization.review');
    if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
    const memoryKey = str(body.memoryKey);
    const transferClass = str(body.transferClass);
    const lifecycleStatus = str(body.lifecycleStatus);
    if (!memoryKey || !transferClass || !TRANSFER_CLASSES.has(transferClass) || !lifecycleStatus || !LIFECYCLE.has(lifecycleStatus)) {
      return NextResponse.json({ ok: false, error: 'invalid_review_state' }, { status: 400 });
    }
    const current = await gate.ctx.service.from('sfi_cognitive_twin_memory').select('*').eq('memory_key', memoryKey).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (current.error || !current.data) return NextResponse.json({ ok: false, error: current.error?.message ?? 'fdre_not_found' }, { status: 404 });
    const content = rec(current.data.content);
    const nextContent = {
      ...content,
      transferClass,
      lifecycleStatus,
      extractedRule: str(body.extractedRule) ?? content.extractedRule ?? null,
      reviewNote: str(body.reviewNote) ?? null,
      reviewedAt: new Date().toISOString(),
      reviewedBy: gate.ctx.user.id,
    };
    const memoryStatus = lifecycleStatus === 'INSTITUTIONALIZED' ? 'VERIFIED' : lifecycleStatus === 'REJECTED' ? 'REJECTED' : lifecycleStatus === 'OBSOLETE' ? 'SUPERSEDED' : 'CANDIDATE';
    const write = await gate.ctx.service.from('sfi_cognitive_twin_memory').update({ content: nextContent, status: memoryStatus, updated_at: new Date().toISOString() }).eq('id', current.data.id).select('*').single();
    if (write.error) return NextResponse.json({ ok: false, error: write.error.message }, { status: 400 });
    const audit = await auditRootAction({ actorId: gate.ctx.user.id, action: 'institutionalization.review', target: memoryKey, payload: { transferClass, lifecycleStatus }, request });
    return NextResponse.json({ ok: audit.ok, event: normalizeEvent(write.data), audit });
  }

  if (action === 'replay') {
    const gate = await requireRootContributor('institutionalization.replay');
    if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
    const memoryKey = str(body.memoryKey);
    const outcome = str(body.outcome);
    if (!memoryKey || !outcome || !REPLAY_OUTCOMES.has(outcome)) return NextResponse.json({ ok: false, error: 'invalid_replay' }, { status: 400 });
    const current = await gate.ctx.service.from('sfi_cognitive_twin_memory').select('*').eq('memory_key', memoryKey).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (current.error || !current.data) return NextResponse.json({ ok: false, error: current.error?.message ?? 'fdre_not_found' }, { status: 404 });
    const content = rec(current.data.content);
    const refs = strs(body.evidenceRefs);
    const nextContent = {
      ...content,
      counterfactualReplay: {
        outcome,
        notes: str(body.notes),
        evidenceRefs: refs,
        observedAt: new Date().toISOString(),
        observedBy: gate.ctx.user.id,
      },
    };
    const mergedRefs = [...new Set([...strs(current.data.evidence_refs), ...refs])];
    const write = await gate.ctx.service.from('sfi_cognitive_twin_memory').update({ content: nextContent, evidence_refs: mergedRefs, updated_at: new Date().toISOString() }).eq('id', current.data.id).select('*').single();
    if (write.error) return NextResponse.json({ ok: false, error: write.error.message }, { status: 400 });
    const audit = await auditRootAction({ actorId: gate.ctx.user.id, action: 'institutionalization.replay', target: memoryKey, payload: { outcome, evidenceRefs: refs }, request });
    return NextResponse.json({ ok: audit.ok, event: normalizeEvent(write.data), audit });
  }

  const gate = await requireRootContributor('institutionalization.capture');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  const situation = str(body.situation);
  const founderIntervention = str(body.founderIntervention);
  const decision = str(body.decision);
  if (!situation || !founderIntervention || !decision) return NextResponse.json({ ok: false, error: 'situation_founder_intervention_decision_required' }, { status: 400 });

  const transferClass = str(body.transferClass);
  const lifecycleStatus = str(body.lifecycleStatus) ?? 'CAPTURED';
  const id = `FDRE-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${randomUUID().slice(0,8).toUpperCase()}`;
  const evidenceRefs = strs(body.evidenceRefs);
  const content = {
    fdreId: id,
    situation,
    inputAvailable: str(body.inputAvailable),
    failure: str(body.failure),
    founderIntervention,
    decision,
    evidenceUsed: strs(body.evidenceUsed),
    rejectedAlternatives: strs(body.rejectedAlternatives),
    claimLimit: str(body.claimLimit),
    authority: str(body.authority) ?? 'UNRESOLVED',
    extractedRule: str(body.extractedRule),
    transferClass: transferClass && TRANSFER_CLASSES.has(transferClass) ? transferClass : 'UNRESOLVED',
    lifecycleStatus: LIFECYCLE.has(lifecycleStatus) ? lifecycleStatus : 'CAPTURED',
    institutionalDimensions: strs(body.institutionalDimensions).filter(v => DIMENSIONS.includes(v as typeof DIMENSIONS[number])),
    observerNote: str(body.observerNote),
    founderPresent: bool(body.founderPresent) ?? true,
    epistemicClass: 'OBSERVED',
    observedObject: 'founder-dependent resolution event occurrence and recorded intervention',
    claimBoundary: 'The event records that a founder intervention occurred. It does not prove that the extracted rule is transferable, reproducible, institutionalized or canonical.',
  };
  const write = await gate.ctx.service.from('sfi_cognitive_twin_memory').insert({
    memory_key: `FDRE:${id}`,
    memory_type: 'DECISION',
    status: 'CANDIDATE',
    content,
    evidence_refs: evidenceRefs,
    source_kind: gate.ctx.isRoot ? 'founder_externalization_protocol' : 'institutional_observer',
    source_ref: 'FEP-01',
    created_by: gate.ctx.user.id,
  }).select('*').single();
  if (write.error) return NextResponse.json({ ok: false, error: write.error.message }, { status: 400 });
  const audit = await auditRootAction({ actorId: gate.ctx.user.id, action: 'institutionalization.capture', target: `FDRE:${id}`, payload: { authority: content.authority, transferClass: content.transferClass, lifecycleStatus: content.lifecycleStatus, evidenceRefs }, request });
  return NextResponse.json({ ok: audit.ok, event: normalizeEvent(write.data), audit }, { status: 201 });
}
