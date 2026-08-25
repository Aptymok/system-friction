import { NextResponse } from 'next/server';
import { recordProposalOutcomeFromObservedReturn } from '@/lib/governance/proposalOutcome';
import { requireGovernedActor } from '@/lib/operational/common';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> | { id: string } };
type Row = Record<string, unknown>;

async function routeId(ctx: RouteContext) {
  const params = await Promise.resolve(ctx.params);
  return typeof params.id === 'string' && params.id.trim() ? params.id.trim() : null;
}

function strings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).map((item) => item.trim())
    : [];
}

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

export async function POST(req: Request, ctx: RouteContext) {
  const gate = await requireGovernedActor('acp.proposals.outcome');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  if (!gate.ctx.isRoot) return NextResponse.json({ ok: false, error: 'root_required' }, { status: 403 });

  const proposalId = await routeId(ctx);
  if (!proposalId) return NextResponse.json({ ok: false, error: 'missing_proposal_id' }, { status: 400 });

  const body = await req.json().catch(() => ({})) as Row;
  const returnEventId = typeof body.return_event_id === 'string' ? body.return_event_id.trim() : '';
  const evidenceRefs = strings(body.evidence_refs);
  if (!returnEventId || !evidenceRefs.length) {
    return NextResponse.json({
      ok: false,
      error: 'observed_return_and_evidence_required',
      required: ['return_event_id', 'evidence_refs[]'],
      boundary: 'A queued proposal cannot be closed by administrative declaration alone.',
    }, { status: 400 });
  }

  const nextState = body.next_state === 'needs_revision' ? 'proposed' as const : 'accepted' as const;
  const result = await recordProposalOutcomeFromObservedReturn({
    proposalId,
    actorId: gate.ctx.user.id,
    returnEventId,
    evidenceRefs,
    outcomeStatus: typeof body.outcome_status === 'string' && body.outcome_status.trim() ? body.outcome_status.trim() : 'observed_effect',
    nextState,
    fieldEffect: record(body.field_effect),
    notes: typeof body.notes === 'string' ? body.notes : null,
  });

  if (!result.ok) {
    const status = result.error === 'proposal_not_found' ? 404
      : result.error === 'return_event_lookup_failed' ? 503
        : result.error === 'proposal_not_awaiting_return' || result.error === 'observed_return_event_required' || result.error === 'return_event_proposal_mismatch' ? 409
          : 400;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json({ ok: true, data: result.data });
}
