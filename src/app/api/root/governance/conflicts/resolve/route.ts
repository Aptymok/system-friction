import { NextResponse } from 'next/server';
import { appendOperationalEvent, recordValue, stringValue, updateActionProposalStatus } from '@/lib/operational/common';
import { requireRootActor } from '@/lib/root/server';

export const dynamic='force-dynamic';
export const runtime='nodejs';

type Row=Record<string,unknown>;
const RESOLUTIONS=['reopen','freeze','supersede'] as const;
type Resolution=typeof RESOLUTIONS[number];

export async function POST(request:Request){
  const gate=await requireRootActor('governance.conflict.resolve');
  if(!gate.ok)return NextResponse.json(gate.body,{status:gate.status});
  const body=await request.json().catch(()=>({})) as Row;
  const proposalId=stringValue(body.proposal_id),resolution=stringValue(body.resolution) as Resolution|null,rationale=stringValue(body.rationale),replacementId=stringValue(body.replacement_proposal_id);
  if(!proposalId||!resolution||!RESOLUTIONS.includes(resolution)||!rationale)return NextResponse.json({ok:false,error:'proposal_id_resolution_rationale_required'},{status:400});
  if(resolution==='supersede'&&!replacementId)return NextResponse.json({ok:false,error:'replacement_proposal_id_required_for_supersede'},{status:400});
  const current=await gate.ctx.service.from('action_proposals').select('*').eq('id',proposalId).eq('status','conflicted').single();
  if(current.error||!current.data)return NextResponse.json({ok:false,error:current.error?.message??'conflicted_proposal_not_found'},{status:404});
  const next=resolution==='reopen'?'proposed':resolution==='freeze'?'frozen':'superseded';
  const event=await appendOperationalEvent({eventName:'governance.conflict.resolved',actorId:gate.ctx.user.id,confidence:1,payload:{proposal_id:proposalId,resolution,next_status:next,rationale,replacement_proposal_id:replacementId,automatic_promotion:false,execution_allowed:false},lineage:[proposalId,...(replacementId?[replacementId]:[])]});
  if(!event.ok)return NextResponse.json(event,{status:400});
  const expectedDelta=recordValue(current.data.expected_field_delta);
  const result=await updateActionProposalStatus({proposalId,status:next,actorId:gate.ctx.user.id,isRoot:true,proposalType:stringValue(current.data.proposal_type)??stringValue(expectedDelta.proposalType)??'twin_proposal',expectedStatuses:['conflicted'],eventId:event.data.id,payloadPatch:{conflictResolved:true,resolution,rationale,replacementProposalId:replacementId,executionAllowed:false,automaticPromotion:false}});
  return NextResponse.json(result,{status:result.ok?200:409});
}
