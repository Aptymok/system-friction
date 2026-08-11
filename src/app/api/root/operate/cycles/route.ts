import { NextResponse } from 'next/server';
import { requireRootActor, auditRootAction } from '@/lib/root/server';
import { resolveMihmMethod } from '@/lib/mihm/methodSelectionResolver';
import type { MihmEvidenceModality, MihmObservationSubject, MihmTemporalScope } from '@/lib/mihm/methodSelectionContract';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Row = Record<string, unknown>;
const SUBJECTS = new Set<MihmObservationSubject>(['PERSON','SESSION','OBJECT','SIGNAL','ARTIFACT','WORLD_CONTEXT','PHENOMENON','CASE','ORGANIZATION','SFI_SYSTEM','UNKNOWN']);
const TEMPORAL = new Set<MihmTemporalScope>(['POINT_IN_TIME','SESSION','BOUNDED_WINDOW','LONGITUDINAL','CURRENT_WORLD_STATE','UNKNOWN']);
const MODALITIES = new Set<MihmEvidenceModality>(['TEXT','AUDIO','VIDEO','IMAGE','SOFTWARE','DATASET','INTERVIEW','FIELD','MODEL','PAPER','CONVERSATION','INSTITUTIONAL_RECORD','TELEMETRY','UNKNOWN']);
const REF_COLUMNS: Record<string,string> = {
  evidence:'evidence_refs', studio:'studio_object_refs', method_lab:'method_lab_refs', return:'return_refs', twin:'cognitive_twin_refs', governance:'governance_refs', event:'event_refs',
};

function text(value: unknown) { return typeof value === 'string' && value.trim() ? value.trim() : ''; }
function list(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : []; }
function cycleCode() {
  // Keep bracket-regex syntax out of Tailwind content scanning; arbitrary-class parsing
  // previously interpreted the regex as CSS and generated the invalid declaration "-: TZ.;".
  const stamp = new Date().toISOString()
    .replaceAll('-', '')
    .replaceAll(':', '')
    .replaceAll('T', '')
    .replaceAll('Z', '')
    .replaceAll('.', '')
    .slice(0,14);
  return `SFI-CYCLE-${stamp}-${crypto.randomUUID().slice(0,8).toUpperCase()}`;
}

export async function GET() {
  const gate = await requireRootActor('root.operate.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  const result = await gate.ctx.service.from('sfi_operating_cycles')
    .select('*').eq('owner_id', gate.ctx.user.id).order('updated_at',{ascending:false}).limit(50);
  if (result.error) return NextResponse.json({ok:false,error:'operating_cycles_read_failed',details:result.error.message},{status:503});
  return NextResponse.json({ok:true,cycles:result.data??[]},{headers:{'Cache-Control':'no-store'}});
}

export async function POST(request: Request) {
  const gate = await requireRootActor('root.operate.start');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  const body = await request.json().catch(()=>({})) as Row;
  const title = text(body.title);
  const question = text(body.question);
  const subjectRaw = text(body.subject).toUpperCase() as MihmObservationSubject;
  const temporalRaw = text(body.temporalScope).toUpperCase() as MihmTemporalScope;
  const subject: MihmObservationSubject = SUBJECTS.has(subjectRaw) ? subjectRaw : 'UNKNOWN';
  const temporalScope: MihmTemporalScope = TEMPORAL.has(temporalRaw) ? temporalRaw : 'UNKNOWN';
  const evidenceModalities = list(body.evidenceModalities).map(value=>value.toUpperCase() as MihmEvidenceModality).filter(value=>MODALITIES.has(value));
  if (title.length < 3 || question.length < 5) return NextResponse.json({ok:false,error:'title_and_question_required'},{status:400});

  const created = await gate.ctx.service.from('sfi_operating_cycles').insert({
    cycle_code:cycleCode(), owner_id:gate.ctx.user.id, title, question, subject, temporal_scope:temporalScope,
    status:'OPEN', metadata:{createdFrom:'root_operating_field', evidenceModalities},
  }).select('*').single();
  if (created.error || !created.data) return NextResponse.json({ok:false,error:'operating_cycle_create_failed',details:created.error?.message},{status:503});

  const cycleId = String(created.data.id);
  const method = resolveMihmMethod({
    subject, temporalScope, evidenceModalities,
    subjectId:['OBJECT','SIGNAL','ARTIFACT','PHENOMENON','CASE','ORGANIZATION'].includes(subject) ? cycleId : null,
    sessionId:['PERSON','SESSION'].includes(subject) ? cycleId : null,
    caseId:['CASE','ORGANIZATION'].includes(subject) ? cycleId : null,
    phenomenonId:subject==='PHENOMENON' ? cycleId : null,
    ownerId:gate.ctx.user.id,
    evidenceCount:evidenceModalities.length,
    worldContextRequested:Boolean(body.worldContextRequested),
    requiresTrajectory:Boolean(body.requiresTrajectory) || temporalScope==='LONGITUDINAL',
    requiresRivalHypothesis:Boolean(body.requiresRivalHypothesis),
    requiresInterventionTracking:Boolean(body.requiresInterventionTracking),
    isSfiInternal:subject==='SFI_SYSTEM',
  });
  const nextStatus = method.status==='READY' ? 'METHOD_SELECTED' : 'OPEN';
  const updated = await gate.ctx.service.from('sfi_operating_cycles').update({
    method_resolution:method, status:nextStatus, updated_at:new Date().toISOString(),
  }).eq('id',cycleId).eq('owner_id',gate.ctx.user.id).select('*').single();
  const row = updated.data ?? created.data;

  const audit = await auditRootAction({actorId:gate.ctx.user.id,action:'operating_cycle.start',target:cycleId,payload:{cycleCode:row.cycle_code,subject,temporalScope,methodStatus:method.status,primaryMethod:method.primary?.methodId??null},request});
  if (!audit.ok) return NextResponse.json(audit,{status:500});
  return NextResponse.json({ok:true,cycle:row,method,audit},{status:201});
}

export async function PATCH(request: Request) {
  const gate = await requireRootActor('root.operate.update');
  if (!gate.ok) return NextResponse.json(gate.body,{status:gate.status});
  const body = await request.json().catch(()=>({})) as Row;
  const id = text(body.id);
  if (!id) return NextResponse.json({ok:false,error:'cycle_id_required'},{status:400});
  const current = await gate.ctx.service.from('sfi_operating_cycles').select('*').eq('id',id).eq('owner_id',gate.ctx.user.id).maybeSingle();
  if (current.error || !current.data) return NextResponse.json({ok:false,error:'operating_cycle_not_found',details:current.error?.message},{status:404});

  const patch: Row = {updated_at:new Date().toISOString()};
  const status = text(body.status).toUpperCase();
  if (status) patch.status=status;
  const refKind = text(body.refKind).toLowerCase();
  const ref = text(body.ref);
  if (refKind && ref && REF_COLUMNS[refKind]) {
    const column=REF_COLUMNS[refKind];
    patch[column]=Array.from(new Set([...list(current.data[column]),ref]));
  }
  if (text(body.fieldCaseRef)) patch.field_case_ref=text(body.fieldCaseRef);
  if (status==='CLOSED') patch.closed_at=new Date().toISOString();
  const updated = await gate.ctx.service.from('sfi_operating_cycles').update(patch).eq('id',id).eq('owner_id',gate.ctx.user.id).select('*').single();
  if (updated.error) return NextResponse.json({ok:false,error:'operating_cycle_update_failed',details:updated.error.message},{status:503});
  const audit=await auditRootAction({actorId:gate.ctx.user.id,action:'operating_cycle.update',target:id,payload:{status:status||null,refKind:refKind||null,ref:ref||null},request});
  return NextResponse.json({ok:true,cycle:updated.data,audit});
}