'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import './SfiRootWorkspace.css';

type Row = Record<string, any>;

function arr(value: unknown): Row[] { return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item && typeof item === 'object')) : []; }
function txt(value: unknown, fallback = '—') { return typeof value === 'string' && value.trim() ? value.trim() : fallback; }
function short(value: unknown, max = 320) { const text = txt(value, ''); return text.length > max ? `${text.slice(0, max - 1)}…` : text || '—'; }
function date(value: unknown) { if (typeof value !== 'string' || !value) return '—'; const parsed = new Date(value); return Number.isNaN(parsed.valueOf()) ? value : parsed.toLocaleString('es-MX'); }
async function jsonFetch(url: string, init?: RequestInit) { const response = await fetch(url, { cache: 'no-store', ...init }); const json = await response.json().catch(() => null); if (!response.ok || !json?.ok) throw new Error(json?.details || json?.message || json?.error || `${response.status}`); return json; }

function State({ value }: { value: unknown }) {
  const raw = String(value ?? '').toUpperCase();
  const danger = /HIGH|BLOCK|MISSING|REJECT|CONFLICT|LIMITATION/.test(raw);
  const human = /PROPOSED|WAITING|HUMAN|REQUIRED|QUEUED_FOR_APPROVAL/.test(raw);
  return <span className={`rootState ${danger ? 'danger' : human ? 'human' : ''}`}>{raw.replaceAll('_', ' ') || 'UNKNOWN'}</span>;
}

function Detail({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rootDecisionSection"><h3>{title}</h3>{children}</section>;
}

const SURFACE_LINKS = [
  { href: '/cases', label: 'CASOS', note: 'Expedientes, ciclos, RETURN y cierre.' },
  { href: '/governance', label: 'GOVERNANCE', note: 'Propuestas y evidencia gobernada.' },
  { href: '/method-lab', label: 'METHOD LAB', note: 'Experimentos, simulación, CRL, CHRONOS y reentry.' },
  { href: '/twin', label: 'COGNITIVE TWIN / SPINE', note: 'Anatomía, runtime y aprendizaje gobernado.' },
  { href: '/observatory', label: 'OBSERVATORIO DE LA FRICCIÓN SISTÉMICA', note: 'Observación longitudinal publicable.' },
  { href: '/observatory/reports', label: 'REPORTES DE CASO', note: 'Reportes persistidos por Case Platform.' },
  { href: '/studio', label: 'STUDIO', note: 'Análisis especialista; FAD/MIHM cuando corresponde.' },
] as const;

export function SfiRootWorkspace({ enabled }: { enabled: boolean }) {
  const search = useSearchParams();
  const selectedId = search.get('decision');
  const selectedKind = search.get('decisionKind') === 'report' ? 'report' : 'proposal';
  const [base, setBase] = useState<Row | null>(null);
  const [dossier, setDossier] = useState<Row | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [reportArchive, setReportArchive] = useState<Row | null>(null);
  const [reportArchiveLoading, setReportArchiveLoading] = useState(false);

  const loadBase = useCallback(async () => {
    if (!enabled) return;
    try {
      const data = await jsonFetch('/api/root/interactive?surface=root');
      setBase(data);
      setError(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  }, [enabled]);

  const loadDossier = useCallback(async (id: string, kind: 'proposal' | 'report') => {
    setLoading(true);
    try {
      const data = await jsonFetch(`/api/root/decision-dossier?kind=${kind}&id=${encodeURIComponent(id)}`);
      setDossier(data.dossier ?? null);
      setError(null);
    } catch (cause) {
      setDossier(null);
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally { setLoading(false); }
  }, []);

  const loadReportArchive = useCallback(async () => {
    if (reportArchive || reportArchiveLoading) return;
    setReportArchiveLoading(true);
    try {
      const data = await jsonFetch('/api/root/reports');
      setReportArchive(data);
      setError(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setReportArchiveLoading(false); }
  }, [reportArchive, reportArchiveLoading]);

  useEffect(() => { void loadBase(); const timer = window.setInterval(() => void loadBase(), 60000); return () => window.clearInterval(timer); }, [loadBase]);
  useEffect(() => { if (selectedId) void loadDossier(selectedId, selectedKind); else setDossier(null); setNote(''); }, [selectedId, selectedKind, loadDossier]);

  const operational = base?.operationalNext ?? {};
  const items = arr(operational.items);
  const reports = arr(operational.reports);
  const cycles = arr(operational.cycles);
  const actionableProposals = items.filter((item) => item.rootActionRequired === true);
  const actionableReports = reports.filter((item) => item.rootActionRequired === true);
  const actionableCycles = cycles.filter((item) => item.rootActionRequired === true);
  const reviewOnly = [...items.filter((item) => item.reviewAvailable === true), ...reports.filter((item) => item.reviewAvailable === true)];
  const projects = arr(base?.caseIndex?.projects);
  const cases = arr(base?.caseIndex?.cases);
  const activeCases = useMemo(() => cases.filter((item) => !['CLOSED', 'REJECTED'].includes(String(item.status).toUpperCase())), [cases]);
  const actionableCount = actionableProposals.length + actionableReports.length + actionableCycles.length;

  const decide = async (decision: 'accept' | 'deny') => {
    if (!dossier?.id) return;
    const kind = dossier.kind === 'report' ? 'report' : 'proposal';
    setBusy(decision);
    try {
      await jsonFetch('/api/root/decisions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind, id: dossier.id, decision, note: note.trim() || null }),
      });
      setNotice(kind === 'report'
        ? decision === 'accept'
          ? 'Reporte aprobado para uso humano. NO fue publicado, ejecutado, convertido en verdad ni canonizado.'
          : 'Reporte rechazado; contenido, limitaciones y decisión quedan preservados.'
        : decision === 'accept'
          ? 'Diseño aprobado. Esto NO ejecutó ni canonizó la propuesta.'
          : 'Propuesta rechazada con lineage preservado.');
      setNote('');
      await Promise.all([loadBase(), loadDossier(dossier.id, kind)]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(null); }
  };

  const requestEvidence = async () => {
    if (!dossier?.id || dossier.kind === 'report') return;
    setBusy('request_evidence');
    try {
      const result = await jsonFetch(`/api/sfi/proposals/${encodeURIComponent(dossier.id)}/request-evidence`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ evidence_required: note.trim() || 'Acquire the minimum evidence required to decide this proposal without re-requesting evidence already persisted.' }),
      });
      const candidates = arr(result.acquisition?.candidates).length;
      setNotice(candidates
        ? `SFI adquirió ${candidates} candidato${candidates === 1 ? '' : 's'} de evidencia. Revísalos antes de decidir la propuesta.`
        : 'Decisión retenida. Evidence Hunter es ahora dueño de adquirir/reconciliar la evidencia; ROOT no debe volver a pedir lo mismo.');
      setNote('');
      await Promise.all([loadBase(), loadDossier(dossier.id, 'proposal')]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(null); }
  };

  const decideEvidence = async (candidateId: string, decision: 'accept' | 'reject') => {
    if (!dossier?.id || dossier.kind === 'report') return;
    setBusy(`evidence:${candidateId}:${decision}`);
    try {
      await jsonFetch(`/api/sfi/proposals/${encodeURIComponent(dossier.id)}/evidence-candidates/${encodeURIComponent(candidateId)}/${decision}`, { method: 'POST' });
      setNotice(decision === 'accept'
        ? 'Fuente aceptada como evidencia gobernada. Aceptar la fuente NO aprueba automáticamente la propuesta.'
        : 'Candidato de evidencia rechazado; la propuesta conserva su historia.');
      await Promise.all([loadBase(), loadDossier(dossier.id, 'proposal')]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(null); }
  };

  if (!enabled) return null;

  return <div className="rootWorkspace">
    {(error || notice) && <div className={`rootToast ${error ? 'error' : ''}`}><span>{error || notice}</span><button onClick={() => { setError(null); setNotice(null); }}>×</button></div>}

    <section className="rootHero">
      <div><span>ROOT · SOBERANÍA OPERATIVA</span><h1>Lo que realmente requiere tu autoridad</h1><p>Un objeto sólo aparece aquí cuando existe una acción humana ejecutable. Revisión posible no equivale a obligación pendiente.</p></div>
      <div className="rootMetrics"><b>{actionableCount}</b><span>requieren de ti</span><b>{actionableReports.length}</b><span>reportes por decidir</span><b>{reviewOnly.length}</b><span>revisables, no obligatorios</span></div>
    </section>

    <section className="rootContextStrip">
      <div><span>PROYECTOS</span><b>{projects.length}</b></div>
      <div><span>CASOS ACTIVOS</span><b>{activeCases.length}</b></div>
      <div><span>CICLOS ABIERTOS</span><b>{cycles.length}</b></div>
      <div><span>INVARIANTE</span><p>HUMAN_ACTION_REQUIRED ⇒ ACTIONABLE_DOSSIER_REQUIRED</p></div>
    </section>

    <section className="rootSurfaceMap">
      <header><span>SUPERFICIES SFI</span><p>ROOT es autoridad. Las demás capacidades conservan su dueño; este mapa evita convertir módulos existentes en superficies invisibles.</p></header>
      <div className="rootSurfaceGrid">
        {SURFACE_LINKS.map((item) => <Link key={item.href} href={item.href}><strong>{item.label}</strong><span>{item.note}</span><small>ABRIR →</small></Link>)}
        <div className="gated"><strong>LIBRARY</strong><span>GATED · `/library` sigue siendo un alias de compatibilidad hacia ROOT. No se presenta como biblioteca activa hasta recuperar un corpus documental real.</span><small>NO FINGIR SUPERFICIE</small></div>
      </div>
    </section>

    <details className="rootReportArchive" onToggle={(event) => { if (event.currentTarget.open) void loadReportArchive(); }}>
      <summary>REPORTES INSTITUCIONALES · ARCHIVO Y SALUD</summary>
      {reportArchiveLoading && <div className="rootEmpty">Leyendo archivo institucional de reportes…</div>}
      {reportArchive && <div className="rootReportArchiveBody">
        <div className="rootFacts"><span><b>Total</b>{String(reportArchive.inbox?.counts?.total ?? arr(reportArchive.inbox?.items).length)}</span><span><b>Último</b>{date(reportArchive.health?.latestReportAt)}</span><span><b>World</b>{String(reportArchive.inbox?.counts?.world ?? 0)}</span><span><b>Internal</b>{String(reportArchive.inbox?.counts?.internal ?? 0)}</span></div>
        <div className="rootArchiveItems">{arr(reportArchive.inbox?.items).slice(0, 40).map((item) => <article key={`${item.source}:${item.id}`}><div><State value={item.status}/><State value={item.approvalQueue?.status}/></div><strong>{txt(item.title, 'Reporte')}</strong><p>{short(item.body, 260)}</p><small>{txt(item.category, 'other')} · {txt(item.cadence, 'unknown')} · {date(item.createdAt)}</small></article>)}</div>
      </div>}
    </details>

    {(projects.length > 0 || activeCases.length > 0) && <details className="rootReviewOnly">
      <summary>RELACIÓN OPERATIVA · PROYECTOS Y CASOS</summary>
      {projects.map((project) => {
        const projectCases = activeCases.filter((item) => String(item.projectId ?? '') === String(project.id ?? ''));
        return <article key={project.id}><strong>{txt(project.name, 'Proyecto')}</strong><p>{projectCases.length} caso{projectCases.length === 1 ? '' : 's'} activo{projectCases.length === 1 ? '' : 's'}</p>{projectCases.map((item) => <Link key={item.id} href={`/cases?case=${encodeURIComponent(String(item.id))}`}>{txt(item.subject, 'Abrir caso')} →</Link>)}</article>;
      })}
      {activeCases.filter((item) => !item.projectId).map((item) => <article key={item.id}><strong>{txt(item.subject, 'Caso sin proyecto')}</strong><Link href={`/cases?case=${encodeURIComponent(String(item.id))}`}>ABRIR CASO →</Link></article>)}
    </details>}

    <div className="rootDecisionLayout">
      <aside className="rootDecisionQueue">
        <header><div><span>NECESITA DE TI</span><b>{actionableCount}</b></div><button onClick={() => void loadBase()}>ACTUALIZAR</button></header>

        {actionableReports.map((item) => <Link key={`report:${item.id}`} href={`/root?decisionKind=report&decision=${encodeURIComponent(String(item.id))}`} className={`rootDecisionCard report ${selectedKind === 'report' && selectedId === item.id ? 'selected' : ''}`}>
          <div><State value="REPORT"/><State value={item.approvalStatus}/></div>
          <strong>{txt(item.title, 'Reporte institucional')}</strong>
          <p>{txt(item.actionability?.question, item.actionLabel ?? 'Decisión ROOT requerida.')}</p>
          <small>{item.evidenceCount ?? 0} evidencia · {item.limitationCount ?? 0} limitación · ABRIR REPORTE →</small>
        </Link>)}

        {actionableProposals.map((item) => <Link key={item.id} href={`/root?decisionKind=proposal&decision=${encodeURIComponent(String(item.id))}`} className={`rootDecisionCard ${selectedKind === 'proposal' && selectedId === item.id ? 'selected' : ''}`}>
          <div><State value={item.status}/><State value={item.riskLevel}/></div>
          <strong>{txt(item.title, 'Propuesta')}</strong>
          <p>{txt(item.actionability?.question, item.actionLabel ?? 'Decisión ROOT requerida.')}</p>
          <small>ABRIR DECISIÓN →</small>
        </Link>)}

        {actionableCycles.map((item) => <Link key={item.cycleId} href={`/cases?cycle=${encodeURIComponent(String(item.cycleId))}`} className="rootDecisionCard cycle">
          <div><State value={item.state}/></div>
          <strong>{txt(item.title, `Ciclo ${item.cycleId}`)}</strong>
          <p>{txt(item.actionability?.question, item.actionLabel)}</p>
          <small>ABRIR EXPEDIENTE →</small>
        </Link>)}

        {!actionableCount && <div className="rootEmpty">No existe ninguna obligación humana accionable en este momento.</div>}

        {!!reviewOnly.length && <details className="rootReviewOnly"><summary>Revisión disponible, no obligatoria · {reviewOnly.length}</summary>{reviewOnly.slice(0, 60).map((item) => {
          const kind = item.kind === 'report' ? 'report' : 'proposal';
          return <Link key={`${kind}:${item.id}`} href={`/root?decisionKind=${kind}&decision=${encodeURIComponent(String(item.id))}`} className="rootDecisionCard review"><div><State value={item.approvalStatus ?? item.status}/></div><strong>{txt(item.title)}</strong><p>{txt(item.actionability?.question, item.actionLabel)}</p><small>ABRIR REVISIÓN →</small></Link>;
        })}</details>}
      </aside>

      <main className="rootDecisionDossier">
        {!selectedId && <div className="rootEmpty dossier"><strong>Selecciona una decisión.</strong><p>Antes de mostrar botones, SFI debe reconstruir qué es, por qué está abierta, qué sabe, qué falta, qué autoridad te corresponde y qué ocurrirá con cada opción.</p></div>}
        {selectedId && loading && <div className="rootEmpty dossier">Reconstruyendo expediente de decisión…</div>}
        {dossier && !loading && <article className="rootDossier">
          <header className="rootDossierHero"><div><span>{dossier.kind === 'report' ? 'REPORT' : txt(dossier.proposalType, 'PROPOSAL')}</span><h2>{txt(dossier.title)}</h2><p>{txt(dossier.statusMeaning)}</p></div><div><State value={dossier.status}/><State value={dossier.risk?.level}/><small>{dossier.id}</small></div></header>

          <Detail title="DE QUÉ TRATA"><p>{txt(dossier.description, dossier.objective)}</p>{dossier.objective && dossier.objective !== dossier.description && <p className="secondary"><b>Objetivo:</b> {dossier.objective}</p>}</Detail>

          <Detail title="POR QUÉ LLEGÓ A ROOT"><div className="rootFacts"><span><b>Origen</b>{txt(dossier.origin?.source, 'No estructurado')}</span><span><b>Emisor</b>{txt(dossier.origin?.credentialLabel ?? dossier.origin?.actorId, 'No registrado')}</span><span><b>Creado</b>{date(dossier.origin?.createdAt)}</span><span><b>Estado</b>{txt(dossier.status)}</span></div></Detail>

          <Detail title="RIESGO Y LÍMITE"><p>{txt(dossier.risk?.rationale, 'No existe rationale de riesgo adicional persistido.')}</p><div className="rootBoundary"><b>NO AUTORIZA</b><span>{dossier.kind === 'report' ? 'publicación · ejecución · verdad · cierre · canon' : 'ejecución · publicación · acción externa · canon'}</span></div></Detail>

          {dossier.request?.requestedAction && <Detail title="ACCIÓN PROPUESTA"><pre>{JSON.stringify(dossier.request.requestedAction, null, 2)}</pre></Detail>}

          {dossier.kind === 'report' && <Detail title="EVIDENCIA Y LIMITACIONES"><div className="rootFacts"><span><b>Evidence refs</b>{arr(dossier.evidenceRefs).length}</span><span><b>Limitaciones</b>{arr(dossier.limitations).length}</span><span><b>Provider</b>{txt(dossier.report?.provider)}</span><span><b>Model</b>{txt(dossier.report?.model)}</span></div>{!!arr(dossier.evidenceRefs).length && <pre>{JSON.stringify(dossier.evidenceRefs, null, 2)}</pre>}{!!arr(dossier.limitations).length && <pre>{JSON.stringify(dossier.limitations, null, 2)}</pre>}</Detail>}

          <Detail title="QUÉ QUIERE SFI DE TI"><p className="decisionQuestion">{txt(dossier.actionability?.question)}</p>{arr(dossier.actionability?.actions).map((action) => <div className="rootConsequence" key={action.id}><b>{action.label}</b><p>{action.consequence}</p></div>)}</Detail>

          {!!arr(dossier.evidenceCandidates).length && <Detail title={`EVIDENCIA CANDIDATA · ${arr(dossier.evidenceCandidates).length}`}>
            <div className="rootEvidenceList">{arr(dossier.evidenceCandidates).map((candidate) => <article key={candidate.id}><div><State value={candidate.status}/><strong>{txt(candidate.source?.title, candidate.title)}</strong></div><p>{txt(candidate.source?.snippet, candidate.description)}</p>{candidate.requestNote && <p className="secondary"><b>Por qué importa:</b> {candidate.requestNote}</p>}<div className="rootEvidenceMeta">{candidate.source?.publisher && <span>{candidate.source.publisher}</span>}{candidate.source?.url && <a href={candidate.source.url} target="_blank" rel="noreferrer">ABRIR FUENTE ↗</a>}{candidate.source?.referenceHash && <span>ref {short(candidate.source.referenceHash, 18)}</span>}</div>{candidate.status === 'proposed' && <div className="rootEvidenceActions"><button disabled={Boolean(busy)} onClick={() => void decideEvidence(candidate.id, 'accept')}>ACEPTAR EVIDENCIA</button><button className="deny" disabled={Boolean(busy)} onClick={() => void decideEvidence(candidate.id, 'reject')}>RECHAZAR EVIDENCIA</button></div>}</article>)}</div>
          </Detail>}

          <Detail title="QUÉ PASÓ HASTA AHORA"><div className="rootFacts"><span><b>Decisión previa</b>{txt(dossier.outcome?.governanceDecision, 'Ninguna')}</span><span><b>RETURN</b>{txt(dossier.outcome?.returnEventId, 'No aplica/no registrado')}</span><span><b>Calibración</b>{txt(dossier.outcome?.calibrationState, 'No aplica/no registrada')}</span><span><b>Ejecución</b>{txt(dossier.outcome?.executionState, 'No autorizada')}</span></div>{dossier.outcome?.note && <p>{dossier.outcome.note}</p>}</Detail>

          <Detail title="CÓMO SE CIERRA"><p>{txt(dossier.terminalCondition)}</p><p className="secondary">La condición de cierre no se infiere ni se fabrica cuando el registro no la contiene.</p></Detail>

          {dossier.actionability?.humanActionRequired && <section className="rootDecisionActionBox"><label>Nota de decisión (opcional)<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Razón, condición o reserva que debe quedar en el receipt."/></label><div className="rootActionButtons">
            {dossier.kind === 'report' && dossier.status === 'queued_for_approval' && <><button disabled={Boolean(busy)} onClick={() => void decide('accept')}>APROBAR PARA USO HUMANO</button><button className="deny" disabled={Boolean(busy)} onClick={() => void decide('deny')}>RECHAZAR REPORTE</button></>}
            {dossier.kind !== 'report' && dossier.status === 'proposed' && <><button disabled={Boolean(busy)} onClick={() => void decide('accept')}>APROBAR DISEÑO</button><button disabled={Boolean(busy)} onClick={() => void requestEvidence()}>PEDIR EVIDENCIA</button></>}
            {dossier.kind !== 'report' && ['proposed', 'waiting_evidence'].includes(String(dossier.status)) && <button className="deny" disabled={Boolean(busy)} onClick={() => void decide('deny')}>RECHAZAR</button>}
          </div><p><b>Boundary:</b> {dossier.kind === 'report' ? 'uso humano ≠ verdad ≠ publicación ≠ ejecución ≠ cierre ≠ canon.' : 'aprobar diseño ≠ ejecutar ≠ aceptar RETURN ≠ cerrar ≠ canonizar.'}</p></section>}

          {!dossier.actionability?.humanActionRequired && <section className="rootNoAction"><b>NO HAY UNA OBLIGACIÓN HUMANA EJECUTABLE AHORA.</b><p>{txt(dossier.actionability?.question)}</p></section>}

          <details className="rootTrace"><summary>TRAZABILIDAD COMPLETA</summary><pre>{JSON.stringify(dossier, null, 2)}</pre></details>
        </article>}
      </main>
    </div>
  </div>;
}
