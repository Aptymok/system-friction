'use client';

import { useMemo, useState } from 'react';
import type { RootSovereignState } from '@/lib/root/sovereign/rootSovereignState';
import './root-autonomous-governance.css';

type ReportType =
  | 'world_vector_internal'
  | 'world_vector_public'
  | 'ifnorm'
  | 'sfi_dr01'
  | 'neural_graph_evidence'
  | 'amv_recurrence'
  | 'calibration'
  | 'atlas_entry'
  | 'linkedin_draft'
  | 'contact_draft';

const REPORTS: Array<{ type: ReportType; label: string; purpose: string }> = [
  { type: 'world_vector_internal', label: 'Lectura interna del mundo', purpose: 'Resume el estado observado para toma de decisiones dentro de SFI.' },
  { type: 'world_vector_public', label: 'Lectura pública del mundo', purpose: 'Prepara una versión pública que requiere revisión antes de publicarse.' },
  { type: 'ifnorm', label: 'Diagnóstico de oportunidad', purpose: 'Explica una necesidad visible y su posible encaje con un servicio de SFI.' },
  { type: 'sfi_dr01', label: 'Diagnóstico SFI-DR01', purpose: 'Organiza el problema, la evidencia disponible y el siguiente paso reversible.' },
  { type: 'neural_graph_evidence', label: 'Mapa de evidencia relacionada', purpose: 'Resume relaciones encontradas en el grafo de evidencia.' },
  { type: 'amv_recurrence', label: 'Recurrencias y memoria', purpose: 'Identifica patrones que vuelven a aparecer en la memoria institucional.' },
  { type: 'calibration', label: 'Calibración de predicciones', purpose: 'Contrasta predicciones, resultados y aprendizaje disponible.' },
  { type: 'atlas_entry', label: 'Entrada para Atlas', purpose: 'Convierte una observación en una entrada documentada y trazable.' },
  { type: 'linkedin_draft', label: 'Borrador para LinkedIn', purpose: 'Prepara contenido; nunca se publica automáticamente.' },
  { type: 'contact_draft', label: 'Borrador de contacto', purpose: 'Prepara un acercamiento para revisión humana; nunca envía mensajes automáticamente.' },
];

function humanState(value: unknown) {
  const state = String(value ?? '').toLowerCase();
  if (['available', 'operational', 'active', 'ready'].includes(state)) return 'Listo';
  if (['gated', 'blocked'].includes(state)) return 'Requiere autorización o datos';
  if (['degraded', 'partial'].includes(state)) return 'Disponible con limitaciones';
  return state ? String(value) : 'Sin estado confirmado';
}

function humanError(value: unknown) {
  const raw = String(value ?? '');
  if (!raw) return null;
  return raw.replaceAll('_', ' ');
}

export function RootAutonomousGovernance({ state }: { state: RootSovereignState }) {
  const [subject, setSubject] = useState('');
  const [reportType, setReportType] = useState<ReportType>('world_vector_internal');
  const [report, setReport] = useState<{ title?: string; body?: string; evidence?: string[] } | null>(null);
  const [reportBusy, setReportBusy] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [entityName, setEntityName] = useState('');
  const [sector, setSector] = useState('');
  const [publicSignal, setPublicSignal] = useState('');
  const [clientResult, setClientResult] = useState<Record<string, unknown> | null>(null);
  const [clientBusy, setClientBusy] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  const agentGroups = useMemo(() => {
    const groups = { ready: [] as typeof state.agents.data.agents, limited: [] as typeof state.agents.data.agents, gated: [] as typeof state.agents.data.agents };
    for (const agent of state.agents.data.agents) {
      const normalized = String(agent.state.value ?? agent.availability).toLowerCase();
      if (['available', 'operational', 'active', 'ready'].includes(normalized)) groups.ready.push(agent);
      else if (['degraded', 'partial'].includes(normalized)) groups.limited.push(agent);
      else groups.gated.push(agent);
    }
    return groups;
  }, [state.agents.data.agents]);

  const pipelines = [
    { title: 'Observación continua', detail: 'Mundo, señales y cambios persistidos', count: state.system.data.matrix.length },
    { title: 'Evidencia y memoria', detail: 'Casos, relaciones y recurrencias', count: state.evidence.data.nodes.length },
    { title: 'Atractores y desvíos', detail: 'Estructuras AMV observadas', count: state.amv.data.attractors.length + state.amv.data.ejectors.length },
    { title: 'Proyección y aprendizaje', detail: 'Predicciones, resultados y calibración', count: state.predictions.data.runs.length + state.predictions.data.outcomes.length },
    { title: 'Oportunidades y clientes', detail: 'Client Finder + predicción + IFNORM', count: 1 },
    { title: 'Gobernanza y aprobación', detail: 'Propuestas, mutaciones y auditorías', count: state.governance.data.proposals.length + state.governance.data.mutations.length },
    { title: 'Reportes institucionales', detail: 'Diez formatos disponibles bajo revisión humana', count: REPORTS.length },
  ];

  async function generateReport() {
    setReportBusy(true);
    setReportError(null);
    try {
      const response = await fetch('/api/root/agentic/report', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: reportType, subject: subject.trim() || undefined }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok) throw new Error(body?.error ?? `HTTP ${response.status}`);
      setReport(body);
    } catch (error) {
      setReportError(error instanceof Error ? humanError(error.message) : 'No fue posible generar el reporte.');
    } finally {
      setReportBusy(false);
    }
  }

  async function findClient() {
    if (!entityName.trim() && !publicSignal.trim()) return;
    setClientBusy(true);
    setClientError(null);
    try {
      const response = await fetch('/api/root/agentic/client-finder', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityName, sector, publicSignal, source: 'ROOT observatory' }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok) throw new Error(body?.error ?? `HTTP ${response.status}`);
      setClientResult(body.ifnorm ?? body);
    } catch (error) {
      setClientError(error instanceof Error ? humanError(error.message) : 'No fue posible analizar la oportunidad.');
    } finally {
      setClientBusy(false);
    }
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
  }

  return (
    <section className="rag-root" aria-label="Observatorio integral de gobernanza">
      <header className="rag-title">
        <span>OPERACIÓN AUTÓNOMA BAJO GOBERNANZA</span>
        <h2>OBSERVATORIO INTEGRAL DE SFI</h2>
        <p>Los agentes observan, relacionan, proyectan y preparan decisiones. Toda publicación, contacto o mutación sensible continúa requiriendo revisión humana.</p>
      </header>

      <div className="rag-pipelines">
        {pipelines.map((pipeline) => (
          <article key={pipeline.title}>
            <span>{pipeline.count}</span>
            <strong>{pipeline.title}</strong>
            <p>{pipeline.detail}</p>
          </article>
        ))}
      </div>

      <div className="rag-grid">
        <article className="rag-agents">
          <header>AGENTES DISPONIBLES · {state.agents.data.agents.length} REGISTRADOS</header>
          <div className="rag-agent-columns">
            <section><h3>Listos · {agentGroups.ready.length}</h3>{agentGroups.ready.map((agent) => <button key={agent.id} type="button"><strong>{agent.role || agent.id}</strong><span>{humanState(agent.state.value ?? agent.availability)}</span><small>{agent.lastResult || 'Sin resultado reciente registrado'}</small></button>)}</section>
            <section><h3>Con limitaciones · {agentGroups.limited.length}</h3>{agentGroups.limited.map((agent) => <button key={agent.id} type="button"><strong>{agent.role || agent.id}</strong><span>{humanState(agent.state.value ?? agent.availability)}</span><small>{humanError(agent.error) || agent.lastResult || 'Revisión necesaria'}</small></button>)}</section>
            <section><h3>Pendientes · {agentGroups.gated.length}</h3>{agentGroups.gated.map((agent) => <button key={agent.id} type="button"><strong>{agent.role || agent.id}</strong><span>{humanState(agent.state.value ?? agent.availability)}</span><small>{humanError(agent.error) || 'Necesita datos, proveedor o autorización'}</small></button>)}</section>
          </div>
        </article>

        <article className="rag-client">
          <header>PIPELINE DE OPORTUNIDADES Y CLIENTES</header>
          <p>El análisis combina Client Finder, grafo de evidencia, memoria AMV y predicción. No envía mensajes ni crea propuestas sin revisión.</p>
          <label>Empresa, institución o persona<input value={entityName} onChange={(event) => setEntityName(event.target.value)} placeholder="Nombre de la organización" /></label>
          <label>Sector<input value={sector} onChange={(event) => setSector(event.target.value)} placeholder="Gobierno, tecnología, cultura…" /></label>
          <label>Señal pública observada<textarea value={publicSignal} onChange={(event) => setPublicSignal(event.target.value)} placeholder="Qué ocurrió, dónde se observó y por qué podría importar" /></label>
          <button type="button" onClick={() => void findClient()} disabled={clientBusy || (!entityName.trim() && !publicSignal.trim())}>{clientBusy ? 'ANALIZANDO' : 'ANALIZAR OPORTUNIDAD'}</button>
          {clientError ? <div className="rag-error">{clientError}</div> : null}
          {clientResult ? <div className="rag-result"><h3>{String(clientResult.entity_name ?? entityName ?? 'Oportunidad analizada')}</h3><p><b>Necesidad detectada:</b> {String(clientResult.detected_pain ?? 'Sin conclusión suficiente')}</p><p><b>Por qué podría encajar SFI:</b> {String(clientResult.why_sfi_fits ?? 'Pendiente de revisión')}</p><p><b>Siguiente acción:</b> {String(clientResult.recommended_action ?? 'Revisar evidencia')}</p><p><b>Servicio sugerido:</b> {String(clientResult.recommended_offer ?? 'Sin propuesta')}</p><button type="button" onClick={() => void copy(JSON.stringify(clientResult, null, 2))}>COPIAR RESULTADO</button><button type="button" onClick={() => setClientResult(null)}>CERRAR</button></div> : null}
        </article>

        <article className="rag-reports">
          <header>CENTRO DE REPORTES</header>
          <p>Selecciona el tipo de lectura. El agente prepara un documento observable que puedes revisar, copiar y cerrar.</p>
          <label>Tipo de reporte<select value={reportType} onChange={(event) => setReportType(event.target.value as ReportType)}>{REPORTS.map((item) => <option key={item.type} value={item.type}>{item.label}</option>)}</select></label>
          <p className="rag-purpose">{REPORTS.find((item) => item.type === reportType)?.purpose}</p>
          <label>Tema o caso<input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Opcional: situación, organización o señal" /></label>
          <button type="button" onClick={() => void generateReport()} disabled={reportBusy}>{reportBusy ? 'GENERANDO' : 'GENERAR REPORTE'}</button>
          {reportError ? <div className="rag-error">{reportError}</div> : null}
          {report ? <div className="rag-result"><h3>{report.title || REPORTS.find((item) => item.type === reportType)?.label}</h3><pre>{report.body || 'El agente no devolvió contenido legible.'}</pre>{report.evidence?.length ? <p><b>Evidencia utilizada:</b> {report.evidence.join(' · ')}</p> : null}<button type="button" onClick={() => void copy(report.body || '')}>COPIAR REPORTE</button><button type="button" onClick={() => setReport(null)}>CERRAR</button></div> : null}
        </article>
      </div>
    </section>
  );
}
