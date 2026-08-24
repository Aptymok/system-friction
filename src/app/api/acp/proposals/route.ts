import { NextResponse } from 'next/server';
import { normalizeProposalState } from '@/lib/governance/proposalLifecycle';
import { latestActionProposals } from '@/lib/operational/common';
import { requireRootActor } from '@/lib/root/server';

export const dynamic = 'force-dynamic';

function asRecord(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function proposalTypeFrom(row: Record<string, unknown>) {
  const expectedDelta=asRecord(row.expected_field_delta),payload=asRecord(expectedDelta.payload),proposal=asRecord(payload.proposal),proportionality=asRecord(row.proportionality_check);
  return String(expectedDelta.proposalType??expectedDelta.proposal_type??proposal.proposalType??proposal.proposal_type??proportionality.proposalType??proportionality.proposal_type??'unknown');
}
function summarizeProposal(row: Record<string, unknown>) {
  const expectedDelta=asRecord(row.expected_field_delta),payload=asRecord(expectedDelta.payload),seedEvidence=asRecord(payload.seed_evidence),mihmRuntimeMatrix=asRecord(seedEvidence.mihmRuntimeMatrix);
  const status=normalizeProposalState(row.status);
  return { id:row.id,title:row.title,status,raw_status:row.status,risk_level:row.risk_level,approval_required:row.approval_required,created_at:row.created_at,approved_at:row.approved_at,executed_at:row.executed_at,event_id:row.event_id,proposalType:proposalTypeFrom(row),specHash:expectedDelta.specHash??null,seedHash:payload.seed_hash??null,seedEvidenceSummary:{nodes:Array.isArray(seedEvidence.nodes)?seedEvidence.nodes.length:0,patterns:Array.isArray(seedEvidence.patterns)?seedEvidence.patterns.length:0,documents:Array.isArray(seedEvidence.documents)?seedEvidence.documents.length:0,mihmSourceState:mihmRuntimeMatrix.sourceState??null,accessMode:seedEvidence.accessMode??null,catalogCounts:seedEvidence.catalogCounts??null},expected_field_delta:expectedDelta,proportionality_check:row.proportionality_check,outcome:row.outcome };
}
export async function GET() {
  // ROOT must retain observability of the decision queue even when the governed runtime
  // is degraded/blind. Authorization and execution routes remain governance-gated.
  const gate=await requireRootActor('acp.proposals.list');
  if(!gate.ok)return NextResponse.json(gate.body,{status:gate.status});

  const proposals=await latestActionProposals(undefined,50);
  if(proposals.error)return NextResponse.json({ok:false,state:'DEGRADED',error:'proposal_list_failed',details:proposals.error,data:{proposals:[],counts:{total:0,proposed:0,waitingEvidence:0,designApproved:0,queued:0,accepted:0,conflicted:0,frozen:0,rejected:0}}},{status:500});

  const rows=proposals.data.map(row=>summarizeProposal(asRecord(row)));
  return NextResponse.json({ok:true,state:'OBSERVED',source:{table:'action_proposals'},data:{proposals:rows,counts:{total:rows.length,proposed:rows.filter(row=>row.status==='proposed').length,waitingEvidence:rows.filter(row=>row.status==='waiting_evidence').length,designApproved:rows.filter(row=>row.status==='design_approved').length,queued:rows.filter(row=>row.status==='queued').length,accepted:rows.filter(row=>row.status==='accepted').length,conflicted:rows.filter(row=>row.status==='conflicted').length,frozen:rows.filter(row=>row.status==='frozen').length,rejected:rows.filter(row=>row.status==='rejected').length}}});
}
