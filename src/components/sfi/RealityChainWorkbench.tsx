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
  {name:'WORLD',role:'An external condition or event — only if grounded in a record or observation.'},
  {name:'SIGNAL',role:'Information that calls for attention; not automatically corroboration or counterevidence.'},
  {name:'OBSERVATION',role:'An observation with a source, time, scope and an identifiable observer.'},
  {name:'EVIDENCE',role:'Material admitted as evidence through a governed process; source registration alone is not enough.'},
  {name:'INFERENCE',role:'Interpretation and hypotheses, including rivals, uncertainty and limits.'},
  {name:'AUTHORITY',role:'The person or institution entitled to approve a particular action, with scope and validity.'},
  {name:'EXECUTION',role:'What actually happened, who acted, when, and what was recorded as completed.'},
  {name:'RETURN',role:'Observed effects and contrast against prior expectations; an action receipt is not a measured outcome.'},
  {name:'LEARNING',role:'Governed integration of what changed after a real-world RETURN; case closure is not automatically learning.'},
] as const;
const FULL_METHOD=['WORLD','CAPTURE','EVIDENCE','TRANSFORMATION','INFERENCE (CONDITIONAL)','VERIFICATION','AUTHORITY','ACTION','RETURN'] as const;
const TRANSVERSAL=['PROVENANCE','UNCERTAINTY','SIGNAL','COUNTEREVIDENCE','APPLICABLE OBLIGATION','ABSTAIN / ESCALATE / REJECT'] as const;
const KIND_TO_STEP:Record<string,number>={SOURCE:-1,RECORD:-1,OBSERVATION:2,EVIDENCE:3,HYPOTHESIS:4,ANALYSIS:4,EPISTEMIC_ASSESSMENT:4,UNRESOLVED_QUESTION:4,CONTRADICTION:4,GOVERNANCE_DECISION:5,RECOMMENDATION:4,INTERVENTION:6,INSTRUMENT_RUN:4,RETURN:7,TRAJECTORY:4};
function stageFor(o:CaseObject){
  if(o.kind==='SOURCE'||o.kind==='RECORD')return -1; // Capture/records are not signals, evidence or authorized executions.
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
 const [caseToLink,setCaseToLink]=useState('');
 const [screen,setScreen]=useState(0);
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
 useEffect(()=>{refreshCases().then(()=>{const incoming=new URLSearchParams(window.location.search).get('case');if(incoming)setCaseId(incoming);}).catch(e=>setError(String(e.message??e)));},[refreshCases]);
 useEffect(()=>{loadCase(caseId).catch(e=>{setError(String(e.message??e));setCaseData(null);});setExtraction(null);setSourceRef(null);setChosen([]);setSelectedObject(null);},[caseId,loadCase]);
 useEffect(()=>{
   const element=scroll.current;if(!element)return;
   const update=()=>setScreen(Math.max(0,Math.min(2,Math.round(element.scrollLeft/Math.max(element.clientWidth,1)))));
   element.addEventListener('scroll',update,{passive:true});
   const wheel=(event:WheelEvent)=>{
     const node=event.target as HTMLElement;
     if(event.ctrlKey||event.metaKey||node.closest('input,select,textarea,.rcExtracted,.rcRecordList,.rcTimelineEntries,.rcThreePane'))return;
     const delta=Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY;
     if(Math.abs(delta)<2)return;
     event.preventDefault();element.scrollBy({left:delta,behavior:'auto'});
   };
   element.addEventListener('wheel',wheel,{passive:false});
   return()=>{element.removeEventListener('wheel',wheel);element.removeEventListener('scroll',update);};
 },[]);
 const visibleCases=useMemo(()=>cases.filter(c=>projectId==='ALL'||c.projectId===projectId),[cases,projectId]);
 const objects=caseData?.objects??[];
 const ordered=useMemo(()=>[...objects].sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt)),[objects]);
 // Known-at requires a persisted row by the selected cutoff: backdated observedAt
 // alone cannot smuggle a later document into an earlier epistemic snapshot.
 const asOfObjects=useMemo(()=>ordered.filter(o=>!cutoff||(
   Date.parse(o.createdAt)<=Date.parse(cutoff+'T23:59:59Z')&&
   (!o.observedAt||Date.parse(o.observedAt)<=Date.parse(cutoff+'T23:59:59Z'))
 )),[ordered,cutoff]);
 const stageObjects=asOfObjects.filter(o=>stageFor(o)===activeStep);
 const focused=asOfObjects.find(o=>o.id===selectedObject)??null;
 const sourceObjects=asOfObjects.filter(o=>o.kind==='SOURCE');
 const stageCoverage=STEPS.map((_,index)=>asOfObjects.filter(o=>stageFor(o)===index).length);
 const scrollTo=(part:number)=>{const target=Math.max(0,Math.min(2,part));const el=scroll.current;el?.scrollTo({left:el.clientWidth*target,behavior:'smooth'});setScreen(target);};
 const makeCase=async()=>{
  if(!title.trim()||!scope.trim()||!profileId){setError('Subject, scope and an existing service profile are required.');return;}
  setWorking(true);setError('');
  try{
   const now=new Date().toISOString();
   const created=await requestJson('/api/cases',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
    resource:'CASE',serviceProfileId:profileId,subject:title.trim(),scope:scope.trim(),...(projectId!=='ALL'?{projectId,tenantId:projects.find(p=>p.id===projectId)?.tenantId}:{}),
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
 const persistTraceManifest=async()=>{
   if(!caseData||!caseId)return;
   if(sourceObjects.length>500){setError('Too many source references for a single bounded trace manifest. Partition the case first.');return;}
   setWorking(true);setError('');
   try{
     const snapshotAt=new Date().toISOString();
     const manifest={contract:'SFI-REALITY-CHAIN-MANIFEST-0.1',classification:'DERIVED_RECORD_NOT_AUTHORIZED_REPORT',
       title:'Traceability snapshot for '+caseData.caseRecord.subject,sourceCutoff:cutoff||null,recordedAt:snapshotAt,
       caseId,caseState:caseData.caseRecord.status,sourceHashes:sourceObjects.map(o=>({id:o.canonicalRef.id,hash:o.canonicalRef.hash??null})),
       objectRefs:asOfObjects.map(o=>({id:o.canonicalRef.id,hash:o.canonicalRef.hash??null,kind:o.kind,
         observedAt:o.observedAt,recordedAt:o.createdAt})),
       stages:STEPS.map((step,i)=>({name:step.name,count:asOfObjects.filter(o=>stageFor(o)===i).length})),
       method:FULL_METHOD,transversalControls:TRANSVERSAL,
       limitations:['Record of existing references only; not independent confirmation.','No original source files stored.','Absence of record does not prove failure or absence in the world.','No substantive claim authorized or validated.']};
     await requestJson('/api/cases/'+encodeURIComponent(caseId)+'/objects',{method:'POST',headers:{'Content-Type':'application/json'},
       body:JSON.stringify({kind:'RECORD',canonicalRef:{id:'trace-manifest:'+crypto.randomUUID(),version:'0.1',hash:null},
         sourceRefs:sourceObjects.map(o=>o.canonicalRef),recordRefs:[],payload:manifest})});
     await loadCase(caseId);
     setMessage('Traceability manifest persisted as a source-linked RECORD in the existing Case Platform. Institutional certification and learning authority remain unchanged.');
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
  const cells=asOfObjects.map(o=>'<tr><td>'+htmlSafe(date(o.observedAt))+'</td><td>'+htmlSafe(date(o.createdAt))+'</td><td>'+htmlSafe(o.kind)+' / '+htmlSafe(o.epistemicRole)+'</td><td>'+htmlSafe(payloadDescription(o))+'</td><td>'+htmlSafe(o.canonicalRef.id)+'<hr>'+htmlSafe(o.sourceRefs.map(r=>r.id).join(', ')||'NO SOURCE REF')+'</td><td>'+htmlSafe(o.canonicalRef.hash??'NOT RECORDED')+'</td><td>'+htmlSafe(JSON.stringify(o.payload.locator??'NOT REPRESENTED'))+'<hr>FILE MODIFIED: '+htmlSafe(((o.payload.metadata??{}) as Record<string,unknown>).fileModifiedAt??'NOT RECORDED')+'</td></tr>').join('');
  const stageRows=STEPS.map((s,i)=>'<h2>'+String(i+1).padStart(2,'0')+' · '+htmlSafe(s.name)+'</h2><p>'+htmlSafe(s.role)+'</p><p>'+String(asOfObjects.filter(o=>stageFor(o)===i).length)+' represented objects</p>').join('');
  const html='<!doctype html><html lang="en"><meta charset="utf-8"><title>SFI Reality Chain Report</title><style>@page{size:A4;margin:20mm}body{background:#F7F4EA;color:#0B0B0A;font:14px/1.6 Georgia,serif;max-width:920px;margin:auto;padding:32px}header,footer{border-top:2px solid #D4AF37;padding-top:15px}h1,h2{font-weight:400}h1{font-size:36px}h2{margin-top:30px;border-bottom:1px solid #D4AF37}small,th,td,.meta{font:10px/1.6 monospace}table{border-collapse:collapse;width:100%;table-layout:fixed;overflow-wrap:anywhere}td,th{border-bottom:1px solid #bdb8a9;text-align:left;padding:8px}th{color:#6B635A}.boundary{border-left:3px solid #B85050;padding:14px;background:#e8e0da}@media print{body{padding:0}}</style><header><small>SFI / SYSTEM FRICTION INSTITUTE · INTERNAL / RECONSTRUCTABLE</small><h1>REALITY CHAIN<br>TRACEABILITY REPORT</h1><p>'+htmlSafe(caseData.caseRecord.subject)+'</p><p class="meta">CASE_ID / '+htmlSafe(caseId)+' · STATE / '+htmlSafe(caseData.caseRecord.status)+' · CUT-OFF / '+htmlSafe(cutoff||'ALL RECORDED')+' · GENERATED / '+htmlSafe(document.generatedAt)+'</p></header><div class="boundary"><b>DERIVED WORKING REPORT — NOT AN AUTHORITY OR SCIENTIFIC VALIDATION</b><p>The report contains only represented source records and citations. Unknown remains unknown.</p></div><h2>FULL EXPERIMENTAL METHOD</h2><p>'+htmlSafe(FULL_METHOD.join(' → '))+'</p>'+stageRows+'<h2>DOCUMENTARY AND TEMPORAL LEDGER</h2><table><thead><tr><th>OBSERVED (UTC)</th><th>RECORDED (UTC)</th><th>KIND / ROLE</th><th>EXACT RECORD / DESCRIPTION</th><th>OBJECT AND SOURCE REF</th><th>SHA / OBJECT HASH</th><th>EXTRACTION LOCATOR</th></tr></thead><tbody>'+cells+'</tbody></table><h2>TRANSVERSAL CONTROLS</h2><p>'+htmlSafe(TRANSVERSAL.join(' · '))+'</p><footer><small>SFI · CASE_ID / '+htmlSafe(caseId)+' · SOURCE / CASE PLATFORM · AUTHORITY / NOT INFERRED · RETURN / ONLY IF RECORDED · '+htmlSafe(document.generatedAt)+'</small></footer></html>';
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

  const linkedCaseObjects=objects.filter(o=>o.kind==='RECORD'&&o.payload?.contract==='SFI-CROSS-CASE-SOURCE-REFERENCE-1.0');
  const availableToLink=cases.filter(candidate=>candidate.id!==caseId&&candidate.tenantId===caseData?.caseRecord.tenantId);
  const linkExistingCase=async()=>{
    if(!caseId||!caseToLink)return;
    setWorking(true);setError('');
    try{
      await requestJson('/api/cases/'+encodeURIComponent(caseId)+'/linked-cases',{
        method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({referencedCaseId:caseToLink}),
      });
      await loadCase(caseId);
      setCaseToLink('');
      setMessage('Case chain recorded as an auditable SOURCE REFERENCE. Its claims were not promoted to evidence or canon.');
    }catch(e){setError(String((e as Error).message));}finally{setWorking(false);}
  };
  const uploadOriginal=async()=>{
    if(!caseId||!file)return;
    if(file.size>25*1024*1024){setError('SOURCE_MAX_FILE_SIZE_25_MB');return;}
    setWorking(true);setError('');setMessage('');
    try{
      const signed=await requestJson('/api/cases/'+encodeURIComponent(caseId)+'/sources/upload-ticket',{
        method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
          filename:file.name,size:file.size,contentType:file.type||'application/octet-stream',
        }),
      });
      const receipt=signed.upload;
      if(typeof receipt?.signedUrl!=='string'||!receipt.signedUrl.startsWith('https://'))throw new Error('SIGNED_UPLOAD_URL_UNAVAILABLE');
      const stored=await fetch(receipt.signedUrl,{method:'PUT',
        headers:{'Content-Type':file.type||'application/octet-stream','x-upsert':'false'},body:file});
      if(!stored.ok)throw new Error('DIRECT_STORAGE_UPLOAD_FAILED:'+stored.status);
      await requestJson('/api/cases/'+encodeURIComponent(caseId)+'/sources/finalize-upload',{
        method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
          storagePath:receipt.storagePath,filename:file.name,size:file.size,
          contentType:file.type||'application/octet-stream',sourceType:'FILE_UPLOAD',
        }),
      });
      const detail=await requestJson('/api/cases/'+encodeURIComponent(caseId));
      if(!Array.isArray(detail.objects)||!detail.objects.some((o:CaseObject)=>o.kind==='SOURCE'&&o.payload?.label===file.name)){
        throw new Error('UPLOAD_REGISTERED_BUT_SOURCE_READBACK_NOT_CONFIRMED');
      }
      setCaseData(detail);setFile(null);
      setMessage('File uploaded to the existing private SFI case bucket and source registered. SOURCE is not EVIDENCE.');
    }catch(e){setError(String((e as Error).message));}finally{setWorking(false);}
  };

 return <main className="rcOperational rcThreeMode" aria-label="Authenticated Reality Chain">
  <header className="rcOperationalHead">
    <span>REALITY CHAIN · INSTITUTIONAL RECONSTRUCTION</span>
    <strong>KNOWN THEN ≠ KNOWN NOW</strong>
    <button type="button" aria-current={screen===0?'step':undefined} onClick={()=>scrollTo(0)}>01 · OBSERVE</button>
    <button type="button" aria-current={screen===1?'step':undefined} onClick={()=>scrollTo(1)}>02 · ASSESS</button>
    <button type="button" aria-current={screen===2?'step':undefined} onClick={()=>scrollTo(2)}>03 · ACT & LEARN</button>
  </header>

  <div className="rcGlobalCaseBar">
    <label>PROJECT
      <select value={projectId} onChange={e=>{setProjectId(e.target.value);setCaseId('')}}>
        <option value="ALL">ALL ACCESSIBLE PROJECTS</option>
        {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    </label>
    <label>CASE
      <select value={caseId} onChange={e=>{setCaseId(e.target.value);setSelectedObject(null)}}>
        <option value="">SELECT A PERSISTED CASE</option>
        {visibleCases.map(c=><option key={c.id} value={c.id}>{c.subject} · {c.status}</option>)}
      </select>
    </label>
    <label>RECONSTRUCT AS OF
      <input type="date" value={cutoff} onChange={e=>setCutoff(e.target.value)}/>
    </label>
    <button type="button" onClick={()=>setNewCase(!newCase)}>{newCase?'CANCEL INTAKE':'+ NEW CASE'}</button>
    <span>{caseData?caseData.caseRecord.status:'NO CASE SELECTED'} · {objects.length} RECORDED OBJECTS</span>
    {newCase?<div className="rcGlobalNewCase">
      <label>CASE SUBJECT<input value={title} onChange={e=>setTitle(e.target.value)} maxLength={160}/></label>
      <label>CASE SCOPE<textarea value={scope} onChange={e=>setScope(e.target.value)} maxLength={2000} rows={2}/></label>
      <label>AUTHORIZED SERVICE PROFILE
        <select value={profileId} onChange={e=>setProfileId(e.target.value)}>
          <option value="">SELECT PROFILE</option>
          {profiles.map((p,i)=><option key={i} value={p.id??p.serviceProfileId??''}>{p.name??p.label??p.id??p.serviceProfileId}</option>)}
        </select>
      </label>
      <button type="button" disabled={working||!profileId} onClick={makeCase}>REGISTER CASE IN CASE PLATFORM</button>
    </div>:null}
  </div>

  <div className="rcOperationalScroller" ref={scroll} aria-label="Reality Chain three-screen horizontal reconstruction">
    <div className="rcOperationalTrack">
      <div className="rcBackdrop" aria-hidden="true"><img src="/assets/sfi/instruments/RealityChain.png" alt=""/></div>

      <section className="rcHorizon rcThreeHorizon" aria-label="Screen 1 · World, Signal, Observation">
        <div className="rcThreeHorizonTop">
          <div className="rcScreenIdentifier">01 / 03</div>
          <h1>WORLD · SIGNAL · OBSERVATION</h1>
          <p>What existed, what attracted attention, and what was actually recorded.</p>
          <div className="rcThreeStageBand">
            {STEPS.slice(0,3).map((stage,index)=><button key={stage.name} type="button" onClick={()=>{setActiveStep(index);setSelectedObject(null)}} aria-pressed={activeStep===index}>
              <small>0{index+1}</small><strong>{stage.name}</strong><span>{stage.role}</span><em>{stageCoverage[index]} REPRESENTED</em>
            </button>)}
          </div>
        </div>
        <div className="rcThreeHorizonBottom">
          <section className="rcThreePane">
            <h2>CASE / OBSERVATION CONTEXT</h2>
            <strong>{caseData?.caseRecord.subject??'SELECT A CASE ABOVE'}</strong>
            <p>{caseData?.caseRecord.scope??'Only cases authorized for this account will be readable here.'}</p>
            <dl><div><dt>STATE</dt><dd>{caseData?.caseRecord.status??'NOT SELECTED'}</dd></div>
            <div><dt>SYSTEM BOUNDARY</dt><dd>{caseData?.caseRecord.serviceProfileId??'NOT REPRESENTED'}</dd></div>
            <div><dt>KNOWLEDGE CUTOFF</dt><dd>{cutoff||'ALL REPRESENTED HISTORY'}</dd></div></dl>
          </section>
          <section className="rcThreePane">
            <h2>INSPECT THE SELECTED BOUNDARY</h2>
            <strong>{STEPS[activeStep].name}</strong><p>{STEPS[activeStep].role}</p>
            <p>{stageObjects.length} objects represented in this epistemic stage.</p>
            <div className="rcRecordList">{stageObjects.slice(0,12).map(o=><button key={o.id} type="button" onClick={()=>{setSelectedObject(o.id);scrollTo(1)}}><time>{date(o.createdAt)}</time><strong>{safeText(o.payload.label??o.payload.statement??o.kind)}</strong></button>)}</div>
            {!stageObjects.length?<p>NOT OBSERVED IN THE CURRENT CASE RECORD.</p>:null}
          </section>
          <section className="rcThreePane">
            <h2>LONGITUDINAL TRACE</h2>
            <p>Recorded time is not necessarily event time. A later receipt does not retroactively change prior knowledge.</p>
            <div className="rcTimelineEntries">{asOfObjects.slice(0,16).map(o=><button key={o.id} type="button" onClick={()=>{setSelectedObject(o.id);scrollTo(1)}}><time>{date(o.createdAt)}</time><strong>{o.kind} · {o.epistemicRole}</strong></button>)}</div>
            {!asOfObjects.length?<p>NO PERSISTED OBJECTS FOR THIS HISTORICAL READING.</p>:null}
          </section>
        </div>
      </section>

      <section className="rcHorizon rcThreeHorizon" aria-label="Screen 2 · Evidence, Inference, Authority">
        <div className="rcThreeHorizonTop">
          <div className="rcScreenIdentifier">02 / 03</div>
          <h1>EVIDENCE · INFERENCE · AUTHORITY</h1>
          <p>What the records support, what remains an interpretation, and who may decide.</p>
          <div className="rcThreeStageBand">
            {STEPS.slice(3,6).map((stage,index)=><button key={stage.name} type="button" onClick={()=>{setActiveStep(index+3);setSelectedObject(null)}} aria-pressed={activeStep===index+3}>
              <small>0{index+4}</small><strong>{stage.name}</strong><span>{stage.role}</span><em>{stageCoverage[index+3]} REPRESENTED</em>
            </button>)}
          </div>
        </div>
        <div className="rcThreeHorizonBottom">
          <section className="rcThreePane">
            <h2>SOURCE INTAKE / FILE UPLOAD</h2>
            <p>Choose whether to extract a document without storing its bytes, or preserve the original in authorized private Case Storage.</p>
            <label>DOCUMENT · PDF, DOCX, TXT, CSV, JSON
              <input type="file" accept=".pdf,.docx,.txt,.md,.csv,.tsv,.json,.xlsx,.zip,.png,.jpg" onChange={e=>setFile(e.target.files?.[0]??null)}/>
            </label>
            <div className="rcThreeActions">
              <button type="button" disabled={!caseId||!file||working} onClick={extract}>EXTRACT TEXT TEMPORARILY · MAX 6 MB</button>
              <button type="button" disabled={!caseId||!file||working} onClick={uploadOriginal}>STORE SOURCE PRIVATELY · MAX 25 MB</button>
            </div>
            {extraction?<><div className="rcSourceSummary">
              <strong>{extraction.source.filename}</strong>
              <span>SHA-256 · {extraction.source.sha256}</span>
              <span>{extraction.extraction.fragmentCount} EXTRACTED BLOCKS · {extraction.extraction.parser}</span>
              <span>{extraction.extraction.complete?'EXTRACTION WITHIN PARSER LIMITS':'PARTIAL / REVIEW REQUIRED'}</span>
            </div>
              <label>OPTIONAL EXTERNAL SOURCE REFERENCE<input value={externalRef} onChange={e=>setExternalRef(e.target.value)} maxLength={1800}/></label>
              <button type="button" disabled={!!sourceRef||!caseId||working} onClick={register}>{sourceRef?'SOURCE REGISTERED':'REGISTER SOURCE METADATA'}</button>
              <div className="rcExtracted">{extraction.extraction.fragments.map((part,index)=><label key={index} className="rcExtractedItem"><input type="checkbox" checked={chosen.includes(index)} onChange={e=>setChosen(old=>e.target.checked?[...old,index]:old.filter(x=>x!==index))}/><span><b>{part.page===null?'PAGE UNKNOWN':'PAGE '+part.page} · PARAGRAPH {part.paragraph}</b><p>{part.text}</p><small>TEXT OFFSETS: {part.start??'UNKNOWN'}–{part.end??'UNKNOWN'}</small></span></label>)}</div>
              <button type="button" disabled={!sourceRef||!chosen.length||working} onClick={savePassages}>PRESERVE SELECTED PASSAGES AS RECORDS</button>
            </>:null}
          </section>
          <section className="rcThreePane">
            <h2>DOCUMENTARY LEDGER / PROVENANCE</h2>
            <p>Known then ≠ known now. An unverified quote remains a RECORD, not EVIDENCE.</p>
            {focused?<div className="rcFocused">
              <strong>{focused.kind} · {focused.epistemicRole}</strong>
              <p>{payloadDescription(focused)}</p>
              <small>ID: {focused.canonicalRef.id}</small>
              <small>HASH: {focused.canonicalRef.hash??'NOT REPRESENTED'}</small>
              <small>OBSERVED: {date(focused.observedAt)} · RECORDED: {date(focused.createdAt)}</small>
              <small>LOCATOR: {JSON.stringify(focused.payload.locator??'NOT REPRESENTED')}</small>
              <small>SOURCE REFS: {focused.sourceRefs.map(r=>r.id).join(', ')||'NOT REPRESENTED'}</small>
              <button type="button" onClick={()=>setSelectedObject(null)}>BACK TO ALL RECORDS</button>
            </div>:<div className="rcRecordList">{asOfObjects.map(o=><button key={o.id} type="button" onClick={()=>setSelectedObject(o.id)}><time>{date(o.createdAt)}</time><strong>{o.kind} · {o.epistemicRole}</strong><span>{payloadDescription(o).slice(0,240)}</span></button>)}</div>}
            <div className="rcThreeDataLine">{sourceObjects.length} SOURCES · {asOfObjects.filter(o=>o.kind==='EVIDENCE').length} ADMITTED EVIDENCE · {asOfObjects.filter(o=>o.kind==='CONTRADICTION').length} CONTRADICTIONS</div>
          </section>
          <section className="rcThreePane">
            <h2>HYPOTHESIS / AUTHORITY</h2>
            <p>Interpretation does not authorize intervention. Independent sources and calibration are not inferred from document counts.</p>
            <dl><div><dt>HYPOTHESES</dt><dd>{asOfObjects.filter(o=>o.kind==='HYPOTHESIS').length} REPRESENTED</dd></div>
              <div><dt>GOVERNANCE DECISIONS</dt><dd>{asOfObjects.filter(o=>o.kind==='GOVERNANCE_DECISION').length} RECORDED</dd></div>
              <div><dt>INDEPENDENT CONFIRMATION</dt><dd>NOT ESTABLISHED FROM COUNTS</dd></div>
              <div><dt>CALIBRATED CONFIDENCE</dt><dd>NOT CALIBRATED</dd></div>
              <div><dt>ABSTENTION</dt><dd>REQUIRED WHERE EVIDENCE OR AUTHORITY IS INSUFFICIENT</dd></div></dl>
            <a className="rcThreeLink" href="/root/evidence-review">OPEN GOVERNED EVIDENCE REVIEW ↗</a>
          </section>
        </div>
      </section>

      <section className="rcHorizon rcThreeHorizon" aria-label="Screen 3 · Execution, Return, Learning">
        <div className="rcThreeHorizonTop">
          <div className="rcScreenIdentifier">03 / 03</div>
          <h1>EXECUTION · RETURN · LEARNING</h1>
          <p>What was done, what reality returned, and what was actually integrated.</p>
          <div className="rcThreeStageBand">
            {STEPS.slice(6,9).map((stage,index)=><button key={stage.name} type="button" onClick={()=>{setActiveStep(index+6);setSelectedObject(null)}} aria-pressed={activeStep===index+6}>
              <small>0{index+7}</small><strong>{stage.name}{stage.name==='LEARNING'?<svg className="rcLearningIcon" viewBox="0 0 48 48" role="img" aria-label="Learning"><path d="M24 11c-6-4-12-4-19-2v27c7-2 13-2 19 2 6-4 12-4 19-2V9c-7-2-13-2-19 2Z" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M24 11v27M29 23l4 4 8-10" fill="none" stroke="currentColor" strokeWidth="2"/></svg>:null}</strong>
              <span>{stage.role}</span><em>{stageCoverage[index+6]} REPRESENTED</em>
            </button>)}
          </div>
        </div>
        <div className="rcThreeHorizonBottom">
          <section className="rcThreePane">
            <h2>CHAIN-TO-CHAIN SOURCE REFERENCES</h2>
            <p>One case may become an inspectable source for another. A reference does not automatically validate its claims as EVIDENCE.</p>
            <label>REFERENCE ANOTHER AUTHORIZED CASE
              <select value={caseToLink} onChange={e=>setCaseToLink(e.target.value)}>
                <option value="">SELECT SOURCE CASE</option>
                {availableToLink.map(item=><option key={item.id} value={item.id}>{item.subject}</option>)}
              </select>
            </label>
            <button type="button" disabled={working||!caseToLink} onClick={linkExistingCase}>ADD GOVERNED CROSS-CASE REFERENCE</button>
            <div className="rcRecordList">{linkedCaseObjects.map(o=><div className="rcRecordItem" key={o.id}><strong>{safeText(o.payload.referencedCaseSubject,'CROSS-CASE SOURCE')}</strong><small>{safeText(o.payload.referencedCaseId)}</small><span>NOT YET QUALIFIED AS EVIDENCE</span></div>)}</div>
            {!linkedCaseObjects.length?<p>NO CROSS-CASE REFERENCES OBSERVED.</p>:null}
          </section>
          <section className="rcThreePane">
            <h2>RECONSTRUCT / TRACE / DELIVER</h2>
            <p>The same case can be reconstructed as known at a particular time. A report does not manufacture a decision or external RETURN.</p>
            <div className="rcThreeDataLine">{asOfObjects.length} HISTORICAL OBJECTS · {reports.length} RECORDED REPORTS</div>
            <button type="button" disabled={!caseData||working} onClick={makeReport}>EXPORT TRACE · JSON + PRINTABLE HTML</button>
            <button type="button" disabled={!caseData||working} onClick={persistTraceManifest}>PERSIST TRACE MANIFEST AS RECORD</button>
            <button type="button" disabled={!caseData||working} onClick={createInstitutionalReport}>REQUEST GOVERNED REPORT RECEIPT</button>
            {generatedAt?<p>LAST LOCAL EXPORT: {date(generatedAt)}</p>:null}
            <dl><div><dt>EXECUTION RECORDS</dt><dd>{asOfObjects.filter(o=>o.kind==='INTERVENTION').length}</dd></div><div><dt>RETURN RECORDS</dt><dd>{asOfObjects.filter(o=>o.kind==='RETURN').length}</dd></div></dl>
          </section>
          <section className="rcThreePane">
            <h2>REALITY PASSPORT / LEARNING</h2>
            <p>Inspect the selected case in ROOT using its existing identifier. No duplicate passport or authority is created.</p>
            {caseId?<a className="rcThreeLink" href={'/root?reading=REALITY_CHAIN&node='+encodeURIComponent(caseId)}>OPEN SELECTED CASE IN ROOT ↗</a>:<p>SELECT A CASE TO OPEN ITS PASSPORT.</p>}
            <dl><div><dt>WHAT WAS KNOWN?</dt><dd>{asOfObjects.filter(o=>o.kind==='EVIDENCE').length} ADMITTED EVIDENCE OBJECTS</dd></div>
            <div><dt>WHAT WAS INFERRED?</dt><dd>{asOfObjects.filter(o=>o.kind==='HYPOTHESIS').length} RECORDED HYPOTHESES</dd></div>
            <div><dt>WHAT WAS AUTHORIZED?</dt><dd>{asOfObjects.filter(o=>o.kind==='GOVERNANCE_DECISION').length} RECORDED DECISIONS</dd></div>
            <div><dt>WHAT WAS EXECUTED?</dt><dd>{asOfObjects.filter(o=>o.kind==='INTERVENTION').length} INTERVENTION RECORDS</dd></div>
            <div><dt>WHAT DID REALITY RETURN?</dt><dd>{asOfObjects.filter(o=>o.kind==='RETURN').length} RETURN RECORDS</dd></div>
            <div><dt>WHAT WAS LEARNED?</dt><dd>GOVERNED INTEGRATION NOT INFERRED FROM CASE CLOSURE</dd></div></dl>
          </section>
        </div>
      </section>
    </div>
  </div>

  <footer className="rcOperationalFooter">
    <div><strong>REALITY CHAIN · THREE COGNITIVE SCREENS</strong><span>ORIGIN · LINEAGE · AUTHORITY · TIME · RETURN</span></div>
    <button type="button" onClick={()=>scrollTo(Math.max(0,screen-1))} disabled={screen===0}>← PREVIOUS</button>
    <div className="rcOperationalFooterRail"><span>{screen===0?'WORLD · SIGNAL · OBSERVATION':screen===1?'EVIDENCE · INFERENCE · AUTHORITY':'EXECUTION · RETURN · LEARNING'}</span></div>
    <button type="button" onClick={()=>scrollTo(Math.min(2,screen+1))} disabled={screen===2}>NEXT →</button>
  </footer>
  {message?<div className="rcToast" role="status">{message}<button onClick={()=>setMessage('')} aria-label="Dismiss message">×</button></div>:null}
  {error?<div className="rcToast rcToastError" role="alert">{error}<button onClick={()=>setError('')} aria-label="Dismiss error">×</button></div>:null}
 </main>;
}
