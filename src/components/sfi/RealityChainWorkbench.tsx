'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './RealityChainWorkbench.css';

type Ref={id:string;hash?:string|null;version?:string|null};
type CaseObject={id:string;kind:string;epistemicRole:string;canonicalRef:Ref;sourceRefs:Ref[];recordRefs:Ref[];evidenceRefs:Ref[];payload:Record<string,unknown>;observedAt:string|null;createdAt:string};
type CaseRecord={id:string;subject:string;scope:string;status:string;projectId?:string|null;createdAt:string;updatedAt:string;tenantId:string;serviceProfileId:string;temporalWindow:{cutoff:string;timezone:string;basis:string}};
type Project={id:string;name:string;caseCount:number;tenantId:string;description:string};
type CaseEnvelope={caseRecord:CaseRecord;objects:CaseObject[];readiness?:{missingSources:string[];readyForAnalysis:boolean}};
type Fragment={paragraph:number;page:number|null;pageBasis:string;text:string;start:number|null;end:number|null};
type Extraction={source:{filename:string;mime:string;size:number;sha256:string;modifiedAt:string|null};extraction:{parser:string;pageCount:number|null;fragmentCount:number;returnedFragments:number;complete:boolean;warnings:string[];fragments:Fragment[]}};
type Profile={id?:string;serviceProfileId?:string;name?:string;label?:string};
const STEPS=[
  {name:'REAL WORLD',role:'An external condition or event — only if grounded in a record or observation.'},
  {name:'SIGNAL',role:'Information that calls for attention; not automatically corroboration or counterevidence.'},
  {name:'OBSERVATION',role:'An observation with a source, time, scope and an identifiable observer.'},
  {name:'EVIDENCE',role:'Material admitted as evidence through a governed process; source registration alone is not enough.'},
  {name:'INFERENCE',role:'Interpretation and hypotheses, including rivals, uncertainty and limits.'},
  {name:'AUTHORITY',role:'The person or institution entitled to approve a particular action, with scope and validity.'},
  {name:'EXECUTION',role:'What actually happened, who acted, when, and what was recorded as completed.'},
  {name:'RETURN',role:'Observed effects, contrast against prior expectations, and proposed learning.'},
] as const;
const FULL_METHOD=['WORLD','CAPTURE','EVIDENCE','TRANSFORMATION','INFERENCE (CONDITIONAL)','VERIFICATION','AUTHORITY','ACTION','RETURN'] as const;
const TRANSVERSAL=['PROVENANCE','UNCERTAINTY','SIGNAL','COUNTEREVIDENCE','APPLICABLE OBLIGATION','ABSTAIN / ESCALATE / REJECT'] as const;
const KIND_TO_STEP:Record<string,number>={SOURCE:1,RECORD:1,OBSERVATION:2,EVIDENCE:3,HYPOTHESIS:4,ANALYSIS:4,EPISTEMIC_ASSESSMENT:4,UNRESOLVED_QUESTION:4,CONTRADICTION:4,GOVERNANCE_DECISION:5,RECOMMENDATION:5,INTERVENTION:6,INSTRUMENT_RUN:6,RETURN:7,TRAJECTORY:7};
function stageFor(o:CaseObject){
  const explicit=String(o.payload.realityStage??o.payload.stage??'').toUpperCase().replaceAll(' ','_');
  const index=STEPS.findIndex(s=>s.name.replaceAll(' ','_')===explicit);
  return index>=0?index:(KIND_TO_STEP[o.kind]??-1);
}
function safeText(v:unknown,fallback='NOT REPRESENTED'){return typeof v==='string'&&v.trim()?v:typeof v==='number'?String(v):fallback;}
function date(v:unknown){if(typeof v!=='string'||!v)return 'NOT DATED';const d=new Date(v);return Number.isNaN(d.getTime())?v:d.toLocaleString('en-US',{year:'numeric',month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'UTC',timeZoneName:'short'});}
function payloadDescription(o:CaseObject){
 const p=o.payload;return safeText(p.extractedText??p.statement??p.description??p.summary??p.label??p.objective??p.sourceType,'This record contains no human-readable description.');
}
function htmlSafe(value:unknown){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]??c));}
async function requestJson(url:string,init?:RequestInit){
 const response=await fetch(url,{cache:'no-store',...init});const body=await response.json().catch(()=>null);
 if(!response.ok||!body?.ok)throw new Error(safeText(body?.error??body?.message,'Request failed: '+response.status));
 return body;
}
function download(name:string,content:string,type:string){
 const url=URL.createObjectURL(new Blob([content],{type}));const link=document.createElement('a');
 link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function RealityChainWorkbench(){
 const scroll=useRef<HTMLDivElement>(null);
 const [cases,setCases]=useState<CaseRecord[]>([]);
 const [projects,setProjects]=useState<Project[]>([]);
 const [profiles,setProfiles]=useState<Profile[]>([]);
 const [caseId,setCaseId]=useState('');
 const [projectId,setProjectId]=useState('ALL');
 const [caseData,setCaseData]=useState<CaseEnvelope|null>(null);
 const [reports,setReports]=useState<unknown[]>([]);
 const [activeStep,setActiveStep]=useState(0);
 const [selectedObject,setSelectedObject]=useState<string|null>(null);
 const [newCase,setNewCase]=useState(false);
 const [title,setTitle]=useState('');
 const [scope,setScope]=useState('');
 const [profileId,setProfileId]=useState('');
 const [working,setWorking]=useState(false);
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');
 const [file,setFile]=useState<File|null>(null);
 const [externalRef,setExternalRef]=useState('');
 const [extraction,setExtraction]=useState<Extraction|null>(null);
 const [sourceRef,setSourceRef]=useState<Ref|null>(null);
 const [chosen,setChosen]=useState<number[]>([]);
 const [showMethod,setShowMethod]=useState(false);
 const [cutoff,setCutoff]=useState('');
 const [generatedAt,setGeneratedAt]=useState('');
 const refreshCases=useCallback(async()=>{
  const [c,p]=await Promise.all([requestJson('/api/cases'),requestJson('/api/cases/service-profiles')]);
  setCases(Array.isArray(c.cases)?c.cases:[]);setProjects(Array.isArray(c.projects)?c.projects:[]);
  setProfiles(Array.isArray(p.profiles)?p.profiles:[]);
 },[]);
 const loadCase=useCallback(async(id:string)=>{
  if(!id){setCaseData(null);setReports([]);return;}
  const [detail,saved]=await Promise.all([requestJson('/api/cases/'+encodeURIComponent(id)),requestJson('/api/cases/'+encodeURIComponent(id)+'/reports')]);
  setCaseData(detail);setReports(Array.isArray(saved.reports)?saved.reports:[]);
 },[]);
 useEffect(()=>{refreshCases().catch(e=>setError(String(e.message??e)));},[refreshCases]);
 useEffect(()=>{loadCase(caseId).catch(e=>{setError(String(e.message??e));setCaseData(null);});setExtraction(null);setSourceRef(null);setChosen([]);setSelectedObject(null);},[caseId,loadCase]);
 const visibleCases=useMemo(()=>cases.filter(c=>projectId==='ALL'||c.projectId===projectId),[cases,projectId]);
 const objects=caseData?.objects??[];
 const stageObjects=objects.filter(o=>stageFor(o)===activeStep);
 const focused=objects.find(o=>o.id===selectedObject)??null;
 const ordered=useMemo(()=>[...objects].sort((a,b)=>Date.parse(a.observedAt??a.createdAt)-Date.parse(b.observedAt??b.createdAt)),[objects]);
 const sourceObjects=objects.filter(o=>o.kind==='SOURCE');
 const asOfObjects=useMemo(()=>ordered.filter(o=>!cutoff||Date.parse(o.observedAt??o.createdAt)<=Date.parse(cutoff+'T23:59:59Z')),[ordered,cutoff]);
 const stageCoverage=STEPS.map((_,index)=>objects.filter(o=>stageFor(o)===index).length);
 const scrollTo=(part:number)=>scroll.current?.scrollTo({left:(scroll.current.scrollWidth-scroll.current.clientWidth)*part,behavior:'smooth'});
 const makeCase=async()=>{
  if(!title.trim()||!scope.trim()||!profileId){setError('Subject, scope and an existing service profile are required.');return;}
  setWorking(true);setError('');
  try{
   const now=new Date().toISOString();
   const created=await requestJson('/api/cases',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
    resource:'CASE',serviceProfileId:profileId,subject:title.trim(),scope:scope.trim(),
    systemBoundaryRef:{id:'user-scope:'+crypto.randomUUID(),version:'1.0',hash:null},
    temporalWindow:{mode:'LONGITUDINAL',basis:'OBSERVED_TIME',start:null,end:null,cutoff:now,timezone:'UTC',reconstructionAsOf:null,horizon:null}
   })});
   await refreshCases();setCaseId(created.case.id);setNewCase(false);setMessage('Case registered in your existing personal case platform. No evidence or authority was created.');
  }catch(e){setError(String((e as Error).message));}finally{setWorking(false);}
 };
 const extract=async()=>{
  if(!file){setError('Choose a local document first.');return;}
  setWorking(true);setError('');setMessage('');
  try{
   const body=new FormData();body.append('file',file);
   const parsed=await requestJson('/api/reality-chain/extract',{method:'POST',body});
   setExtraction(parsed);setChosen([]);setSourceRef(null);setFile(null);
   setMessage('Temporary extraction complete. The original file was not stored. Review the quoted passages and source locators before registering.');
  }catch(e){setError(String((e as Error).message));}finally{setWorking(false);}
 };
 const register=async()=>{
  if(!caseId||!extraction)return;
  setWorking(true);setError('');
  try{
   const src=extraction.source;
   const saved=await requestJson('/api/cases/'+encodeURIComponent(caseId)+'/sources',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
    sourceId:'local-sha256:'+src.sha256,sourceType:'DOCUMENT_REFERENCE',label:src.filename,externalRef:externalRef.trim()||null,contentHash:src.sha256,observedAt:new Date().toISOString(),
    metadata:{intakeMode:'TRANSIENT_EXTRACTION_NO_FILE_STORAGE',rawContentPersisted:false,sha256Basis:'SERVER_CALCULATED_DURING_TRANSIENT_EXTRACTION',hashDoesNotProveLongTermCustody:true,
      filename:src.filename,size:src.size,mime:src.mime,fileModifiedAt:src.modifiedAt,parser:extraction.extraction.parser,fragmentCount:extraction.extraction.fragmentCount,
      extractedFragmentsReturned:extraction.extraction.returnedFragments,complete:extraction.extraction.complete,warnings:extraction.extraction.warnings}
   })});
   setSourceRef(saved.source.canonicalRef);await loadCase(caseId);
   setMessage('Source reference persisted, without file bytes. Extracted passages are still separate unpromoted records.');
  }catch(e){setError(String((e as Error).message));}finally{setWorking(false);}
 };
 const savePassages=async()=>{
  if(!sourceRef||!extraction||!caseId)return;
  if(!chosen.length){setError('Select at least one passage to preserve.');return;}
  setWorking(true);setError('');
  try{
   const selected=chosen.slice(0,24);
   for(const index of selected){
    const segment=extraction.extraction.fragments[index];if(!segment)continue;
    await requestJson('/api/cases/'+encodeURIComponent(caseId)+'/objects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
     kind:'RECORD',canonicalRef:{id:'extracted:'+extraction.source.sha256+':'+(segment.page??'unknown')+':'+segment.paragraph,version:'1.0',hash:null},
     sourceRefs:[sourceRef],recordRefs:[],
     payload:{statement:'Deterministic document extraction',extractedText:segment.text,locator:{page:segment.page,pageBasis:segment.pageBasis,paragraph:segment.paragraph,
      extractedTextStart:segment.start,extractedTextEnd:segment.end},sourceFilename:extraction.source.filename,sourceHash:extraction.source.sha256,
      parser:extraction.extraction.parser,epistemicBoundary:'SOURCE_TEXT_IS_RECORD_NOT_VERIFIED_EVIDENCE',
      fragmentTruncated:segment.end!==null&&segment.start!==null&&segment.end-segment.start>segment.text.length}
    })});
   }
   setChosen(chosen.filter(i=>!selected.includes(i)));await loadCase(caseId);
   setMessage(String(selected.length)+' extracted passages preserved as RECORD with source linkage and locators. No evidence or claims were automatically promoted.');
  }catch(e){setError(String((e as Error).message));}finally{setWorking(false);}
 };
 const makeReport=()=>{
  if(!caseData)return;
  const document={contract:'SFI-REALITY-CHAIN-TRACEABILITY-DRAFT-0.1',classification:'DERIVED_READ_MODEL_NOT_INSTITUTIONAL_CERTIFICATION',
    generatedAt:new Date().toISOString(),sourceCutoff:cutoff||null,case:caseData.caseRecord,readiness:caseData.readiness,
    presentationStages:STEPS.map((s,i)=>({name:s.name,definition:s.role,records:asOfObjects.filter(o=>stageFor(o)===i)})),
    operationalMethod:FULL_METHOD,transversalConditions:TRANSVERSAL,
    uncategorizedObjects:asOfObjects.filter(o=>stageFor(o)<0),allRecordedObjects:asOfObjects,
    previousInstitutionalReports:reports,
    limitations:['Missing stage does not prove a control failed.','A document and its copies are not independent sources.','An extracted passage is a record, not verified evidence.',
      'No causal RETURN is inferred from execution.','Original files are not contained in this report; their source hashes and recorded excerpts are preserved.',
      'This is an account-scoped inspection draft, not an institutionally approved publication or certification.']};
  const base='SFI-REALITY-CHAIN-'+caseData.caseRecord.id.slice(0,12);
  download(base+'.json',JSON.stringify(document,null,2),'application/json');
  const cells=asOfObjects.map(o=>'<tr><td>'+htmlSafe(date(o.observedAt??o.createdAt))+'</td><td>'+htmlSafe(o.kind)+'</td><td>'+htmlSafe(payloadDescription(o))+'</td><td>'+htmlSafe(o.canonicalRef.id)+'</td><td>'+htmlSafe(o.canonicalRef.hash??'NOT RECORDED')+'</td></tr>').join('');
  const stageRows=STEPS.map((s,i)=>'<h2>'+String(i+1).padStart(2,'0')+' · '+htmlSafe(s.name)+'</h2><p>'+htmlSafe(s.role)+'</p><p>'+String(asOfObjects.filter(o=>stageFor(o)===i).length)+' represented objects</p>').join('');
  const html='<!doctype html><html lang="en"><meta charset="utf-8"><title>SFI Reality Chain Report</title><style>@page{size:A4;margin:20mm}body{background:#F7F4EA;color:#0B0B0A;font:14px/1.6 Georgia,serif;max-width:920px;margin:auto;padding:32px}header,footer{border-top:2px solid #D4AF37;padding-top:15px}h1,h2{font-weight:400}h1{font-size:36px}h2{margin-top:30px;border-bottom:1px solid #D4AF37}small,th,td,.meta{font:10px/1.6 monospace}table{border-collapse:collapse;width:100%;table-layout:fixed;overflow-wrap:anywhere}td,th{border-bottom:1px solid #bdb8a9;text-align:left;padding:8px}th{color:#6B635A}.boundary{border-left:3px solid #B85050;padding:14px;background:#e8e0da}@media print{body{padding:0}}</style><header><small>SFI / SYSTEM FRICTION INSTITUTE · INTERNAL / RECONSTRUCTABLE</small><h1>REALITY CHAIN<br>TRACEABILITY REPORT</h1><p>'+htmlSafe(caseData.caseRecord.subject)+'</p><p class="meta">CASE_ID / '+htmlSafe(caseId)+' · STATE / '+htmlSafe(caseData.caseRecord.status)+' · CUT-OFF / '+htmlSafe(cutoff||'ALL RECORDED')+' · GENERATED / '+htmlSafe(document.generatedAt)+'</p></header><div class="boundary"><b>DERIVED WORKING REPORT — NOT AN AUTHORITY OR SCIENTIFIC VALIDATION</b><p>The report contains only represented source records and citations. Unknown remains unknown.</p></div>'+stageRows+'<h2>DOCUMENTARY AND TEMPORAL LEDGER</h2><table><thead><tr><th>UTC TIME</th><th>TYPE</th><th>EXACT RECORD / DESCRIPTION</th><th>OBJECT REFERENCE</th><th>HASH</th></tr></thead><tbody>'+cells+'</tbody></table><h2>TRANSVERSAL CONTROLS</h2><p>'+htmlSafe(TRANSVERSAL.join(' · '))+'</p><footer><small>SFI · CASE_ID / '+htmlSafe(caseId)+' · SOURCE / CASE PLATFORM · AUTHORITY / NOT INFERRED · RETURN / ONLY IF RECORDED · '+htmlSafe(document.generatedAt)+'</small></footer></html>';
  download(base+'.html',html,'text/html');
  setGeneratedAt(document.generatedAt);setMessage('Download generated: complete represented case JSON and SFI V4 printable HTML. This is a working trace report, not a governed institutional certification.');
 };
 const createInstitutionalReport=async()=>{
  if(!caseId)return;
  setWorking(true);setError('');
  try{
   await requestJson('/api/cases/'+encodeURIComponent(caseId)+'/reports',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({claims:[],deliveryFormats:['JSON'],
    limitations:['No substantive claims have been approved in this report. This governed receipt records case references only.','The full trace export is a separately downloadable derived read-model, not a certified publication.']})});
   await loadCase(caseId);setMessage('An institutional report receipt was persisted under the existing governed Case Platform; no unsupported claims were added.');
  }catch(e){setError('Institutional report gate: '+String((e as Error).message));}finally{setWorking(false);}
 };
 return <main className="rcOperational" aria-label="Authenticated Reality Chain">
  <div className="rcBackdrop" aria-hidden="true"><img src="/assets/sfi/instruments/RealityChain.png" alt=""/></div>
  <header className="rcOperationalHead"><span>03 / REALITY CHAIN · AUTHENTICATED WORKSPACE</span><strong>FROM SOURCE TO CONSEQUENTIAL RETURN</strong><button type="button" onClick={()=>scrollTo(0)}>01 FIELD</button><button type="button" onClick={()=>scrollTo(1)}>02 DOSSIER / REPORT</button></header>
  <div className="rcOperationalScroller" ref={scroll}>
   <div className="rcOperationalTrack">
    <section className="rcHorizon rcFieldHorizon" aria-label="Reality Chain field">
     <aside className="rcCaseRail"><h1>REALITY<br/>CHAIN</h1><p>NOTHING ACTS ALONE.<br/>REALITY ANSWERS BACK.</p>
      <label>PROJECT FILTER<select value={projectId} onChange={e=>{setProjectId(e.target.value);setCaseId('')}}><option value="ALL">ALL AUTHORIZED PROJECTS</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name} · {p.caseCount}</option>)}</select></label>
      <label>YOUR CASES<select value={caseId} onChange={e=>setCaseId(e.target.value)}><option value="">SELECT AN EXISTING CASE</option>{visibleCases.map(c=><option key={c.id} value={c.id}>{c.subject} · {c.status}</option>)}</select></label>
      <button onClick={()=>setNewCase(!newCase)} type="button">{newCase?'CLOSE CASE INTAKE':'+ REGISTER NEW CASE'}</button>
      {newCase?<div className="rcNewCase"><label>CASE SUBJECT<input value={title} onChange={e=>setTitle(e.target.value)} maxLength={160}/></label><label>SCOPE<textarea value={scope} onChange={e=>setScope(e.target.value)} maxLength={2000} rows={3}/></label><label>EXISTING SERVICE PROFILE<select value={profileId} onChange={e=>setProfileId(e.target.value)}><option value="">SELECT PROFILE</option>{profiles.map((p,i)=><option key={i} value={p.id??p.serviceProfileId??''}>{p.name??p.label??p.id??p.serviceProfileId}</option>)}</select></label><button onClick={makeCase} disabled={working||!profileId}>REGISTER CASE</button></div>:null}
      <div className="rcRailStats"><span>{visibleCases.length} ACCOUNT-ACCESSIBLE CASES</span><span>{sourceObjects.length} REPRESENTED SOURCES</span><span>{objects.length} CASE OBJECTS</span></div>
      <button onClick={()=>setShowMethod(!showMethod)} type="button">{showMethod?'HIDE':'SHOW'} FULL METHOD & CONDITIONS</button>
     </aside>
     <div className="rcMainField">
       <p className="rcFieldKicker">MATERIAL CLAIM / DECISION CHAIN · EACH BOUNDARY IS INSPECTABLE</p>
       <div className="rcStageBand">{STEPS.map((stage,i)=><button type="button" key={stage.name} data-active={activeStep===i} onClick={()=>{setActiveStep(i);setSelectedObject(null)}}><small>{String(i+1).padStart(2,'0')}</small><strong>{stage.name}</strong><em>{stageCoverage[i]} RECORDS</em></button>)}</div>
       {showMethod?<div className="rcMethodDetails"><strong>FULL EXPERIMENTAL METHOD · NOT A MANDATORY SOFTWARE PIPELINE</strong><p>{FULL_METHOD.join(' → ')}</p><small>TRANSVERSAL · {TRANSVERSAL.join(' · ')}</small></div>:null}
       <div className="rcFieldBottom">
        <article className="rcPanel rcStepPanel"><small>SELECTED BOUNDARY · {String(activeStep+1).padStart(2,'0')}</small><h2>{STEPS[activeStep].name}</h2><p>{STEPS[activeStep].role}</p><strong>{stageObjects.length} represented case objects</strong><ul>{stageObjects.slice(0,9).map(o=><li key={o.id}><button type="button" onClick={()=>{setSelectedObject(o.id);scrollTo(1)}}>{safeText(o.payload.label??o.payload.statement??o.kind)} <span>→</span></button></li>)}</ul></article>
        <article className="rcPanel rcCaseOverview"><small>CASE PASSPORT</small><h2>{caseData?.caseRecord.subject??'Select a case to inspect its chain.'}</h2><p>{caseData?.caseRecord.scope??'The case and timeline will be read from your authorized Case Platform records.'}</p><dl><div><dt>CASE STATE</dt><dd>{caseData?.caseRecord.status??'NOT SELECTED'}</dd></div><div><dt>AS-OF CUTOFF</dt><dd>{caseData?.caseRecord.temporalWindow?.cutoff??'UNKNOWN'}</dd></div><div><dt>EVIDENCE COVERAGE</dt><dd>{caseData?.readiness?.readyForAnalysis?'PROFILE SOURCES PRESENT':'NOT ESTABLISHED'}</dd></div></dl></article>
        <article className="rcPanel rcTimeline"><small>OBSERVED / RECORDED TIME · UTC</small><h2>LONGITUDINAL CHAIN</h2><p>Time of the source event, observation and record creation are not interchangeable.</p><div className="rcTimelineEntries">{ordered.slice(0,12).map(o=><button key={o.id} type="button" onClick={()=>{setSelectedObject(o.id);scrollTo(1)}}><time>{date(o.observedAt??o.createdAt)}</time><strong>{o.kind}</strong></button>)}</div></article>
       </div>
     </div>
    </section>
    <section className="rcHorizon rcDossierHorizon" aria-label="Case source and traceability workbench">
      <div className="rcDossierIntro"><span>CASE PLATFORM / ACCOUNT-BOUND</span><h2>THE EVIDENCE<br/>HAS AN ADDRESS.</h2><p>Reconstruct the source, its extractable passages, precise locators, dates, authorized transitions and what remains unknown.</p><label>HISTORICAL READ-AS-OF DATE<input type="date" value={cutoff} onChange={e=>setCutoff(e.target.value)}/></label><small>Historical cutoff filters recorded objects; it cannot reconstruct a version that was not persisted.</small></div>
      <section className="rcPanel rcMaterials"><small>01 / SOURCE INTAKE</small><h2>Reference a document without storing the original</h2><p>Uploaded bytes are parsed transiently for exact text, hash and recoverable locators. The source is registered only when you confirm it.</p>
        <label>LOCAL DOCUMENT (PDF / DOCX / TXT / MD / CSV / JSON)<input type="file" accept=".pdf,.docx,.txt,.md,.csv,.tsv,.json" onChange={e=>setFile(e.target.files?.[0]??null)}/></label>
        <button type="button" disabled={!caseId||!file||working} onClick={extract}>EXTRACT TEMPORARILY · NO FILE STORAGE</button>
        {extraction?<><div className="rcSourceSummary"><strong>{extraction.source.filename}</strong><span>SHA-256 · {extraction.source.sha256}</span><span>{extraction.extraction.fragmentCount} PARAGRAPH BLOCKS · {extraction.extraction.parser}</span><span>{extraction.extraction.complete?'COMPLETE WITHIN PARSER LIMITS':'PARTIAL EXTRACTION · REVIEW REQUIRED'}</span>{extraction.extraction.warnings.map(w=><span key={w}>{w}</span>)}</div>
          <label>OPTIONAL EXTERNAL SOURCE REFERENCE<input placeholder="Institutional repository URL or stable reference" value={externalRef} onChange={e=>setExternalRef(e.target.value)} maxLength={1800}/></label>
          <button type="button" disabled={!!sourceRef||!caseId||working} onClick={register}>{sourceRef?'SOURCE REFERENCE RECORDED':'REGISTER SOURCE METADATA ONLY'}</button>
          <div className="rcExtracted">{extraction.extraction.fragments.map((part,i)=><label key={i} className="rcExtractedItem"><input type="checkbox" checked={chosen.includes(i)} onChange={e=>setChosen(old=>e.target.checked?[...old,i]:old.filter(x=>x!==i))}/><span><b>{part.page===null?'PAGE NOT RESOLVED':'PAGE '+part.page} · PARAGRAPH {part.paragraph}</b><p>{part.text}</p><small>EXTRACTED TEXT OFFSETS · {part.start??'UNKNOWN'}–{part.end??'UNKNOWN'}</small></span></label>)}</div>
          <button type="button" onClick={savePassages} disabled={!sourceRef||!chosen.length||working}>PRESERVE {Math.min(chosen.length,24)} SELECTED EXACT PASSAGES AS RECORDS</button>
        </>:null}
      </section>
      <section className="rcPanel rcDossierRecords"><small>02 / DOCUMENTARY LEDGER</small><h2>What actually exists in the record?</h2>{focused?<div className="rcFocused"><strong>{focused.kind} · {focused.epistemicRole}</strong><p>{payloadDescription(focused)}</p><small>CASE REFERENCE: {focused.canonicalRef.id}</small><small>HASH: {focused.canonicalRef.hash??'NOT REPRESENTED'}</small><small>OBSERVED: {date(focused.observedAt)} · RECORDED: {date(focused.createdAt)}</small><small>LOCATOR: {JSON.stringify(focused.payload.locator??'NOT REPRESENTED')}</small><small>RELATED SOURCE REFERENCES: {focused.sourceRefs.map(r=>r.id).join(', ')||'NOT REPRESENTED'}</small><button onClick={()=>setSelectedObject(null)}>SHOW COMPLETE LEDGER</button></div>:<div className="rcRecordList">{asOfObjects.map(o=><button key={o.id} type="button" onClick={()=>setSelectedObject(o.id)}><time>{date(o.observedAt??o.createdAt)}</time><strong>{o.kind} · {o.epistemicRole}</strong><span>{payloadDescription(o).slice(0,250)}</span></button>)}</div>}</section>
      <section className="rcPanel rcDeliver"><small>03 / TRACEABILITY DELIVERY</small><h2>Reconstruct · Inspect · Export</h2><p>Includes the case, all represented stages, unclassified objects, source lineage, source hashes, text excerpts and time boundaries. Missing records remain unknown.</p><strong>{asOfObjects.length} objects in selected historical reading · {reports.length} governed reports already recorded</strong><button type="button" disabled={!caseData||working} onClick={makeReport}>GENERATE COMPLETE REPRESENTED TRACE (JSON + PRINTABLE HTML)</button><button type="button" disabled={!caseData||working} onClick={createInstitutionalReport}>REGISTER GOVERNED REPORT RECEIPT (AUTHORIZED MEMBERS ONLY)</button><p>Report registration is an institutional act and does not certify unsupported claims. The full printable report is a derived inspection artifact.</p>{generatedAt?<small>LAST LOCAL EXPORT: {date(generatedAt)}</small>:null}</section>
    </section>
   </div>
  </div>
  <footer className="rcOperationalFooter"><div><strong>REALITY CHAIN / FIELD HISTORY</strong><span>CASE_ID · SOURCE · AUTHORITY · STATE · RETURN</span></div><div className="rcOperationalFooterRail"><span>WORLD</span><span>CAPTURE</span><span>EVIDENCE</span><span>VERIFY</span><span>AUTHORITY</span><span>ACTION</span><span>RETURN</span></div><button type="button" onClick={()=>scrollTo(0)}>← FIELD</button><button type="button" onClick={()=>scrollTo(1)}>DOSSIER →</button></footer>
  {message?<div className="rcToast" role="status">{message}<button onClick={()=>setMessage('')} aria-label="Dismiss message">×</button></div>:null}
  {error?<div className="rcToast rcToastError" role="alert">{error}<button onClick={()=>setError('')} aria-label="Dismiss error">×</button></div>:null}
 </main>;
}
