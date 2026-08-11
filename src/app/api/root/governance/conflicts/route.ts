import { NextResponse } from 'next/server';
import { appendOperationalEvent, recordValue, stringValue, updateActionProposalStatus } from '@/lib/operational/common';
import { normalizeProposalState } from '@/lib/governance/proposalLifecycle';
import { requireRootActor } from '@/lib/root/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Row = Record<string, unknown>;

export async function POST(request: Request) {
  const gate = await requireRootActor('governance.conflict.declare');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  const body = await request.json().catch(() => ({})) as Row;
  const proposalId = stringValue(body.proposal_id);
  const description = stringValue(body.description);
  if (!proposalId || !description) return NextResponse.json({ ok:false,error:'proposal_id_and_description_required' }, { status:400 });
  const current = await gate.ctx.service.from('action_proposals').select('*').eq('id', proposalId).single();
  if (current.error || !current.data) return NextResponse.json({ ok:false,error:current.error?.message??'proposal_not_found' }, { status:404 });
  const state = normalizeProposalState(current.data.status);
  if (!['design_approved','queued','accepted'].includes(state)) return NextResponse.json({ ok:false,error:'conflict_requires_post_review_state',state }, { status:409 });
  const expectedRaw = stringValue(current.data.status)?.toLowerCase() ?? state;
  const event = await appendOperationalEvent({ eventName:'governance.conflict.declared', actorId:gate.ctx.user.id, confidence:1, payload:{ proposal_id:proposalId, previous_status:state, description, affected_outputs:Array.isArray(body.affected_outputs)?body.affected_outputs:[], claims_blocked:true }, lineage:[proposalId] });
  if (!event.ok) return NextResponse.json(event,{status:400});
  const expected = [expectedRaw] as Parameters<typeof updateActionProposalStatus>[0]['expectedStatuses'];
  const expectedDelta = recordValue(current.data.expected_field_delta);
  const result = await updateActionProposalStatus({ proposalId, status:'conflicted', actorId:gate.ctx.user.id, isRoot:true, proposalType:stringValue(current.data.proposal_type)??stringValue(expectedDelta.proposalType)??'twin_proposal', expectedStatuses:expected, eventId:event.data.id, payloadPatch:{ conflictDeclared:true, description, claimsBlocked:true } });
  return NextResponse.json(result,{status:result.ok?200:409});
}
