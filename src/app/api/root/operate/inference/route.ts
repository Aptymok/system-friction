import { NextResponse } from 'next/server';
import { requireRootActor, auditRootAction } from '@/lib/root/server';

export const dynamic='force-dynamic';
export const runtime='nodejs';

type Row=Record<string,unknown>;
function text(value:unknown){return typeof value==='string'&&value.trim()?value.trim():''}
function list(value:unknown){return Array.isArray(value)?value.map(item=>text(item)).filter(Boolean).slice(0,12):[]}

export async function POST(request:Request){
  const gate=await requireRootActor('root.operate.inference.write');
  if(!gate.ok)return NextResponse.json(gate.body,{status:gate.status});
  const body=await request.json().catch(()=>({})) as Row;
  const operatingCycleId=text(body.operatingCycleId);
  const primaryHypothesis=text(body.primaryHypothesis);
  if(!operatingCycleId||primaryHypothesis.length<5)return NextResponse.json({ok:false,error:'cycle_and_primary_hypothesis_required'},{status:400});

  const cycle=await gate.ctx.service.from('sfi_operating_cycles').select('id,question,evidence_refs,inference_refs').eq('id',operatingCycleId).eq('owner_id',gate.ctx.user.id).maybeSingle();
  if(cycle.error||!cycle.data)return NextResponse.json({ok:false,error:'operating_cycle_not_found',details:cycle.error?.message},{status:404});

  const evidenceRefs=list(body.evidenceRefs).length?list(body.evidenceRefs):list(cycle.data.evidence_refs);
  const rivals=list(body.rivalHypotheses).filter(value=>value!==primaryHypothesis);
  const discriminators=list(body.discriminatingObservations);
  const unknowns=list(body.unknowns);
  const status=discriminators.length&&rivals.length?'CONTRAST_READY':'OPEN';
  const inserted=await gate.ctx.service.from('sfi_inference_traces').insert({
    operating_cycle_id:operatingCycleId,
    owner_id:gate.ctx.user.id,
    question:text(cycle.data.question),
    primary_hypothesis:primaryHypothesis,
    rival_hypotheses:rivals,
    evidence_refs:evidenceRefs,
    unknowns,
    discriminating_observations:discriminators,
    stopping_condition:text(body.stoppingCondition)||null,
    epistemic_class:'INFERRED',
    status,
    payload:{rule:'Inference is not observation. A hypothesis remains INFERRED until a discriminating observation is actually acquired and linked.'},
  }).select('*').single();
  if(inserted.error||!inserted.data)return NextResponse.json({ok:false,error:'inference_trace_persist_failed',details:inserted.error?.message},{status:503});

  const refs=Array.from(new Set([...list(cycle.data.inference_refs),String(inserted.data.id)]));
  await gate.ctx.service.from('sfi_operating_cycles').update({inference_refs:refs,updated_at:new Date().toISOString()}).eq('id',operatingCycleId).eq('owner_id',gate.ctx.user.id);
  const audit=await auditRootAction({actorId:gate.ctx.user.id,action:'operating_cycle.inference_trace',target:String(inserted.data.id),payload:{operatingCycleId,status,evidenceRefs,rivalCount:rivals.length,discriminatorCount:discriminators.length},request});
  return NextResponse.json({ok:true,trace:inserted.data,audit},{status:201});
}
