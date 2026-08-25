'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { nextSfiCaseStatuses } from '@/core/case-platform';
import type { SfiCaseStatus } from '@/core/contracts/sfi';
import { CognitiveSpinePark, type SfiParkFocus, type SfiParkState, type SfiParkZone } from './CognitiveSpinePark';
import { SessionControls } from './SessionControls';
import './PipelineConsole.css';

type Row = Record<string, any>;
type TenantRole = 'OWNER' | 'ADMIN' | 'OPERATOR' | 'VIEWER' | 'AUDITOR';
const SYSTEM_AI_PROFILES = new Set(['SYSTEM_OBSERVATORY','AI_IMPLEMENTATION_DIAGNOSTIC','AI_ADOPTION_INTEGRATION','AI_GOVERNANCE_ASSURANCE','CUSTOM_RESEARCH']);

function stateFromCase(status?: string): SfiParkState {
  if (!status) return 'UNOBSERVED';
  if (status === 'CLOSED') return 'CLOSED';
  if (status === 'REJECTED') return 'DEGRADED';
  if (status === 'AWAITING_GOVERNANCE' || status === 'AWAITING_RETURN') return 'ATTENTION';
  if (status === 'INTERVENING' || status === 'ANALYZING' || status === 'OBSERVING') return 'LIVE';
  return 'READY';
}
function readArray(value: unknown): Row[] { return Array.isArray(value) ? value.filter((item) => item && typeof item === 'object') : []; }
function text(value: unknown, fallback = '—') { return typeof value === 'string' && value.trim() ? value.trim() : fallback; }
function canWrite(role?: TenantRole | null) { return role === 'OWNER' || role === 'ADMIN' || role === 'OPERATOR'; }
function canDecide(role?: TenantRole | null) { return role === 'OWNER' || role === 'ADMIN'; }

export function PipelineConsole() {
  const [cases, setCases] = useState<Row[]>([]);
  const [tenants, setTenants] = useState<Row[]>([]);
  const [profiles, setProfiles] = useState<Row[]>([]);
  const [caseId, setCaseId] = useState('');
  const [caseData, setCaseData] = useState<Row | null>(null);
  const [actions, setActions] = useState<Row[]>([]);
  const [reports, setReports] = useState<Row[]>([]);
  const [systemAi, setSystemAi] = useState<Row | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [newCase, setNewCase] = useState({ profile: '', subject: '', scope: '', boundary: '' });
  const [recordText, setRecordText] = useState('');
  const [recordKind, setRecordKind] = useState<'RECORD'|'OBSERVATION'>('OBSERVATION');
  const [returnText, setReturnText] = useState<Record<string,string>>({});

  const pullWorkspace = useCallback(async () => {
    try {
      const [caseRes, tenantRes, profileRes] = await Promise.all([
        fetch('/api/cases', { cache: 'no-store' }),
        fetch('/api/cases/tenants', { cache: 'no-store' }),
        fetch('/api/cases/service-profiles', { cache: 'no-store' }),
      ]);
      const [caseJson, tenantJson, profileJson] = await Promise.all([caseRes.json(), tenantRes.json(), profileRes.json()]);
      if (!caseRes.ok || !caseJson?.ok) throw new Error(`${caseRes.status}: ${caseJson?.error ?? 'case_list_failed'}`);
      if (!tenantRes.ok || !tenantJson?.ok) throw new Error(`${tenantRes.status}: ${tenantJson?.error ?? 'tenant_list_failed'}`);
      setCases(readArray(caseJson.cases));
      setTenants(readArray(tenantJson.tenants));
      setProfiles(readArray(profileJson?.profiles));
      const available = readArray(caseJson.cases);
      if (!caseId && available.length) setCaseId(String(available[0].id));
      if (caseId && !available.some((item) => String(item.id) === caseId)) setCaseId(available[0]?.id ? String(available[0].id) : '');
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, [caseId]);

  const pullCase = useCallback(async () => {
    if (!caseId) { setCaseData(null); setActions([]); setReports([]); setSystemAi(null); return; }
    try {
      const selected = cases.find((item) => String(item.id) === caseId);
      const requests: Promise<Response>[] = [
        fetch(`/api/cases/${caseId}`, { cache: 'no-store' }),
        fetch(`/api/cases/${caseId}/actions`, { cache: 'no-store' }),
        fetch(`/api/cases/${caseId}/reports`, { cache: 'no-store' }),
      ];
      const useSystemAi = selected && SYSTEM_AI_PROFILES.has(String(selected.serviceProfileId));
      if (useSystemAi) requests.push(fetch(`/api/cases/${caseId}/system-ai/read-model`, { cache: 'no-store' }));
      const responses = await Promise.all(requests);
      const json = await Promise.all(responses.map((response) => response.json().catch(() => null)));
      if (!responses[0].ok || !json[0]?.ok) throw new Error(`${responses[0].status}: ${json[0]?.error ?? 'case_read_failed'}`);
      setCaseData(json[0]);
      setActions(responses[1].ok && json[1]?.ok ? readArray(json[1].actions) : []);
      setReports(responses[2].ok && json[2]?.ok ? readArray(json[2].reports) : []);
      setSystemAi(useSystemAi && responses[3]?.ok && json[3]?.ok ? json[3] : null);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, [caseId, cases]);

  useEffect(() => { void pullWorkspace(); }, [pullWorkspace]);
  useEffect(() => { void pullCase(); const timer = window.setInterval(() => void pullCase(), 30000); return () => window.clearInterval(timer); }, [pullCase]);

  const record = caseData?.caseRecord ?? cases.find((item) => String(item.id) === caseId) ?? null;
  const objects = readArray(caseData?.objects);
  const readiness = caseData?.readiness ?? {};
  const tenant = tenants.find((item) => record && String(item.id) === String(record.tenantId));
  const role = (tenant?.role ?? null) as TenantRole | null;
  const writeAllowed = canWrite(role);
  const decisionAllowed = canDecide(role);
  const byKind = useMemo(() => new Map<string,Row[]>(Array.from(new Set(objects.map((item) => String(item.kind)))).map((kind) => [kind, objects.filter((item) => String(item.kind) === kind)])), [objects]);
  const sources = byKind.get('SOURCE') ?? [];
  const observations = byKind.get('OBSERVATION') ?? [];
  const recommendations = byKind.get('RECOMMENDATION') ?? [];
  const interventions = byKind.get('INTERVENTION') ?? [];
  const returns = byKind.get('RETURN') ?? [];
  const analyses = [...(byKind.get('ANALYSIS') ?? []), ...(byKind.get('INSTRUMENT_RUN') ?? [])];
  const unresolved = [...(byKind.get('UNRESOLVED_QUESTION') ?? []), ...(byKind.get('CONTRADICTION') ?? [])];
  const pendingActions = actions.filter((item) => ['PENDING','APPROVED','EXECUTED'].includes(String(item.status)));
  const caseAiExecutions = objects.filter((item) => item.payload?.entityType === 'AI_EXECUTION' || item.kind === 'INSTRUMENT_RUN');

  const focuses: SfiParkFocus[] = useMemo(() => {
    if (!record) return [];
    const base: SfiParkFocus[] = [{ id: `case:${record.id}`, kind: 'CASE', title: text(record.subject, 'Case'), status: text(record.status), detail: String(record.id) }];
    return base.concat(
      pendingActions.slice(0,4).map((item) => ({ id:`action:${item.id}`, kind:'ACTION', title:text(item.action ?? item.actionPayload?.action,'Action'), status:text(item.status), detail:String(item.id) })),
      returns.slice(-3).map((item) => ({ id:`return:${item.id}`, kind:'RETURN', title:text(item.payload?.outcome ?? item.canonicalRef?.id,'Return'), status:'RECORDED', detail:text(item.observedAt) })),
    );
  }, [record, pendingActions, returns]);
  const [focusId, setFocusId] = useState('');
  useEffect(() => { if (focuses.length && !focuses.some((item) => item.id === focusId)) setFocusId(focuses[0].id); }, [focuses, focusId]);
  const focus = focuses.find((item) => item.id === focusId) ?? focuses[0] ?? null;

  const zones: SfiParkZone[] = useMemo(() => {
    const ready = Boolean(readiness.readyForAnalysis);
    return [
      { id:'observer', label:'OBSERVER GATE', state: !record ? 'UNOBSERVED' : sources.length || observations.length ? (ready ? 'LIVE' : 'ATTENTION') : 'GATED', detail: record ? `${sources.length} source(s), ${observations.length} observation(s). Missing required sources: ${readArray(readiness.missingSources).length || (Array.isArray(readiness.missingSources) ? readiness.missingSources.length : 0)}.` : 'No case selected.', count:sources.length + observations.length, live:observations.length>0, x:18, y:19 },
      { id:'memory', label:'MEMORY BASIN', state: !record ? 'UNOBSERVED' : objects.length ? 'READY' : 'GATED', detail:'Tenant-scoped case memory only. It does not enter institutional Cognitive Spine or canon by inheritance.', count:objects.length, live:objects.length>0, x:22, y:43 },
      { id:'affective', label:'AFFECTIVE LOOP', state: analyses.length ? 'LIVE' : 'UNOBSERVED', detail: analyses.length ? 'Observed case analytical/instrument outputs are present.' : 'No case-scoped analytical or instrument execution is observed. No psychological state is inferred.', count:analyses.length, live:analyses.length>0, x:78, y:18 },
      { id:'signal', label:'SIGNAL MARSH', state: sources.length ? 'READY' : 'GATED', detail: systemAi ? `${systemAi.counts?.entities ?? 0} System/AI entities and ${systemAi.counts?.relations ?? 0} relations are recorded.` : `${sources.length} source(s) registered. SOURCE ≠ EVIDENCE.`, count:systemAi?.counts?.entities ?? sources.length, live:Boolean(systemAi?.counts?.executions), x:80, y:43 },
      { id:'fragment', label:'FRAGMENT DOCK', state: pendingActions.length || unresolved.length ? 'ATTENTION' : record ? 'READY' : 'UNOBSERVED', detail:`${pendingActions.length} action(s) pending continuity; ${unresolved.length} unresolved question/contradiction object(s).`, count:pendingActions.length + unresolved.length, live:pendingActions.length>0, x:80, y:69 },
      { id:'core', label:'CASE SPINE', state:stateFromCase(record?.status), detail:record ? `${record.serviceProfileId} · ${role ?? 'ROLE UNOBSERVED'} · tenant ${record.tenantId}` : 'Create or select a case. The park cannot fabricate a subject.', count:objects.length, live:['OBSERVING','ANALYZING','INTERVENING'].includes(String(record?.status)), x:50, y:49 },
      { id:'return', label:'EXECUTION / RETURN', state: returns.length ? 'LIVE' : interventions.length ? 'ATTENTION' : pendingActions.some((item)=>item.status==='APPROVED') ? 'READY' : 'GATED', detail:`${interventions.length} intervention record(s); ${returns.length} RETURN record(s). Platform does not claim an external action occurred unless an intervention is recorded.`, count:interventions.length + returns.length, live:returns.length>0, x:51, y:78 },
    ];
  }, [record, role, sources, observations, readiness, objects, analyses, systemAi, pendingActions, unresolved, interventions, returns]);

  const refreshAll = async () => { await pullWorkspace(); await pullCase(); };
  const apiAction = async (label:string, request:()=>Promise<Response>) => {
    if (busy) return; setBusy(label); setNotice(null); setError(null);
    try { const response = await request(); const json = await response.json().catch(()=>null); if (!response.ok || json?.ok===false) throw new Error(`${response.status}: ${json?.error ?? label}`); setNotice(`${label} · RECORDED`); await refreshAll(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(null); }
  };

  const createCase = async (event:FormEvent) => {
    event.preventDefault();
    if (!newCase.profile || !newCase.subject.trim() || !newCase.scope.trim()) return;
    const boundary = newCase.boundary.trim() || `boundary:${crypto.randomUUID()}`;
    await apiAction('CASE_CREATED', () => fetch('/api/cases',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
      serviceProfileId:newCase.profile, subject:newCase.subject.trim(), scope:newCase.scope.trim(),
      systemBoundaryRef:{id:boundary,version:'1.0',hash:null},
      temporalWindow:{mode:'LONGITUDINAL',basis:'OBSERVED_TIME',start:null,end:null,cutoff:new Date().toISOString(),timezone:Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'}
    })}));
    setNewCase({profile:'',subject:'',scope:'',boundary:''});
  };

  const uploadSource = async (event:FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!caseId || !writeAllowed) return;
    const form = event.currentTarget; const input = form.elements.namedItem('file') as HTMLInputElement; const file=input.files?.[0]; if(!file)return;
    const data=new FormData(); data.set('file',file); data.set('sourceType','DECLARED_BY_PROTOCOL');
    await apiAction('SOURCE_RECORDED',()=>fetch(`/api/cases/${caseId}/sources/upload`,{method:'POST',body:data})); form.reset();
  };

  const addRecord = async (event:FormEvent) => {
    event.preventDefault(); if(!caseId || !writeAllowed || !recordText.trim())return;
    const id=`${recordKind.toLowerCase()}:${crypto.randomUUID()}`;
    await apiAction(`${recordKind}_RECORDED`,()=>fetch(`/api/cases/${caseId}/objects`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({kind:recordKind,canonicalRef:{id,version:'1.0',hash:null},payload:{text:recordText.trim(),submittedBy:'tenant_member'},observedAt:recordKind==='OBSERVATION'?new Date().toISOString():null})}));
    setRecordText('');
  };

  const transition = (status:string) => apiAction(`CASE_${status}`,()=>fetch(`/api/cases/${caseId}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({status})}));
  const decide = (proposalId:string,decision:'APPROVE'|'REJECT') => apiAction(`ACTION_${decision}`,()=>fetch(`/api/cases/${caseId}/actions/${proposalId}/decision`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({decision,rationale:'Tenant authority decision from SFI Pipeline'})}));
  const recordIntervention = (proposalId:string) => apiAction('INTERVENTION_RECORDED',()=>fetch(`/api/cases/${caseId}/actions/${proposalId}/intervention`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({observedAt:new Date().toISOString(),executionDetails:{recordedFrom:'SFI_PIPELINE',platformPerformedExternalAction:false}})}));
  const recordReturn = (proposalId:string) => { const outcome=returnText[proposalId]?.trim(); if(!outcome)return; void apiAction('RETURN_RECORDED',()=>fetch(`/api/cases/${caseId}/actions/${proposalId}/return`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({observedAt:new Date().toISOString(),outcome,measurements:{}})})).then(()=>setReturnText((current)=>({...current,[proposalId]:''}))); };
  const generateReport = () => apiAction('REPORT_GENERATED',()=>fetch(`/api/cases/${caseId}/reports`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({claims:[],deliveryFormats:['JSON','WEB'],limitations:['Report is a tenant-scoped case snapshot. REPORT ≠ ACTION and does not grant execution or institutional truth authority.']})}));

  const nextStates = record ? nextSfiCaseStatuses(record.status as SfiCaseStatus) : [];
  const inspector = (zone:SfiParkZone) => <>
    {zone.id==='observer' && <section><small>SOURCES / RECORDS</small><div className="sfiParkList">{sources.slice(-8).reverse().map((item)=><article key={item.id}><b>{text(item.payload?.label ?? item.canonicalRef?.id,'Source')}</b><span>{text(item.payload?.sourceType,'SOURCE')} · {text(item.observedAt)}</span></article>)}{!sources.length&&<p>No sources recorded.</p>}</div></section>}
    {zone.id==='fragment' && <section><small>ACTIONS / GOVERNANCE</small><div className="sfiParkList">{pendingActions.map((item)=><article key={item.id}><b>{text(item.actionPayload?.action ?? item.action,'Action')}</b><span>{text(item.status)} · risk {text(item.riskLevel)}</span>{item.status==='PENDING'&&decisionAllowed&&<div><button disabled={!!busy} onClick={()=>void decide(item.id,'APPROVE')}>APPROVE</button><button disabled={!!busy} className="danger" onClick={()=>void decide(item.id,'REJECT')}>REJECT</button></div>}{item.status==='APPROVED'&&writeAllowed&&<button disabled={!!busy} onClick={()=>void recordIntervention(item.id)}>RECORD OBSERVED INTERVENTION</button>}{item.status==='EXECUTED'&&writeAllowed&&<><textarea value={returnText[item.id]??''} onChange={(e)=>setReturnText((current)=>({...current,[item.id]:e.target.value}))} placeholder="Observed outcome / RETURN"/><button disabled={!!busy||!returnText[item.id]?.trim()} onClick={()=>recordReturn(item.id)}>RECORD RETURN</button></>}</article>)}{!pendingActions.length&&<p>No open case actions.</p>}</div></section>}
    {zone.id==='return' && <section><small>RETURN TRACE</small><div className="sfiParkList">{returns.slice(-8).reverse().map((item)=><article key={item.id}><b>{text(item.payload?.outcome ?? item.canonicalRef?.id,'RETURN')}</b><span>{text(item.observedAt)} · RECORD</span></article>)}{!returns.length&&<p>No observed RETURN recorded.</p>}</div></section>}
    {zone.id==='affective' && <section><small>OBSERVED CASE EXECUTION</small><div className="sfiParkList">{caseAiExecutions.slice(-8).reverse().map((item)=><article key={item.id}><b>{text(item.payload?.label ?? item.canonicalRef?.id,'Instrument run')}</b><span>{text(item.epistemicRole)} · {text(item.observedAt ?? item.createdAt)}</span></article>)}{!caseAiExecutions.length&&<p>NO OBSERVED CASE AGENT / INSTRUMENT EXECUTION. Registration is not execution.</p>}</div></section>}
    {zone.id==='core' && <section><small>CASE CONTINUITY</small><dl><div><dt>PROFILE</dt><dd>{text(record?.serviceProfileId)}</dd></div><div><dt>ROLE</dt><dd>{role??'UNOBSERVED'}</dd></div><div><dt>READINESS</dt><dd>{readiness.readyForAnalysis?'READY':'INCOMPLETE'}</dd></div><div><dt>SOURCE COVERAGE</dt><dd>{typeof readiness.sourceCoverage==='number'?`${Math.round(readiness.sourceCoverage*100)}%`:'—'}</dd></div></dl></section>}
  </>;

  const toolbar = record ? <>
    <label>CASE<select value={caseId} onChange={(e)=>setCaseId(e.target.value)}>{cases.map((item)=><option key={item.id} value={item.id}>{item.subject} · {item.status}</option>)}</select></label>
    {writeAllowed && nextStates.length>0 && <div className="pipelineActionRow">{nextStates.map((status)=><button key={status} disabled={!!busy} className={status==='REJECTED'?'danger':''} onClick={()=>void transition(status)}>MOVE → {status}</button>)}</div>}
    {writeAllowed && <form onSubmit={uploadSource}><label>ADD SOURCE / FILE<input name="file" type="file" required/></label><button disabled={!!busy}>UPLOAD + HASH + REGISTER SOURCE</button></form>}
    {writeAllowed && <form onSubmit={addRecord}><label>CASE RECORD TYPE<select value={recordKind} onChange={(e)=>setRecordKind(e.target.value as 'RECORD'|'OBSERVATION')}><option value="OBSERVATION">OBSERVATION</option><option value="RECORD">RECORD</option></select></label><textarea value={recordText} onChange={(e)=>setRecordText(e.target.value)} placeholder="Record only what was observed or declared. This does not create EVIDENCE."/><button disabled={!!busy||!recordText.trim()}>PERSIST {recordKind}</button></form>}
    {writeAllowed && <button disabled={!!busy} onClick={()=>void generateReport()}>GENERATE CASE REPORT</button>}
    {!writeAllowed && <p className="sfiParkNotice">READ-ONLY TENANT ROLE · {role ?? 'UNKNOWN'}</p>}
  </> : null;

  return <main className="pipelinePage">
    <header className="pipelineHeader"><Link href="/field" className="pipelineBrand">SFI.</Link><div><small>CANONICAL SURFACE</small><strong>PIPELINE</strong><span>case → source → observation → analysis → governance → intervention → RETURN → report</span></div><SessionControls/></header>
    <section className="pipelineWorkspace">
      <aside className="pipelineCases"><small>YOUR TENANT WORKSPACE</small><h1>{record ? text(record.subject,'CASE') : 'NO CASE YET'}</h1><p>{record ? text(record.scope) : 'Create a case. Your workspace remains tenant-scoped and does not enter SFI institutional memory by inheritance.'}</p>
        {cases.length>0&&<select value={caseId} onChange={(e)=>setCaseId(e.target.value)}>{cases.map((item)=><option key={item.id} value={item.id}>{item.subject} · {item.status}</option>)}</select>}
        {!record&&<form className="pipelineCreate" onSubmit={createCase}><label>SERVICE PROFILE<select required value={newCase.profile} onChange={(e)=>setNewCase((v)=>({...v,profile:e.target.value}))}><option value="">Select…</option>{profiles.map((profile)=><option key={profile.id} value={profile.id}>{profile.id}</option>)}</select></label><label>SUBJECT<input required value={newCase.subject} onChange={(e)=>setNewCase((v)=>({...v,subject:e.target.value}))}/></label><label>SCOPE<textarea required value={newCase.scope} onChange={(e)=>setNewCase((v)=>({...v,scope:e.target.value}))}/></label><label>SYSTEM BOUNDARY REF<input value={newCase.boundary} onChange={(e)=>setNewCase((v)=>({...v,boundary:e.target.value}))} placeholder="optional; generated if empty"/></label><button disabled={!!busy}>CREATE PERSONAL CASE</button></form>}
        <div className="pipelineBoundary">CLIENT CASE MEMORY ≠ SFI INSTITUTIONAL MEMORY<br/>SOURCE ≠ RECORD ≠ EVIDENCE<br/>REPORT ≠ ACTION</div>
        {notice&&<p className="pipelineNotice">{notice}</p>}{error&&<p className="pipelineError">DEGRADED · {error}</p>}
      </aside>
      <section className="pipelineSummary"><div><small>STATE</small><b>{text(record?.status,'NO CASE')}</b></div><div><small>ROLE</small><b>{role??'—'}</b></div><div><small>SOURCES</small><b>{sources.length}</b></div><div><small>OBJECTS</small><b>{objects.length}</b></div><div><small>ACTIONS</small><b>{pendingActions.length}</b></div><div><small>RETURNS</small><b>{returns.length}</b></div><div><small>REPORTS</small><b>{reports.length}</b></div><div><small>CASE EXECUTIONS</small><b>{caseAiExecutions.length}</b></div></section>
      <section className="pipelineParkMount"><CognitiveSpinePark enabled={Boolean(record)} mode="case" title="YOUR SFI OPERATING PARK" subtitle="Tenant-scoped case continuity · no institutional truth authority" focus={focus} focusOptions={focuses} onFocusChange={setFocusId} zones={zones} stats={[{label:'CASE',value:text(record?.status,'NONE'),state:stateFromCase(record?.status)},{label:'ROLE',value:role??'—'},{label:'OBJECTS',value:objects.length},{label:'RETURNS',value:returns.length,state:returns.length?'LIVE':'UNOBSERVED'}]} toolbar={toolbar} inspector={inspector} footer={<><b>{text(record?.status,'NO CASE')}</b> <i>→</i> OBSERVE <i>→</i> GOVERN WHEN REQUIRED <i>→</i> INTERVENTION <i>→</i> RETURN <i>→</i> REPORT</>}/></section>
      {record&&<section className="pipelineReports"><header><span>REPORTS</span><b>{reports.length}</b></header>{reports.slice(0,8).map((entry)=><details key={entry.id}><summary>{entry.report?.id ?? entry.id} · {entry.generatedAt}</summary><pre>{JSON.stringify(entry.report,null,2)}</pre></details>)}{!reports.length&&<p>No tenant reports recorded.</p>}</section>}
    </section>
  </main>;
}
