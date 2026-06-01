import { NextResponse } from 'next/server';
import { appendOperationalEvent, requireGovernedActor, updateActionProposalStatus } from '@/lib/operational/common';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

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
      'no_external_execution',
      'no_field_mutation_without_followup_approval',
      'preserve_audit_trail',
    ],
  };
}

async function readProposalForPlan(proposalId: string) {
  const service = createServiceSupabaseClient();
  const { data, error } = await service
    .from('action_proposals')
    .select('*')
    .eq('id', proposalId)
    .eq('status', 'design_approved')
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function POST(req: Request, ctx: RouteContext) {
  const gate = await requireGovernedActor('acp.proposals.prepare');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  if (!gate.ctx.isRoot) return NextResponse.json({ ok: false, error: 'root_required' }, { status: 403 });

  const proposalId = await routeId(ctx);
  if (!proposalId) return NextResponse.json({ ok: false, error: 'missing_proposal_id' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const note = typeof body.note === 'string' && body.note.trim().length > 0 ? body.note.trim() : null;
  const existing = await readProposalForPlan(proposalId);
  if (existing.error) return NextResponse.json({ ok: false, error: 'proposal_lookup_failed', details: existing.error }, { status: 400 });
  if (!existing.data) return NextResponse.json({ ok: false, error: 'action_proposal_not_found_or_forbidden' }, { status: 400 });

  const executionPlan = buildExecutionPlan(asRecord(existing.data));

  const event = await appendOperationalEvent({
    eventName: 'acp.proposal.execution_prepared',
    actorId: gate.ctx.user.id,
    confidence: 0.9,
    payload: {
      proposal_id: proposalId,
      status: 'queued',
      preparation_only: true,
      execution_allowed: false,
      executionPlan,
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
      executionPlan,
      note,
    },
  });

  if (!proposal.ok) return NextResponse.json(proposal, { status: 400 });

  return NextResponse.json({
    ok: true,
    data: {
      ...proposal.data,
      prepared: true,
      executionPlan,
    },
  });
}
