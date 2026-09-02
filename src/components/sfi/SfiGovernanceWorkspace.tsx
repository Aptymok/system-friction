'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type Row = Record<string, any>;
type AgentTarget = { kind:'CASE'|'PROJECT'|'CYCLE'|'EVIDENCE'|'NODE'; id:string; title:string };
type TriState = 'NOT_DECLARED'|'YES'|'NO';

const arr=(value:unknown):Row[]=>Array.isArray(value)?value.filter((item):item is Row=>Boolean(item&&typeof item==='object'&&!Array.isArray(item))):[];
const list=(value:unknown):unknown[]=>Array.isArray(value)?value:[];
const strings=(value:unknown):string[]=>list(value).map(String);
const txt=(value:unknown,fallback='—')=>typeof value==='string'&&value.trim()?value.trim():fallback;
function date(value:unknown){if(typeof value!=='string'||!value)return '—';const parsed=new Date(value);return Number.isNaN(parsed.valueOf())?value:parsed.toLocaleString('es-MX')}
function short(value:unknown,max=240){const text=txt(value,'');return text.length>max?`${text.slice(0,max-1)}…`:text||'—'}
function tone(value:unknown){const state=String(value??'').toLowerCase();if(/human|required|review|approval/.test(state))return 'human';if(/blocked|failed|missing|degraded|contradict|insufficient/.test(state))return 'blocked';if(/complete|operational|allowed|ready|sufficient/.test(state))return 'ready';return 'working'}
function humanState(value:unknown){const state=String(value??'').toUpperCase();const labels:Record<string,string>={OPERATIONAL:'Operativo',GATED:'Registrado · sin ejecución',DEGRADED:'Degradado',MISSING:'No observado',IDLE:'Inactivo',RUNNING:'Ejecutando',WAITING_EVIDENCE:'Esperando evidencia',WAITING_HUMAN:'Esperando decisión humana',WAITING_RETURN:'Esperando RETURN',FAILED:'Falló',COMPLETE:'Completo',SUFFICIENT:'Suficiente',PARTIAL:'Parcial',CONTRADICTED:'Contradicho',INSUFFICIENT:'Insuficiente',NOT_OBSERVED:'No observado',ALLOWED:'Permitido',ANALYSIS_ONLY:'Sólo análisis',APPROVAL_REQUIRED:'Requiere aprobación',BLOCKED:'Bloqueado'};return labels[state]??state.replaceAll('_',' ').toLowerCase()}
function Status({value}:{value:unknown}){return <span className={`sfiStatus ${tone(value)}`}>{humanState(value)}</span>}
function Trace({value}:{value:unknown}){return <details className="sfiTrace"><summary>Ver trazabilidad completa</summary><pre>{JSON.stringify(value,null,2)}</pre></details>}
function tri(value:TriState){return value==='YES'?true:value==='NO'?false:null}
async function jsonFetch(url:string,init?:RequestInit){const response=await fetch(url,{cache:'no-store',...init});const json=await response.json().catch(()=>null);if(!response.ok||!json?.ok)throw new Error(json?.message||json?.details||json?.error||`${response.status}`);return json}

export function SfiGovernanceWorkspace({enabled}:{enabled:boolean}){
  const [runtime,setRuntime]=useState<Row|null>(null);
  const [rootConsole,setRootConsole]=useState<Row|null>(null);
  const [caseIndex,setCaseIndex]=useState<Row>({projects:[],cases:[]});
  const [workboard,setWorkboard]=useState<Row|null>(null);
  const [proposals,setProposals]=useState<Row[]>([]);
  const [proposalReadState,setProposalReadState]=useState<'READY'|'DEGRADED'>('READY');
  const [proposalReadError,setProposalReadError]=useState<string|null>(null);
  const [agentId,setAgentId]=useState('evidence_hunter');
  const [dossier,setDossier]=useState<Row|null>(null);
  const [selectedExecutionId,setSelectedExecutionId]=useState<string|null>(null);
  const [selectedTargets,setSelectedTargets]=useState<AgentTarget[]>([]);
  const [targetQuery,setTargetQuery]=useState('');
  const [purpose,setPurpose]=useState('Busca evidencia que sostenga o contradiga las preguntas abiertas del objeto seleccionado.');
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

  const loadBase=useCallback(async()=>{if(!enabled)return;try{
    const [rt,root,ci,wb]=await Promise.all([jsonFetch('/api/root/cognitive-runtime'),jsonFetch('/api/root/console'),jsonFetch('/api/cases'),jsonFetch('/api/root/workboard')]);
    setRuntime(rt);setRootConsole(root);setCaseIndex({projects:ci.projects??[],cases:ci.cases??[]});setWorkboard(wb.workboard??{});
    try{const pr=await jsonFetch('/api/acp/proposals');setProposals(pr.data?.proposals??[]);setProposalReadState('READY');setProposalReadError(null)}catch(cause){setProposalReadState('DEGRADED');setProposalReadError(cause instanceof Error?cause.message:String(cause))}
    setError(null);
  }catch(cause){setError(cause instanceof Error?cause.message:String(cause))}},[enabled]);

  const loadDossier=useCallback(async(id:string)=>{if(!enabled||!id)return;try{
    const result=await jsonFetch(`/api/root/cognitive-runtime/records?agentId=${encodeURIComponent(id)}&limit=100`);
    setDossier(result);
    const records=arr(result.history);
    setSelectedExecutionId(current=>current&&records.some(item=>item.executionId===current)?current:(result.state?.latestExecutionId??records[0]?.executionId??null));
    setError(null);
  }catch(cause){setError(cause instanceof Error?cause.message:String(cause))}},[enabled]);

  useEffect(()=>{void loadBase();const timer=window.setInterval(()=>void loadBase(),30000);return()=>window.clearInterval(timer)},[loadBase]);
  useEffect(()=>{void loadDossier(agentId);const timer=window.setInterval(()=>void loadDossier(agentId),30000);return()=>window.clearInterval(timer)},[agentId,loadDossier]);

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
  const evidenceEntries=arr(rootConsole?.state?.evidence?.data?.entries);
  const evidenceNodes=arr(rootConsole?.state?.evidence?.data?.nodes);
  const allowedTargetKinds=strings(contract?.allowedTargetKinds);
  const allowedAnchorKinds=strings(contract?.allowedAnchorKinds);
  const requiredParameters=strings(contract?.requiredParameters);
  const optionalParameters=strings(contract?.optionalParameters);
  const allowedDirections=strings(contract?.allowedDirections);
  const requestedOutputs=strings(contract?.requestedOutputs);

  const targetOptions=useMemo<AgentTarget[]>(()=>{
    const options:AgentTarget[]=[
      ...projects.filter(item=>item.status!=='CLOSED').map(item=>({kind:'PROJECT' as const,id:String(item.id),title:`Proyecto · ${txt(item.name,item.id)}`})),
      ...cases.filter(item=>!['CLOSED','REJECTED'].includes(String(item.status))).map(item=>({kind:'CASE' as const,id:String(item.id),title:`Caso · ${txt(item.subject,item.id)}`})),
      ...cycles.map(item=>({kind:'CYCLE' as const,id:String(item.cycleId),title:`Ciclo · ${txt(item.title,item.cycleId)}`})),
      ...evidenceEntries.map(item=>({kind:'EVIDENCE' as const,id:String(item.id),title:`Evidencia · ${txt(item.title??item.name,item.id)}`})),
      ...evidenceNodes.map(item=>({kind:'NODE' as const,id:String(item.id),title:`Nodo · ${txt(item.label??item.title,item.id)}`})),
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

  const heartbeat=async()=>{setBusy('heartbeat');try{const result=await jsonFetch('/api/root/continuity',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'heartbeat'})});setNotice(result.result?.humanSummary?.message??'Ronda de continuidad ejecutada.');await loadBase()}catch(cause){setError(cause instanceof Error?cause.message:String(cause))}finally{setBusy(null)}};
  const decideProposal=async(item:Row,decision:'approve'|'reject')=>{setBusy(`proposal:${item.id}`);try{await jsonFetch(`/api/acp/proposals/${item.id}/${decision}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({note:decision==='approve'?'Autorizado desde Gobernanza IA.':'Denegado desde Gobernanza IA.'})});setNotice(decision==='approve'?'Propuesta autorizada.':'Propuesta denegada.');await loadBase()}catch(cause){setError(cause instanceof Error?cause.message:String(cause))}finally{setBusy(null)}};
  const requestEvidence=async(item:Row)=>{setBusy(`proposal:${item.id}`);try{await jsonFetch(`/api/sfi/proposals/${item.id}/request-evidence`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({evidence_required:'Busca evidencia suficiente para sostener, contradecir o volver indeterminada esta propuesta antes de decidir.'})});setNotice('Solicitud de evidencia registrada. SFI inició adquisición gobernada.');await loadBase()}catch(cause){setError(cause instanceof Error?cause.message:String(cause))}finally{setBusy(null)}};

  const runAgent=async()=>{if(!canExecute||!contract)return;setBusy('agent');setAgentResult(null);try{
    let uploadedEvidenceId:string|undefined;
    if(file){const caseTarget=selectedTargets.find(item=>item.kind==='CASE');if(!caseTarget)throw new Error('Para aportar un archivo desde esta superficie selecciona también un CASE que lo ancle.');const form=new FormData();form.set('file',file);form.set('title',`${caseTarget.title} · archivo aportado`);form.set('content',purpose);form.set('caseId',caseTarget.id);form.set('domain','case');const uploaded=await jsonFetch('/api/root/evidence',{method:'POST',body:form});uploadedEvidenceId=uploaded.data?.evidence?.id}
    const evidenceIds=[...new Set([...selectedTargets.filter(item=>item.kind==='EVIDENCE').map(item=>item.id),...(uploadedEvidenceId?[uploadedEvidenceId]:[])])];
    const anchorTarget=selectedTargets.find(item=>allowedAnchorKinds.includes(item.kind));
    const anchors=anchorTarget?[{kind:anchorTarget.kind,id:anchorTarget.id}]:[{kind:'ANALYSIS_SESSION',id:`root-ui:${agentId}:${crypto.randomUUID()}`,label:'ROOT governed analysis session'}];
    const parameterPayload=Object.fromEntries(Object.entries(parameters).filter(([,value])=>value.trim()).map(([key,value])=>[key,value.trim()]));
    const body={operation:'execute',agentId,purpose:purpose.trim(),anchors,targets:selectedTargets.map(({kind,id})=>({kind,id})),evidenceIds,sourceUrls:contract.acceptsSourceUrls&&url.trim()?[url.trim()]:[],timeRange:contract.timeRange==='NOT_APPLICABLE'?null:(timeFrom||timeTo||timezone?{from:timeFrom||null,to:timeTo||null,timezone:timezone||null}:null),direction:allowedDirections.length?(direction||null):null,parameters:parameterPayload,requestedOutputs,governanceContext:{subjectType,jurisdiction:jurisdiction.trim()||null,containsPersonalData:tri(personalData),containsSensitiveData:tri(sensitiveData),affectsDecisionAboutPersons:tri(personDecision),declaredPurposeBasis:purposeBasis.trim()||null}};
    const result=await jsonFetch('/api/root/cognitive-runtime',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
    setAgentResult(result.execution);setSelectedExecutionId(result.execution?.id??null);setNotice(result.execution?.humanSummary??'Agente ejecutado.');await Promise.all([loadBase(),loadDossier(agentId)]);
  }catch(cause){setError(cause instanceof Error?cause.message:String(cause))}finally{setBusy(null)}};

  if(!enabled)return null;
  const openProposals=proposals.filter(item=>['proposed','waiting_evidence','needs_evidence'].includes(String(item.status)));
  const parameterKeys=[...new Set([...requiredParameters,...optionalParameters])];

  return <div className="sfiGovernanceLayout">
    {(error||notice)&&<div className={`sfiToast ${error?'error':''}`}><span>{error||notice}</span><button onClick={()=>{setError(null);setNotice(null)}}>×</button></div>}
    <section className="sfiGovernancePanel agentPanel"><header><span>AGENTES · PASSPORT</span><b>{agents.length}</b></header><div className="sfiAgentList">{agents.map(agent=><button key={agent.id} className={agentId===agent.id?'selected':''} onClick={()=>setAgentId(agent.id)}><small>{agent.layer} · {agent.domain}</small><strong>{agent.name}</strong><p>{agent.purpose}</p><em>{agent.humanApprovalRequired?'Autoridad humana requerida donde aplique':'Autoridad no expandida por el modelo'}</em></button>)}</div></section>

    <section className="sfiGovernancePanel operatorPanel"><header><span>DOSSIER OPERACIONAL · {selectedAgent?.name??agentId}</span><button className="heartbeat" disabled={busy==='heartbeat'} onClick={()=>void heartbeat()}>{busy==='heartbeat'?'Ejecutando…':'Ejecutar heartbeat ahora'}</button></header><div className="sfiOperatorForm">
      <div className="sfiMetaGrid"><span>Infraestructura: <Status value={state?.infrastructure}/></span><span>Trabajo: <Status value={state?.work}/></span><span>Epistemología: <Status value={state?.epistemic}/></span><span>Autoridad: <Status value={state?.authority}/></span><span>Última ejecución: {date(state?.latestExecutionAt)}</span><span>Última inferencia: {date(state?.latestInferenceAt)}</span><span>Interacción genérica: {state?.latestInteractionObservation==='OBSERVED'?date(state?.latestInteractionAt):'NO OBSERVADA'}</span><span>Contrato: {contract?.version??'—'}</span></div>
      <p>{dossier?.passport?.purpose??selectedAgent?.purpose}</p>
      <div className="sfiMetaGrid"><span>LEE: {arr(dossier?.passport?.reads).map(item=>txt(item.memory??item)).join(', ')||'—'}</span><span>ESCRIBE: {arr(dossier?.passport?.writes).map(item=>txt(item.memory??item)).join(', ')||'—'}</span><span>EMITE: {strings(dossier?.passport?.emits).join(', ')||'—'}</span><span>Perfil: {contract?.governanceProfile??'—'}</span></div>
      {state?.latestInferenceSummary&&<div className="sfiAgentResult"><h3>Inferencia vigente más reciente</h3><p>{state.latestInferenceSummary}</p>{state?.contextCoverage&&<p>Cobertura: {state.contextCoverage.evidenceDelivered??'N/O'} / {state.contextCoverage.evidenceAvailable??'N/O'} evidencias entregadas · parcial: {String(state.contextCoverage.partial??'N/O')}</p>}</div>}

      <h3>EJECUTAR SEGÚN CONTRATO</h3><p>Objetivos requeridos: {minTargets}–{maxTargets}. Tipos permitidos: {allowedTargetKinds.join(', ')||'—'}.</p>
      <label>Objetos de trabajo ({selectedTargets.length}/{maxTargets})<input value={targetQuery} onChange={event=>setTargetQuery(event.target.value)} placeholder="Busca caso, proyecto, ciclo, evidencia o nodo permitido…"/></label>
      <div className="sfiTargetResults">{targetOptions.map(item=>{const selected=selectedTargets.some(target=>target.kind===item.kind&&target.id===item.id);return <button className={selected?'selected':''} key={`${item.kind}:${item.id}`} onClick={()=>toggleTarget(item)}><small>{item.kind}</small><span>{item.title}</span></button>})}</div>
      {!targetCountValid&&<p>El contrato exige entre {minTargets} y {maxTargets} objetivos válidos.</p>}
      <label>Propósito de esta ejecución<textarea value={purpose} onChange={event=>setPurpose(event.target.value)} rows={4}/></label>
      {contract?.acceptsSourceUrls&&<label>URL candidata opcional<input value={url} onChange={event=>setUrl(event.target.value)} placeholder="https://…"/></label>}
      {contract?.acceptsEvidenceRefs&&<label className="filePicker">Archivo opcional · requiere CASE para anclar su ingreso<input type="file" onChange={event=>setFile(event.target.files?.[0]??null)}/><span>{file?.name??'Seleccionar archivo'}</span></label>}
      {allowedDirections.length>0&&<label>Dirección<select value={direction} onChange={event=>setDirection(event.target.value)}>{allowedDirections.map(item=><option key={item} value={item}>{item}</option>)}</select></label>}
      {contract?.timeRange!=='NOT_APPLICABLE'&&<div className="sfiMetaGrid"><label>Desde<input type="datetime-local" value={timeFrom} onChange={event=>setTimeFrom(event.target.value)}/></label><label>Hasta<input type="datetime-local" value={timeTo} onChange={event=>setTimeTo(event.target.value)}/></label><label>Zona horaria<input value={timezone} onChange={event=>setTimezone(event.target.value)}/></label></div>}
      {parameterKeys.length>0&&<div><h3>Parámetros del agente</h3>{parameterKeys.map(key=><label key={key}>{key}{requiredParameters.includes(key)?' · requerido':' · opcional'}<input value={parameters[key]??''} onChange={event=>setParameters(current=>({...current,[key]:event.target.value}))}/></label>)}</div>}

      <h3>Preflight contextual</h3><div className="sfiMetaGrid"><label>Sujeto<select value={subjectType} onChange={event=>setSubjectType(event.target.value)}>{['NOT_DECLARED','SYSTEM','ORGANIZATION','PERSON','GROUP','MIXED'].map(item=><option key={item}>{item}</option>)}</select></label><label>Jurisdicción<input value={jurisdiction} onChange={event=>setJurisdiction(event.target.value)} placeholder="MX, EU, organización interna…"/></label><label>Datos personales<select value={personalData} onChange={event=>setPersonalData(event.target.value as TriState)}>{['NOT_DECLARED','YES','NO'].map(item=><option key={item}>{item}</option>)}</select></label><label>Datos sensibles<select value={sensitiveData} onChange={event=>setSensitiveData(event.target.value as TriState)}>{['NOT_DECLARED','YES','NO'].map(item=><option key={item}>{item}</option>)}</select></label><label>Decisión sobre personas<select value={personDecision} onChange={event=>setPersonDecision(event.target.value as TriState)}>{['NOT_DECLARED','YES','NO'].map(item=><option key={item}>{item}</option>)}</select></label><label>Base declarada<input value={purposeBasis} onChange={event=>setPurposeBasis(event.target.value)} placeholder="Base jurídica/organizacional declarada; no se presume"/></label></div>
      <button className="primaryAction" disabled={!canExecute} onClick={()=>void runAgent()}>{busy==='agent'?'Ejecutando agente…':'EJECUTAR CONTRATO'}</button>{missingRequiredParameters.length>0&&<p>Faltan parámetros requeridos: {missingRequiredParameters.join(', ')}.</p>}
      {agentResult&&<div className="sfiAgentResult"><h3>{agentResult.agent?.name}</h3><p>{agentResult.humanSummary}</p><p>executionId: {agentResult.id}</p><Trace value={agentResult}/></div>}

      <h3>HISTORIAL DE EJECUCIONES</h3><div className="sfiDecisionList">{history.map(item=><article key={item.eventId} className={selectedExecutionId===item.executionId?'selected':''}><Status value={item.authority}/><strong>{date(item.occurredAt)} · {item.executionId??item.eventId}</strong><p>{short(item.purpose??item.interpretation?.summary,'Ejecución sin propósito visible')}</p><button onClick={()=>setSelectedExecutionId(item.executionId)}>ABRIR EJECUCIÓN</button></article>)}{history.length===0&&<p>No hay ejecuciones observadas dentro de la ventana leída.</p>}</div>
      {selectedExecution&&<div className="sfiAgentResult"><h3>LINEAGE DE EJECUCIÓN</h3><div className="sfiMetaGrid"><span>Solicitud: {selectedExecution.requestSource??'N/O'}</span><span>Actor: {selectedExecution.requestedBy??'N/O'}</span><span>Contrato: {selectedExecution.contractVersion??'N/O'}</span><span>Autoridad: {humanState(selectedExecution.authority)}</span><span>Gobernanza: {selectedExecution.governance?.disposition??'N/O'}</span><span>Proveedor/modelo: {selectedExecution.telemetry?.provider?.value??'N/O'} / {selectedExecution.telemetry?.model?.value??'N/O'}</span><span>Tokens entrada: {selectedExecution.telemetry?.inputTokens?.observation==='OBSERVED'?selectedExecution.telemetry.inputTokens.value:'NOT_OBSERVED'}</span><span>Coste: {selectedExecution.telemetry?.providerCost?.observation==='OBSERVED'?selectedExecution.telemetry.providerCost.value:'NOT_OBSERVED'}</span></div><p>{selectedExecution.interpretation?.summary??'No existe inferencia observada para esta ejecución.'}</p><p>Contexto ≠ evidencia · evidencia antes/después: {selectedExecution.evidence?.before??'N/O'} → {selectedExecution.evidence?.after??'N/O'} · cobertura parcial: {String(selectedExecution.contextCoverage?.partial??'N/O')}</p><Trace value={selectedExecution}/></div>}
      {dossier?.historyRead&&<p>{strings(dossier.historyRead.warnings).join(' · ')}</p>}
    </div></section>

    <section className="sfiGovernancePanel decisionPanel"><header><span>DECISIONES</span><b>{openProposals.length}</b></header>{proposalReadState==='DEGRADED'&&<div className="sfiToast error"><span>Fuente de propuestas DEGRADED · se conserva la última cola visible. {proposalReadError}</span></div>}<div className="sfiDecisionList">{openProposals.map(item=><article key={item.id}><Status value={item.status}/><strong>{item.title||item.proposalType||'Propuesta'}</strong><p>{short(item.objective??item.expected_field_delta?.objective??'SFI solicita una decisión gobernada.',260)}</p><div><button onClick={()=>void decideProposal(item,'approve')} disabled={busy===`proposal:${item.id}`}>ACEPTAR</button><button onClick={()=>void requestEvidence(item)} disabled={busy===`proposal:${item.id}`}>PEDIR EVIDENCIA</button><button className="deny" onClick={()=>void decideProposal(item,'reject')} disabled={busy===`proposal:${item.id}`}>DENEGAR</button></div></article>)}{proposalReadState==='READY'&&openProposals.length===0&&<p>No hay decisiones abiertas.</p>}</div></section>
  </div>;
}
