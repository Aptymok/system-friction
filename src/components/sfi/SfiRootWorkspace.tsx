'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import './SfiRootWorkspace.css';

type Row = Record<string, any>;

const OBSERVE_LINKS = [
  { href: '/observatory', label: 'Observatorio', note: 'Actividad, ejecución, evidencia, salud y continuidad.' },
  { href: '/cases', label: 'Casos', note: 'Expedientes, evidencia, RETURN y cierres autónomos.' },
  { href: '/method-lab', label: 'Laboratorio', note: 'Experimentos, comparación, simulación y reentry.' },
  { href: '/twin', label: 'Twin / Spine', note: 'Estado cognitivo, lineage, contradicción y memoria no canónica.' },
  { href: '/twin/learning', label: 'Aprendizajes', note: 'Candidatos y promociones institucionales gobernadas.' },
  { href: '/studio', label: 'Studio', note: 'Material, audio y ejecución de capacidades specialist.' },
  { href: '/library', label: 'Library / Atlas', note: 'Corpus documental, referencia longitudinal y catálogo metodológico.' },
  { href: '/governance', label: 'Gobernanza', note: 'Actividad de gobierno, propuestas y operación de agentes.' },
  { href: '/root/evidence-review', label: 'Evidence', note: 'Candidatos, procedencia y elegibilidad antes de aceptación.' },
  { href: '/history/mutations', label: 'Audit / Return', note: 'Mutaciones, receipts y trazabilidad de cambio institucional.' },
] as const;

function rows(value: unknown): Row[] {
  return Array.isArray(value)
    ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    : [];
}
function txt(value: unknown, fallback = '—') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}
function short(value: unknown, max = 360) {
  const text = txt(value, '');
  return text.length > max ? `${text.slice(0, max - 1)}…` : text || '—';
}
function when(value: unknown) {
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
  const attention = /HIGH|BLOCK|MISSING|REJECT|CONFLICT|LIMITATION|FAILED|DEGRADED/.test(raw);
  const sovereign = /PROPOSED|REQUIRED|LEARNING_PROMOTION|CAPABILITY_IMPLEMENTATION|INSTITUTIONAL_CHANGE/.test(raw);
  return <span className={`rootState ${attention ? 'attention' : sovereign ? 'sovereign' : ''}`}>{raw.replaceAll('_', ' ') || 'MISSING'}</span>;
}
function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rootDossierSection"><h3>{title}</h3>{children}</section>;
}
function Trace({ value }: { value: unknown }) {
  return <details className="rootTrace"><summary>Ver trazabilidad técnica</summary><pre>{JSON.stringify(value, null, 2)}</pre></details>;
}

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
  const [lastReadAt, setLastReadAt] = useState<string | null>(null);

  const loadBase = useCallback(async () => {
    if (!enabled) return;
    try {
      setBase(await jsonFetch('/api/root/interactive?surface=root'));
      setLastReadAt(new Date().toISOString());
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
  const observable = items.filter((item) => item.rootActionRequired !== true);
  const cases = rows(base?.caseIndex?.cases);
  const projects = rows(base?.caseIndex?.projects);
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
        ? 'Cambio aceptado. La ejecución posterior conserva sus propios límites, evidencia y RETURN.'
        : 'Cambio denegado. El expediente y su trazabilidad permanecen disponibles.');
      setNote('');
      await Promise.all([loadBase(), loadDossier(dossier.id)]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(null);
    }
  };

  if (!enabled) return null;
  const plain = dossier?.plainLanguage ?? {};

  return <div className="rootWorkspace" data-root-visual-contract="SFI-ROOT-VISUAL-2.0" data-root-module-count={OBSERVE_LINKS.length}>
    {(error || notice) && <div className={`rootToast ${error ? 'error' : ''}`}><span>{error || notice}</span><button onClick={() => { setError(null); setNotice(null); }}>×</button></div>}

    <header className="rootHeader">
      <div className="rootHeaderCopy">
        <span>ROOT · SOBERANÍA INSTITUCIONAL · AUTHORITY / OBSERVATION / RETURN</span>
        <h1>Gobierna cambios. Observa el resto.</h1>
        <p>SFI opera, busca evidencia, ejecuta capacidades ya autorizadas, registra RETURN y cierra trabajo rutinario sin pedir permiso. ROOT sólo interviene cuando algo pretende cambiar a la institución, cambiar materialmente una capacidad o promover un aprendizaje. MISSING y DEGRADED permanecen visibles: esta superficie no fabrica salud ni certeza.</p>
      </div>
      <div className="rootReadState">
        <span>ÚLTIMA LECTURA OBSERVADA</span>
        <b>{lastReadAt ? when(lastReadAt) : 'MISSING · leyendo'}</b>
        <button onClick={() => void loadBase()}>Actualizar</button>
      </div>
    </header>

    <section className="rootPulse" aria-label="Estado institucional observable">
      <article><span>Decisiones ROOT</span><b>{actionable.length}</b><small>Sólo cambios soberanos.</small></article>
      <article><span>Casos activos</span><b>{activeCases.length}</b><small>Se observan; no se aprueban.</small></article>
      <article><span>Ciclos abiertos</span><b>{cycles.length}</b><small>Pueden cerrar autónomamente.</small></article>
      <article><span>Trabajo observable</span><b>{observable.length}</b><small>SFI continúa dentro de su autoridad.</small></article>
    </section>

    <nav className="rootObserve" aria-label="Diez módulos institucionales ROOT">
      <div className="rootObserveLead"><span>10 MÓDULOS · TOPOLOGÍA DE OBSERVACIÓN</span><p>No son subsistemas nuevos: son lentes sobre las superficies y read contracts que ya poseen objetos, evidencia y capacidades. Ningún módulo adquiere escritor propio por aparecer aquí.</p></div>
      <div className="rootObserveLinks">{OBSERVE_LINKS.map((item) => <Link key={item.href} href={item.href}><strong>{item.label}</strong><span>{item.note}</span></Link>)}</div>
    </nav>

    <section className="rootRule">
      <strong>SFI OPERA SIN PEDIR PERMISO.</strong>
      <span>OBSERVACIÓN ≠ INFERENCIA · SIMULACIÓN ≠ OBSERVACIÓN · operar ≠ gobernar · cerrar ≠ aprender · evidencia ≠ aprobación · reporte ≠ decisión.</span>
    </section>

    <div className="rootDecisionLayout">
      <aside className="rootDecisionQueue">
        <header><div><span>CAMBIOS QUE SÍ NECESITAN ROOT</span><b>{actionable.length}</b></div></header>
        {actionable.map((item) => <Link key={item.id} href={`/root?decision=${encodeURIComponent(String(item.id))}`} className={`rootDecisionCard ${selectedId === item.id ? 'selected' : ''}`}>
          <div><State value={item.rootDecisionClass ?? item.decisionClass}/><State value={item.riskLevel}/></div>
          <strong>{txt(item.title, 'Cambio institucional')}</strong>
          <p>{txt(item.actionability?.question, 'Abre el expediente para entender qué cambiaría y por qué.')}</p>
          <small>Abrir decisión →</small>
        </Link>)}
        {!actionable.length && <div className="rootEmpty">No hay cambios institucionales esperando tu decisión.</div>}
        {!!observable.length && <details className="rootObservable"><summary>Trabajo que SFI está resolviendo · {observable.length}</summary>{observable.slice(0, 80).map((item) => <article key={item.id}><strong>{txt(item.title, 'Trabajo operativo')}</strong><p>{txt(item.actionability?.question, 'SFI continúa dentro de autoridad existente.')}</p></article>)}</details>}
      </aside>

      <main className="rootDecisionDetail">
        {loading && <div className="rootEmpty large">Reconstruyendo expediente…</div>}
        {!loading && !dossier && <div className="rootEmpty large"><strong>No hay nada que aprobar aquí por defecto.</strong><p>Selecciona una decisión sólo cuando SFI proponga un cambio soberano. Para trabajo rutinario usa Observatorio, Casos, Laboratorio, Studio o las demás superficies existentes.</p></div>}
        {!loading && dossier && <article className="rootDossier">
          <header className="rootDossierHero"><div><State value={dossier.decisionClass}/><h2>{txt(dossier.title, 'Decisión institucional')}</h2><p>{txt(dossier.statusMeaning, dossier.status)}</p></div><State value={dossier.risk?.level}/></header>

          <Section title="Quién lo trae"><p>{txt(plain.who, 'El origen no quedó normalizado. La trazabilidad técnica debe mostrar exactamente qué falta.')}</p></Section>
          <Section title="Qué pasó"><p>{txt(plain.whatHappened, 'No quedó registrada una explicación humana suficiente.')}</p></Section>
          <Section title="Por qué importa"><p>{txt(plain.whyItMatters)}</p></Section>
          <Section title="Qué propone"><p>{txt(plain.proposal)}</p></Section>
          <Section title="Qué gana SFI"><p>{txt(plain.sfiGain)}</p></Section>
          <Section title="Qué evidencia hay"><p>{txt(plain.evidence)}</p><small>SFI es responsable de obtener o declarar la evidencia faltante. ROOT no aprueba fuentes.</small></Section>
          <Section title="Si aceptas"><p>{txt(plain.ifAccepted)}</p></Section>
          <Section title="Si deniegas"><p>{txt(plain.ifDenied)}</p></Section>
          <Section title="Por qué te corresponde decidir"><p>{txt(plain.whyRoot)}</p></Section>

          {dossier.actionability?.actionable === true
            ? <section className="rootDecisionActions"><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Nota opcional para el expediente"/><div><button disabled={Boolean(busy)} onClick={() => void decide('accept')}>ACEPTAR</button><button className="deny" disabled={Boolean(busy)} onClick={() => void decide('deny')}>DENEGAR</button></div></section>
            : <div className="rootEmpty">No hay una decisión ROOT accionable ahora. El trabajo operativo continúa sin pedir autorización.</div>}

          <Trace value={dossier.technicalTrace ?? dossier}/>
        </article>}
      </main>
    </div>

    <details className="rootReports" onToggle={(event) => { if (event.currentTarget.open) void loadReportArchive(); }}>
      <summary>Reportes institucionales · archivo de lectura</summary>
      {reportArchiveLoading && <div className="rootEmpty">Leyendo reportes…</div>}
      {reportArchive && <div className="rootReportList">
        <p>Los reportes informan y reconstruyen. No requieren ACCEPT/DENY para existir o utilizarse bajo autoridad vigente.</p>
        {rows(reportArchive.inbox?.items).slice(0, 60).map((item) => <article key={`${item.source}:${item.id}`}><div><State value={item.status}/><small>{when(item.createdAt)}</small></div><strong>{txt(item.title, 'Reporte')}</strong><p>{short(item.body)}</p></article>)}
      </div>}
    </details>

    <footer className="rootFooter"><span>PROYECTOS {projects.length}</span><span>CASOS {cases.length}</span><span>10 MÓDULOS · 3 TOPOLOGÍAS: OBSERVACIÓN / AUTORIDAD / RETURN</span><span>REGLA: ROOT ACEPTA O DENIEGA CAMBIOS; SFI HACE EL TRABAJO.</span></footer>
  </div>;
}