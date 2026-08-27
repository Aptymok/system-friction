import { NextResponse } from 'next/server';
import { normalizeProposalState } from '@/lib/governance/proposalLifecycle';
import { classifyProposalDecision, controllerCanDecideProposal } from '@/lib/governance/proposalDecisionAuthority';
import { resolveProposalReviewerAuthority } from '@/lib/governance/proposalReviewer';
import { latestActionProposals } from '@/lib/operational/common';
import { requireRootViewer } from '@/lib/root/server';

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
  // Observability of the decision queue must not depend on runtime/governance
  // health. Otherwise blind/degraded governance can hide the exact queue a
  // reviewer needs in order to recover it. This gate authorizes identity and
  // ROOT-view access only; all proposal mutations remain governance-gated in
  // their dedicated routes.
  const gate=await requireRootViewer('acp.proposals.list');
  if(!gate.ok)return NextResponse.json(gate.body,{status:gate.status});
  const authority=resolveProposalReviewerAuthority(gate.ctx);
  if(!authority)return NextResponse.json({ok:false,error:'proposal_reviewer_required'},{status:403});

  const proposals=await latestActionProposals(undefined,80);
  if(proposals.error)return NextResponse.json({
    ok:false,
    state:'DEGRADED',
    error:'proposal_list_failed',
    details:proposals.error,
    data:{viewerAuthority:authority,proposals:[],counts:{total:0,proposed:0,waitingEvidence:0,designApproved:0,queued:0,accepted:0,conflicted:0,frozen:0,rejected:0}},
  },{status:500});

  // Evidence candidates are subordinate to a parent proposal and have their own
  // ROOT review surface. Keeping them out of the primary ACP queue prevents the
  // search subworkflow from multiplying top-level governance decisions.
  const sourceRows=proposals.data.map(row=>asRecord(row)).filter(row=>proposalTypeFrom(row)!=='evidence_candidate').slice(0,50);
  const visibleRows=authority==='root'?sourceRows:sourceRows.filter(row=>controllerCanDecideProposal(row));
  const rows=visibleRows.map(row=>summarizeProposal(row));
  return NextResponse.json({ok:true,state:'OBSERVED',source:{table:'action_proposals'},data:{viewerAuthority:authority,proposals:rows,counts:{total:rows.length,proposed:rows.filter(row=>row.status==='proposed').length,waitingEvidence:rows.filter(row=>row.status==='waiting_evidence').length,designApproved:rows.filter(row=>row.status==='design_approved').length,queued:rows.filter(row=>row.status==='queued').length,accepted:rows.filter(row=>row.status==='accepted').length,conflicted:rows.filter(row=>row.status==='conflicted').length,frozen:rows.filter(row=>row.status==='frozen').length,rejected:rows.filter(row=>row.status==='rejected').length}}});
}
