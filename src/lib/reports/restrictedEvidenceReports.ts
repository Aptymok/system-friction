import 'server-only';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

/**
 * Separate, source-only reporting. This is NOT the general cron permission:
 * no LLM, crawler, external contact, new World observation, execution or
 * scientific-memory promotion. The existing scheduled_report task IDs and
 * ROOT report inbox remain the sole persistence/reading contract.
 */
export const SFI_RESTRICTED_REPORT_CONTRACT = 'SFI-RESTRICTED-EVIDENCE-REPORTS-1.0';

type Lane = 'world_daily'|'world_weekly'|'internal_daily'|'prospect_weekly'|'attractor_daily';
type Evidence = {id:string; at:string; kind:string};
type Draft = {lane:Lane; title:string; period:string; body:string; evidence:Evidence[]; warnings:string[]};

function dateKey(date:Date) {
  const parts = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit'})
    .formatToParts(date);
  const p=(n:string)=>parts.find(x=>x.type===n)?.value??'';
  return [p('year'),p('month'),p('day')].join('-');
}
function weekKey(isoDate:string) {
  const t=new Date(isoDate+'T12:00:00Z');
  const shift=(t.getUTCDay()+6)%7;
  t.setUTCDate(t.getUTCDate()-shift+3);
  const year=t.getUTCFullYear();
  const jan=new Date(Date.UTC(year,0,4));
  jan.setUTCDate(jan.getUTCDate()-(jan.getUTCDay()+6)%7+3);
  return year+'-W'+String(1+Math.round((t.getTime()-jan.getTime())/604800000)).padStart(2,'0');
}
function iso(value:unknown):string|null{
  if(typeof value!=='string')return null;
  const t=Date.parse(value);return Number.isFinite(t)?new Date(t).toISOString():null;
}
function fromPeriod(at:string|null, day:string, week:string, cadence:'daily'|'weekly') {
  return !!at && (cadence==='daily'?dateKey(new Date(at))===day:weekKey(dateKey(new Date(at)))===week);
}

export async function runRestrictedEvidenceReports(now=new Date()) {
  const db=createServiceSupabaseClient();
  const today=dateKey(now),week=weekKey(today);
  // Read exactly bounded, already-persisted institutional evidence.
  const [worldRead,runRead,prospectRead,attractorRead]=await Promise.all([
    db.from('worldspect_snapshots').select('id,observed_at,source_state,evidence_level,wsi,nti,confidence').order('observed_at',{ascending:false}).limit(32),
    db.from('sfi_cognitive_twin_runs').select('id,role,status,created_at').order('created_at',{ascending:false}).limit(40),
    db.from('prospect_opportunity_reports').select('id,created_at,company_name,epistemic_status,confidence,run_id').order('created_at',{ascending:false}).limit(12),
    db.from('sfi_attractor_trajectory_snapshots').select('id,observed_at,source_state,evidence_coverage,supported_dimensions,missing_dimensions,contradicted_dimensions').order('observed_at',{ascending:false}).limit(8),
  ]);
  const errors=[
    worldRead.error?'worldspect_snapshots:'+worldRead.error.code:null,
    runRead.error?'sfi_cognitive_twin_runs:'+runRead.error.code:null,
    prospectRead.error?'prospect_opportunity_reports:'+prospectRead.error.code:null,
    attractorRead.error?'sfi_attractor_trajectory_snapshots:'+attractorRead.error.code:null,
  ].filter((x):x is string=>Boolean(x));
  if(errors.length)return {ok:false,contract:SFI_RESTRICTED_REPORT_CONTRACT,generated:0,skipped:0,failed:0,errors,modelInvoked:false,externalActions:0};

  const world=(worldRead.data??[]).filter(x=>x.id && iso(x.observed_at) && x.source_state==='observed');
  const runs=(runRead.data??[]).filter(x=>iso(x.created_at) && !['report_agent','report_scheduler'].includes(String(x.role)));
  const prospects=(prospectRead.data??[]).filter(x=>x.id&&iso(x.created_at));
  const attractors=(attractorRead.data??[]).filter(x=>x.id&&iso(x.observed_at));
  const wd=world.filter(x=>fromPeriod(iso(x.observed_at),today,week,'daily'));
  const ww=world.filter(x=>fromPeriod(iso(x.observed_at),today,week,'weekly'));
  const pd=prospects.filter(x=>fromPeriod(iso(x.created_at),today,week,'weekly'));
  const ad=attractors.filter(x=>fromPeriod(iso(x.observed_at),today,week,'daily'));
  const dailyRuns=runs.filter(x=>now.getTime()-Date.parse(x.created_at)<86400000);
  const drafts:Draft[]=[];
  const m=(v:unknown)=>v===null||v===undefined?'MISSING':String(v);
  const makeWorld=(lane:'world_daily'|'world_weekly',cohort:typeof world,period:string)=>{
    const latest=cohort[0],oldest=cohort[cohort.length-1];
    drafts.push({lane,period,title:'Mundo · '+(lane==='world_daily'?'diario':'semanal')+' · '+period,
      body:['Fuente: WorldSpect (snapshots ya persistidos).','Número de snapshots observados en muestra: '+cohort.length,
        'Primero: '+oldest.observed_at,'Último: '+latest.observed_at,
        'WSI: '+m(oldest.wsi)+' → '+m(latest.wsi),'NTI: '+m(oldest.nti)+' → '+m(latest.nti),
        'Confianza instrumental última: '+m(latest.confidence),
        'No se observó ni infirió causalidad ni se ejecutó una intervención para este reporte.'].join('\n'),
      evidence:cohort.slice(0,12).map(x=>({id:x.id,at:x.observed_at,kind:'worldspect_snapshot'})),
      warnings:['SOURCE_BOUNDED','NO_LLM','NO_NEW_OBSERVATION','NO_SCIENTIFIC_VALIDATION']});
  };
  if(wd.length)makeWorld('world_daily',wd,today);
  if(ww.length)makeWorld('world_weekly',ww,week);
  if(wd.length){
    const grouped:Record<string,number>={};
    for(const r of dailyRuns)grouped[r.role]=(grouped[r.role]??0)+1;
    drafts.push({lane:'internal_daily',period:today,title:'SFI interno · '+today,
      body:['Informe de continuidad basado en registros, no en ejecución nueva.',
        'WorldSpect observados hoy (muestra limitada): '+wd.length,
        'Recibos no asociados a reportes en 24 h: '+dailyRuns.length,
        'Roles con recibos: '+JSON.stringify(grouped),
        'No es prueba de ejecución de los 21 agentes ni de RETURN, adopción o aprendizaje consolidado.'].join('\n'),
      evidence:[{id:wd[0].id,at:wd[0].observed_at,kind:'worldspect_snapshot'},
        ...dailyRuns.slice(0,8).map(x=>({id:x.id,at:x.created_at,kind:'cognitive_run'}))],
      warnings:['PARTIAL_INTERNAL_REPORT','NO_LLM','NO_GOVERNED_EXECUTION']});
  }
  if(pd.length){
    drafts.push({lane:'prospect_weekly',period:week,title:'Prospectos · señales registradas · '+week,
      body:['Informes internos de radar generados durante esta semana: '+pd.length,
        'Son señales y candidatos preliminares, NO empresas verificadas, contratos ni clientes.',
        'No se realizó búsqueda ni contacto externo al elaborar este reporte.'].join('\n'),
      evidence:pd.slice(0,8).map(x=>({id:x.id,at:x.created_at,kind:'prospect_report'})),
      warnings:['PROSPECTS_NOT_VALIDATED','NO_CONTACT','NO_LLM']});
  }
  if(ad.length){
    const x=ad[0];
    drafts.push({lane:'attractor_daily',period:today,title:'Atractor · estado persistido · '+today,
      body:['Estado del atractor derivado de la última trayectoria registrada.',
        'Fuente: '+x.observed_at,'Cobertura de dimensiones con evidencia: '+m(x.evidence_coverage),
        'Soporte: '+JSON.stringify(x.supported_dimensions),
        'Evidencia ausente: '+JSON.stringify(x.missing_dimensions),
        'Contradicciones: '+JSON.stringify(x.contradicted_dimensions),
        'Cobertura NO equivale al cumplimiento del atractor. No se recalculó una trayectoria nueva.'].join('\n'),
      evidence:[{id:x.id,at:x.observed_at,kind:'attractor_trajectory'}],
      warnings:['PERSISTED_ONLY','NO_ATTRACTOR_REFRESH','NO_LLM']});
  }

  const results:{lane:Lane;state:'GENERATED'|'SKIPPED_EXISTING'|'FAILED';error?:string}[]=[];
  for(const d of drafts){
    const taskId='scheduled-report:'+d.lane+':'+d.period;
    const existing=await db.from('sfi_cognitive_twin_runs').select('id').eq('task_id',taskId).in('role',['report_agent','report_scheduler']).maybeSingle();
    if(existing.error){results.push({lane:d.lane,state:'FAILED',error:'EXISTING_REPORT_CHECK_FAILED'});continue;}
    if(existing.data){results.push({lane:d.lane,state:'SKIPPED_EXISTING'});continue;}
    const content={
      ok:true,type:d.lane,title:d.title,body:d.body,
      evidence:d.evidence.map(x=>x.id),
      provider:'deterministic:bounded-persisted-evidence',
      warnings:d.warnings,
      trace:{contract:SFI_RESTRICTED_REPORT_CONTRACT,sourceReceipts:d.evidence,period:d.period},
      approval_queue:{},
    };
    const insert=await db.from('sfi_cognitive_twin_runs').insert({
      task_id:taskId,contract_version:SFI_RESTRICTED_REPORT_CONTRACT,role:d.lane.startsWith('world')?'report_agent':'report_scheduler',
      provider:content.provider,model:null,status:'READY',objective:d.title,
      input_snapshot:{scheduleKey:d.lane,reportMode:'RESTRICTED_EVIDENCE_ONLY',schedule:{key:d.lane,period:d.period,cadence:d.lane.includes('weekly')?'weekly':'daily',timezone:'America/Mexico_City',generatedBy:'continuity-report-cron'}},
      output_envelope:content,evidence_refs:content.evidence,limitations:d.warnings,
      started_at:now.toISOString(),finished_at:new Date().toISOString(),
    }).select('id').single();
    results.push(insert.error?{lane:d.lane,state:'FAILED',error:'REPORT_PERSISTENCE_FAILED'}:{lane:d.lane,state:'GENERATED'});
  }
  return {ok:!results.some(x=>x.state==='FAILED'),contract:SFI_RESTRICTED_REPORT_CONTRACT,
    generated:results.filter(x=>x.state==='GENERATED').length,skipped:results.filter(x=>x.state==='SKIPPED_EXISTING').length,
    failed:results.filter(x=>x.state==='FAILED').length,
    unavailable:(['world_daily','world_weekly','internal_daily','prospect_weekly','attractor_daily'] as Lane[]).filter(k=>!drafts.some(x=>x.lane===k)),
    results,modelInvoked:false,externalActions:0,
    boundary:'Reports describe persisted receipts only; no new observations, models, contact, proposals, autonomous learning or governance changes.'};
}
