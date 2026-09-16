'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthState } from '@/components/auth/AuthProvider';
import './SfiRootWorkspace.css';

type Row = Record<string, any>;
type CacheEntry = { at:number; data:Row };

const BASE_CACHE_TTL_MS=120_000;
const DOSSIER_CACHE_TTL_MS=300_000;
const REPORT_CACHE_TTL_MS=300_000;
const baseCache=new Map<string,CacheEntry>();
const dossierCache=new Map<string,CacheEntry>();
const reportCache=new Map<string,CacheEntry>();

const OBSERVE_LINKS = [
  { href: '/observatory', label: 'Observatorio', note: 'Actividad, ejecución, evidencia, salud y continuidad.' },
  { href: '/cases', label: 'Casos', note: 'Expedientes, evidencia, RETURN y cierres autónomos.' },
  { href: '/method-lab', label: 'Laboratorio', note: 'Experimentos, comparación, simulación y reentry.' },
  { href: '/twin', label: 'Twin / Spine', note: 'Estado cognitivo, lineage, contradicción y memoria no canónica.' },
  { href: '/twin/learning', label: 'Aprendizajes', note: 'Candidatos y promociones institucionales gobernadas.' },
  { href: '/studio', label: 'Studio', note: 'Material, audio y ejecución de capacidades specialist.' },
  { href: '/library', label: 'Library / Atlas', note: 'Corpus documental, referencia longitudinal y catálogo metodológico.' },
  { href: '/governance', label: 'Agentes / Runtime', note: 'Passports, ejecución y telemetría. Las decisiones humanas viven aquí en ROOT.' },
  { href: '/root/evidence-review', label: 'Evidence', note: 'Aportar, revisar procedencia y elegibilidad de evidencia.' },
  { href: '/history/mutations', label: 'Audit / Return', note: 'Mutaciones, receipts y trazabilidad de cambio institucional.' },
] as const;

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}
function txt(value: unknown, fallback = '—') { return typeof value === 'string' && value.trim() ? value.trim() : fallback; }
function when(value: unknown) { if (typeof value !== 'string' || !value) return '—'; const parsed = new Date(value); return Number.isNaN(parsed.valueOf()) ? value : parsed.toLocaleString('es-MX'); }
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
function Trace({ value }: { value: unknown }) { return <details className="rootTrace"><summary>Ver trazabilidad técnica</summary><pre>{JSON.stringify(value, null, 2)}</pre></details>; }
function HumanReportBody({ value }: { value: unknown }) {
  const raw = txt(value, 'MISSING · no existe cuerpo legible para este reporte.');
  const blocks = raw.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
  return <div className="rootReportBody">{blocks.map((block, index) => {
    const cleaned = block.replace(/^#{1,6}\s*/gm, '').replace(/^[-*]\s+/gm, '• ');
    const heading = cleaned.length < 90 && /^[A-ZÁÉÍÓÚÑ0-9 /·:_-]+$/.test(cleaned);
    return heading ? <h4 key={index}>{cleaned}</h4> : <p key={index}>{cleaned}</p>;
  })}</div>;
}

export function SfiRootWorkspace({ enabled }: { enabled: boolean }) {
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

  useEffect(() => { void loadBase(false); }, [loadBase]);
  useEffect(() => { if (selectedId) void loadDossier(selectedId,false); else setDossier(null); setNote(''); }, [selectedId, loadDossier]);

  const operational = base?.operationalNext ?? {};
  const items = rows(operational.items);
  const cycles = rows(operational.cycles);
  const actionable = items.filter((item) => item.rootActionRequired === true);
  const observable = items.filter((item) => item.rootActionRequired !== true);
  const cases = rows(base?.caseIndex?.cases);
  const projects = rows(base?.caseIndex?.projects);
  const activeCases = useMemo(() => cases.filter((item) => !['CLOSED', 'REJECTED'].includes(String(item.status).toUpperCase())), [cases]);
  const readState = base ? (error ? 'DEGRADED' : 'OBSERVED') : (error ? 'DEGRADED' : 'MISSING');
  const pulseValue = (value: number) => base ? value : 'MISSING';

  const decide = async (decision: 'accept' | 'deny') => {
    if (!dossier?.id || dossier?.actionability?.actionable !== true) return;
    setBusy(decision);
    try {
      await jsonFetch('/api/root/decisions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'proposal', id: dossier.id, decision, note: note.trim() || null }) });
      setNotice(decision === 'accept' ? 'Cambio aceptado. La ejecución posterior conserva sus propios límites, evidencia y RETURN.' : 'Cambio denegado. El expediente y su trazabilidad permanecen disponibles.');
      setNote('');
      await Promise.all([loadBase(true), loadDossier(dossier.id,true)]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(null); }
  };

  const requestEvidence = async () => {
    if (!dossier?.id || dossier?.actionability?.actionable !== true) return;
    setBusy('evidence');
    try {
      await jsonFetch(`/api/sfi/proposals/${dossier.id}/request-evidence`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ evidence_required: note.trim() || 'Busca evidencia suficiente para sostener, contradecir o volver indeterminada esta propuesta antes de decidir.' }) });
      setNotice('Solicitud de evidencia registrada. SFI inició adquisición gobernada y la decisión permanece abierta.');
      setNote('');
      await Promise.all([loadBase(true), loadDossier(dossier.id,true)]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(null); }
  };

  if (!enabled) return null;
  const plain = dossier?.plainLanguage ?? {};
  const reportItems = rows(reportArchive?.inbox?.items);
  const reportLanes = rows(reportArchive?.health?.lanes);

  return <div className="rootWorkspace" data-root-visual-contract="SFI-ROOT-VISUAL-2.0" data-root-module-count={OBSERVE_LINKS.length}>
    {(error || notice) && <div className={`rootToast ${error ? 'error' : ''}`}><span>{error || notice}</span><button onClick={() => { setError(null); setNotice(null); }}>×</button></div>}

    <header className="rootHeader"><div className="rootHeaderCopy"><span>ROOT · SOBERANÍA INSTITUCIONAL · AUTHORITY / OBSERVATION / RETURN</span><h1>Decide lo soberano. Observa y lee el resto.</h1><p>SFI opera, busca evidencia, ejecuta capacidades ya autorizadas, registra RETURN y cierra trabajo rutinario sin pedir permiso. ROOT interviene cuando existe una decisión real de autoridad y conserva lectura completa de reportes, casos, aprendizaje y RETURN.</p></div><div className="rootReadState"><span>ESTADO DE LECTURA</span><b>{lastReadAt ? `${readState} · ${when(lastReadAt)}` : `${readState} · esperando primera observación`}</b><button onClick={() => void loadBase(true)}>Actualizar</button></div></header>

    <section className="rootPulse" aria-label="Estado institucional observable"><article data-epistemic-state={readState}><span>Decisiones ROOT</span><b>{pulseValue(actionable.length)}</b><small>Sólo cambios soberanos.</small></article><article data-epistemic-state={readState}><span>Casos activos</span><b>{pulseValue(activeCases.length)}</b><small>Se observan; no se aprueban.</small></article><article data-epistemic-state={readState}><span>Ciclos abiertos</span><b>{pulseValue(cycles.length)}</b><small>Pueden cerrar autónomamente.</small></article><article data-epistemic-state={readState}><span>Trabajo observable</span><b>{pulseValue(observable.length)}</b><small>SFI continúa dentro de su autoridad.</small></article></section>

    <nav className="rootObserve" aria-label="Diez módulos institucionales ROOT"><div className="rootObserveLead"><span>10 MÓDULOS · TOPOLOGÍA DE OBSERVACIÓN</span><p>Son lentes sobre owners existentes. Ninguno adquiere escritor, memoria o autoridad nueva por aparecer aquí.</p></div><div className="rootObserveLinks">{OBSERVE_LINKS.map((item) => <Link key={item.href} href={item.href}><strong>{item.label}</strong><span>{item.note}</span></Link>)}</div></nav>

    <section className="rootRule"><strong>SFI OPERA SIN PEDIR PERMISO.</strong><span>OBSERVACIÓN ≠ INFERENCIA · SIMULACIÓN ≠ OBSERVACIÓN · operar ≠ gobernar · cerrar ≠ aprender · evidencia ≠ aprobación · reporte ≠ decisión.</span></section>

    <div className="rootDecisionLayout">
      <aside className="rootDecisionQueue"><header><div><span>DECISIONES QUE SÍ NECESITAN ROOT</span><b>{base ? actionable.length : 'MISSING'}</b></div></header>{actionable.map((item) => <Link key={item.id} href={`/root?decision=${encodeURIComponent(String(item.id))}`} className={`rootDecisionCard ${selectedId === item.id ? 'selected' : ''}`}><div><State value={item.rootDecisionClass ?? item.decisionClass}/><State value={item.riskLevel}/></div><strong>{txt(item.title, 'Cambio institucional')}</strong><p>{txt(item.actionability?.question, 'Abre el expediente para entender qué cambiaría y por qué.')}</p><small>Abrir decisión →</small></Link>)}{base && !actionable.length && <div className="rootEmpty">No hay cambios institucionales esperando tu decisión.</div>}{!base && <div className="rootEmpty">{readState} · no se proyecta cero hasta observar el read contract.</div>}{!!observable.length && <details className="rootObservable"><summary>Trabajo que SFI está resolviendo · {observable.length}</summary>{observable.slice(0, 80).map((item) => <article key={item.id}><strong>{txt(item.title, 'Trabajo operativo')}</strong><p>{txt(item.actionability?.question, 'SFI continúa dentro de autoridad existente.')}</p></article>)}</details>}</aside>

      <main className="rootDecisionDetail">
        {loading && <div className="rootEmpty large">Reconstruyendo expediente…</div>}
        {!loading && !dossier && <div className="rootEmpty large"><strong>No hay nada que aprobar aquí por defecto.</strong><p>Selecciona una decisión sólo cuando SFI proponga un cambio soberano. El resto debe continuar automáticamente o permanecer observable.</p></div>}
        {!loading && dossier && <article className="rootDossier"><header className="rootDossierHero"><div><State value={dossier.decisionClass}/><h2>{txt(dossier.title, 'Decisión institucional')}</h2><p>{txt(dossier.statusMeaning, dossier.status)}</p></div><State value={dossier.risk?.level}/></header>
          <Section title="Quién lo trae"><p>{txt(plain.who, 'El origen no quedó normalizado. La trazabilidad técnica debe mostrar exactamente qué falta.')}</p></Section><Section title="Qué pasó"><p>{txt(plain.whatHappened, 'No quedó registrada una explicación humana suficiente.')}</p></Section><Section title="Por qué importa"><p>{txt(plain.whyItMatters)}</p></Section><Section title="Qué propone"><p>{txt(plain.proposal)}</p></Section><Section title="Qué gana SFI"><p>{txt(plain.sfiGain)}</p></Section><Section title="Qué evidencia hay"><p>{txt(plain.evidence)}</p><small>ROOT puede pedir más evidencia, pero no convierte una fuente en evidencia aceptada por pulsar un botón.</small></Section><Section title="Si aceptas"><p>{txt(plain.ifAccepted)}</p></Section><Section title="Si deniegas"><p>{txt(plain.ifDenied)}</p></Section><Section title="Por qué te corresponde decidir"><p>{txt(plain.whyRoot)}</p></Section>
          {dossier.actionability?.actionable === true ? <section className="rootDecisionActions"><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Nota opcional o especificación de la evidencia que falta"/><div><button disabled={Boolean(busy)} onClick={() => void decide('accept')}>ACEPTAR</button><button className="deny" disabled={Boolean(busy)} onClick={() => void decide('deny')}>DENEGAR</button><button className="evidence" disabled={Boolean(busy)} onClick={() => void requestEvidence()}>SOLICITAR EVIDENCIA</button><Link className="rootEvidenceLink" href="/root/evidence-review">APORTAR / REVISAR EVIDENCIA →</Link></div></section> : <div className="rootEmpty">No hay una decisión ROOT accionable ahora. El trabajo operativo continúa sin pedir autorización.</div>}
          <Trace value={dossier.technicalTrace ?? dossier}/>
        </article>}
      </main>
    </div>

    <details className="rootReports" onToggle={(event) => { if (event.currentTarget.open) void loadReportArchive(false); }}>
      <summary>REPORTES · OBSERVACIONES · HIPÓTESIS · APRENDIZAJE · RETURN</summary>
      {reportArchiveLoading && <div className="rootEmpty">Leyendo reportes…</div>}
      {reportArchive && <div className="rootReportList">
        <p>Los reportes se leen completos aquí. Informan y reconstruyen; no requieren ACCEPT/DENY para existir o utilizarse bajo autoridad vigente.</p>
        {!!reportLanes.length && <div className="rootReportHealth">{reportLanes.map((lane) => <article key={lane.key}><span>{txt(lane.label, lane.key)}</span><State value={lane.state}/><small>{lane.lastGeneratedAt ? when(lane.lastGeneratedAt) : 'sin generación observada'}</small></article>)}</div>}
        {reportItems.slice(0, 80).map((item) => <details className="rootReportItem" key={`${item.source}:${item.id}`}><summary><div><State value={item.status}/><State value={item.category}/><small>{when(item.createdAt)}</small></div><strong>{txt(item.title, 'Reporte')}</strong><span>{txt(item.reportType, 'report')} · {txt(item.cadence, 'unknown')}</span></summary><HumanReportBody value={item.body}/><div className="rootReportFacts"><span>EVIDENCIA {rows(item.evidence).length || (Array.isArray(item.evidence) ? item.evidence.length : 0)}</span><span>WARNINGS {Array.isArray(item.warnings) ? item.warnings.length : 0}</span><span>PROVIDER {txt(item.provider, '—')}</span><span>MODEL {txt(item.model, '—')}</span></div><Trace value={{ evidence: item.evidence, warnings: item.warnings, trace: item.trace, metadata: item.metadata }}/></details>)}
      </div>}
    </details>

    <footer className="rootFooter"><span>PROYECTOS {base ? projects.length : 'MISSING'}</span><span>CASOS {base ? cases.length : 'MISSING'}</span><span>DECISIÓN / EVIDENCIA / REPORTES / RETURN</span><span>REGLA: ROOT DECIDE; SFI HACE EL TRABAJO.</span></footer>
  </div>;
}
