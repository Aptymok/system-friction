import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT=process.cwd();
const abs=p=>path.join(ROOT,p);
const exists=p=>fs.existsSync(abs(p));
const read=p=>fs.readFileSync(abs(p),'utf8');
const write=(p,c)=>{fs.mkdirSync(path.dirname(abs(p)),{recursive:true});fs.writeFileSync(abs(p),c)};
const rm=p=>{if(exists(p))execFileSync('git',['rm','-f','--',p],{stdio:'inherit'})};
const files=[];
function walk(dir){if(!exists(dir))return;for(const e of fs.readdirSync(abs(dir),{withFileTypes:true})){const p=path.join(dir,e.name).replaceAll('\\','/');if(e.isDirectory())walk(p);else if(/\.(ts|tsx|js|jsx,mjs|cjs)$/.test(e.name)||/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(e.name))files.push(p)}}
walk('src');walk('scripts');
for(const p of files){if(!exists(p))continue;let s=read(p);const before=s;s=s.replaceAll("./experienceBridge","./experience").replaceAll("@/core/cognitive-twin/experienceBridge","@/core/cognitive-twin/experience").replaceAll('persistCognitiveTwinExperience','recordCognitiveTwinExperience');if(s!==before)write(p,s)}
rm('src/core/cognitive-twin/experienceBridge.ts');

const fric='src/app/api/root/friccionauta/route.ts';
let fsr=read(fric);
if(!fsr.includes("recordCognitiveTwinExperience")) fsr=fsr.replace("import { readCognitiveTwinState } from '@/core/cognitive-twin/readState';", "import { readCognitiveTwinState } from '@/core/cognitive-twin/readState';\nimport { recordCognitiveTwinExperience } from '@/core/cognitive-twin/experience';");
const start=fsr.indexOf('async function saveFinding(');
const end=fsr.indexOf('\nexport async function POST',start);
if(start<0||end<0) throw new Error('friccionauta_saveFinding_boundary_not_found');
const saveFinding=`async function saveFinding(request: Request, gate: RootActorGate, body: Row) {
  const finding = text(body.finding);
  const question = text(body.question);
  const sourceRunId = text(body.sourceRunId);
  const evidenceRefs = strings(body.evidenceRefs);
  if (!finding) return NextResponse.json({ ok: false, error: 'finding_required' }, { status: 400 });
  const memoryKey = \`FRICCIONAUTA:FINDING:\${new Date().toISOString()}:\${crypto.randomUUID().slice(0, 8).toUpperCase()}\`;
  const recorded = await recordCognitiveTwinExperience({
    memoryKey,
    memoryType:'EVIDENCE',
    sourceKind:'friccionauta_root',
    sourceRef:sourceRunId || memoryKey,
    evidenceRefs,
    createdBy:gate.ctx.user.id,
    operation:'CAPTURE',
    content:{
      finding,
      question:question || null,
      sourceRunId:sourceRunId || null,
      epistemicClass:'INFERRED',
      observedObject:'founder_selected_friccionauta_finding',
      claimBoundary:'Founder selection records relevance; it does not make the finding verified or canonical.',
      selectedAt:new Date().toISOString(),
    },
  });
  if (!recorded.ok) return NextResponse.json({ ok:false, error:'friccionauta_finding_record_failed', details:recorded.reason }, { status:500 });
  const audit = await auditRootAction({ actorId:gate.ctx.user.id, action:'friccionauta.finding.save', target:memoryKey, payload:{ sourceRunId:sourceRunId || null, evidenceRefs, epistemicEventId:recorded.event.id }, request });
  return NextResponse.json({ ok:audit.ok, event:recorded.event, promotion:recorded.promotion, audit });
}
`;
fsr=fsr.slice(0,start)+saveFinding+fsr.slice(end);
write(fric,fsr);

const inst=`import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { recordCognitiveTwinExperience } from '@/core/cognitive-twin/experience';
import { auditRootAction, requireRootActor, requireRootContributor, requireRootViewer } from '@/lib/root/server';

export const dynamic='force-dynamic';
export const runtime='nodejs';
const TRANSFER_CLASSES=new Set(['TRANSFERIBLE','CONTEXTUAL','EXPERIMENTAL','PERSONAL','FOUNDER_RESERVED','OBSOLETE']);
const LIFECYCLE=new Set(['CAPTURED','EXTRACTED','UNDER_TEST','REPRODUCIBLE','INSTITUTIONALIZED','FOUNDER_RESERVED','REJECTED','OBSOLETE','UNRESOLVED']);
const REPLAY_OUTCOMES=new Set(['REQUIRES_FOUNDER','RESOLVED_WITHOUT_FOUNDER','INCONCLUSIVE']);
const DIMENSIONS=['CONTINUITY','METHOD','MEMORY','ROLES','AUTHORITY','REPRODUCIBILITY','CORRECTION','EXTERNAL_RECOGNITION'] as const;
type Row=Record<string,unknown>;
const rec=(v:unknown):Row=>v&&typeof v==='object'&&!Array.isArray(v)?v as Row:{};
const str=(v:unknown)=>typeof v==='string'&&v.trim()?v.trim():null;
const strs=(v:unknown)=>Array.isArray(v)?v.filter((x):x is string=>typeof x==='string'&&Boolean(x.trim())).map(x=>x.trim()):[];
const bool=(v:unknown)=>v===true?true:v===false?false:null;
function normalizeHistorical(row:Row){const content=rec(row.content);return{id:String(row.id??''),memoryKey:String(row.memory_key??''),memoryStatus:String(row.status??'CANDIDATE'),createdAt:row.created_at??null,updatedAt:row.updated_at??null,createdBy:row.created_by??null,evidenceRefs:strs(row.evidence_refs),...content}}
function buildSummary(events:Row[]){const lifecycle=(e:Row)=>String(e.lifecycleStatus??'CAPTURED');const transfer=(e:Row)=>String(e.transferClass??'UNRESOLVED');const transferCandidates=events.filter(e=>['TRANSFERIBLE','CONTEXTUAL','EXPERIMENTAL'].includes(transfer(e))&&!['INSTITUTIONALIZED','FOUNDER_RESERVED','REJECTED','OBSOLETE'].includes(lifecycle(e))).length;const underTest=events.filter(e=>['UNDER_TEST','REPRODUCIBLE'].includes(lifecycle(e))).length;const institutionalized=events.filter(e=>lifecycle(e)==='INSTITUTIONALIZED').length;const founderReserved=events.filter(e=>lifecycle(e)==='FOUNDER_RESERVED'||transfer(e)==='FOUNDER_RESERVED').length;const unresolved=events.filter(e=>['CAPTURED','EXTRACTED','UNRESOLVED'].includes(lifecycle(e))).length;const replayed=events.map(e=>rec(e.counterfactualReplay)).filter(r=>REPLAY_OUTCOMES.has(String(r.outcome??'')));const resolvedReplay=replayed.filter(r=>['REQUIRES_FOUNDER','RESOLVED_WITHOUT_FOUNDER'].includes(String(r.outcome))).length;const requiresFounder=replayed.filter(r=>r.outcome==='REQUIRES_FOUNDER').length;const founderDependency=resolvedReplay?requiresFounder/resolvedReplay:null;const vector=DIMENSIONS.map(dimension=>{const related=events.filter(e=>strs(e.institutionalDimensions).includes(dimension));let status='MISSING';if(related.some(e=>lifecycle(e)==='INSTITUTIONALIZED'))status='INSTITUTIONALIZED';else if(related.some(e=>['UNDER_TEST','REPRODUCIBLE'].includes(lifecycle(e))))status='UNDER_TEST';else if(related.length)status='CANDIDATE';return{dimension,status,eventCount:related.length}});return{total:events.length,transferCandidates,underTest,institutionalized,founderReserved,unresolved,replayed:replayed.length,founderDependency,vector}}
async function readState(service:any){
  const [history,ledger,decisions,experiment]=await Promise.all([
    service.from('sfi_cognitive_twin_memory').select('id,memory_key,memory_type,status,content,evidence_refs,source_kind,source_ref,created_by,created_at,updated_at').eq('memory_type','DECISION').like('memory_key','FDRE:%').order('created_at',{ascending:true}).limit(250),
    service.from('epistemic_events').select('id,event_name,payload,actor_id,created_at').eq('event_name','cognitive_twin.experience.recorded').order('created_at',{ascending:true}).limit(1000),
    service.from('sfi_cognitive_twin_decisions').select('id,decision_id,situation,rejected_condition,correct_state,general_rule,required_evidence,evidence_refs,status,approved_by,approved_at,created_by,created_at,updated_at').order('created_at',{ascending:false}).limit(200),
    service.from('sfi_institutional_experiments').select('*').eq('experiment_key','SFI-INSTITUTIONAL-30D-001').maybeSingle(),
  ]);
  const map=new Map<string,Row>();
  for(const row of history.data??[]){const event=normalizeHistorical(row as Row);map.set(String(event.memoryKey),event)}
  for(const row of ledger.data??[]){const payload=rec((row as Row).payload);const key=str(payload.memoryKey);if(!key||!key.startsWith('FDRE:'))continue;const content=rec(payload.content);const current=map.get(key)??{memoryKey:key,memoryStatus:'CANDIDATE',createdAt:(row as Row).created_at??null,evidenceRefs:[]};map.set(key,{...current,...content,updatedAt:(row as Row).created_at??null,createdBy:(row as Row).actor_id??null,epistemicEventId:(row as Row).id??null})}
  const events=[...map.values()].sort((a,b)=>String(b.updatedAt??b.createdAt??'').localeCompare(String(a.updatedAt??a.createdAt??'')));
  const warnings=[history.error?.message,ledger.error?.message,decisions.error?.message,experiment.error?.message].filter(Boolean);
  return{ok:!history.error&&!ledger.error,events,decisions:decisions.data??[],experiment:experiment.data??null,summary:buildSummary(events),warnings,epistemicBoundary:'Historical FDRE rows are read-only. New captures/reviews/replays are append-only Cognitive Twin epistemic events; memory promotion is policy-governed.'};
}
export async function GET(){const gate=await requireRootViewer('institutionalization.read');if(!gate.ok)return NextResponse.json(gate.body,{status:gate.status});return NextResponse.json(await readState(gate.ctx.service),{headers:{'Cache-Control':'no-store'}})}
export async function POST(request:Request){
  const body=await request.json().catch(()=>({})) as Row;const action=str(body.action)??'capture';
  if(action==='review'){
    const gate=await requireRootActor('institutionalization.review');if(!gate.ok)return NextResponse.json(gate.body,{status:gate.status});const memoryKey=str(body.memoryKey);const transferClass=str(body.transferClass);const lifecycleStatus=str(body.lifecycleStatus);if(!memoryKey||!transferClass||!TRANSFER_CLASSES.has(transferClass)||!lifecycleStatus||!LIFECYCLE.has(lifecycleStatus))return NextResponse.json({ok:false,error:'invalid_review_state'},{status:400});const state=await readState(gate.ctx.service);const current=state.events.find(e=>String(e.memoryKey)===memoryKey);if(!current)return NextResponse.json({ok:false,error:'fdre_not_found'},{status:404});const content={...current,transferClass,lifecycleStatus,extractedRule:str(body.extractedRule)??current.extractedRule??null,reviewNote:str(body.reviewNote),reviewedAt:new Date().toISOString(),reviewedBy:gate.ctx.user.id};const recorded=await recordCognitiveTwinExperience({memoryKey,memoryType:'DECISION',sourceKind:'founder_externalization_protocol',sourceRef:'FEP-01',createdBy:gate.ctx.user.id,operation:'REVIEW',content});if(!recorded.ok)return NextResponse.json({ok:false,error:recorded.reason},{status:400});const audit=await auditRootAction({actorId:gate.ctx.user.id,action:'institutionalization.review',target:memoryKey,payload:{transferClass,lifecycleStatus,epistemicEventId:recorded.event.id},request});return NextResponse.json({ok:audit.ok,event:{...content,epistemicEventId:recorded.event.id},audit});
  }
  if(action==='replay'){
    const gate=await requireRootContributor('institutionalization.replay');if(!gate.ok)return NextResponse.json(gate.body,{status:gate.status});const memoryKey=str(body.memoryKey);const outcome=str(body.outcome);if(!memoryKey||!outcome||!REPLAY_OUTCOMES.has(outcome))return NextResponse.json({ok:false,error:'invalid_replay'},{status:400});const state=await readState(gate.ctx.service);const current=state.events.find(e=>String(e.memoryKey)===memoryKey);if(!current)return NextResponse.json({ok:false,error:'fdre_not_found'},{status:404});const refs=strs(body.evidenceRefs);const content={...current,counterfactualReplay:{outcome,notes:str(body.notes),evidenceRefs:refs,observedAt:new Date().toISOString(),observedBy:gate.ctx.user.id}};const recorded=await recordCognitiveTwinExperience({memoryKey,memoryType:'DECISION',sourceKind:'founder_externalization_protocol',sourceRef:'FEP-01',createdBy:gate.ctx.user.id,evidenceRefs:refs,operation:'REPLAY',content});if(!recorded.ok)return NextResponse.json({ok:false,error:recorded.reason},{status:400});const audit=await auditRootAction({actorId:gate.ctx.user.id,action:'institutionalization.replay',target:memoryKey,payload:{outcome,evidenceRefs:refs,epistemicEventId:recorded.event.id},request});return NextResponse.json({ok:audit.ok,event:{...content,epistemicEventId:recorded.event.id},audit});
  }
  const gate=await requireRootContributor('institutionalization.capture');if(!gate.ok)return NextResponse.json(gate.body,{status:gate.status});const situation=str(body.situation);const founderIntervention=str(body.founderIntervention);const decision=str(body.decision);if(!situation||!founderIntervention||!decision)return NextResponse.json({ok:false,error:'situation_founder_intervention_decision_required'},{status:400});const transferClass=str(body.transferClass);const lifecycleStatus=str(body.lifecycleStatus)??'CAPTURED';const id=\`FDRE-\${new Date().toISOString().slice(0,10).replaceAll('-','')}-\${randomUUID().slice(0,8).toUpperCase()}\`;const memoryKey=\`FDRE:\${id}\`;const evidenceRefs=strs(body.evidenceRefs);const content={fdreId:id,situation,inputAvailable:str(body.inputAvailable),failure:str(body.failure),founderIntervention,decision,evidenceUsed:strs(body.evidenceUsed),rejectedAlternatives:strs(body.rejectedAlternatives),claimLimit:str(body.claimLimit),authority:str(body.authority)??'UNRESOLVED',extractedRule:str(body.extractedRule),transferClass:transferClass&&TRANSFER_CLASSES.has(transferClass)?transferClass:'UNRESOLVED',lifecycleStatus:LIFECYCLE.has(lifecycleStatus)?lifecycleStatus:'CAPTURED',institutionalDimensions:strs(body.institutionalDimensions).filter(v=>DIMENSIONS.includes(v as typeof DIMENSIONS[number])),observerNote:str(body.observerNote),founderPresent:bool(body.founderPresent)??true,epistemicClass:'OBSERVED',observedObject:'founder-dependent resolution event occurrence and recorded intervention',claimBoundary:'The event records that a founder intervention occurred. It does not prove that the extracted rule is transferable, reproducible, institutionalized or canonical.'};const recorded=await recordCognitiveTwinExperience({memoryKey,memoryType:'DECISION',sourceKind:gate.ctx.isRoot?'founder_externalization_protocol':'institutional_observer',sourceRef:'FEP-01',createdBy:gate.ctx.user.id,evidenceRefs,operation:'CAPTURE',content});if(!recorded.ok)return NextResponse.json({ok:false,error:recorded.reason},{status:400});const audit=await auditRootAction({actorId:gate.ctx.user.id,action:'institutionalization.capture',target:memoryKey,payload:{authority:content.authority,transferClass:content.transferClass,lifecycleStatus:content.lifecycleStatus,evidenceRefs,epistemicEventId:recorded.event.id},request});return NextResponse.json({ok:audit.ok,event:{memoryKey,...content,epistemicEventId:recorded.event.id},audit},{status:201});
}
`;
write('src/app/api/root/institutionalization/route.ts',inst);
console.log('Canonical cleanup C applied.');
