'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthState } from '@/components/auth/AuthProvider';

type Row = Record<string, any>;
type AgentTarget = { kind:'CASE'|'PROJECT'|'CYCLE'|'EVIDENCE'|'NODE'; id:string; title:string };
type TriState = 'NOT_DECLARED'|'YES'|'NO';
type CacheEntry = { at:number; data:Row };

const BASE_CACHE_TTL_MS=600_000;
const TARGET_CACHE_TTL_MS=120_000;
const DOSSIER_CACHE_TTL_MS=300_000;
const runtimeCache=new Map<string,CacheEntry>();
const targetCache=new Map<string,CacheEntry>();
const dossierCache=new Map<string,CacheEntry>();

const arr=(value:unknown):Row[]=>Array.isArray(value)?value.filter((item):item is Row=>Boolean(item&&typeof item==='object'&&!Array.isArray(item))):[];
const list=(value:unknown):unknown[]=>Array.isArray(value)?value:[];
const strings=(value:unknown):string[]=>list(value).map(String);
const txt=(value:unknown,fallback='—')=>typeof value==='string'&&value.trim()?value.trim():fallback;
function date(value:unknown){if(typeof value!=='string'||!value)return '—';const parsed=new Date(value);return Number.isNaN(parsed.valueOf())?value:parsed.toLocaleString('en-US')}
function short(value:unknown,max=240){const text=txt(value,'');return text.length>max?`${text.slice(0,max-1)}…`:text||'—'}
function tone(value:unknown){const state=String(value??'').toLowerCase();if(/human|required|review|approval/.test(state))return 'human';if(/blocked|failed|missing|degraded|contradict|insufficient/.test(state))return 'blocked';if(/complete|operational|allowed|ready|sufficient/.test(state))return 'ready';return 'working'}
function humanState(value:unknown){const state=String(value??'').toUpperCase();const labels:Record<string,string>={OPERATIONAL:'Operational',GATED:'Registered · no execution',DEGRADED:'Degraded',MISSING:'Not observed',IDLE:'Idle',RUNNING:'Running',WAITING_EVIDENCE:'Waiting for evidence',WAITING_HUMAN:'Waiting for human decision',WAITING_RETURN:'Waiting for RETURN',FAILED:'Failed',COMPLETE:'Complete',SUFFICIENT:'Sufficient',PARTIAL:'Partial',CONTRADICTED:'Contradicted',INSUFFICIENT:'Insufficient',NOT_OBSERVED:'Not observed',ALLOWED:'Allowed',ANALYSIS_ONLY:'Analysis only',APPROVAL_REQUIRED:'Approval required',BLOCKED:'Blocked'};return labels[state]??state.replaceAll('_',' ').toLowerCase()}
function Status({value}:{value:unknown}){return <span className={`sfiStatus ${tone(value)}`}>{humanState(value)}</span>}
function Trace({value}:{value:unknown}){return <details className="sfiTrace"><summary>View complete trace</summary><pre>{JSON.stringify(value,null,2)}</pre></details>}
function tri(value:TriState){return value==='YES'?true:value==='NO'?false:null}
function cacheFresh(entry:CacheEntry|undefined,ttl:number){return Boolean(entry&&Date.now()-entry.at<ttl)}
async function jsonFetch(url:string,init?:RequestInit){const response=await fetch(url,{cache:'no-store',...init});const json=await response.json().catch(()=>null);if(!response.ok||!json?.ok)throw new Error(json?.message||json?.details||json?.error||`${response.status}`);return json}

export function SfiGovernanceWorkspace({enabled}:{enabled:boolean}){
  const auth=useAuthState();
  const userKey=auth.identity?.userId??'unknown';
  const [runtime,setRuntime]=useState<Row|null>(null);
  const [evidenceTargets,setEvidenceTargets]=useState<Row|null>(null);
  const [caseIndex,setCaseIndex]=useState<Row>({projects:[],cases:[]});
  const [workboard,setWorkboard]=useState<Row|null>(null);
  const [agentId,setAgentId]=useState('');
  const [dossier,setDossier]=useState<Row|null>(null);
  const [selectedExecutionId,setSelectedExecutionId]=useState<string|null>(null);
  const [selectedTargets,setSelectedTargets]=useState<AgentTarget[]>([]);
  const [targetQuery,setTargetQuery]=useState('');
  const [purpose,setPurpose]=useState('Find evidence that supports or contradicts the open questions of the selected object.');
  const [url,setUrl]=useState('');
  const [file,setFile]=useState<File|null>(null);
  const [direction,setDirection]=useState('');
  const [parameters,setParameters]=useState<Record<string,string>>({});
  const [timeFrom,setTimeFrom]=useState('');
  const [timeTo,setTimeTo]=useState('');
  const [timezone,setTimezone]=useState('America/Mexico_City');
  const [subjectType,setSubjectType]=useState('NOT_DECLARED');
  const [jurisdiction,setJurisdiction]=useState('');
  const [personalData,setPersonalData]=useState<TriState>('NOT_DECLARED');
  const [sensitiveData,setSensitiveData]=useState<TriState>('NOT_DECLARED');
  const [personDecision,setPersonDecision]=useState<TriState>('NOT_DECLARED');
  const [purposeBasis,setPurposeBasis]=useState('');
  const [agentResult,setAgentResult]=useState<Row|null>(null);
  const [busy,setBusy]=useState<string|null>(null);
  const [error,setError]=useState<string|null>(null);
  const [notice,setNotice]=useState<string|null>(null);

  const loadBase=useCallback(async(force=false)=>{if(!enabled)return;const key=`${userKey}:governance-runtime`;const cached=runtimeCache.get(key);if(!force&&userKey!=='unknown'&&cacheFresh(cached,BASE_CACHE_TTL_MS)){setRuntime(cached!.data.runtime??null);setError(null);return}try{
    const data=await jsonFetch('/api/root/interactive?surface=governance');
    if(userKey!=='unknown')runtimeCache.set(key,{at:Date.now(),data});
    setRuntime(data.runtime??null);setError(null);
  }catch(cause){setError(cause instanceof Error?cause.message:String(cause))}},[enabled,userKey]);

  const loadTargets=useCallback(async(force=false)=>{if(!enabled||!agentId)return;const key=`${userKey}:governance-targets`;const cached=targetCache.get(key);const apply=(data:Row)=>{setRuntime(data.runtime??runtime);setEvidenceTargets(data.evidence??null);setCaseIndex({projects:data.caseIndex?.projects??[],cases:data.caseIndex?.cases??[]});setWorkboard(data.operationalNext?{operationalNext:data.operationalNext}:{operationalNext:{}})};if(!force&&userKey!=='unknown'&&cacheFresh(cached,TARGET_CACHE_TTL_MS)){apply(cached!.data);setError(null);return}try{
    const data=await jsonFetch('/api/root/interactive?surface=governance&includeTargets=1');
    if(userKey!=='unknown')targetCache.set(key,{at:Date.now(),data});
    apply(data);setError(null);
  }catch(cause){setError(cause instanceof Error?cause.message:String(cause))}},[enabled,agentId,userKey,runtime]);

  const loadDossier=useCallback(async(id:string,force=false)=>{if(!enabled||!id)return;const key=`${userKey}:agent:${id}`;const cached=dossierCache.get(key);const apply=(result:Row)=>{setDossier(result);const records=arr(result.history);setSelectedExecutionId(current=>current&&records.some(item=>item.executionId===current)?current:(result.state?.latestExecutionId??records[0]?.executionId??null))};if(!force&&userKey!=='unknown'&&cacheFresh(cached,DOSSIER_CACHE_TTL_MS)){apply(cached!.data);setError(null);return}try{
    const result=await jsonFetch(`/api/root/cognitive-runtime/records?agentId=${encodeURIComponent(id)}&limit=40`);
    if(userKey!=='unknown')dossierCache.set(key,{at:Date.now(),data:result});
    apply(result);setError(null);
  }catch(cause){setError(cause instanceof Error?cause.message:String(cause))}},[enabled,userKey]);

  useEffect(()=>{void loadBase(false)},[loadBase]);
  useEffect(()=>{if(!agentId){setDossier(null);setEvidenceTargets(null);setCaseIndex({projects:[],cases:[]});setWorkboard(null);return}void Promise.all([loadTargets(false),loadDossier(agentId,false)])},[agentId,loadTargets,loadDossier]);

  const agents=arr(runtime?.agents);
  const contracts=arr(runtime?.executionContracts);
  const selectedAgent=agents.find(item=>item.id===agentId)??null;
  const contract=contracts.find(item=>item.agentId===agentId)??dossier?.contract??null;
  const state=dossier?.state??null;
  const history=arr(dossier?.history);
  const selectedExecution=history.find(item=>item.executionId===selectedExecutionId)??history[0]??null;
  const projects=arr(caseIndex.projects);
  const cases=arr(caseIndex.cases);
  const cycles=arr(workboard?.operationalNext?.cycles);
  const evidenceEntries=arr(evidenceTargets?.evidence?.entries);
  const evidenceNodes=arr(evidenceTargets?.evidence?.nodes);
  const allowedTargetKinds=strings(contract?.allowedTargetKinds);
  const allowedAnchorKinds=strings(contract?.allowedAnchorKinds);
  const requiredParameters=strings(contract?.requiredParameters);
  const optionalParameters=strings(contract?.optionalParameters);
  const allowedDirections=strings(contract?.allowedDirections);
  const requestedOutputs=strings(contract?.requestedOutputs);

  const targetOptions=useMemo<AgentTarget[]>(()=>{
    const options:AgentTarget[]=[
      ...projects.filter(item=>item.status!=='CLOSED').map(item=>({kind:'PROJECT' as const,id:String(item.id),title:`Project · ${txt(item.name,item.id)}`})),
      ...cases.filter(item=>!['CLOSED','REJECTED'].includes(String(item.status))).map(item=>({kind:'CASE' as const,id:String(item.id),title:`Case · ${txt(item.subject,item.id)}`})),
      ...cycles.map(item=>({kind:'CYCLE' as const,id:String(item.cycleId),title:`Cycle · ${txt(item.title,item.cycleId)}`})),
      ...evidenceEntries.map(item=>({kind:'EVIDENCE' as const,id:String(item.id),title:`Evidence · ${txt(item.title??item.name,item.id)}`})),
      ...evidenceNodes.map(item=>({kind:'NODE' as const,id:String(item.id),title:`Node · ${txt(item.label??item.title,item.id)}`})),
    ];
    const allowed=new Set(allowedTargetKinds);
    const unique=[...new Map(options.filter(item=>!allowed.size||allowed.has(item.kind)).map(item=>[`${item.kind}:${item.id}`,item])).values()];
    const q=targetQuery.toLowerCase().trim();
    return (q?unique.filter(item=>`${item.kind} ${item.id} ${item.title}`.toLowerCase().includes(q)):unique).slice(0,40);
  },[projects,cases,cycles,evidenceEntries,evidenceNodes,allowedTargetKinds.join('|'),targetQuery]);

  useEffect(()=>{
    setSelectedTargets(current=>current.filter(item=>!allowedTargetKinds.length||allowedTargetKinds.includes(item.kind)).slice(0,Number(contract?.maxTargets??8)));
    setDirection(allowedDirections[0]??'');
    setParameters({});
    setAgentResult(null);
  },[agentId,contract?.version,allowedTargetKinds.join('|'),allowedDirections.join('|')]);

  const toggleTarget=(item:AgentTarget)=>setSelectedTargets(current=>{const key=`${item.kind}:${item.id}`;if(current.some(target=>`${target.kind}:${target.id}`===key))return current.filter(target=>`${target.kind}:${target.id}`!==key);const max=Number(contract?.maxTargets??8);return current.length>=max?current:[...current,item]});
  const minTargets=Number(contract?.minTargets??1);const maxTargets=Number(contract?.maxTargets??8);
  const targetCountValid=selectedTargets.length>=minTargets&&selectedTargets.length<=maxTargets;
  const missingRequiredParameters=requiredParameters.filter(key=>!parameters[key]?.trim());
  const canExecute=Boolean(agentId&&contract&&purpose.trim()&&targetCountValid&&!missingRequiredParameters.length&&busy!=='agent');

  const heartbeat=async()=>{setBusy('heartbeat');try{const result=await jsonFetch('/api/root/continuity',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'heartbeat'})});setNotice(result.result?.humanSummary?.message??'Continuity round executed.');await Promise.all([loadTargets(true),agentId?loadDossier(agentId,true):Promise.resolve()])}catch(cause){setError(cause instanceof Error?cause.message:String(cause))}finally{setBusy(null)}};

  const runAgent=async()=>{if(!canExecute||!contract)return;setBusy('agent');setAgentResult(null);try{
    let uploadedEvidenceId:string|undefined;
    if(file){const caseTarget=selectedTargets.find(item=>item.kind==='CASE');if(!caseTarget)throw new Error('To contribute a file from this surface, also select a CASE to anchor it.');const form=new FormData();form.set('file',file);form.set('title',`${caseTarget.title} · contributed file`);form.set('content',purpose);form.set('caseId',caseTarget.id);form.set('domain','case');const uploaded=await jsonFetch('/api/root/evidence',{method:'POST',body:form});uploadedEvidenceId=uploaded.data?.evidence?.id}
    const evidenceIds=[...new Set([...selectedTargets.filter(item=>item.kind==='EVIDENCE').map(item=>item.id),...(uploadedEvidenceId?[uploadedEvidenceId]:[])])];
    const anchorTarget=selectedTargets.find(item=>allowedAnchorKinds.includes(item.kind));
    const anchors=anchorTarget?[{kind:anchorTarget.kind,id:anchorTarget.id}]:[{kind:'ANALYSIS_SESSION',id:`root-ui:${agentId}:${crypto.randomUUID()}`,label:'ROOT governed analysis session'}];
    const parameterPayload=Object.fromEntries(Object.entries(parameters).filter(([,value])=>value.trim()).map(([key,value])=>[key,value.trim()]));
    const body={operation:'execute',agentId,purpose:purpose.trim(),anchors,targets:selectedTargets.map(({kind,id})=>({kind,id})),evidenceIds,sourceUrls:contract.acceptsSourceUrls&&url.trim()?[url.trim()]:[],timeRange:contract.timeRange==='NOT_APPLICABLE'?null:(timeFrom||timeTo||timezone?{from:timeFrom||null,to:timeTo||null,timezone:timezone||null}:null),direction:allowedDirections.length?(direction||null):null,parameters:parameterPayload,requestedOutputs,governanceContext:{subjectType,jurisdiction:jurisdiction.trim()||null,containsPersonalData:tri(personalData),containsSensitiveData:tri(sensitiveData),affectsDecisionAboutPersons:tri(personDecision),declaredPurposeBasis:purposeBasis.trim()||null}};
    const result=await jsonFetch('/api/root/cognitive-runtime',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
    setAgentResult(result.execution);setSelectedExecutionId(result.execution?.id??null);setNotice(result.execution?.humanSummary??'Agente ejecutado.');await Promise.all([loadTargets(true),loadDossier(agentId,true)]);
  }catch(cause){setError(cause instanceof Error?cause.message:String(cause))}finally{setBusy(null)}};

  if(!enabled)return null;
  const parameterKeys=[...new Set([...requiredParameters,...optionalParameters])];

  return <div className="sfiGovernanceLayout">
    {(error||notice)&&<div className={`sfiToast ${error?'error':''}`}><span>{error||notice}</span><button onClick={()=>{setError(null);setNotice(null)}}>×</button></div>}
    <section className="sfiGovernancePanel agentPanel"><header><span>AGENTS · PASSPORT</span><b>{agents.length}</b></header><div className="sfiAgentList">{agents.map(agent=><button key={agent.id} className={agentId===agent.id?'selected':''} onClick={()=>setAgentId(agent.id)}><small>{agent.layer} · {agent.domain}</small><strong>{agent.name}</strong><p>{agent.purpose}</p><em>{agent.humanApprovalRequired?'La autoridad humana se resuelve en ROOT cuando aplique':'Autoridad no expandida por el modelo'}</em></button>)}</div></section>

    <section className="sfiGovernancePanel operatorPanel"><header><span>RUNTIME / AGENTS · {selectedAgent?.name??'No agent selected'}</span><button className="heartbeat" disabled={busy==='heartbeat'||!agentId} onClick={()=>void heartbeat()}>{busy==='heartbeat'?'Running…':'RUN HEARTBEAT NOW'}</button></header><div className="sfiOperatorForm">
      {!agentId&&<div className="sfiAgentResult"><h3>DEFERRED HYDRATION</h3><p>Passports and contracts are available without loading Cases, Evidence, Graph, cycles or history. Select an agent to read only the targets and records needed to operate it.</p></div>}
      {agentId&&<><div className="sfiMetaGrid"><span>Infrastructure: <Status value={state?.infrastructure}/></span><span>Work: <Status value={state?.work}/></span><span>Epistemology: <Status value={state?.epistemic}/></span><span>Authority: <Status value={state?.authority}/></span><span>Latest execution: {date(state?.latestExecutionAt)}</span><span>Latest inference: {date(state?.latestInferenceAt)}</span><span>Generic interaction: {state?.latestInteractionObservation==='OBSERVED'?date(state?.latestInteractionAt):'NOT OBSERVED'}</span><span>Contract: {contract?.version??'—'}</span></div>
      <p>{dossier?.passport?.purpose??selectedAgent?.purpose}</p>
      <div className="sfiMetaGrid"><span>LEE: {arr(dossier?.passport?.reads).map(item=>txt(item.memory??item)).join(', ')||'—'}</span><span>ESCRIBE: {arr(dossier?.passport?.writes).map(item=>txt(item.memory??item)).join(', ')||'—'}</span><span>EMITE: {strings(dossier?.passport?.emits).join(', ')||'—'}</span><span>Perfil: {contract?.governanceProfile??'—'}</span></div>
      {state?.latestInferenceSummary&&<div className="sfiAgentResult"><h3>Latest current inference</h3><p>{state.latestInferenceSummary}</p>{state?.contextCoverage&&<p>Coverage: {state.contextCoverage.evidenceDelivered??'N/O'} / {state.contextCoverage.evidenceAvailable??'N/O'} evidence delivered · partial: {String(state.contextCoverage.partial??'N/O')}</p>}</div>}

      <h3>RUN UNDER CONTRACT</h3><p>Required targets: {minTargets}–{maxTargets}. Allowed types: {allowedTargetKinds.join(', ')||'—'}.</p>
      <label>Work objects ({selectedTargets.length}/{maxTargets})<input value={targetQuery} onChange={event=>setTargetQuery(event.target.value)} placeholder="Search allowed case, project, cycle, evidence or node…"/></label>
      <div className="sfiTargetResults">{targetOptions.map(item=>{const selected=selectedTargets.some(target=>target.kind===item.kind&&target.id===item.id);return <button className={selected?'selected':''} key={`${item.kind}:${item.id}`} onClick={()=>toggleTarget(item)}><small>{item.kind}</small><span>{item.title}</span></button>})}</div>
      {!targetCountValid&&<p>The contract requires between {minTargets} and {maxTargets} valid targets.</p>}
      <label>Purpose of this execution<textarea value={purpose} onChange={event=>setPurpose(event.target.value)} rows={4}/></label>
      {contract?.acceptsSourceUrls&&<label>Optional candidate URL<input value={url} onChange={event=>setUrl(event.target.value)} placeholder="https://…"/></label>}
      {contract?.acceptsEvidenceRefs&&<label className="filePicker">Optional file · a Case binding is required for intake<input type="file" onChange={event=>setFile(event.target.files?.[0]??null)}/><span>{file?.name??'Select file'}</span></label>}
      {allowedDirections.length>0&&<label>Direction<select value={direction} onChange={event=>setDirection(event.target.value)}>{allowedDirections.map(item=><option key={item} value={item}>{item}</option>)}</select></label>}
      {contract?.timeRange!=='NOT_APPLICABLE'&&<div className="sfiMetaGrid"><label>Desde<input type="datetime-local" value={timeFrom} onChange={event=>setTimeFrom(event.target.value)}/></label><label>Hasta<input type="datetime-local" value={timeTo} onChange={event=>setTimeTo(event.target.value)}/></label><label>Zona horaria<input value={timezone} onChange={event=>setTimezone(event.target.value)}/></label></div>}
      {parameterKeys.length>0&&<div><h3>Agent parameters</h3>{parameterKeys.map(key=><label key={key}>{key}{requiredParameters.includes(key)?' · required':' · optional'}<input value={parameters[key]??''} onChange={event=>setParameters(current=>({...current,[key]:event.target.value}))}/></label>)}</div>}

      <h3>Contextual preflight</h3><div className="sfiMetaGrid"><label>Subject<select value={subjectType} onChange={event=>setSubjectType(event.target.value)}>{['NOT_DECLARED','SYSTEM','ORGANIZATION','PERSON','GROUP','MIXED'].map(item=><option key={item}>{item}</option>)}</select></label><label>Jurisdiction<input value={jurisdiction} onChange={event=>setJurisdiction(event.target.value)} placeholder="MX, EU, internal organization…"/></label><label>Personal data<select value={personalData} onChange={event=>setPersonalData(event.target.value as TriState)}>{['NOT_DECLARED','YES','NO'].map(item=><option key={item}>{item}</option>)}</select></label><label>Sensitive data<select value={sensitiveData} onChange={event=>setSensitiveData(event.target.value as TriState)}>{['NOT_DECLARED','YES','NO'].map(item=><option key={item}>{item}</option>)}</select></label><label>Decision about people<select value={personDecision} onChange={event=>setPersonDecision(event.target.value as TriState)}>{['NOT_DECLARED','YES','NO'].map(item=><option key={item}>{item}</option>)}</select></label><label>Declared basis<input value={purposeBasis} onChange={event=>setPurposeBasis(event.target.value)} placeholder="Declared legal/organizational basis; not presumed"/></label></div>
      <button className="primaryAction" disabled={!canExecute} onClick={()=>void runAgent()}>{busy==='agent'?'Running agente…':'RUN CONTRACT'}</button>{missingRequiredParameters.length>0&&<p>Missing required parameters: {missingRequiredParameters.join(', ')}.</p>}
      {agentResult&&<div className="sfiAgentResult"><h3>{agentResult.agent?.name}</h3><p>{agentResult.humanSummary}</p><p>executionId: {agentResult.id}</p><Trace value={agentResult}/></div>}

      <h3>EXECUTION HISTORY</h3><div className="sfiDecisionList">{history.map(item=><article key={item.eventId} className={selectedExecutionId===item.executionId?'selected':''}><Status value={item.authority}/><strong>{date(item.occurredAt)} · {item.executionId??item.eventId}</strong><p>{short(item.purpose??item.interpretation?.summary??'Execution without visible purpose')}</p><button onClick={()=>setSelectedExecutionId(item.executionId)}>OPEN EXECUTION</button></article>)}{history.length===0&&<p>No executions are observed within the read window.</p>}</div>
      {selectedExecution&&<div className="sfiAgentResult"><h3>EXECUTION LINEAGE</h3><div className="sfiMetaGrid"><span>Request: {selectedExecution.requestSource??'N/O'}</span><span>Actor: {selectedExecution.requestedBy??'N/O'}</span><span>Contract: {selectedExecution.contractVersion??'N/O'}</span><span>Authority: {humanState(selectedExecution.authority)}</span><span>Governance: {selectedExecution.governance?.disposition??'N/O'}</span><span>Provider/model: {selectedExecution.telemetry?.provider?.value??'N/O'} / {selectedExecution.telemetry?.model?.value??'N/O'}</span><span>Input tokens: {selectedExecution.telemetry?.inputTokens?.observation==='OBSERVED'?selectedExecution.telemetry.inputTokens.value:'NOT_OBSERVED'}</span><span>Cost: {selectedExecution.telemetry?.providerCost?.observation==='OBSERVED'?selectedExecution.telemetry.providerCost.value:'NOT_OBSERVED'}</span></div><p>{selectedExecution.interpretation?.summary??'No observed inference exists for this execution.'}</p><p>Context ≠ evidence · evidence before/after: {selectedExecution.evidence?.before??'N/O'} → {selectedExecution.evidence?.after??'N/O'} · partial coverage: {String(selectedExecution.contextCoverage?.partial??'N/O')}</p><Trace value={selectedExecution}/></div>}
      {dossier?.historyRead&&<p>{strings(dossier.historyRead.warnings).join(' · ')}</p>}</>}
    </div></section>
  </div>;
}
