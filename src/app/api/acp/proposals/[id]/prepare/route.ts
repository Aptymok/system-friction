import { NextResponse } from 'next/server';
import { appendOperationalEvent, requireGovernedActor, updateActionProposalStatus } from '@/lib/operational/common';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

async function routeId(ctx: RouteContext) {
  const params = await Promise.resolve(ctx.params);
  return typeof params.id === 'string' && params.id.trim().length > 0 ? params.id.trim() : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function buildExecutionPlan(input: Record<string, unknown>) {
  const expectedFieldDelta = asRecord(input.expected_field_delta);
  const payload = asRecord(expectedFieldDelta.payload);
  const seedEvidence = asRecord(payload.seed_evidence);
  const catalogCounts = asRecord(seedEvidence.catalogCounts);

  return {
    mode: 'non_automatic_preparation',
    executionAllowed: false,
    requiresHumanExecution: true,
    sourceProposalId: input.id ?? null,
    proposalType: expectedFieldDelta.proposalType ?? asRecord(input.proportionality_check).proposalType ?? 'unknown',
    preparedFromStatus: input.status ?? null,
    seedHash: payload.seed_hash ?? expectedFieldDelta.specHash ?? null,
    evidenceSummary: {
      nodes: Array.isArray(seedEvidence.nodes) ? seedEvidence.nodes.length : 0,
      patterns: Array.isArray(seedEvidence.patterns) ? seedEvidence.patterns.length : 0,
      documents: Array.isArray(seedEvidence.documents) ? seedEvidence.documents.length : 0,
      mihmSourceState: asRecord(seedEvidence.mihmRuntimeMatrix).sourceState ?? null,
      accessMode: seedEvidence.accessMode ?? null,
      catalogCounts,
    },
    steps: [
      'review_seed_evidence',
      'confirm_target_node_or_pattern',
      'draft_non_automatic_action',
      'await_explicit_execution_authorization',
    ],
    guardrails: [
      'do_not_execute_external_action',
      'do_not_mutate_field_without_followup_approval',
      'preserve_audit_trail',
    ],
  };
}

export async function POST(req: Request, ctx: RouteContext) {
  const gate = await requireGovernedActor('acp.proposals.prepare');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  if (!gate.ctx.isRoot) return NextResponse.json({ ok: false, error: 'root_required' }, { status: 403 });

  const proposalId = await routeId(ctx);
  if (!proposalId) return NextResponse.json({ ok: false, error: 'missing_proposal_id' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const note = typeof body.note === 'string' && body.note.trim().length > 0 ? body.note.trim() : null;

  const event = await appendOperationalEvent({
    eventName: 'acp.proposal.execution_prepared',
    actorId: gate.ctx.user.id,
    confidence: 0.9,
    payload: {
      proposal_id: proposalId,
      status: 'queued',
      preparation_only: true,
      execution_allowed: false,
      note,
    },
    lineage: [proposalId],
  });
  if (!event.ok) return NextResponse.json(event, { status: 400 });

  const proposal = await updateActionProposalStatus({
    proposalId,
    status: 'queued',
    actorId: gate.ctx.user.id,
    isRoot: gate.ctx.isRoot,
    proposalType: 'twin_proposal',
    expectedStatuses: ['design_approved'],
    eventId: event.data.id,
    payloadPatch: {
      preparationOnly: true,
      executionAllowed: false,
      note,
    },
  });

  if (!proposal.ok) return NextResponse.json(proposal, { status: 400 });

  const executionPlan = buildExecutionPlan(asRecord(proposal.data));
  return NextResponse.json({
    ok: true,
    data: {
      ...proposal.data,
      prepared: true,
      executionPlan,
    },
  });
}
