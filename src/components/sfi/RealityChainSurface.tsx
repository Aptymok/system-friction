'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuthState } from '@/components/auth/AuthProvider';
import './RealityChainSurface.css';

type CaseRow = {
  id:string; subject:string; status:string; tenantId:string;
  temporalWindow?:{cutoff?:string;mode?:string;basis?:string};
  updatedAt?:string;
};
type CaseObject = {
  id:string; kind:string; epistemicRole:string; createdAt:string;
  observedAt:string|null; canonicalRef:{id:string;hash?:string|null};
  sourceRefs: Array<{id:string}>; recordRefs:Array<{id:string}>;
  evidenceRefs:Array<{id:string}>; payload:Record<string,unknown>;
};
type CaseEnvelope = {
  caseRecord:CaseRow; objects:CaseObject[];
  readiness?:{missingSources?:string[];readyForAnalysis?:boolean};
};
type Tab = 'CASE'|'RECONSTRUCTION'|'SOURCES'|'EVIDENCE'|'RELATIONS'|'PASSPORT';

const SCREEN_GROUPS = [
  {
    number:'01', label:'WORLD / SIGNAL / OBSERVATION',
    stages:[
      {code:'01',name:'WORLD',text:'What system, place, people and conditions existed within the declared boundary?'},
      {code:'02',name:'SIGNAL',text:'What event, anomaly or contradiction motivated observation? A signal is not evidence.'},
      {code:'03',name:'OBSERVATION',text:'What did someone or something actually record, when, and through which source?'},
    ],
    principle:'Before inference, preserve the origin and time of each observation.',
  },
  {
    number:'02', label:'EVIDENCE / INFERENCE / AUTHORITY',
    stages:[
      {code:'04',name:'EVIDENCE',text:'Which sources and records are traceable? Which are independent rather than copies?'},
      {code:'05',name:'INFERENCE',text:'What is proposed, what contradicts it, and what remains unknown?'},
      {code:'06',name:'AUTHORITY',text:'Who could decide, within which scope and evidence boundary? Abstention remains possible.'},
    ],
    principle:'Evidence does not grant authority. Confidence is not manufactured from relation counts.',
  },
  {
    number:'03', label:'EXECUTION / RETURN / LEARNING',
    stages:[
      {code:'07',name:'EXECUTION',text:'Which authorized action actually occurred? Preserve its receipt; deployment is not impact.'},
      {code:'08',name:'RETURN',text:'What did reality return after the action? Contrast expected and observed states.'},
      {code:'09',name:'LEARNING',text:'What changed in the interpretation, and was that change actually integrated through governance?'},
    ],
    principle:'A later observation adds a new layer; it must never rewrite the earlier knowledge state.',
  },
] as const;

function caseObjects(value:unknown):CaseObject[]{
  return Array.isArray(value)?value.filter((item):item is CaseObject=>Boolean(item&&typeof item==='object'&&!Array.isArray(item))):[];
}
function string(value:unknown,fallback='NOT OBSERVED'):string{
  return typeof value==='string'&&value.trim()?value.trim():fallback;
}
function timestamp(value:unknown):number|null{
  if(typeof value!=='string')return null;
  const result=Date.parse(value);
  return Number.isFinite(result)?result:null;
}
function readableDate(value:unknown){
  const ms=timestamp(value);
  return ms===null?'NOT OBSERVED':new Date(ms).toLocaleString('en-US',{dateStyle:'medium',timeStyle:'short'});
}
function counts(objects:CaseObject[],kind:string){return objects.filter(item=>item.kind===kind).length;}
async function api(url:string,options?:RequestInit):Promise<any>{
  const response=await fetch(url,{cache:'no-store',...options});
  const result=await response.json().catch(()=>null);
  if(!response.ok||result?.ok!==true)throw new Error(String(result?.error??result?.details??'REQUEST_FAILED')+' ('+response.status+')');
  return result;
}

function LearningIcon(){
  return <svg className="rcLearningIcon" viewBox="0 0 48 48" role="img" aria-label="Learning: reviewed knowledge">
    <path d="M24 11c-6-4-12-4-19-2v27c7-2 13-2 19 2 6-4 12-4 19-2V9c-7-2-13-2-19 2Z" fill="none" stroke="currentColor" strokeWidth="2"/>
    <path d="M24 11v27M12 17h7M12 23h7M29 23l4 4 8-10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>;
}

export function RealityChainSurface(){
  const auth=useAuthState();
  const scroller=useRef<HTMLDivElement|null>(null);
  const [screen,setScreen]=useState(0);
  const [cases,setCases]=useState<CaseRow[]>([]);
  const [selectedId,setSelectedId]=useState('');
  const [selected,setSelected]=useState<CaseEnvelope|null>(null);
  const [tab,setTab]=useState<Tab>('CASE');
  const [asOf,setAsOf]=useState('');
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);
  const [file,setFile]=useState<File|null>(null);
  const [sourceUrl,setSourceUrl]=useState('');
  const [linkedCaseId,setLinkedCaseId]=useState('');
  const [working,setWorking]=useState(false);
  const [expanded,setExpanded]=useState(true);

  useEffect(()=>{
    if(auth.status!=='authenticated'){setCases([]);setSelected(null);return;}
    let active=true;
    setLoading(true);
    void api('/api/cases').then(result=>{
      if(!active)return;
      const listed=Array.isArray(result.cases)?result.cases as CaseRow[]:[];
      setCases(listed);
      const fromUrl=new URLSearchParams(window.location.search).get('case')||'';
      const initial=listed.find(item=>item.id===fromUrl)?.id||'';
      setSelectedId(current=>listed.some(item=>item.id===current)?current:initial);
    }).catch(cause=>{if(active)setError(String(cause));}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[auth.status]);

  async function refreshCase(caseId:string){
    const result=await api('/api/cases/'+encodeURIComponent(caseId));
    const envelope={caseRecord:result.caseRecord as CaseRow,objects:caseObjects(result.objects),readiness:result.readiness} as CaseEnvelope;
    setSelected(envelope);
    return envelope;
  }
  useEffect(()=>{
    if(auth.status!=='authenticated'||!selectedId){setSelected(null);return;}
    let alive=true;
    setLoading(true);
    void api('/api/cases/'+encodeURIComponent(selectedId)).then(result=>{
      if(alive){setSelected({caseRecord:result.caseRecord as CaseRow,objects:caseObjects(result.objects),readiness:result.readiness});setError('');}
    }).catch(cause=>{if(alive){setSelected(null);setError(String(cause));}})
      .finally(()=>{if(alive)setLoading(false);});
    return()=>{alive=false;};
  },[auth.status,selectedId]);

  const objects=selected?.objects??[];
  // Creation/capture cutoff: later-introduced evidence is never smuggled into an earlier view.
  const visibleObjects=useMemo(()=>{
    const cutoff=timestamp(asOf);
    if(cutoff===null)return objects;
    return objects.filter(object=>{
      const created=timestamp(object.createdAt);
      const observed=timestamp(object.observedAt);
      return created!==null&&created<=cutoff&&(observed===null||observed<=cutoff);
    });
  },[objects,asOf]);

  const citedCases=objects.filter(item=>item.kind==='RECORD'&&item.payload?.contract==='SFI-CROSS-CASE-SOURCE-REFERENCE-1.0');
  const sourceCases=cases.filter(item=>item.id!==selectedId&&item.tenantId===selected?.caseRecord?.tenantId);

  useEffect(()=>{
    const node=scroller.current;
    if(!node)return;
    const update=()=>setScreen(Math.min(2,Math.max(0,Math.round(node.scrollLeft/Math.max(node.clientWidth,1)))));
    const wheel=(event:WheelEvent)=>{
      if(Math.abs(event.deltaY)<=Math.abs(event.deltaX))return;
      event.preventDefault();
      node.scrollBy({left:event.deltaY,behavior:'auto'});
    };
    node.addEventListener('scroll',update,{passive:true});
    node.addEventListener('wheel',wheel,{passive:false});
    return()=>{node.removeEventListener('scroll',update);node.removeEventListener('wheel',wheel);};
  },[]);
  function goto(index:number){
    const target=Math.min(2,Math.max(0,index));
    scroller.current?.scrollTo({left:target*(scroller.current.clientWidth||0),behavior:'smooth'});
    setScreen(target);
  }

  async function registerUrl(){
    if(!selectedId||!sourceUrl.trim())return;
    setWorking(true);setError('');setNotice('');
    try{
      const url=new URL(sourceUrl.trim());
      if(url.protocol!=='https:'&&url.protocol!=='http:')throw new Error('PUBLIC_SOURCE_URL_REQUIRED');
      await api('/api/cases/'+encodeURIComponent(selectedId)+'/sources',{
        method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({sourceType:'PUBLIC_URL',label:url.hostname,externalRef:url.toString(),observedAt:new Date().toISOString(),metadata:{intake:'REALITY_CHAIN_UI',epistemicBoundary:'SOURCE_NOT_EVIDENCE'}}),
      });
      await refreshCase(selectedId);
      setSourceUrl('');
      setNotice('Source reference registered and read back. It is not yet qualified as evidence.');
    }catch(cause){setError(cause instanceof Error?cause.message:'SOURCE_REGISTRATION_FAILED');}
    finally{setWorking(false);}
  }
  async function upload(){
    if(!selectedId||!file)return;
    if(file.size>25*1024*1024){setError('MAX_FILE_SIZE_25_MB');return;}
    setWorking(true);setError('');setNotice('');
    try{
      const ticket=await api('/api/cases/'+encodeURIComponent(selectedId)+'/sources/upload-ticket',{
        method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({filename:file.name,size:file.size,contentType:file.type||'application/octet-stream'}),
      });
      const instruction=ticket.upload;
      if(typeof instruction?.signedUrl!=='string'||!instruction.signedUrl.startsWith('https://'))throw new Error('SIGNED_STORAGE_URL_MISSING');
      const response=await fetch(instruction.signedUrl,{method:'PUT',headers:{'Content-Type':file.type||'application/octet-stream','x-upsert':'false'},body:file});
      if(!response.ok)throw new Error('STORAGE_UPLOAD_FAILED:'+response.status);
      await api('/api/cases/'+encodeURIComponent(selectedId)+'/sources/finalize-upload',{
        method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({storagePath:instruction.storagePath,filename:file.name,size:file.size,contentType:file.type||'application/octet-stream',sourceType:'FILE_UPLOAD'}),
      });
      const updated=await refreshCase(selectedId);
      if(!updated.objects.some(obj=>obj.kind==='SOURCE'&&obj.payload?.label===file.name))throw new Error('SOURCE_FINALIZED_BUT_NOT_FOUND_ON_READBACK');
      setFile(null);
      setNotice('File stored privately and source receipt verified. Source ≠ evidence.');
    }catch(cause){setError(cause instanceof Error?cause.message:'FILE_UPLOAD_FAILED');}
    finally{setWorking(false);}
  }
  async function linkCase(){
    if(!selectedId||!linkedCaseId)return;
    setWorking(true);setError('');setNotice('');
    try{
      await api('/api/cases/'+encodeURIComponent(selectedId)+'/linked-cases',{
        method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({referencedCaseId:linkedCaseId}),
      });
      const updated=await refreshCase(selectedId);
      if(!updated.objects.some(obj=>obj.payload?.contract==='SFI-CROSS-CASE-SOURCE-REFERENCE-1.0'&&obj.payload?.referencedCaseId===linkedCaseId))throw new Error('CASE_REFERENCE_NOT_FOUND_ON_READBACK');
      setLinkedCaseId('');
      setNotice('Cross-case source reference persisted. Independent evidence review remains required.');
    }catch(cause){setError(cause instanceof Error?cause.message:'CASE_LINK_FAILED');}
    finally{setWorking(false);}
  }

  return <main className="rcExperience" aria-label="Reality Chain">
    <div className="rcBackdrop" aria-hidden="true"/>
    <header className="rcTitleLine"><strong>REALITY CHAIN</strong><span>KNOWLEDGE HAS A TIME. ACTION HAS CONSEQUENCES.</span></header>
    <section className="rcThreeScreens" ref={scroller} aria-label="Three stages of Reality Chain">
      <div className="rcThreeTrack">
        {SCREEN_GROUPS.map((group,index)=><article key={group.number} className="rcScreen" aria-label={'Screen '+group.number}>
          <header className="rcScreenHeading"><span>SCREEN {group.number} / 03</span><h1>{group.label}</h1></header>
          <div className="rcStageRow">
            {group.stages.map(stage=><section className="rcStage" key={stage.code}>
              <span className="rcStageNumber">{stage.code}</span>
              <h2>{stage.name}</h2>
              {stage.name==='LEARNING'?<LearningIcon/>:null}
              <p>{stage.text}</p>
            </section>)}
          </div>
          <p className="rcScreenPrinciple">{group.principle}</p>
        </article>)}
      </div>
    </section>
    <nav className="rcPageNav" aria-label="Reality Chain screens">
      <button type="button" disabled={screen===0} onClick={()=>goto(screen-1)} aria-label="Previous screen">←</button>
      {SCREEN_GROUPS.map((item,index)=><button key={item.number} type="button" aria-current={screen===index?'step':undefined} onClick={()=>goto(index)}>{item.number} <span>{item.label}</span></button>)}
      <button type="button" disabled={screen===2} onClick={()=>goto(screen+1)} aria-label="Next screen">→</button>
    </nav>

    <section className={'rcCaseDesk '+(expanded?'':'rcCaseDesk--collapsed')} aria-label="Reality Chain case workspace">
      <header className="rcDeskTop">
        <div><span>CASE WORKSPACE</span><strong>{selected?.caseRecord.subject??'NO CASE SELECTED'}</strong></div>
        <button type="button" onClick={()=>setExpanded(previous=>!previous)} aria-expanded={expanded}>{expanded?'COLLAPSE WORKSPACE':'OPEN WORKSPACE'}</button>
      </header>
      {expanded?<div className="rcDeskContent">
        <nav className="rcDeskTabs" aria-label="Case tools">
          {(['CASE','RECONSTRUCTION','SOURCES','EVIDENCE','RELATIONS','PASSPORT'] as const).map(item=><button key={item} type="button" onClick={()=>setTab(item)} aria-pressed={tab===item}>{item}</button>)}
        </nav>
        {auth.status!=='authenticated'?<p className="rcDeskNotice">Public orientation only. <Link href="/login">Sign in</Link> to inspect, upload, create or link cases with authorized tenant access.</p>:<>
          <div className="rcCasePicker">
            <label>SELECT EXISTING CASE
              <select value={selectedId} onChange={event=>{setSelectedId(event.target.value);setAsOf('');setNotice('');}}>
                <option value="">SELECT A CASE</option>
                {cases.map(item=><option key={item.id} value={item.id}>{item.subject} · {item.status}</option>)}
              </select>
            </label>
            <Link href="/cases/new">+ CREATE CASE</Link>
            <span>{loading?'LOADING…':selected?'CASE READ VERIFIED':'NOT SELECTED'}</span>
          </div>
          {notice?<p className="rcDeskSuccess" role="status">{notice}</p>:null}
          {error?<p className="rcDeskError" role="alert">{error}</p>:null}
          {!selected?<p className="rcDeskNotice">Select a case to inspect its actual persisted SOURCE, RECORD, EVIDENCE, inference, authorization and RETURN objects. No example counts or fake case is shown.</p>:<>
            {tab==='CASE'?<div className="rcDeskGrid">
              <div><span>CASE</span><strong>{selected.caseRecord.subject}</strong><p>{string(selected.caseRecord.status,'UNKNOWN')} · {selected.caseRecord.id}</p></div>
              <div><span>DOCUMENTED OBJECTS</span><strong>{objects.length}</strong><p>{counts(objects,'SOURCE')} sources · {counts(objects,'EVIDENCE')} admitted evidence objects · {counts(objects,'RETURN')} recorded RETURN objects</p></div>
              <div><span>READINESS</span><strong>{selected.readiness?.readyForAnalysis?'SOURCE TYPES SATISFIED':'INCOMPLETE / UNKNOWN'}</strong><p>Missing sources: {selected.readiness?.missingSources?.join(', ')||'None declared / not established'}</p></div>
            </div>:null}
            {tab==='RECONSTRUCTION'?<div className="rcDeskReconstruction">
              <label>WHAT WAS KNOWN AT THIS POINT?
                <input type="datetime-local" value={asOf} onChange={event=>setAsOf(event.target.value)}/>
              </label>
              <p className="rcDeskNotice">CREATED-AT AND OBSERVED-AT CUTOFF · Later-recorded material is excluded from this historical reading; absence of a dated source is not proof of absence in the world.</p>
              <p>AS OF: {asOf?readableDate(new Date(asOf).toISOString()):'CURRENT AVAILABLE RECORD'} · {visibleObjects.length} / {objects.length} OBJECTS</p>
              <ol className="rcDeskHistory">{visibleObjects.map(object=><li key={object.id}><time>{readableDate(object.createdAt)}</time><strong>{object.kind} · {object.epistemicRole}</strong><span>{string(object.payload?.label,object.canonicalRef?.id??'UNKNOWN')}</span></li>)}</ol>
              {!visibleObjects.length?<p>NOT OBSERVED IN THE SELECTED TIME WINDOW.</p>:null}
            </div>:null}
            {tab==='SOURCES'?<div className="rcDeskSources">
              <p>Files are uploaded privately to the existing case source bucket. Storage registration is not evidence admission.</p>
              <label>UPLOAD SOURCE FILE<input type="file" onChange={event=>setFile(event.target.files?.[0]??null)}/></label>
              <button type="button" disabled={!file||working} onClick={()=>void upload()}>UPLOAD & REGISTER SOURCE</button>
              <label>OR REGISTER EXTERNAL SOURCE URL<input type="url" value={sourceUrl} onChange={event=>setSourceUrl(event.target.value)} placeholder="https://source.example/document"/></label>
              <button type="button" disabled={!sourceUrl.trim()||working} onClick={()=>void registerUrl()}>REGISTER SOURCE URL</button>
              <ol className="rcDeskHistory">{objects.filter(object=>object.kind==='SOURCE').map(object=><li key={object.id}><time>{readableDate(object.createdAt)}</time><strong>{string(object.payload?.label,'SOURCE')}</strong><span>{string(object.payload?.externalRef,'REFERENCE NOT REPRESENTED')}</span></li>)}</ol>
            </div>:null}
            {tab==='EVIDENCE'?<div className="rcDeskGrid">
              <div><span>SOURCE / RECORD</span><strong>{counts(objects,'SOURCE')} / {counts(objects,'RECORD')}</strong><p>Acquisition and registration do not establish independent corroboration.</p></div>
              <div><span>EVIDENCE</span><strong>{counts(objects,'EVIDENCE')}</strong><p>Admitted evidence in the persisted case. The public interface cannot promote a source to evidence.</p></div>
              <div><span>CONTRADICTION / HYPOTHESIS</span><strong>{counts(objects,'CONTRADICTION')} / {counts(objects,'HYPOTHESIS')}</strong><p>Rival positions and unresolved questions remain distinct.</p></div>
              <Link href="/root/evidence-review">OPEN GOVERNED EVIDENCE REVIEW ↗</Link>
            </div>:null}
            {tab==='RELATIONS'?<div className="rcDeskRelations">
              <p>Reference another accessible case as a source record in this chain. It remains a reference, not automatically validated evidence. Later qualification must identify specific claims, source dependencies and temporal relevance.</p>
              <label>REFERENCE EXISTING CASE
                <select value={linkedCaseId} onChange={event=>setLinkedCaseId(event.target.value)}><option value="">SELECT CASE</option>{sourceCases.map(item=><option key={item.id} value={item.id}>{item.subject}</option>)}</select>
              </label>
              <button type="button" disabled={!linkedCaseId||working} onClick={()=>void linkCase()}>LINK CASE AS SOURCE REFERENCE</button>
              <ol className="rcDeskHistory">{citedCases.map(item=><li key={item.id}><time>{readableDate(item.createdAt)}</time><strong>CROSS-CASE SOURCE</strong><span>{string(item.payload?.referencedCaseId)}</span></li>)}</ol>
              {!citedCases.length?<p>NO CROSS-CASE REFERENCES REGISTERED.</p>:null}
            </div>:null}
            {tab==='PASSPORT'?<div className="rcDeskPassport">
              <p>The Reality Passport is a contextual reading of the same case and its institutional relations. This link never creates a duplicate passport or grants authority.</p>
              <dl>
                <div><dt>KNOWLEDGE</dt><dd>{counts(objects,'SOURCE')} SOURCE · {counts(objects,'EVIDENCE')} EVIDENCE</dd></div>
                <div><dt>AUTHORITY</dt><dd>{counts(objects,'GOVERNANCE_DECISION')} GOVERNANCE DECISIONS RECORDED</dd></div>
                <div><dt>EXECUTION</dt><dd>{counts(objects,'INTERVENTION')} INTERVENTION RECORDS</dd></div>
                <div><dt>RETURN</dt><dd>{counts(objects,'RETURN')} RETURN RECORDS</dd></div>
                <div><dt>LEARNING</dt><dd>NOT AUTOMATICALLY PROMOTED FROM CASE CLOSURE</dd></div>
              </dl>
              <Link href={'/root?reading=REALITY_CHAIN&node='+encodeURIComponent(selectedId)}>OPEN THIS OBJECT IN ROOT ↗</Link>
            </div>:null}
          </>}
        </>}
      </div>:null}
    </section>
  </main>;
}
