import { NextResponse } from 'next/server';
import { normalizeProposalState } from '@/lib/governance/proposalLifecycle';
import { classifyProposalDecision, controllerCanDecideProposal } from '@/lib/governance/proposalDecisionAuthority';
import { resolveProposalReviewerAuthority } from '@/lib/governance/proposalReviewer';
import { latestActionProposals, requireGovernedActor } from '@/lib/operational/common';

export const dynamic = 'force-dynamic';

function asRecord(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function proposalTypeFrom(row: Record<string, unknown>) {
  const expectedDelta=asRecord(row.expected_field_delta),payload=asRecord(expectedDelta.payload),proposal=asRecord(payload.proposal),proportionality=asRecord(row.proportionality_check);
  return String(expectedDelta.proposalType??expectedDelta.proposal_type??proposal.proposalType??proposal.proposal_type??proportionality.proposalType??proportionality.proposal_type??'unknown');
}
function summarizeProposal(row: Record<string, unknown>) {
  const expectedDelta=asRecord(row.expected_field_delta),payload=asRecord(expectedDelta.payload),seedEvidence=asRecord(payload.seed_evidence),mihmRuntimeMatrix=asRecord(seedEvidence.mihmRuntimeMatrix),outcome=asRecord(row.outcome),outcomePatch=asRecord(outcome.payloadPatch);
  const status=normalizeProposalState(row.status);
  return {
    id:row.id,
    title:row.title,
    status,
    raw_status:row.status,
    risk_level:row.risk_level,
    approval_required:row.approval_required,
    created_at:row.created_at,
    approved_at:row.approved_at,
    executed_at:row.executed_at,
    event_id:row.event_id,
    proposalType:proposalTypeFrom(row),
    decisionClass:classifyProposalDecision(row),
    decisionActorId:outcomePatch.decisionActorId??outcome.actorId??null,
    decisionActorLabel:outcomePatch.decisionActorLabel??null,
    decisionAuthority:outcomePatch.decisionAuthority??null,
    specHash:expectedDelta.specHash??null,
    seedHash:payload.seed_hash??null,
    seedEvidenceSummary:{nodes:Array.isArray(seedEvidence.nodes)?seedEvidence.nodes.length:0,patterns:Array.isArray(seedEvidence.patterns)?seedEvidence.patterns.length:0,documents:Array.isArray(seedEvidence.documents)?seedEvidence.documents.length:0,mihmSourceState:mihmRuntimeMatrix.sourceState??null,accessMode:seedEvidence.accessMode??null,catalogCounts:seedEvidence.catalogCounts??null},
    expected_field_delta:expectedDelta,
    proportionality_check:row.proportionality_check,
    outcome:row.outcome,
  };
}
export async function GET() {
  const gate=await requireGovernedActor('acp.proposals.list');
  if(!gate.ok)return NextResponse.json(gate.body,{status:gate.status});
  const authority=resolveProposalReviewerAuthority(gate.ctx);
  if(!authority)return NextResponse.json({ok:false,error:'proposal_reviewer_required'},{status:403});

  const proposals=await latestActionProposals(undefined,50);
  if(proposals.error)return NextResponse.json({ok:false,error:'proposal_list_failed',details:proposals.error},{status:500});

  const sourceRows=proposals.data.map(row=>asRecord(row));
  const visibleRows=authority==='root'?sourceRows:sourceRows.filter(row=>controllerCanDecideProposal(row));
  const rows=visibleRows.map(row=>summarizeProposal(row));
  return NextResponse.json({ok:true,data:{viewerAuthority:authority,proposals:rows,counts:{total:rows.length,proposed:rows.filter(row=>row.status==='proposed').length,waitingEvidence:rows.filter(row=>row.status==='waiting_evidence').length,designApproved:rows.filter(row=>row.status==='design_approved').length,queued:rows.filter(row=>row.status==='queued').length,accepted:rows.filter(row=>row.status==='accepted').length,conflicted:rows.filter(row=>row.status==='conflicted').length,frozen:rows.filter(row=>row.status==='frozen').length,rejected:rows.filter(row=>row.status==='rejected').length}}});
}
