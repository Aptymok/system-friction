import { NextResponse } from 'next/server';
import { auditRootAction, requireRootActor } from '@/lib/root/server';
import { runCognitiveAgent } from '@/lib/sfi/cognitive-runtime/runtimeAgentExecutor';
import type { KernelContext, KernelEvidence } from '@/lib/sfi/cognitive-runtime/kernelContext';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Row = Record<string, unknown>;
function rows(value: unknown): Row[] { return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : []; }
function text(value: unknown) { return typeof value === 'string' && value.trim() ? value.trim() : null; }
function number(value: unknown) { const parsed = typeof value === 'number' ? value : Number(value); return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : null; }

export async function POST(request: Request) {
  const gate = await requireRootActor('root.simulation.run');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const body = await request.json().catch(() => ({}));
  const evidenceIds = Array.isArray(body?.evidenceIds)
    ? body.evidenceIds.filter((value: unknown): value is string => typeof value === 'string' && value.trim().length > 0)
    : [];
  if (!evidenceIds.length) return NextResponse.json({ ok: false, error: 'persisted_evidence_ids_required' }, { status: 400 });

  const db = gate.ctx.service;
  const evidenceRows = await db.from('root_evidence_entries')
    .select('id,title,content,evidence_type,payload,epistemic_event_id,created_at')
    .in('id', evidenceIds);
  if (evidenceRows.error) return NextResponse.json({ ok: false, error: 'simulation_evidence_read_failed', details: evidenceRows.error.message }, { status: 503 });

  const persisted = rows(evidenceRows.data);
  if (!persisted.length) return NextResponse.json({ ok: false, error: 'persisted_evidence_not_found' }, { status: 404 });

  const eventIds = persisted.map((item) => text(item.epistemic_event_id)).filter((value): value is string => Boolean(value));
  const eventRows = eventIds.length
    ? await db.from('epistemic_events').select('event_id,epistemic_class,confidence,occurred_at').in('event_id', eventIds)
    : { data: [], error: null };
  const eventMap = new Map(rows(eventRows.data).map((item) => [String(item.event_id), item]));

  const evidence: KernelEvidence[] = persisted.map((item) => {
    const event = eventMap.get(String(item.epistemic_event_id ?? ''));
    return {
      id: String(item.id),
      source: `root_evidence_entries:${text(item.evidence_type) ?? 'evidence'}`,
      confidence: number(event?.confidence) ?? 0,
      payload: {
        title: text(item.title),
        content: text(item.content),
        payload: item.payload,
        epistemicClass: text(event?.epistemic_class)?.toUpperCase() ?? 'MISSING',
        observedAt: text(event?.occurred_at) ?? text(item.created_at),
      },
    };
  });

  const cycleId = crypto.randomUUID();
  const taskId = crypto.randomUUID();
  const context: KernelContext = {
    cycleId,
    logbookId: `root-simulation:${taskId}`,
    taskId,
    currentEvent: 'SFI_ROOT_SIMULATION_REQUESTED',
    evidence,
    hypotheses: [],
    contradictions: [],
    simulations: [],
    predictions: [],
    risks: [],
    opportunities: [],
    metadata: {
      requestedBy: gate.ctx.user.id,
      epistemicRule: 'Simulation may consume persisted evidence but cannot append its output to observed evidence.',
    },
  };

  const result = await runCognitiveAgent('social_field_simulator', context);
  const audit = await auditRootAction({
    actorId: gate.ctx.user.id,
    action: 'simulation.run',
    target: 'social_field_simulator',
    payload: { taskId, cycleId, evidenceIds: persisted.map((item) => item.id), executed: result.executed },
    request,
  });

  return NextResponse.json({
    ok: result.executed && audit.ok,
    taskId,
    cycleId,
    epistemicClass: 'SIMULATED',
    evidenceRefs: persisted.map((item) => item.id),
    simulations: result.context.simulations,
    claimBoundary: 'Simulation output is not observed evidence, validation, approval or external execution.',
    audit: audit.ok ? { ok: true } : audit,
  }, { status: result.executed ? 200 : 503 });
}
