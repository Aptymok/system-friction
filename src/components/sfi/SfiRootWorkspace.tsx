'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthState } from '@/components/auth/AuthProvider';
import { SfiFriccionautaPanel } from './SfiFriccionautaPanel';
import {projectCaseLabel} from '@/lib/root/caseDisplayName';
import './SfiRootWorkspace.css';

type Row = Record<string, any>;
type CacheEntry = { at:number; data:Row };

const BASE_CACHE_TTL_MS=120_000;
const DOSSIER_CACHE_TTL_MS=300_000;
const REPORT_CACHE_TTL_MS=300_000;
const baseCache=new Map<string,CacheEntry>();
const dossierCache=new Map<string,CacheEntry>();
const reportCache=new Map<string,CacheEntry>();

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}
function txt(value: unknown, fallback = '—') { return typeof value === 'string' && value.trim() ? value.trim() : fallback; }
function when(value: unknown) { if (typeof value !== 'string' || !value) return '—'; const parsed = new Date(value); return Number.isNaN(parsed.valueOf()) ? value : parsed.toLocaleString('en-US'); }
function cacheFresh(entry:CacheEntry|undefined,ttl:number){return Boolean(entry&&Date.now()-entry.at<ttl)}
async function jsonFetch(url: string, init?: RequestInit) {
  const response = await fetch(url, { cache: 'no-store', ...init });
  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.ok) throw new Error(json?.details || json?.message || json?.error || `${response.status}`);
  return json;
}

function State({ value }: { value: unknown }) {
  const raw = String(value ?? '').toUpperCase();
  const attention = /HIGH|BLOCK|MISSING|REJECT|CONFLICT|LIMITATION|FAILED|DEGRADED/.test(raw);
  const sovereign = /PROPOSED|REQUIRED|LEARNING_PROMOTION|CAPABILITY_IMPLEMENTATION|INSTITUTIONAL_CHANGE/.test(raw);
  return <span className={`rootState ${attention ? 'attention' : sovereign ? 'sovereign' : ''}`}>{raw.replaceAll('_', ' ') || 'MISSING'}</span>;
}
function Section({ title, children }: { title: string; children: ReactNode }) { return <section className="rootDossierSection"><h3>{title}</h3>{children}</section>; }
function Trace({ value }: { value: unknown }) { return <details className="rootTrace"><summary>View technical trace</summary><pre>{JSON.stringify(value, null, 2)}</pre></details>; }
function HumanReportBody({ value }: { value: unknown }) {
  const raw = txt(value, 'MISSING · no readable report body exists.');
  const blocks = raw.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
  return <div className="rootReportBody">{blocks.map((block, index) => {
    const cleaned = block.replace(/^#{1,6}\s*/gm, '').replace(/^[-*]\s+/gm, '• ');
    const heading = cleaned.length < 90 && /^[A-ZÁÉÍÓÚÑ0-9 /·:_-]+$/.test(cleaned);
    return heading ? <h4 key={index}>{cleaned}</h4> : <p key={index}>{cleaned}</p>;
  })}</div>;
}

export function SfiRootWorkspace({ enabled, decisionOnly = false, missionOnly = false }: { enabled: boolean; decisionOnly?: boolean; missionOnly?: boolean }) {
  const search = useSearchParams();
  const auth=useAuthState();
  const userKey=auth.identity?.userId??'unknown';
  const selectedId = search.get('decision');
  const [base, setBase] = useState<Row | null>(null);
  const [dossier, setDossier] = useState<Row | null>(null);
  const [reportArchive, setReportArchive] = useState<Row | null>(null);
  const [reportArchiveLoading, setReportArchiveLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [lastReadAt, setLastReadAt] = useState<string | null>(null);
  const [missionQueue, setMissionQueue] = useState<Row | null>(null);
  const [missionQueueLoading, setMissionQueueLoading] = useState(false);
  const [missionQueueError, setMissionQueueError] = useState<string | null>(null);
  const [missionDefinitions, setMissionDefinitions] = useState<Row[]>([]);
  const [missionExecutionContracts, setMissionExecutionContracts] = useState<Row[]>([]);
  const [missionQueueEnabled, setMissionQueueEnabled] = useState(false);
  const [selectedMissionId, setSelectedMissionId] = useState('SFI-C06:meta_orchestrator');
  const [selectedMissionCaseId, setSelectedMissionCaseId] = useState('');
  const [authorizedCanaryCaseId,setAuthorizedCanaryCaseId]=useState<string|null>(null);
  const [caseDirectory,setCaseDirectory]=useState<Row[]|null>(null);
  const [projectDirectory,setProjectDirectory]=useState<Row[]>([]);
  const [caseDirectoryError,setCaseDirectoryError]=useState<string|null>(null);
  const [missionBusy, setMissionBusy] = useState(false);
  const [missionActionResult, setMissionActionResult] = useState<Row | null>(null);
  const [missionActionError, setMissionActionError] = useState<string | null>(null);
  const [missionDetailJobId,setMissionDetailJobId]=useState<string|null>(null);
  const [missionDetail,setMissionDetail]=useState<Row|null>(null);
  const [missionDetailLoading,setMissionDetailLoading]=useState(false);
  const [missionDetailError,setMissionDetailError]=useState<string|null>(null);
  const [costMeter,setCostMeter]=useState<Row|null>(null);
  const [costMeterBusy,setCostMeterBusy]=useState(false);
  const [costMeterError,setCostMeterError]=useState<string|null>(null);
  const [pilotEconomics, setPilotEconomics] = useState<Row | null>(null);
  const [pilotEconomicsLoading, setPilotEconomicsLoading] = useState(false);
  const [pilotEconomicsError, setPilotEconomicsError] = useState<string | null>(null);
  const [worldSpectClocks, setWorldSpectClocks] = useState<Row | null>(null);
  const [worldSpectClocksLoading, setWorldSpectClocksLoading] = useState(false);
  const [worldSpectClocksError, setWorldSpectClocksError] = useState<string | null>(null);

  const loadBase = useCallback(async (force=false) => {
    if (!enabled) return;
    const key=`${userKey}:root`;
    const cached=baseCache.get(key);
    if(!force&&userKey!=='unknown'&&cacheFresh(cached,BASE_CACHE_TTL_MS)){
      setBase(cached!.data);setLastReadAt(new Date(cached!.at).toISOString());setError(null);return;
    }
    try { const data=await jsonFetch('/api/root/interactive?surface=root'); if(userKey!=='unknown')baseCache.set(key,{at:Date.now(),data});setBase(data);setLastReadAt(new Date().toISOString());setError(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  }, [enabled,userKey]);

  const loadDossier = useCallback(async (id: string,force=false) => {
    const key=`${userKey}:decision:${id}`;
    const cached=dossierCache.get(key);
    if(!force&&userKey!=='unknown'&&cacheFresh(cached,DOSSIER_CACHE_TTL_MS)){setDossier(cached!.data.dossier??null);setError(null);return;}
    setLoading(true);
    try { const data = await jsonFetch(`/api/root/decision-dossier?kind=proposal&id=${encodeURIComponent(id)}`); if(userKey!=='unknown')dossierCache.set(key,{at:Date.now(),data});setDossier(data.dossier ?? null); setError(null); }
    catch (cause) { setDossier(null); setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setLoading(false); }
  }, [userKey]);

  const loadReportArchive = useCallback(async (force=false) => {
    if (reportArchiveLoading) return;
    const key=`${userKey}:reports`;
    const cached=reportCache.get(key);
    if(!force&&userKey!=='unknown'&&cacheFresh(cached,REPORT_CACHE_TTL_MS)){setReportArchive(cached!.data);setError(null);return;}
    if(reportArchive&&!force)return;
    setReportArchiveLoading(true);
    try { const data=await jsonFetch('/api/root/reports');if(userKey!=='unknown')reportCache.set(key,{at:Date.now(),data});setReportArchive(data);setError(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setReportArchiveLoading(false); }
  }, [reportArchive, reportArchiveLoading,userKey]);

  const loadMissionQueue = useCallback(async () => {
    if (!enabled || missionQueueLoading) return;
    setMissionQueueLoading(true);
    setMissionQueueError(null);
    try {
      const data = await jsonFetch('/api/root/cognitive-runtime');
      setMissionQueue(data.ownerQueue ?? { available: false, state: 'READ_UNAVAILABLE', jobs: [] });
      setMissionDefinitions(rows(data.missionDefinitions));
      setMissionExecutionContracts(rows(data.executionContracts));
      setMissionQueueEnabled(data.queuedMissionEnabled === true);
      setAuthorizedCanaryCaseId(txt(data.authorizedCanaryCaseId,'')||null);
    } catch (cause) {
      setMissionQueue(null);
      setMissionQueueError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setMissionQueueLoading(false);
    }
  }, [enabled, missionQueueLoading]);

  const loadCostMeter=useCallback(async()=>{
    if(!enabled||costMeterBusy)return;
    setCostMeterBusy(true);setCostMeterError(null);
    try {setCostMeter(await jsonFetch('/api/root/cost-meter'));}
    catch(error){setCostMeter(null);setCostMeterError(error instanceof Error?error.message:String(error));}
    finally{setCostMeterBusy(false);}
  },[enabled,costMeterBusy]);

  const readMissionDetail=useCallback(async(jobId:string)=>{
    if(missionDetailLoading)return;
    if(missionDetailJobId===jobId){setMissionDetailJobId(null);setMissionDetail(null);return;}
    setMissionDetailJobId(jobId);setMissionDetail(null);setMissionDetailError(null);setMissionDetailLoading(true);
    try {
      const data=await jsonFetch('/api/root/cognitive-runtime?jobId='+encodeURIComponent(jobId));
      setMissionDetail(data);
    } catch(cause) {
      setMissionDetailError(cause instanceof Error?cause.message:String(cause));
    } finally {setMissionDetailLoading(false);}
  },[missionDetailLoading,missionDetailJobId]);

  const runMissionAction=useCallback(async (operation:'queue_mission'|'run_queue_once')=>{
    if(!enabled||missionBusy||!missionQueueEnabled)return;
    if(operation==='queue_mission'&&(!authorizedCanaryCaseId||selectedMissionCaseId!==authorizedCanaryCaseId)){
      setMissionActionError('Selecciona únicamente el caso autorizado para la prueba C07.');
      return;
    }
    const mission=missionDefinitions.find(m=>m.missionId===selectedMissionId);
    if(operation==='queue_mission'&&(!mission||!selectedMissionCaseId)) {
      setMissionActionError('Selecciona una misión y un caso autorizado.');
      return;
    }
    setMissionBusy(true);setMissionActionError(null);setMissionActionResult(null);
    try {
      const payload:Row={operation};
      if(operation==='queue_mission'&&mission){
        payload.missionId=mission.missionId;
        payload.agentId=mission.agentId;
        payload.idempotencyKey='root-canary-'+crypto.randomUUID();
        payload.purpose='Analyze the selected authorized case for '+mission.title+
          '. Preserve provenance, missing evidence and authority; propose next agent handoff where appropriate. No material action, external RETURN, or promotion.';
        payload.targets=[{kind:'CASE',id:selectedMissionCaseId}];
        payload.anchors=[{kind:'CASE',id:selectedMissionCaseId}];
        payload.governanceContext={
          subjectType:'NOT_DECLARED', jurisdiction:null,
          containsPersonalData:null, containsSensitiveData:null,
          affectsDecisionAboutPersons:null, declaredPurposeBasis:null,
        };
      }
      const result=await jsonFetch('/api/root/cognitive-runtime',{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),
      });
      setMissionActionResult(result);
      await loadMissionQueue();
    }catch(cause){
      setMissionActionError(cause instanceof Error?cause.message:String(cause));
      await loadMissionQueue();
    }finally{setMissionBusy(false);}
  },[enabled,missionBusy,missionQueueEnabled,missionDefinitions,selectedMissionId,selectedMissionCaseId,authorizedCanaryCaseId,loadMissionQueue]);

  const loadPilotEconomics = useCallback(async () => {
    if (!enabled || pilotEconomicsLoading) return;
    setPilotEconomicsLoading(true);
    setPilotEconomicsError(null);
    try {
      const data = await jsonFetch('/api/root/continuity?economics=1');
      setPilotEconomics(data);
    } catch (cause) {
      setPilotEconomics(null);
      setPilotEconomicsError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setPilotEconomicsLoading(false);
    }
  }, [enabled, pilotEconomicsLoading]);

  const loadWorldSpectClocks = useCallback(async () => {
    if(!enabled || worldSpectClocksLoading)return;
    setWorldSpectClocksLoading(true);
    setWorldSpectClocksError(null);
    try {
      const data=await jsonFetch('/api/root/continuity?worldspect_planes=1');
      setWorldSpectClocks(data);
    } catch(cause) {
      setWorldSpectClocks(null);
      setWorldSpectClocksError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setWorldSpectClocksLoading(false);
    }
  },[enabled,worldSpectClocksLoading]);

  useEffect(() => {
    if(!enabled||!missionOnly)return;
    let cancelled=false;
    void jsonFetch('/api/cases').then(data=>{
      if(cancelled)return;
      setCaseDirectory(rows(data.cases));
      setProjectDirectory(rows(data.projects));
      setCaseDirectoryError(null);
    }).catch(cause=>{
      if(cancelled)return;
      setCaseDirectoryError(cause instanceof Error?cause.message:String(cause));
    });
    return ()=>{cancelled=true};
  },[enabled,missionOnly,userKey]);

  useEffect(() => {
    if (!enabled || !missionOnly || missionQueue || missionQueueLoading || missionQueueError) return;
    void loadMissionQueue();
  }, [enabled, missionOnly, missionQueue, missionQueueLoading, missionQueueError, loadMissionQueue]);

  useEffect(() => {
    // Never reuse a previous ROOT principal's actor-scoped job snapshot.
    setMissionQueue(null);
    setMissionQueueError(null);
    setMissionDefinitions([]);
    setMissionExecutionContracts([]);
    setMissionQueueEnabled(false);
    setMissionActionResult(null);
    setMissionActionError(null);
    setPilotEconomics(null);
    setPilotEconomicsError(null);
    setWorldSpectClocks(null);
    setWorldSpectClocksError(null);
  }, [userKey]);

  useEffect(() => { void loadBase(false); }, [loadBase]);
  useEffect(() => { if (selectedId) void loadDossier(selectedId,false); else setDossier(null); setNote(''); }, [selectedId, loadDossier]);

  const operational = base?.operationalNext ?? {};
  const items = rows(operational.items);
  const cycles = rows(operational.cycles);
  const actionable = items.filter((item) => item.rootActionRequired === true);
  const observable = items.filter((item) => item.rootActionRequired !== true);
  const cases = missionOnly ? (caseDirectory ?? []) : rows(base?.caseIndex?.cases);
  const projects = missionOnly ? projectDirectory : rows(base?.caseIndex?.projects);
  const activeCases = useMemo(() => cases.filter((item) => !['CLOSED', 'REJECTED'].includes(String(item.status).toUpperCase())), [cases]);
  const selectedCaseRecord=activeCases.find(item=>item.id===selectedMissionCaseId);
  const selectedMissionRecord=missionDefinitions.find(item=>item.missionId===selectedMissionId);
  const eligibleCaseMissions=missionDefinitions.filter((mission)=>{
    if(mission.executorBound!==true||mission.humanApprovalRequired===true||
      mission.minimumTargets>1||mission.maximumTargets<1||
      !Array.isArray(mission.inputKinds)||!mission.inputKinds.includes('CASE'))return false;
    const contract=missionExecutionContracts.find(c=>c.agentId===mission.agentId);
    return contract&&Array.isArray(contract.requiredParameters)&&contract.requiredParameters.length===0
      &&contract.timeRange!=='REQUIRED'
      &&Array.isArray(contract.allowedAnchorKinds)&&contract.allowedAnchorKinds.includes('CASE');
  });

  const readState = base ? (error ? 'DEGRADED' : 'OBSERVED') : (error ? 'DEGRADED' : 'MISSING');
  const pulseValue = (value: number) => base ? value : 'MISSING';

  const decide = async (decision: 'accept' | 'deny') => {
    if (!dossier?.id || dossier?.actionability?.actionable !== true) return;
    setBusy(decision);
    try {
      await jsonFetch('/api/root/decisions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'proposal', id: dossier.id, decision, note: note.trim() || null }) });
      setNotice(decision === 'accept' ? 'Change accepted. Subsequent execution keeps its own limits, evidence and RETURN.' : 'Change denied. The dossier and its trace remain available.');
      setNote('');
      await Promise.all([loadBase(true), loadDossier(dossier.id,true)]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(null); }
  };

  const requestEvidence = async () => {
    if (!dossier?.id || dossier?.actionability?.actionable !== true) return;
    setBusy('evidence');
    try {
      await jsonFetch(`/api/sfi/proposals/${dossier.id}/request-evidence`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ evidence_required: note.trim() || 'Find enough evidence to support, contradict or make this proposal indeterminate before deciding.' }) });
      setNotice('Evidence request recorded. SFI started governed acquisition and the decision remains open.');
      setNote('');
      await Promise.all([loadBase(true), loadDossier(dossier.id,true)]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(null); }
  };

  if (!enabled) return null;
  const plain = dossier?.plainLanguage ?? {};
  const reportItems = rows(reportArchive?.inbox?.items);
  const reportLanes = rows(reportArchive?.health?.lanes);

  const decisionSurface = (
    <div className="rootDecisionLayout">
      <aside className="rootDecisionQueue"><header><div><span>DECISIONS THAT REQUIRE ROOT</span><b>{base ? actionable.length : 'MISSING'}</b></div></header>{actionable.map((item) => <Link key={item.id} href={`/root?decision=${encodeURIComponent(String(item.id))}`} className={`rootDecisionCard ${selectedId === item.id ? 'selected' : ''}`}><div><State value={item.rootDecisionClass ?? item.decisionClass}/><State value={item.riskLevel}/></div><strong>{txt(item.title, 'Institutional change')}</strong><p>{txt(item.actionability?.question, 'Open the dossier to understand what would change and why.')}</p><small>Open decision →</small></Link>)}{base && !actionable.length && <div className="rootEmpty">No institutional changes currently require a ROOT decision.</div>}{!base && <div className="rootEmpty">{readState} · zero is not projected until the read contract is observed.</div>}{!!observable.length && <details className="rootObservable"><summary>Work SFI is resolving · {observable.length}</summary>{observable.slice(0, 80).map((item) => <article key={item.id}><strong>{txt(item.title, 'Operational work')}</strong><p>{txt(item.actionability?.question, 'SFI continues within existing authority.')}</p></article>)}</details>}</aside>

      <main className="rootDecisionDetail">
        {loading && <div className="rootEmpty large">Reconstructing dossier…</div>}
        {!loading && !dossier && <div className="rootEmpty large"><strong>There is nothing to approve here by default.</strong><p>A dossier appears only when SFI proposes a sovereign change. All other work continues automatically or remains observable.</p></div>}
        {!loading && dossier && <article className="rootDossier"><header className="rootDossierHero"><div><State value={dossier.decisionClass}/><h2>{txt(dossier.title, 'Institutional decision')}</h2><p>{txt(dossier.statusMeaning, dossier.status)}</p></div><State value={dossier.risk?.level}/></header>
          <Section title="Who brings it"><p>{txt(plain.who, 'The origin was not normalized. The technical trace must show exactly what is missing.')}</p></Section><Section title="What happened"><p>{txt(plain.whatHappened, 'No sufficient human-readable explanation was recorded.')}</p></Section><Section title="Why it matters"><p>{txt(plain.whyItMatters)}</p></Section><Section title="What it proposes"><p>{txt(plain.proposal)}</p></Section><Section title="What SFI gains"><p>{txt(plain.sfiGain)}</p></Section><Section title="What evidence exists"><p>{txt(plain.evidence)}</p><small>ROOT may request more evidence, but pressing a button does not turn a source into admitted evidence.</small></Section><Section title="If accepted"><p>{txt(plain.ifAccepted)}</p></Section><Section title="If denied"><p>{txt(plain.ifDenied)}</p></Section><Section title="Why this decision belongs to ROOT"><p>{txt(plain.whyRoot)}</p></Section>
          {dossier.actionability?.actionable === true ? <section className="rootDecisionActions"><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional note or specification of missing evidence"/><div><button disabled={Boolean(busy)} onClick={() => void decide('accept')}>ACCEPT</button><button className="deny" disabled={Boolean(busy)} onClick={() => void decide('deny')}>DENY</button><button className="evidence" disabled={Boolean(busy)} onClick={() => void requestEvidence()}>REQUEST EVIDENCE</button><Link className="rootEvidenceLink" href="/root/evidence-review">CONTRIBUTE / REVIEW EVIDENCE →</Link></div></section> : <div className="rootEmpty">There is no actionable ROOT decision now. Operational work continues without asking for authorization.</div>}
          <Trace value={dossier.technicalTrace ?? dossier}/>
        </article>}
      </main>
    </div>
  );

  const missionSurface = (
    <details className="rootReports" data-c09-actor-scoped-mission-status="SFI-C09-READ-ONLY-1.0"
      open={missionOnly ? true : undefined}
      onToggle={(event) => { if (event.currentTarget.open && !missionQueue && !missionQueueLoading) void loadMissionQueue(); }}>
      <summary>MISSIONS · GOVERNED QUEUE · RECEIPTS</summary>
      <div className="rootReportList">
        <p>Esta cola conserva autoridad, idempotencia, leases y recibos reales. Encolar no equivale a ejecutar.
          El operador ROOT puede iniciar un canario autorizado, y el trabajador C08 debe proseguir la cola bajo la política desplegada.</p>
        <button type="button" disabled={missionQueueLoading}
          onClick={() => void loadMissionQueue()}>Actualizar estado de misiones</button>
        <section className="rootReportItem" data-sfi-cost-meter="PRIMARY_ON_DEMAND_NO_SYNC">
          <strong>COSTE Y LÍMITES · SFI</strong>
          <p>Sin sincronización Neon ni sondeos automáticos. Este contador consulta Supabase solo cuando lo solicitas; no sustituye las facturas de los proveedores.</p>
          <button type="button" disabled={costMeterBusy} onClick={()=>void loadCostMeter()}>
            {costMeterBusy?'Leyendo consumo…':'Consultar consumo y presupuesto'}
          </button>
          {costMeterError&&<p role="alert">Consumo no verificable: {costMeterError}. No se supone que es cero.</p>}
          {costMeter&&<div className="rootReportHealth" role="status">
            <article><span>Misiones admitidas hoy</span><strong>
              {String(costMeter.quota?.admittedToday??'NO MEDIDO')} / {String(costMeter.quota?.limits?.perDay??'NO DEFINIDO')}
            </strong></article>
            <article><span>Misiones admitidas este mes</span><strong>
              {String(costMeter.quota?.admittedMonth??'NO MEDIDO')} / {String(costMeter.quota?.limits?.perMonth??'NO DEFINIDO')}
            </strong></article>
            <article><span>Cupo restante hoy / mes</span><strong>
              {String(costMeter.quota?.remainingToday??'NO MEDIDO')} / {String(costMeter.quota?.remainingMonth??'NO MEDIDO')}
            </strong></article>
            <article><span>Admisión de nuevas misiones</span>
              <strong>{costMeter.quota?.admissionAllowed===true?'DISPONIBLE':'LIMITADA'}</strong></article>
            <article><span>Modelos externos en las ejecuciones registradas</span>
              <strong>{String(costMeter.providerSpending?.modelCalls??'NO MEDIDO')}</strong></article>
            <article><span>Coste de modelos observado</span>
              <strong>{costMeter.providerSpending?.observedUsd!==null&&costMeter.providerSpending?.observedUsd!==undefined
                ? '
        <div className="rootReportItem" data-c07-authorized-canary-control="SFI-C07-OPERATOR-CANARY-1.0">
          <strong>CANARIO GOBERNADO · AGENTES C06/C07</strong>
          <p>Agentes disponibles por contrato: {missionDefinitions.length || 'SIN LECTURA'} de 21. Seleccionar un agente no acredita una ejecución. La API comprueba pertenencia, WRITE, revisión exacta,
            identidad del canario, alcance, lease y recibo. Esta interfaz no activa permisos ni elimina GATED.</p>
          <label htmlFor="sfi-c07-case-choice">Caso autorizado</label>
          <select id="sfi-c07-case-choice" value={selectedMissionCaseId}
            onChange={(event)=>setSelectedMissionCaseId(event.target.value)}>
            <option value="">Selecciona un caso</option>
            {activeCases.map(item=><option key={String(item.id)} value={String(item.id)} disabled={item.id!==authorizedCanaryCaseId}>
              {projectCaseLabel({id:String(item.id),subject:txt(item.subject,''),scope:item.scope,projectName:txt(projects.find(p=>p.id===item.projectId)?.name,''),boundary:txt(item.systemBoundaryRef?.id,'')}).title} · {txt(item.status,'SIN ESTADO')} · {String(item.id).slice(0,8)} {item.id===authorizedCanaryCaseId?'· CANARIO AUTORIZADO':'· NO HABILITADO'}
            </option>)}
          </select>
          {caseDirectory===null&&!caseDirectoryError&&<p role="status">Cargando descripciones de los casos…</p>}
          {caseDirectoryError&&<p role="alert">No se pudieron leer los nombres de los casos: {caseDirectoryError}. No selecciones un código desconocido.</p>}
          {missionQueueEnabled&&!authorizedCanaryCaseId&&<p role="alert">
            No hay ningún caso de prueba C07 asignado a esta cuenta. Las misiones permanecen bloqueadas.
          </p>}
          {selectedCaseRecord&&<div className="rootReportHealth" data-c07-case-confirmation="READABLE_CASE_BEFORE_ENQUEUE">
            <article><span>Expediente seleccionado</span><strong>{
              projectCaseLabel({id:String(selectedCaseRecord.id),subject:txt(selectedCaseRecord.subject,''),
                scope:selectedCaseRecord.scope,
                projectName:txt(projects.find(p=>p.id===selectedCaseRecord.projectId)?.name,''),
                boundary:txt(selectedCaseRecord.systemBoundaryRef?.id,'')}).title
            }</strong></article>
            <article><span>Estado / referencia secundaria</span><strong>{txt(selectedCaseRecord.status)} · {String(selectedCaseRecord.id).slice(0,8)}</strong></article>
            <article><span>Alcance registrado</span><strong>{txt(selectedCaseRecord.scope,'ALCANCE NO DISPONIBLE')}</strong></article>
          </div>}
          <label htmlFor="sfi-c07-mission-choice">Misión</label>
          <select id="sfi-c07-mission-choice" value={selectedMissionId}
            onChange={(event)=>setSelectedMissionId(event.target.value)}>
            {eligibleCaseMissions.map(m=><option key={String(m.missionId)} value={String(m.missionId)}>
              {txt(m.agentName,txt(m.agentId))} · {txt(m.title)}
            </option>)}
          </select>
          {selectedMissionRecord&&<div className="rootReportHealth" data-c07-agent-confirmation="EXPLAIN_AGENT_BEFORE_ENQUEUE">
            <article><span>Agente / misión</span><strong>{txt(selectedMissionRecord.agentName,txt(selectedMissionRecord.agentId))} · {txt(selectedMissionRecord.title)}</strong></article>
            <article><span>Qué realizará</span><strong>{txt(selectedMissionRecord.objective)}</strong></article>
            <article><span>Requisito previo</span><strong>{txt(selectedMissionRecord.prerequisite)}</strong></article>
          </div>}
          <button type="button" disabled={!missionQueueEnabled||missionBusy||!selectedMissionCaseId||
            !eligibleCaseMissions.some(m=>m.missionId===selectedMissionId)}
            onClick={()=>void runMissionAction('queue_mission')}>
            {missionBusy?'Procesando…':'Encolar misión autorizada'}
          </button>
          <button type="button" disabled={!missionQueueEnabled||missionBusy} onClick={()=>void runMissionAction('run_queue_once')}>
            Ejecutar una misión pendiente (prueba gobernada)
          </button>
          {missionActionError&&<p role="alert">Canario no ejecutado: {missionActionError}</p>}
          {missionActionResult&&<div className="rootReportHealth">
            <article><span>Operación</span><strong>{txt(missionActionResult.operation)}</strong></article>
            <article><span>Estado observado</span><State value={missionActionResult.state||missionActionResult.result?.state}/></article>
            <article><span>Recibo</span><strong>{txt(missionActionResult.jobId||missionActionResult.result?.executionId,'NO CONFIRMADO')}</strong></article>
          </div>}
        </div>
        {!missionQueueEnabled&&missionQueue&&<p role="alert">
          C07 está deshabilitado o no liberado en este entorno. Puedes inspeccionar agentes y contratos, pero no iniciar ejecuciones; las acciones permanecen bloqueadas.
        </p>}
        {missionQueueLoading && <div className="rootEmpty">Checking governed mission queue…</div>}
        {missionQueueError && <div className="rootEmpty" role="alert">Queue read unavailable: {missionQueueError}. No zero count is inferred.</div>}
        {missionQueue && <div className="rootReportHealth">
          <article><span>Queue status</span><State value={missionQueue.state}/></article>
          <article><span>Result scope</span><strong>Authenticated operator · latest 20</strong></article>
          <article><span>External RETURN</span><strong>NOT INFERRED FROM JOB STATUS</strong></article>
        </div>}
        {missionQueue?.available === false && <div className="rootEmpty">
          The mission queue is disabled or unavailable. No tasks or executions are inferred.
        </div>}
        {missionQueue?.available === true && rows(missionQueue.jobs).length === 0 &&
          <div className="rootEmpty">No owned jobs returned in this bounded snapshot.</div>}
        {missionQueue?.available === true && rows(missionQueue.jobs).map((job) =>
          <article className="rootReportItem" key={String(job.id)}>
            <div><State value={job.status}/><small>{when(job.updated_at)}</small></div>
            <strong>{txt(job.mission_id, 'Unidentified mission')}</strong>
            <p>Execution ID: {txt(job.execution_id)} · Attempts: {Number(job.attempts ?? 0)} / {Number(job.max_attempts ?? 0)}</p>
            <p>Confirmed receipt: {txt(job.receipt_event_id, 'NOT OBSERVED')}</p>
            <small>Return observation: {txt(job.return_observation, 'NOT OBSERVED')}</small>
            <button type="button" disabled={missionDetailLoading}
              onClick={()=>void readMissionDetail(String(job.id))}>
              {missionDetailJobId===String(job.id)?'Cerrar comprobación':'Leer resultado y evidencia'}
            </button>
            {missionDetailJobId===String(job.id)&&<div className="rootReportHealth" role="status">
              {missionDetailLoading&&<p>Consultando recibo principal…</p>}
              {missionDetailError&&<p role="alert">No se pudo comprobar el resultado: {missionDetailError}</p>}
              {missionDetail&&<>
                <article><span>Recibo independiente</span><strong>{txt(missionDetail.outcome?.verification)}</strong></article>
                <article><span>Resultado científico</span><strong>{txt(missionDetail.outcome?.scientificResult,'NO OBSERVADO')}</strong></article>
                <article><span>Fuentes registradas / leídas</span><strong>{
                  String(missionDetail.outcome?.caseSourceInventory?.references??'NO MEDIDO')+' / '+
                  String(missionDetail.outcome?.caseSourceInventory?.retrievedContents??'NO MEDIDO')
                }</strong></article>
                <article><span>Hipótesis del caso</span><strong>{
                  String(missionDetail.outcome?.caseSourceInventory?.hypotheses??'NO MEDIDO')
                }</strong></article>
                <article><span>Faltantes identificados</span><strong>{
                  String(missionDetail.outcome?.evidenceHunter?.missingDetected??'NO MEDIDO')
                }</strong></article>
                <article><span>Modelo externo / RETURN</span><strong>{
                  txt(missionDetail.outcome?.modelExecution,'NO OBSERVADO')+' / '+
                  txt(missionDetail.outcome?.externalReturn,'NO OBSERVADO')
                }</strong></article>
                <p>Un recibo COMPLETED no acredita fuente leída, contraste, adopción ni aprendizaje. Los valores NO MEDIDO no equivalen a cero.</p>
              </>}
            </div>}
          </article>)}
        {missionQueue?.truncated === true && <div className="rootEmpty">
          Only the most recent twenty owned jobs are shown. This is not a complete historical count.
        </div>}
      </div>
    </details>
  );

  if (missionOnly) return <section className="rootWorkspace rootMissionEmbedded"
    data-root-missions-panel="SFI-ROOT-ACTUAL-FIELD-MISSION-CONSOLE-1.0">
    {missionSurface}
  </section>;

  if (decisionOnly) return <section className="rootWorkspace rootDecisionEmbedded" data-root-decision-interface="SFI-ROOT-SOVEREIGN-DECISION-1.0">
    {(error || notice) && <div className={`rootToast ${error ? 'error' : ''}`}><span>{error || notice}</span><button onClick={() => { setError(null); setNotice(null); }}>×</button></div>}
    <header className="rootDecisionEmbeddedHeader"><span>SOVEREIGN DECISIONS · ROOT</span><strong>{base ? actionable.length : 'MISSING'}</strong><small>Only authority-bound changes appear here. Observation and routine execution continue autonomously.</small></header>
    {decisionSurface}
  </section>;

  return <div className="rootWorkspace" data-root-visual-contract="SFI-ROOT-VISUAL-2.0" data-root-module-count="dynamic">
    {(error || notice) && <div className={`rootToast ${error ? 'error' : ''}`}><span>{error || notice}</span><button onClick={() => { setError(null); setNotice(null); }}>×</button></div>}

    <header className="rootHeader"><div className="rootHeaderCopy"><span>ROOT · INSTITUTIONAL SOVEREIGNTY · AUTHORITY / OBSERVATION / RETURN</span><h1>Decide what is sovereign. Observe and read the rest.</h1><p>SFI operates, searches for evidence, executes already-authorized capabilities, records RETURN and closes routine work without asking permission. ROOT intervenes when a real authority decision exists and retains complete visibility over reports, cases, learning and RETURN.</p></div><div className="rootReadState"><span>READ STATE</span><b>{lastReadAt ? `${readState} · ${when(lastReadAt)}` : `${readState} · waiting for first observation`}</b><button onClick={() => void loadBase(true)}>Refresh</button></div></header>

    <section className="rootPulse" aria-label="Observable institutional state"><article data-epistemic-state={readState}><span>ROOT decisions</span><b>{pulseValue(actionable.length)}</b><small>Sovereign changes only.</small></article><article data-epistemic-state={readState}><span>Active cases</span><b>{pulseValue(activeCases.length)}</b><small>Observed; not approved.</small></article><article data-epistemic-state={readState}><span>Open cycles</span><b>{pulseValue(cycles.length)}</b><small>May close autonomously.</small></article><article data-epistemic-state={readState}><span>Observable work</span><b>{pulseValue(observable.length)}</b><small>SFI continues within its authority.</small></article></section>

    <section className="rootRule"><strong>SFI OPERATES WITHOUT ASKING PERMISSION.</strong><span>OBSERVATION ≠ INFERENCE · SIMULATION ≠ OBSERVATION · operating ≠ governing · closing ≠ learning · evidence ≠ approval · report ≠ decision.</span></section>

    <SfiFriccionautaPanel />

    {decisionSurface}

    <details className="rootReports" data-sfi-pilot-light-economics="SFI-PILOT-LIGHT-ECONOMICS-OBSERVE-1.0"
      onToggle={(event) => { if (event.currentTarget.open) void loadPilotEconomics(); }}>
      <summary>CONTINUIDAD ECONÓMICA · COSTOS Y CAPACIDAD</summary>
      <div className="rootReportList">
        <p>Supabase y Neon son proveedores independientes. La replicación automática está retirada por decisión del fundador.
          Medición sólo bajo solicitud explícita: actividad real, espacio ocupado y unidades registradas. Sin cobros inferidos.</p>
        <button type="button" disabled={pilotEconomicsLoading} onClick={() => void loadPilotEconomics()}>
          {pilotEconomicsLoading ? 'Midiendo…' : 'Medir ahora'}
        </button>
        {pilotEconomicsError && <p role="alert">Medición no disponible: {pilotEconomicsError}</p>}
        {pilotEconomics && <div className="rootReportHealth">
          <article><span>Plano actual</span><strong>{txt(pilotEconomics.neonMode,'NO OBSERVADO')}</strong></article>
          <article><span>Neon PostgreSQL</span><strong>
            {typeof pilotEconomics.neonStorage?.databaseBytes === 'number'
              ? (pilotEconomics.neonStorage.databaseBytes / 1_000_000).toFixed(1) + ' MB'
              : 'NO OBSERVADO'}
          </strong></article>
          <article><span>Histórico de diario Neon (sin obligación de réplica)</span><strong>
            {typeof pilotEconomics.neonStorage?.journalBytes === 'number'
              ? (pilotEconomics.neonStorage.journalBytes / 1_000_000).toFixed(1) + ' MB'
              : 'NO OBSERVADO'}
          </strong></article>
          <article><span>Outbox histórico PRIMARY (no requiere vaciado)</span><strong>
            {typeof pilotEconomics.primaryOutbox?.pending === 'number'
              ? pilotEconomics.primaryOutbox.pending
              : 'NO OBSERVADO'}
          </strong></article>
          <article><span>Ejecuciones institucionales registradas (30 días, máximo 250)</span>
            <strong>{typeof pilotEconomics.operationalConsumption?.observedRuns==='number'
              ? pilotEconomics.operationalConsumption.observedRuns.toLocaleString()
              : 'NO OBSERVADAS'}</strong></article>
          <article><span>Tiempo transcurrido de ejecuciones observadas</span>
            <strong>{typeof pilotEconomics.operationalConsumption?.observedDurationMs==='number'
              ? (pilotEconomics.operationalConsumption.observedDurationMs/60000).toFixed(1)+' min'
              : 'NO OBSERVADO'}</strong></article>
          <article><span>Operaciones de capacidades registradas</span>
            <strong>{typeof pilotEconomics.operationalConsumption?.executedCapabilityChecks==='number'
              ? pilotEconomics.operationalConsumption.executedCapabilityChecks.toLocaleString()
              : 'NO OBSERVADAS'}</strong></article>
          <article><span>Contabilidad de consumo</span><strong>
            {pilotEconomics.measuredUsage?.status==='OBSERVED'
              ? String(pilotEconomics.measuredUsage.eventCount)+' eventos medidos (últimos 30 días)'
              : 'SIN LECTURA'}
          </strong></article>
          <article><span>Coste monetario y cuota restante</span><strong>DESCONOCIDOS · FALTA FACTURACIÓN DEL PROVEEDOR</strong></article>
          <article><span>Política de bases</span><strong>SIN REPLICACIÓN · PROVEEDORES INDEPENDIENTES</strong></article>
          {Array.isArray(pilotEconomics.measuredUsage?.units)&&pilotEconomics.measuredUsage.units.slice(0,12).map((item: Row, i: number)=>
            <article key={'cost-ledger-'+i}><span>{txt(item.kind,'TIPO')} · {txt(item.unit,'UNIDAD')}</span>
              <strong>{Number(item.amount).toLocaleString()} unidades medidas</strong></article>)}
        </div>}
        {pilotEconomics?.errors?.neon && <p role="alert">Neon: medición incompleta.</p>}
        {pilotEconomics?.errors?.primary && <p role="alert">PRIMARY: medición incompleta.</p>}
        <p>Las lecturas de consumo provienen del ledger de PRIMARY; no son una factura.
          Una tarifa y cuota deben venir de cada proveedor. Neon conserva su información propia sin reflejar Supabase.</p>
      </div>
    </details>

    <details className="rootReports" data-sfi-worldspect-provider-clocks="SFI-WORLDSPECT-INDEPENDENT-PLANE-CLOCK-1.0"
      onToggle={(event) => {if(event.currentTarget.open)void loadWorldSpectClocks();}}>
      <summary>WORLDSPECT · RELOJES DE OBSERVACIÓN POR PROVEEDOR</summary>
      <div className="rootReportList">
        <p>Supabase PRIMARY y Neon mantienen observaciones independientes. Esta comparación no replica datos,
          no cambia el proveedor de escritura ni acredita que las observaciones sean equivalentes.</p>
        <button type="button" disabled={worldSpectClocksLoading} onClick={()=>void loadWorldSpectClocks()}>
          {worldSpectClocksLoading?'Comparando…':'Comparar ahora'}
        </button>
        {worldSpectClocksError && <p role="alert">Lectura no disponible: {worldSpectClocksError}</p>}
        {worldSpectClocks && <div className="rootReportHealth">
          <article><span>Diagnóstico de relojes</span><State value={worldSpectClocks.status}/></article>
          <article><span>Supabase PRIMARY · última observación</span><strong>{when(worldSpectClocks.primary?.observedAt)}</strong></article>
          <article><span>Neon · última observación</span><strong>{when(worldSpectClocks.neon?.observedAt)}</strong></article>
          <article><span>Diferencia Neon − PRIMARY</span><strong>
            {typeof worldSpectClocks.differenceMinutes==='number'
              ? worldSpectClocks.differenceMinutes.toLocaleString()+' min'
              : 'SIN DATOS SUFICIENTES'}
          </strong></article>
        </div>}
        {worldSpectClocks && <p>{worldSpectClocks.status==='NEON_NEWER'
          ? 'Neon tiene una medición más reciente; la lectura de PRIMARY no demuestra ausencia de observación.'
          : worldSpectClocks.status==='PRIMARY_NEWER'
            ? 'PRIMARY registra una medición posterior a la última observación conocida en Neon.'
            : worldSpectClocks.status==='SAME_OBSERVED_TIME_UNVERIFIED'
              ? 'Los relojes coinciden; esto no certifica igualdad de contenido ni replicación.'
              : 'No es posible atribuir una observación más reciente con la evidencia disponible.'}</p>}
        {(worldSpectClocks?.readWarnings?.primary || worldSpectClocks?.readWarnings?.neon) &&
          <p role="alert">Al menos una consulta fue indisponible. No se atribuye un valor cero ni paridad.</p>}
      </div>
    </details>

    {missionSurface}

    <details className="rootReports" onToggle={(event) => { if (event.currentTarget.open) void loadReportArchive(false); }}>
      <summary>REPORTS · OBSERVATIONS · HYPOTHESES · LEARNING · RETURN</summary>
      {reportArchiveLoading && <div className="rootEmpty">Reading reports…</div>}
      {reportArchive && <div className="rootReportList">
        <p>Reports are read in full here. They inform and reconstruct; they do not require ACCEPT/DENY to exist or be used under current authority.</p>
        {!!reportLanes.length && <div className="rootReportHealth">{reportLanes.map((lane) => <article key={lane.key}><span>{txt(lane.label, lane.key)}</span><State value={lane.state}/><small>{lane.lastGeneratedAt ? when(lane.lastGeneratedAt) : 'no observed generation'}</small></article>)}</div>}
        {reportItems.slice(0, 80).map((item) => <details className="rootReportItem" key={`${item.source}:${item.id}`}><summary><div><State value={item.status}/><State value={item.category}/><small>{when(item.createdAt)}</small></div><strong>{txt(item.title, 'Report')}</strong><span>{txt(item.reportType, 'report')} · {txt(item.cadence, 'unknown')}</span></summary><HumanReportBody value={item.body}/><div className="rootReportFacts"><span>EVIDENCE {rows(item.evidence).length || (Array.isArray(item.evidence) ? item.evidence.length : 0)}</span><span>WARNINGS {Array.isArray(item.warnings) ? item.warnings.length : 0}</span><span>PROVIDER {txt(item.provider, '—')}</span><span>MODEL {txt(item.model, '—')}</span></div><Trace value={{ evidence: item.evidence, warnings: item.warnings, trace: item.trace, metadata: item.metadata }}/></details>)}
      </div>}
    </details>

    <section className="rootSummaryTile" aria-label="Resumen operativo"><span>PROJECTS {base ? projects.length : 'MISSING'}</span><span>CASES {base ? cases.length : 'MISSING'}</span><span>DECISION / EVIDENCE / REPORTS / RETURN</span><span>RULE: ROOT DECIDES; SFI DOES THE WORK.</span></section>
  </div>;
}
+Number(costMeter.providerSpending.observedUsd).toFixed(6)+' USD · solo eventos medidos'
                : 'NO MEDIDO / SIN TARIFA VERIFICADA'}</strong></article>
            <article><span>Facturación Supabase / Vercel</span><strong>NO CONECTADA</strong></article>
            <small>Última lectura: {when(costMeter.snapshotAt)}. Contamos misiones autorizadas y llamadas observadas; el coste total real puede incluir almacenamiento, red, invocaciones y otros servicios.</small>
          </div>}
        </section>
        <div className="rootReportItem" data-c07-authorized-canary-control="SFI-C07-OPERATOR-CANARY-1.0">
          <strong>CANARIO GOBERNADO · AGENTES C06/C07</strong>
          <p>Agentes disponibles por contrato: {missionDefinitions.length || 'SIN LECTURA'} de 21. Seleccionar un agente no acredita una ejecución. La API comprueba pertenencia, WRITE, revisión exacta,
            identidad del canario, alcance, lease y recibo. Esta interfaz no activa permisos ni elimina GATED.</p>
          <label htmlFor="sfi-c07-case-choice">Caso autorizado</label>
          <select id="sfi-c07-case-choice" value={selectedMissionCaseId}
            onChange={(event)=>setSelectedMissionCaseId(event.target.value)}>
            <option value="">Selecciona un caso</option>
            {activeCases.map(item=><option key={String(item.id)} value={String(item.id)} disabled={item.id!==authorizedCanaryCaseId}>
              {projectCaseLabel({id:String(item.id),subject:txt(item.subject,''),scope:item.scope,projectName:txt(projects.find(p=>p.id===item.projectId)?.name,''),boundary:txt(item.systemBoundaryRef?.id,'')}).title} · {txt(item.status,'SIN ESTADO')} · {String(item.id).slice(0,8)} {item.id===authorizedCanaryCaseId?'· CANARIO AUTORIZADO':'· NO HABILITADO'}
            </option>)}
          </select>
          {caseDirectory===null&&!caseDirectoryError&&<p role="status">Cargando descripciones de los casos…</p>}
          {caseDirectoryError&&<p role="alert">No se pudieron leer los nombres de los casos: {caseDirectoryError}. No selecciones un código desconocido.</p>}
          {missionQueueEnabled&&!authorizedCanaryCaseId&&<p role="alert">
            No hay ningún caso de prueba C07 asignado a esta cuenta. Las misiones permanecen bloqueadas.
          </p>}
          {selectedCaseRecord&&<div className="rootReportHealth" data-c07-case-confirmation="READABLE_CASE_BEFORE_ENQUEUE">
            <article><span>Expediente seleccionado</span><strong>{
              projectCaseLabel({id:String(selectedCaseRecord.id),subject:txt(selectedCaseRecord.subject,''),
                scope:selectedCaseRecord.scope,
                projectName:txt(projects.find(p=>p.id===selectedCaseRecord.projectId)?.name,''),
                boundary:txt(selectedCaseRecord.systemBoundaryRef?.id,'')}).title
            }</strong></article>
            <article><span>Estado / referencia secundaria</span><strong>{txt(selectedCaseRecord.status)} · {String(selectedCaseRecord.id).slice(0,8)}</strong></article>
            <article><span>Alcance registrado</span><strong>{txt(selectedCaseRecord.scope,'ALCANCE NO DISPONIBLE')}</strong></article>
          </div>}
          <label htmlFor="sfi-c07-mission-choice">Misión</label>
          <select id="sfi-c07-mission-choice" value={selectedMissionId}
            onChange={(event)=>setSelectedMissionId(event.target.value)}>
            {eligibleCaseMissions.map(m=><option key={String(m.missionId)} value={String(m.missionId)}>
              {txt(m.agentName,txt(m.agentId))} · {txt(m.title)}
            </option>)}
          </select>
          {selectedMissionRecord&&<div className="rootReportHealth" data-c07-agent-confirmation="EXPLAIN_AGENT_BEFORE_ENQUEUE">
            <article><span>Agente / misión</span><strong>{txt(selectedMissionRecord.agentName,txt(selectedMissionRecord.agentId))} · {txt(selectedMissionRecord.title)}</strong></article>
            <article><span>Qué realizará</span><strong>{txt(selectedMissionRecord.objective)}</strong></article>
            <article><span>Requisito previo</span><strong>{txt(selectedMissionRecord.prerequisite)}</strong></article>
          </div>}
          <button type="button" disabled={!missionQueueEnabled||missionBusy||!selectedMissionCaseId||
            !eligibleCaseMissions.some(m=>m.missionId===selectedMissionId)}
            onClick={()=>void runMissionAction('queue_mission')}>
            {missionBusy?'Procesando…':'Encolar misión autorizada'}
          </button>
          <button type="button" disabled={!missionQueueEnabled||missionBusy} onClick={()=>void runMissionAction('run_queue_once')}>
            Ejecutar una misión pendiente (prueba gobernada)
          </button>
          {missionActionError&&<p role="alert">Canario no ejecutado: {missionActionError}</p>}
          {missionActionResult&&<div className="rootReportHealth">
            <article><span>Operación</span><strong>{txt(missionActionResult.operation)}</strong></article>
            <article><span>Estado observado</span><State value={missionActionResult.state||missionActionResult.result?.state}/></article>
            <article><span>Recibo</span><strong>{txt(missionActionResult.jobId||missionActionResult.result?.executionId,'NO CONFIRMADO')}</strong></article>
          </div>}
        </div>
        {!missionQueueEnabled&&missionQueue&&<p role="alert">
          C07 está deshabilitado o no liberado en este entorno. Puedes inspeccionar agentes y contratos, pero no iniciar ejecuciones; las acciones permanecen bloqueadas.
        </p>}
        {missionQueueLoading && <div className="rootEmpty">Checking governed mission queue…</div>}
        {missionQueueError && <div className="rootEmpty" role="alert">Queue read unavailable: {missionQueueError}. No zero count is inferred.</div>}
        {missionQueue && <div className="rootReportHealth">
          <article><span>Queue status</span><State value={missionQueue.state}/></article>
          <article><span>Result scope</span><strong>Authenticated operator · latest 20</strong></article>
          <article><span>External RETURN</span><strong>NOT INFERRED FROM JOB STATUS</strong></article>
        </div>}
        {missionQueue?.available === false && <div className="rootEmpty">
          The mission queue is disabled or unavailable. No tasks or executions are inferred.
        </div>}
        {missionQueue?.available === true && rows(missionQueue.jobs).length === 0 &&
          <div className="rootEmpty">No owned jobs returned in this bounded snapshot.</div>}
        {missionQueue?.available === true && rows(missionQueue.jobs).map((job) =>
          <article className="rootReportItem" key={String(job.id)}>
            <div><State value={job.status}/><small>{when(job.updated_at)}</small></div>
            <strong>{txt(job.mission_id, 'Unidentified mission')}</strong>
            <p>Execution ID: {txt(job.execution_id)} · Attempts: {Number(job.attempts ?? 0)} / {Number(job.max_attempts ?? 0)}</p>
            <p>Confirmed receipt: {txt(job.receipt_event_id, 'NOT OBSERVED')}</p>
            <small>Return observation: {txt(job.return_observation, 'NOT OBSERVED')}</small>
            <button type="button" disabled={missionDetailLoading}
              onClick={()=>void readMissionDetail(String(job.id))}>
              {missionDetailJobId===String(job.id)?'Cerrar comprobación':'Leer resultado y evidencia'}
            </button>
            {missionDetailJobId===String(job.id)&&<div className="rootReportHealth" role="status">
              {missionDetailLoading&&<p>Consultando recibo principal…</p>}
              {missionDetailError&&<p role="alert">No se pudo comprobar el resultado: {missionDetailError}</p>}
              {missionDetail&&<>
                <article><span>Recibo independiente</span><strong>{txt(missionDetail.outcome?.verification)}</strong></article>
                <article><span>Resultado científico</span><strong>{txt(missionDetail.outcome?.scientificResult,'NO OBSERVADO')}</strong></article>
                <article><span>Fuentes registradas / leídas</span><strong>{
                  String(missionDetail.outcome?.caseSourceInventory?.references??'NO MEDIDO')+' / '+
                  String(missionDetail.outcome?.caseSourceInventory?.retrievedContents??'NO MEDIDO')
                }</strong></article>
                <article><span>Hipótesis del caso</span><strong>{
                  String(missionDetail.outcome?.caseSourceInventory?.hypotheses??'NO MEDIDO')
                }</strong></article>
                <article><span>Faltantes identificados</span><strong>{
                  String(missionDetail.outcome?.evidenceHunter?.missingDetected??'NO MEDIDO')
                }</strong></article>
                <article><span>Modelo externo / RETURN</span><strong>{
                  txt(missionDetail.outcome?.modelExecution,'NO OBSERVADO')+' / '+
                  txt(missionDetail.outcome?.externalReturn,'NO OBSERVADO')
                }</strong></article>
                <p>Un recibo COMPLETED no acredita fuente leída, contraste, adopción ni aprendizaje. Los valores NO MEDIDO no equivalen a cero.</p>
              </>}
            </div>}
          </article>)}
        {missionQueue?.truncated === true && <div className="rootEmpty">
          Only the most recent twenty owned jobs are shown. This is not a complete historical count.
        </div>}
      </div>
    </details>
  );

  if (missionOnly) return <section className="rootWorkspace rootMissionEmbedded"
    data-root-missions-panel="SFI-ROOT-ACTUAL-FIELD-MISSION-CONSOLE-1.0">
    {missionSurface}
  </section>;

  if (decisionOnly) return <section className="rootWorkspace rootDecisionEmbedded" data-root-decision-interface="SFI-ROOT-SOVEREIGN-DECISION-1.0">
    {(error || notice) && <div className={`rootToast ${error ? 'error' : ''}`}><span>{error || notice}</span><button onClick={() => { setError(null); setNotice(null); }}>×</button></div>}
    <header className="rootDecisionEmbeddedHeader"><span>SOVEREIGN DECISIONS · ROOT</span><strong>{base ? actionable.length : 'MISSING'}</strong><small>Only authority-bound changes appear here. Observation and routine execution continue autonomously.</small></header>
    {decisionSurface}
  </section>;

  return <div className="rootWorkspace" data-root-visual-contract="SFI-ROOT-VISUAL-2.0" data-root-module-count="dynamic">
    {(error || notice) && <div className={`rootToast ${error ? 'error' : ''}`}><span>{error || notice}</span><button onClick={() => { setError(null); setNotice(null); }}>×</button></div>}

    <header className="rootHeader"><div className="rootHeaderCopy"><span>ROOT · INSTITUTIONAL SOVEREIGNTY · AUTHORITY / OBSERVATION / RETURN</span><h1>Decide what is sovereign. Observe and read the rest.</h1><p>SFI operates, searches for evidence, executes already-authorized capabilities, records RETURN and closes routine work without asking permission. ROOT intervenes when a real authority decision exists and retains complete visibility over reports, cases, learning and RETURN.</p></div><div className="rootReadState"><span>READ STATE</span><b>{lastReadAt ? `${readState} · ${when(lastReadAt)}` : `${readState} · waiting for first observation`}</b><button onClick={() => void loadBase(true)}>Refresh</button></div></header>

    <section className="rootPulse" aria-label="Observable institutional state"><article data-epistemic-state={readState}><span>ROOT decisions</span><b>{pulseValue(actionable.length)}</b><small>Sovereign changes only.</small></article><article data-epistemic-state={readState}><span>Active cases</span><b>{pulseValue(activeCases.length)}</b><small>Observed; not approved.</small></article><article data-epistemic-state={readState}><span>Open cycles</span><b>{pulseValue(cycles.length)}</b><small>May close autonomously.</small></article><article data-epistemic-state={readState}><span>Observable work</span><b>{pulseValue(observable.length)}</b><small>SFI continues within its authority.</small></article></section>

    <section className="rootRule"><strong>SFI OPERATES WITHOUT ASKING PERMISSION.</strong><span>OBSERVATION ≠ INFERENCE · SIMULATION ≠ OBSERVATION · operating ≠ governing · closing ≠ learning · evidence ≠ approval · report ≠ decision.</span></section>

    <SfiFriccionautaPanel />

    {decisionSurface}

    <details className="rootReports" data-sfi-pilot-light-economics="SFI-PILOT-LIGHT-ECONOMICS-OBSERVE-1.0"
      onToggle={(event) => { if (event.currentTarget.open) void loadPilotEconomics(); }}>
      <summary>CONTINUIDAD ECONÓMICA · COSTOS Y CAPACIDAD</summary>
      <div className="rootReportList">
        <p>Supabase y Neon son proveedores independientes. La replicación automática está retirada por decisión del fundador.
          Medición sólo bajo solicitud explícita: actividad real, espacio ocupado y unidades registradas. Sin cobros inferidos.</p>
        <button type="button" disabled={pilotEconomicsLoading} onClick={() => void loadPilotEconomics()}>
          {pilotEconomicsLoading ? 'Midiendo…' : 'Medir ahora'}
        </button>
        {pilotEconomicsError && <p role="alert">Medición no disponible: {pilotEconomicsError}</p>}
        {pilotEconomics && <div className="rootReportHealth">
          <article><span>Plano actual</span><strong>{txt(pilotEconomics.neonMode,'NO OBSERVADO')}</strong></article>
          <article><span>Neon PostgreSQL</span><strong>
            {typeof pilotEconomics.neonStorage?.databaseBytes === 'number'
              ? (pilotEconomics.neonStorage.databaseBytes / 1_000_000).toFixed(1) + ' MB'
              : 'NO OBSERVADO'}
          </strong></article>
          <article><span>Histórico de diario Neon (sin obligación de réplica)</span><strong>
            {typeof pilotEconomics.neonStorage?.journalBytes === 'number'
              ? (pilotEconomics.neonStorage.journalBytes / 1_000_000).toFixed(1) + ' MB'
              : 'NO OBSERVADO'}
          </strong></article>
          <article><span>Outbox histórico PRIMARY (no requiere vaciado)</span><strong>
            {typeof pilotEconomics.primaryOutbox?.pending === 'number'
              ? pilotEconomics.primaryOutbox.pending
              : 'NO OBSERVADO'}
          </strong></article>
          <article><span>Ejecuciones institucionales registradas (30 días, máximo 250)</span>
            <strong>{typeof pilotEconomics.operationalConsumption?.observedRuns==='number'
              ? pilotEconomics.operationalConsumption.observedRuns.toLocaleString()
              : 'NO OBSERVADAS'}</strong></article>
          <article><span>Tiempo transcurrido de ejecuciones observadas</span>
            <strong>{typeof pilotEconomics.operationalConsumption?.observedDurationMs==='number'
              ? (pilotEconomics.operationalConsumption.observedDurationMs/60000).toFixed(1)+' min'
              : 'NO OBSERVADO'}</strong></article>
          <article><span>Operaciones de capacidades registradas</span>
            <strong>{typeof pilotEconomics.operationalConsumption?.executedCapabilityChecks==='number'
              ? pilotEconomics.operationalConsumption.executedCapabilityChecks.toLocaleString()
              : 'NO OBSERVADAS'}</strong></article>
          <article><span>Contabilidad de consumo</span><strong>
            {pilotEconomics.measuredUsage?.status==='OBSERVED'
              ? String(pilotEconomics.measuredUsage.eventCount)+' eventos medidos (últimos 30 días)'
              : 'SIN LECTURA'}
          </strong></article>
          <article><span>Coste monetario y cuota restante</span><strong>DESCONOCIDOS · FALTA FACTURACIÓN DEL PROVEEDOR</strong></article>
          <article><span>Política de bases</span><strong>SIN REPLICACIÓN · PROVEEDORES INDEPENDIENTES</strong></article>
          {Array.isArray(pilotEconomics.measuredUsage?.units)&&pilotEconomics.measuredUsage.units.slice(0,12).map((item: Row, i: number)=>
            <article key={'cost-ledger-'+i}><span>{txt(item.kind,'TIPO')} · {txt(item.unit,'UNIDAD')}</span>
              <strong>{Number(item.amount).toLocaleString()} unidades medidas</strong></article>)}
        </div>}
        {pilotEconomics?.errors?.neon && <p role="alert">Neon: medición incompleta.</p>}
        {pilotEconomics?.errors?.primary && <p role="alert">PRIMARY: medición incompleta.</p>}
        <p>Las lecturas de consumo provienen del ledger de PRIMARY; no son una factura.
          Una tarifa y cuota deben venir de cada proveedor. Neon conserva su información propia sin reflejar Supabase.</p>
      </div>
    </details>

    <details className="rootReports" data-sfi-worldspect-provider-clocks="SFI-WORLDSPECT-INDEPENDENT-PLANE-CLOCK-1.0"
      onToggle={(event) => {if(event.currentTarget.open)void loadWorldSpectClocks();}}>
      <summary>WORLDSPECT · RELOJES DE OBSERVACIÓN POR PROVEEDOR</summary>
      <div className="rootReportList">
        <p>Supabase PRIMARY y Neon mantienen observaciones independientes. Esta comparación no replica datos,
          no cambia el proveedor de escritura ni acredita que las observaciones sean equivalentes.</p>
        <button type="button" disabled={worldSpectClocksLoading} onClick={()=>void loadWorldSpectClocks()}>
          {worldSpectClocksLoading?'Comparando…':'Comparar ahora'}
        </button>
        {worldSpectClocksError && <p role="alert">Lectura no disponible: {worldSpectClocksError}</p>}
        {worldSpectClocks && <div className="rootReportHealth">
          <article><span>Diagnóstico de relojes</span><State value={worldSpectClocks.status}/></article>
          <article><span>Supabase PRIMARY · última observación</span><strong>{when(worldSpectClocks.primary?.observedAt)}</strong></article>
          <article><span>Neon · última observación</span><strong>{when(worldSpectClocks.neon?.observedAt)}</strong></article>
          <article><span>Diferencia Neon − PRIMARY</span><strong>
            {typeof worldSpectClocks.differenceMinutes==='number'
              ? worldSpectClocks.differenceMinutes.toLocaleString()+' min'
              : 'SIN DATOS SUFICIENTES'}
          </strong></article>
        </div>}
        {worldSpectClocks && <p>{worldSpectClocks.status==='NEON_NEWER'
          ? 'Neon tiene una medición más reciente; la lectura de PRIMARY no demuestra ausencia de observación.'
          : worldSpectClocks.status==='PRIMARY_NEWER'
            ? 'PRIMARY registra una medición posterior a la última observación conocida en Neon.'
            : worldSpectClocks.status==='SAME_OBSERVED_TIME_UNVERIFIED'
              ? 'Los relojes coinciden; esto no certifica igualdad de contenido ni replicación.'
              : 'No es posible atribuir una observación más reciente con la evidencia disponible.'}</p>}
        {(worldSpectClocks?.readWarnings?.primary || worldSpectClocks?.readWarnings?.neon) &&
          <p role="alert">Al menos una consulta fue indisponible. No se atribuye un valor cero ni paridad.</p>}
      </div>
    </details>

    {missionSurface}

    <details className="rootReports" onToggle={(event) => { if (event.currentTarget.open) void loadReportArchive(false); }}>
      <summary>REPORTS · OBSERVATIONS · HYPOTHESES · LEARNING · RETURN</summary>
      {reportArchiveLoading && <div className="rootEmpty">Reading reports…</div>}
      {reportArchive && <div className="rootReportList">
        <p>Reports are read in full here. They inform and reconstruct; they do not require ACCEPT/DENY to exist or be used under current authority.</p>
        {!!reportLanes.length && <div className="rootReportHealth">{reportLanes.map((lane) => <article key={lane.key}><span>{txt(lane.label, lane.key)}</span><State value={lane.state}/><small>{lane.lastGeneratedAt ? when(lane.lastGeneratedAt) : 'no observed generation'}</small></article>)}</div>}
        {reportItems.slice(0, 80).map((item) => <details className="rootReportItem" key={`${item.source}:${item.id}`}><summary><div><State value={item.status}/><State value={item.category}/><small>{when(item.createdAt)}</small></div><strong>{txt(item.title, 'Report')}</strong><span>{txt(item.reportType, 'report')} · {txt(item.cadence, 'unknown')}</span></summary><HumanReportBody value={item.body}/><div className="rootReportFacts"><span>EVIDENCE {rows(item.evidence).length || (Array.isArray(item.evidence) ? item.evidence.length : 0)}</span><span>WARNINGS {Array.isArray(item.warnings) ? item.warnings.length : 0}</span><span>PROVIDER {txt(item.provider, '—')}</span><span>MODEL {txt(item.model, '—')}</span></div><Trace value={{ evidence: item.evidence, warnings: item.warnings, trace: item.trace, metadata: item.metadata }}/></details>)}
      </div>}
    </details>

    <section className="rootSummaryTile" aria-label="Resumen operativo"><span>PROJECTS {base ? projects.length : 'MISSING'}</span><span>CASES {base ? cases.length : 'MISSING'}</span><span>DECISION / EVIDENCE / REPORTS / RETURN</span><span>RULE: ROOT DECIDES; SFI DOES THE WORK.</span></section>
  </div>;
}
