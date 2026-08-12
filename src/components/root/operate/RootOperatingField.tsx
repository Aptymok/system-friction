'use client';

import { useEffect, useMemo, useState } from 'react';
import './root-operating-field.css';

type Cycle = Record<string, any>;
type Surface = { key:string; label:string; href:string } | null;
type ProofStep = { id:string; label:string; status:'PASS'|'BLOCKED'; required?:boolean; ref:string|null; detail:string };
type Proof = { complete:boolean; steps:ProofStep[]; boundary:string } | null;

const STEPS = [
  ['OPEN','INICIO'],
  ['EVIDENCE','EVIDENCIA'],
  ['METHOD_SELECTED','MÉTODO'],
  ['STUDIO','STUDIO · AUX'],
  ['METHOD_LAB','LAB'],
  ['FIELD','FIELD'],
  ['WAITING_RETURN','RETORNO'],
  ['RETURNED','CONTRASTE'],
  ['TWIN_SYNCED','TWIN'],
  ['GOVERNANCE','ROOT'],
  ['CLOSED','CIERRE'],
] as const;

const SURFACES = [
  {key:'studio',label:'Studio · opcional',href:'/studio'},
  {key:'lab',label:'Method Lab',href:'/method-lab'},
  {key:'field',label:'Field',href:'/field'},
  {key:'twin',label:'Cognitive Twin',href:'/root/cognitive-twin'},
  {key:'readiness',label:'Readiness',href:'/root/readiness'},
] as const;

const SUBJECTS = [
  ['PERSON','Persona'],['SESSION','Sesión'],['OBJECT','Objeto'],['SIGNAL','Señal'],['ARTIFACT','Artefacto'],['PHENOMENON','Fenómeno'],['CASE','Caso'],['ORGANIZATION','Organización'],['SFI_SYSTEM','SFI'],
] as const;
const TEMPORAL = [['POINT_IN_TIME','Punto temporal'],['BOUNDED_WINDOW','Ventana'],['LONGITUDINAL','Longitudinal'],['SESSION','Sesión']] as const;

function arrays(value:any){return Array.isArray(value)?value:[];}
function methodName(cycle:Cycle|null){return cycle?.method_resolution?.primary?.methodId ?? 'POR RESOLVER';}
function statusIndex(status:string){const index=STEPS.findIndex(([key])=>key===status);return index<0?0:index;}
function refCount(cycle:Cycle|null){if(!cycle)return 0;return ['evidence_refs','studio_object_refs','method_lab_refs','return_refs','cognitive_twin_refs','governance_refs','event_refs'].reduce((sum,key)=>sum+arrays(cycle[key]).length,0)+(cycle.field_case_ref?1:0);}

export function RootOperatingField({ actorLabel }:{actorLabel:string}){
  const [cycles,setCycles]=useState<Cycle[]>([]);
  const [active,setActive]=useState<Cycle|null>(null);
  const [busy,setBusy]=useState('');
  const [message,setMessage]=useState('');
  const [surface,setSurface]=useState<Surface>(null);
  const [proof,setProof]=useState<Proof>(null);
  const [title,setTitle]=useState('');
  const [question,setQuestion]=useState('');
  const [subject,setSubject]=useState('CASE');
  const [temporal,setTemporal]=useState('LONGITUDINAL');
  const [evidenceTitle,setEvidenceTitle]=useState('');
  const [evidenceText,setEvidenceText]=useState('');
  const [file,setFile]=useState<File|null>(null);
  const [protocol,setProtocol]=useState<'sociotechnical_simulation'|'economic_simulation'>('sociotechnical_simulation');

  async function reload(selectId?:string){
    const response=await fetch('/api/root/operate/cycles',{cache:'no-store',credentials:'include'});
    const body=await response.json().catch(()=>null);
    if(!response.ok||!body?.ok){setMessage(body?.details??body?.error??'No fue posible leer los ciclos.');return;}
    const next=body.cycles??[];setCycles(next);
    const wanted=selectId??active?.id;setActive(next.find((item:Cycle)=>item.id===wanted)??next[0]??null);
  }
  useEffect(()=>{void reload();},[]);

  async function startCycle(){
    if(!title.trim()||!question.trim())return;
    setBusy('start');setMessage('');setProof(null);
    try{
      const response=await fetch('/api/root/operate/cycles',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({title,question,subject,temporalScope:temporal,evidenceModalities:['TEXT'],worldContextRequested:true,requiresTrajectory:temporal==='LONGITUDINAL',requiresRivalHypothesis:true,requiresInterventionTracking:true})});
      const body=await response.json().catch(()=>null);if(!response.ok||!body?.ok)throw new Error(body?.details??body?.error??`HTTP ${response.status}`);
      setTitle('');setQuestion('');setActive(body.cycle);setMessage(`Ciclo ${body.cycle.cycle_code} iniciado. SFI seleccionó ${body.method?.primary?.methodId??'sin método'} como instrumento primario.`);await reload(body.cycle.id);
    }catch(error){setMessage(error instanceof Error?error.message:String(error));}finally{setBusy('');}
  }

  async function patchCycle(input:Record<string,unknown>){
    if(!active)return null;
    const response=await fetch('/api/root/operate/cycles',{method:'PATCH',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:active.id,...input})});
    const body=await response.json().catch(()=>null);if(!response.ok||!body?.ok)throw new Error(body?.details??body?.error??`HTTP ${response.status}`);
    setActive(body.cycle);return body.cycle;
  }

  async function addEvidence(event:React.FormEvent){
    event.preventDefault();if(!active||(!evidenceText.trim()&&!file))return;
    setBusy('evidence');setMessage('');
    try{
      const form=new FormData();if(evidenceTitle.trim())form.set('title',evidenceTitle.trim());if(evidenceText.trim())form.set('content',evidenceText.trim());
      form.set('source','sfi_operating_field');form.set('evidenceType','observed_evidence');form.set('caseId',String(active.id));form.set('domain','digital');if(file)form.set('file',file);
      const response=await fetch('/api/root/evidence',{method:'POST',credentials:'include',body:form});const body=await response.json().catch(()=>null);
      if(!response.ok||!body?.ok)throw new Error(body?.details??body?.error??`HTTP ${response.status}`);
      const evidenceId=String(body.data?.evidence?.id??body.data?.id??'');if(evidenceId)await patchCycle({refKind:'evidence',ref:evidenceId,status:'EVIDENCE'});
      setEvidenceTitle('');setEvidenceText('');setFile(null);setMessage(body.duplicate?'La evidencia ya existía; se vinculó al ciclo sin duplicarla.':'Evidencia persistida, trazada y vinculada al ciclo.');await reload(active.id);
    }catch(error){setMessage(error instanceof Error?error.message:String(error));}finally{setBusy('');}
  }

  async function runLab(){
    if(!active||!arrays(active.evidence_refs).length)return;setBusy('lab');setMessage('');
    try{
      const response=await fetch('/api/root/method-lab/simulate',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({protocolId:protocol,evidenceIds:arrays(active.evidence_refs)})});
      const body=await response.json().catch(()=>null);if(!response.ok||!body?.ok)throw new Error(body?.details??body?.error??`HTTP ${response.status}`);
      await patchCycle({refKind:'method_lab',ref:String(body.labAnalysisId),status:'METHOD_LAB'});setMessage(`Laboratorio ejecutado como SIMULACIÓN. Resultado ${String(body.run?.resultHash??'').slice(0,12)}… persistido sin convertirlo en observación.`);await reload(active.id);
    }catch(error){setMessage(error instanceof Error?error.message:String(error));}finally{setBusy('');}
  }

  async function runInstitutional(){
    if(!active)return;setBusy('cycle');setMessage('');
    try{
      const response=await fetch('/api/root/institutional-cycle',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({trigger:`operating-field:${active.cycle_code}`})});
      const body=await response.json().catch(()=>null);if(!response.ok||!body?.ok)throw new Error(body?.details??body?.error??body?.status??`HTTP ${response.status}`);
      const ref=String(body.run?.id??body.taskId??'');if(ref)await patchCycle({refKind:'twin',ref,status:'TWIN_SYNCED'});setMessage('Ciclo institucional ejecutado y sincronizado con el Cognitive Twin.');await reload(active.id);
    }catch(error){setMessage(error instanceof Error?error.message:String(error));}finally{setBusy('');}
  }

  async function runFullProof(){
    if(!active)return;setBusy('proof');setMessage('');setProof(null);
    try{
      const response=await fetch('/api/root/operate/verify',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({operatingCycleId:active.id})});
      const body=await response.json().catch(()=>null);
      if(body?.proof)setProof(body.proof);
      if(!body?.proof&&(!response.ok||!body?.ok))throw new Error(body?.details??body?.error??`HTTP ${response.status}`);
      setMessage(body?.proof?.complete?'PRUEBA TOTAL: PASS. El núcleo institucional quedó trazado; ramas opcionales se reportan aparte.':'PRUEBA TOTAL: BLOQUEADA. La pantalla muestra exactamente qué dependencia obligatoria faltó; no se rellenó nada artificialmente.');
      await reload(active.id);
    }catch(error){setMessage(error instanceof Error?error.message:String(error));}finally{setBusy('');}
  }

  const currentStep=useMemo(()=>statusIndex(String(active?.status??'OPEN')),[active?.status]);
  const evidenceRefs=arrays(active?.evidence_refs);

  return <main className="sfi-operate">
    <header className="operate-header">
      <div><span>SYSTEM FRICTION INSTITUTE · PIPELINE INSTITUCIONAL</span><h1>Un ciclo. Todo SFI.</h1><p>Objeto → evidencia → método → laboratorio → Field → retorno → contraste → memoria → gobierno. Studio queda disponible como análisis especializado, no como dependencia del núcleo.</p></div>
      <aside><b>{actorLabel}</b><small>ROOT · SOBERANO</small><a href="/root">ROOT</a><a href="/root/method-lab">Laboratorio</a></aside>
    </header>

    <section className="cycle-rail" aria-label="Trayectoria del ciclo">
      {STEPS.map(([key,label],index)=><div key={key} data-state={index<currentStep?'done':index===currentStep?'current':'future'}><i>{String(index+1).padStart(2,'0')}</i><b>{label}</b></div>)}
    </section>

    {!active?<section className="start-cycle hero-card"><span>INICIAR</span><h2>¿Qué quieres observar?</h2><div className="start-grid"><label>TÍTULO<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Nombre corto del caso"/></label><label className="question">PREGUNTA<textarea value={question} onChange={e=>setQuestion(e.target.value)} placeholder="¿Qué quieres saber, cambiar o contrastar?"/></label><label>OBJETO<select value={subject} onChange={e=>setSubject(e.target.value)}>{SUBJECTS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label>TIEMPO<select value={temporal} onChange={e=>setTemporal(e.target.value)}>{TEMPORAL.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label></div><button onClick={()=>void startCycle()} disabled={busy==='start'||!title.trim()||!question.trim()}>{busy==='start'?'INICIANDO…':'INICIAR CICLO'}</button></section>:
    <>
      <section className="cycle-identity">
        <div><span>CICLO ACTIVO</span><h2>{active.title}</h2><p>{active.question}</p></div>
        <dl><div><dt>ESTADO</dt><dd>{active.status}</dd></div><div><dt>MÉTODO</dt><dd>{methodName(active)}</dd></div><div><dt>TRAZAS</dt><dd>{refCount(active)}</dd></div><div><dt>ID</dt><dd>{active.cycle_code}</dd></div></dl>
        <button className="quiet" onClick={()=>{setActive(null);setProof(null)}}>NUEVO CICLO</button>
      </section>

      <section className="system-map">
        <div className="map-core"><span>OBJETO</span><strong>{active.title}</strong><small>{active.subject} · {active.temporal_scope}</small></div>
        <button className="node n-evidence" onClick={()=>document.getElementById('operate-evidence')?.scrollIntoView({behavior:'smooth'})}><b>EVIDENCIA</b><small>{evidenceRefs.length} registros</small></button>
        <button className="node n-studio" onClick={()=>setSurface(SURFACES[0])}><b>STUDIO · OPCIONAL</b><small>análisis especializado</small></button>
        <button className="node n-lab" onClick={()=>setSurface(SURFACES[1])}><b>METHOD LAB</b><small>probar sin contaminar</small></button>
        <button className="node n-field" onClick={()=>setSurface(SURFACES[2])}><b>FIELD</b><small>ejecutar / retornar</small></button>
        <button className="node n-twin" onClick={()=>setSurface(SURFACES[3])}><b>COGNITIVE TWIN</b><small>recordar / aprender</small></button>
        <button className="node n-root" onClick={()=>setSurface(SURFACES[4])}><b>ROOT</b><small>gobernar / cerrar</small></button>
        <div className="flow-label">OBSERVAR → PROBAR → ACTUAR → VOLVER → APRENDER → GOBERNAR</div>
      </section>

      <section className="operate-columns">
        <form id="operate-evidence" className="operate-card evidence-card" onSubmit={addEvidence}><span>01 · ENTRADA</span><h3>Agregar evidencia</h3><p>Texto o archivo. SFI conserva hash, procedencia y relación con este ciclo. Almacenar no significa interpretar.</p><input value={evidenceTitle} onChange={e=>setEvidenceTitle(e.target.value)} placeholder="Título de la evidencia"/><textarea value={evidenceText} onChange={e=>setEvidenceText(e.target.value)} placeholder="Describe sólo lo observado o declarado."/><input type="file" onChange={e=>setFile(e.target.files?.[0]??null)}/><button disabled={busy==='evidence'||(!evidenceText.trim()&&!file)}>{busy==='evidence'?'GUARDANDO…':'GUARDAR Y TRAZAR'}</button></form>
        <article className="operate-card"><span>02 · MÉTODO</span><h3>{methodName(active)}</h3><p>{active.method_resolution?.rationale?.[0]??'SFI resolverá el instrumento cuando exista clasificación suficiente.'}</p><div className="chips">{arrays(active.method_resolution?.supporting).map((item:any)=><i key={item.methodId}>{item.methodId}</i>)}</div><details><summary>Por qué se eligió</summary><ul>{arrays(active.method_resolution?.rationale).map((line:string)=><li key={line}>{line}</li>)}</ul></details></article>
        <article className="operate-card"><span>03 · PRUEBA</span><h3>Laboratorio</h3><p>Ejecuta una simulación real del runtime sobre evidencia persistida. La salida permanece marcada como simulación.</p><select value={protocol} onChange={e=>setProtocol(e.target.value as any)}><option value="sociotechnical_simulation">Sociotécnica</option><option value="economic_simulation">Económica</option></select><button onClick={()=>void runLab()} disabled={busy==='lab'||!evidenceRefs.length}>{busy==='lab'?'EJECUTANDO…':'EJECUTAR SOBRE EVIDENCIA'}</button></article>
        <article className="operate-card"><span>04 · INTEGRACIÓN</span><h3>Ciclo institucional</h3><p>Sincroniza SFI con el Twin, ejecuta la topología cognitiva y vuelve a sincronizar. Una dependencia rota no puede presentarse como cierre.</p><button onClick={()=>void runInstitutional()} disabled={busy==='cycle'}>{busy==='cycle'?'EJECUTANDO…':'EJECUTAR CICLO SFI'}</button><button className="proof-button" onClick={()=>void runFullProof()} disabled={busy==='proof'}>{busy==='proof'?'VERIFICANDO TODO…':'PRUEBA TOTAL REAL'}</button></article>
      </section>

      <section className="trace-panel"><div className="trace-heading"><div><span>BITÁCORA DEL CICLO</span><h3>Qué existe de verdad</h3></div><button onClick={()=>void runFullProof()} disabled={busy==='proof'}>{busy==='proof'?'EJECUTANDO…':'VERIFICAR CICLO COMPLETO'}</button></div><div className="trace-grid"><Trace label="Evidencia" values={evidenceRefs}/><Trace label="Studio opcional" values={arrays(active.studio_object_refs)}/><Trace label="Laboratorio" values={arrays(active.method_lab_refs)}/><Trace label="Field" values={active.field_case_ref?[active.field_case_ref]:[]}/><Trace label="Retornos" values={arrays(active.return_refs)}/><Trace label="Twin" values={arrays(active.cognitive_twin_refs)}/><Trace label="Gobernanza" values={arrays(active.governance_refs)}/></div>{proof?<div className="proof-results" data-complete={proof.complete}><header><b>{proof.complete?'PRUEBA NÚCLEO · PASS':'PRUEBA NÚCLEO · BLOQUEADA'}</b><small>Sin mocks · sin outcomes inventados · Studio opcional · sin saltar ventanas Field</small></header><div>{proof.steps.map(step=><article key={step.id} data-status={step.status} data-required={step.required!==false}><strong>{step.required===false&&step.status==='BLOCKED'?'OPTIONAL':step.status}</strong><b>{step.label}</b><p>{step.detail}</p></article>)}</div><p>{proof.boundary}</p></div>:null}</section>
    </>}

    {cycles.length?<section className="recent-cycles"><header><span>HISTORIAL</span><h3>Ciclos recientes</h3></header>{cycles.slice(0,8).map(cycle=><button key={cycle.id} onClick={()=>{setActive(cycle);setProof(cycle.metadata?.fullCycleProof??null)}} data-active={active?.id===cycle.id}><b>{cycle.title}</b><span>{cycle.status} · {cycle.cycle_code}</span></button>)}</section>:null}
    {message?<div className="operate-message">{message}</div>:null}

    {surface?<div className="surface-layer"><header><div><span>DENTRO DEL MISMO CAMPO</span><b>{surface.label}</b></div><button onClick={()=>setSurface(null)}>CERRAR</button></header><iframe src={surface.href} title={surface.label}/></div>:null}
  </main>;
}

function Trace({label,values}:{label:string;values:string[]}){return <article data-empty={!values.length}><b>{label}</b><strong>{values.length}</strong><small>{values.length?values.slice(-2).map(value=>String(value).slice(0,16)).join(' · '):'Aún sin registro'}</small></article>}
