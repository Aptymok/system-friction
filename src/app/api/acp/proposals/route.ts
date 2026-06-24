import { NextResponse } from 'next/server';
import { latestActionProposals, requireGovernedActor } from '@/lib/operational/common';

export const dynamic = 'force-dynamic';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function proposalTypeFrom(row: Record<string, unknown>) {
  const expectedDelta = asRecord(row.expected_field_delta);
  const payload = asRecord(expectedDelta.payload);
  const proposal = asRecord(payload.proposal);
  const proportionality = asRecord(row.proportionality_check);

  return String(
    expectedDelta.proposalType
    ?? expectedDelta.proposal_type
    ?? proposal.proposalType
    ?? proposal.proposal_type
    ?? proportionality.proposalType
    ?? proportionality.proposal_type
    ?? 'unknown'
  );
}

function summarizeProposal(row: Record<string, unknown>) {
  const expectedDelta = asRecord(row.expected_field_delta);
  const payload = asRecord(expectedDelta.payload);
  const seedEvidence = asRecord(payload.seed_evidence);
  const mihmRuntimeMatrix = asRecord(seedEvidence.mihmRuntimeMatrix);

  const nodes = Array.isArray(seedEvidence.nodes) ? seedEvidence.nodes.length : 0;
  const patterns = Array.isArray(seedEvidence.patterns) ? seedEvidence.patterns.length : 0;
  const documents = Array.isArray(seedEvidence.documents) ? seedEvidence.documents.length : 0;

  return {
    id: row.id,
    title: row.title,
    status: row.status,
    risk_level: row.risk_level,
    approval_required: row.approval_required,
    created_at: row.created_at,
    approved_at: row.approved_at,
    executed_at: row.executed_at,
    event_id: row.event_id,
    proposalType: proposalTypeFrom(row),
    specHash: expectedDelta.specHash ?? null,
    seedHash: payload.seed_hash ?? null,
    seedEvidenceSummary: {
      nodes,
      patterns,
      documents,
      mihmSourceState: mihmRuntimeMatrix.sourceState ?? null,
      accessMode: seedEvidence.accessMode ?? null,
      catalogCounts: seedEvidence.catalogCounts ?? null,
    },
    expected_field_delta: expectedDelta,
    proportionality_check: row.proportionality_check,
    outcome: row.outcome,
  };
}

export async function GET() {
  const gate = await requireGovernedActor('acp.proposals.list');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  if (!gate.ctx.isRoot) {
    return NextResponse.json({ ok: false, error: 'root_required' }, { status: 403 });
  }

  const proposals = await latestActionProposals(undefined, 50);

  if (proposals.error) {
    return NextResponse.json(
      { ok: false, error: 'proposal_list_failed', details: proposals.error },
      { status: 500 }
    );
  }

  const rows = proposals.data.map((row) => summarizeProposal(asRecord(row)));

  return NextResponse.json({
    ok: true,
    data: {
      proposals: rows,
      counts: {
        total: rows.length,
        proposed: rows.filter((row) => row.status === 'proposed').length,
        approved: rows.filter((row) => row.status === 'design_approved' || row.status === 'accepted').length,
        rejected: rows.filter((row) => row.status === 'rejected').length,
      },
    },
  });
}
