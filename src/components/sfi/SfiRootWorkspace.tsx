'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import './SfiRootWorkspace.css';

type Row = Record<string, any>;

function rows(value: unknown): Row[] {
  return Array.isArray(value)
    ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    : [];
}
function txt(value: unknown, fallback = '—') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}
function short(value: unknown, max = 320) {
  const text = txt(value, '');
  return text.length > max ? `${text.slice(0, max - 1)}…` : text || '—';
}
function date(value: unknown) {
  if (typeof value !== 'string' || !value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? value : parsed.toLocaleString('es-MX');
}
async function jsonFetch(url: string, init?: RequestInit) {
  const response = await fetch(url, { cache: 'no-store', ...init });
  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.ok) throw new Error(json?.details || json?.message || json?.error || `${response.status}`);
  return json;
}

function State({ value }: { value: unknown }) {
  const raw = String(value ?? '').toUpperCase();
  const danger = /HIGH|BLOCK|MISSING|REJECT|CONFLICT|LIMITATION/.test(raw);
  const human = /PROPOSED|REQUIRED|LEARNING_PROMOTION|CAPABILITY_IMPLEMENTATION|INSTITUTIONAL_CHANGE/.test(raw);
  return <span className={`rootState ${danger ? 'danger' : human ? 'human' : ''}`}>{raw.replaceAll('_', ' ') || 'UNKNOWN'}</span>;
}
function Detail({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rootDecisionSection"><h3>{title}</h3>{children}</section>;
}
function Trace({ value }: { value: unknown }) {
  return <details className="rootReviewOnly"><summary>VER TRAZABILIDAD TÉCNICA</summary><pre>{JSON.stringify(value, null, 2)}</pre></details>;
}

const SURFACE_LINKS = [
  { href: '/cases', label: 'CASOS', note: 'Expedientes, evidencia, RETURN y cierre autónomo.' },
  { href: '/governance', label: 'GOVERNANCE', note: 'Estado de gobierno y cambios institucionales.' },
  { href: '/method-lab', label: 'METHOD LAB', note: 'Experimentos, simulación, comparación y reentry.' },
  { href: '/twin', label: 'COGNITIVE TWIN / SPINE', note: 'Estado cognitivo y memoria no canónica.' },
  { href: '/twin/learning', label: 'APRENDIZAJES', note: 'Sólo aquí se promueve o rechaza aprendizaje institucional.' },
  { href: '/observatory', label: 'OBSERVATORIO', note: 'Actividad, evidencia, ejecución, salud y continuidad.' },
  { href: '/library', label: 'LIBRARY', note: 'Corpus documental y catálogo metodológico.' },
  { href: '/studio', label: 'STUDIO', note: 'Análisis y ejecución de capacidades de material/audio.' },
] as const;

export function SfiRootWorkspace({ enabled }: { enabled: boolean }) {
  const search = useSearchParams();
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

  const loadBase = useCallback(async () => {
    if (!enabled) return;
    try {
      setBase(await jsonFetch('/api/root/interactive?surface=root'));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, [enabled]);

  const loadDossier = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const data = await jsonFetch(`/api/root/decision-dossier?kind=proposal&id=${encodeURIComponent(id)}`);
      setDossier(data.dossier ?? null);
      setError(null);
    } catch (cause) {
      setDossier(null);
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadReportArchive = useCallback(async () => {
    if (reportArchive || reportArchiveLoading) return;
    setReportArchiveLoading(true);
    try {
      setReportArchive(await jsonFetch('/api/root/reports'));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setReportArchiveLoading(false);
    }
  }, [reportArchive, reportArchiveLoading]);

  useEffect(() => {
    void loadBase();
    const timer = window.setInterval(() => void loadBase(), 60000);
    return () => window.clearInterval(timer);
  }, [loadBase]);

  useEffect(() => {
    if (selectedId) void loadDossier(selectedId);
    else setDossier(null);
    setNote('');
  }, [selectedId, loadDossier]);

  const operational = base?.operationalNext ?? {};
  const items = rows(operational.items);
  const cycles = rows(operational.cycles);
  const actionable = items.filter((item) => item.rootActionRequired === true);
  const reviewOnly = items.filter((item) => item.reviewAvailable === true && item.rootActionRequired !== true);
  const projects = rows(base?.caseIndex?.projects);
  const cases = rows(base?.caseIndex?.cases);
  const activeCases = useMemo(
    () => cases.filter((item) => !['CLOSED', 'REJECTED'].includes(String(item.status).toUpperCase())),
    [cases],
  );

  const decide = async (decision: 'accept' | 'deny') => {
    if (!dossier?.id || dossier?.actionability?.actionable !== true) return;
    setBusy(decision);
    try {
      await jsonFetch('/api/root/decisions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind: 'proposal', id: dossier.id, decision, note: note.trim() || null }),
      });
      setNotice(decision === 'accept'
        ? 'Cambio institucional aceptado. Sólo autoriza el cambio descrito; ejecución, evidencia, publicación y RETURN conservan sus propias fronteras.'
        : 'Cambio institucional denegado. El expediente, su evidencia y su origen permanecen reconstruibles.');
      setNote('');
      await Promise.all([loadBase(), loadDossier(dossier.id)]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(null);
    }
  };

  if (!enabled) return null;
  const p = dossier?.plainLanguage ?? {};

  return <div className="rootWorkspace">
    {(error || notice) && <div className={`rootToast ${error ? 'error' : ''}`}><span>{error || notice}</span><button onClick={() => { setError(null); setNotice(null); }}>×</button></div>}

    <section className="rootHero">
      <div>
        <span>ROOT · GOBIERNO DE CAMBIOS</span>
        <h1>Sólo lo que realmente cambia a SFI</h1>
        <p>SFI trabaja, busca evidencia, ejecuta capacidades autorizadas y cierra trabajo rutinario sin pedir permiso. Aquí sólo decides cambios institucionales, cambios materiales de capacidad y promociones de aprendizaje.</p>
      </div>
      <div className="rootMetrics">
        <b>{actionable.length}</b><span>decisiones reales</span>
        <b>{activeCases.length + cycles.length}</b><span>casos/ciclos observables</span>
        <b>{reviewOnly.length}</b><span>revisables, no obligatorios</span>
      </div>
    </section>

    <section className="rootContextStrip">
      <div><span>PROYECTOS</span><b>{projects.length}</b></div>
      <div><span>CASOS ACTIVOS</span><b>{activeCases.length}</b></div>
      <div><span>CICLOS ABIERTOS</span><b>{cycles.length}</b></div>
      <div><span>REGLA</span><p>OPERAR ≠ PEDIR PERMISO · CERRAR ≠ APRENDER</p></div>
    </section>

    <section className="rootSurfaceMap">
      <header><span>SUPERFICIES SFI</span><p>ROOT gobierna cambios; el trabajo cotidiano vive en sus propios dueños y puede observarse.</p></header>
      <div className="rootSurfaceGrid">{SURFACE_LINKS.map((item) => <Link key={item.href} href={item.href}><strong>{item.label}</strong><span>{item.note}</span><small>ABRIR →</small></Link>)}</div>
    </section>

    <details id="reports" className="rootReportArchive" onToggle={(event) => { if (event.currentTarget.open) void loadReportArchive(); }}>
      <summary>REPORTES INSTITUCIONALES · ARCHIVO DE LECTURA</summary>
      {reportArchiveLoading && <div className="rootEmpty">Leyendo reportes…</div>}
      {reportArchive && <div className="rootReportArchiveBody">
        <p>Los reportes existen para informar y reconstruir. No requieren ACCEPT/DENY para existir o usarse bajo autoridad vigente.</p>
        <div className="rootArchiveItems">{rows(reportArchive.inbox?.items).slice(0, 40).map((item) => <article key={`${item.source}:${item.id}`}><div><State value={item.status}/></div><strong>{txt(item.title, 'Reporte')}</strong><p>{short(item.body, 360)}</p><small>{date(item.createdAt)}</small></article>)}</div>
      </div>}
    </details>

    <div className="rootDecisionLayout">
      <aside className="rootDecisionQueue">
        <header><div><span>DECISIONES ROOT</span><b>{actionable.length}</b></div><button onClick={() => void loadBase()}>ACTUALIZAR</button></header>
        {actionable.map((item) => <Link key={item.id} href={`/root?decision=${encodeURIComponent(String(item.id))}`} className={`rootDecisionCard ${selectedId === item.id ? 'selected' : ''}`}><div><State value={item.rootDecisionClass ?? item.decisionClass}/><State value={item.riskLevel}/></div><strong>{txt(item.title, 'Cambio institucional')}</strong><p>{txt(item.actionability?.question, 'Abre el expediente para entender exactamente qué cambiaría.')}</p><small>ABRIR DECISIÓN →</small></Link>)}
        {!actionable.length && <div className="rootEmpty">No hay ningún cambio institucional que necesite tu decisión.</div>}
        {!!reviewOnly.length && <details className="rootReviewOnly"><summary>Actividad revisable, no aprobable · {reviewOnly.length}</summary>{reviewOnly.slice(0, 60).map((item) => <article key={item.id}><strong>{txt(item.title, 'Trabajo operativo')}</strong><p>{txt(item.actionability?.question, 'SFI continúa dentro de la autoridad existente.')}</p></article>)}</details>}
      </aside>

      <main className="rootDecisionDetail">
        {loading && <div className="rootEmpty">Reconstruyendo expediente…</div>}
        {!loading && !dossier && <div className="rootEmpty">Selecciona una decisión. Los casos, reportes, evidencia faltante y ejecución rutinaria no aparecen como solicitudes de permiso.</div>}
        {!loading && dossier && <article>
          <header className="rootDecisionHero"><div><State value={dossier.decisionClass}/><h2>{txt(dossier.title, 'Decisión institucional')}</h2><p>{txt(dossier.statusMeaning, dossier.status)}</p></div><State value={dossier.risk?.level}/></header>

          <Detail title="Quién lo trae"><p>{txt(p.who, 'El origen no quedó normalizado; revisa la trazabilidad técnica.')}</p></Detail>
          <Detail title="Qué pasó"><p>{txt(p.whatHappened, 'No quedó registrada una explicación humana suficiente.')}</p></Detail>
          <Detail title="Por qué importa"><p>{txt(p.whyItMatters)}</p></Detail>
          <Detail title="Qué propone"><p>{txt(p.proposal)}</p></Detail>
          <Detail title="Qué gana SFI"><p>{txt(p.sfiGain)}</p></Detail>
          <Detail title="Qué evidencia hay"><p>{txt(p.evidence)}</p>{dossier.evidence?.acquisitionOwner && <small>SFI sigue buscando/reconciliando evidencia. No tienes que aprobar fuentes.</small>}</Detail>
          <Detail title="Si aceptas"><p>{txt(p.ifAccepted)}</p></Detail>
          <Detail title="Si deniegas"><p>{txt(p.ifDenied)}</p></Detail>
          <Detail title="Por qué te corresponde decidir"><p>{txt(p.whyRoot)}</p></Detail>

          {dossier.actionability?.actionable === true
            ? <section className="rootDecisionActions"><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Nota opcional para el expediente"/><button disabled={Boolean(busy)} onClick={() => void decide('accept')}>ACEPTAR</button><button className="deny" disabled={Boolean(busy)} onClick={() => void decide('deny')}>DENEGAR</button></section>
            : <div className="rootEmpty">No hay una decisión ROOT accionable ahora. Si falta evidencia, SFI es responsable de buscarla o declarar que no está disponible.</div>}

          <Trace value={dossier.technicalTrace ?? dossier}/>
        </article>}
      </main>
    </div>
  </div>;
}
