'use client';

import { useMemo, useState } from 'react';
import type { RootSovereignState, RootRow } from '@/lib/root/sovereign/rootSovereignState';
import type { RootActionRequest, RootSelection } from './sovereignTypes';
import { RootRevenueWorkspace } from './RootRevenueWorkspace';
import './root-governance-observatory.css';

type RootMode = 'observatory' | 'governance' | 'revenue';
type Lens = 'signals' | 'evidence' | 'hypotheses' | 'memory' | 'attractors' | 'agents' | 'history';

type ObservableItem = {
  id: string;
  title: string;
  kind: string;
  summary: string;
  source: string;
  observedAt: string | null;
  confidence: number | null;
  evidenceIds: string[];
  payload: unknown;
};

const LENSES: Array<{ id: Lens; label: string; description: string }> = [
  { id: 'signals', label: 'Señales', description: 'Cambios, tensiones y eventos que requieren atención.' },
  { id: 'evidence', label: 'Evidencia', description: 'Registros que sostienen o contradicen una lectura.' },
  { id: 'hypotheses', label: 'Hipótesis y predicciones', description: 'Lecturas abiertas, resultados observados y aprendizaje.' },
  { id: 'memory', label: 'Memoria', description: 'Patrones, recurrencias y asociaciones recuperadas.' },
  { id: 'attractors', label: 'Atractores y desvíos', description: 'Direcciones persistentes y fuerzas que alejan la trayectoria.' },
  { id: 'agents', label: 'Agentes', description: 'Capacidades de observación, análisis y propuesta disponibles.' },
  { id: 'history', label: 'Historia', description: 'Secuencia de decisiones, acciones, resultados y cambios.' },
];

function text(value: unknown, fallback = 'Sin descripción') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function number(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function time(row: RootRow): string | null {
  const value = row.observed_at ?? row.created_at ?? row.updated_at ?? row.executed_at ?? row.timestamp;
  return typeof value === 'string' && value ? value : null;
}

function id(row: RootRow, fallback: string) {
  return text(row.id ?? row.event_id ?? row.run_id ?? row.prediction_id ?? row.created_at, fallback);
}

function title(row: RootRow, fallback: string) {
  return text(row.title ?? row.label ?? row.name ?? row.event_type ?? row.action ?? row.type ?? row.status, fallback);
}

function summary(row: RootRow) {
  return text(
    row.summary ?? row.public_summary ?? row.description ?? row.explanation ?? row.statement ?? row.result ?? row.status,
    'Este registro existe, pero todavía no contiene una explicación legible.',
  );
}

function rowItem(row: RootRow, index: number, source: string, kind: string): ObservableItem {
  return {
    id: id(row, `${kind}-${index}`),
    title: title(row, `Registro ${index + 1}`),
    kind,
    summary: summary(row),
    source,
    observedAt: time(row),
    confidence: number(row.confidence ?? row.trust_score ?? row.score),
    evidenceIds: Array.isArray(row.evidence_ids) ? row.evidence_ids.map(String) : [],
    payload: row,
  };
}

function itemsForLens(lens: Lens, state: RootSovereignState): ObservableItem[] {
  if (lens === 'evidence') {
    return state.evidence.data.nodes.slice(0, 140).map((node) => ({
      id: node.id,
      title: node.label,
      kind: node.type,
      summary: text(node.payload.public_summary ?? node.payload.summary ?? node.payload.description, 'Evidencia registrada sin resumen público.'),
      source: node.source,
      observedAt: node.observedAt,
      confidence: node.confidence,
      evidenceIds: node.evidenceIds,
      payload: node,
    }));
  }
  if (lens === 'hypotheses') {
    return [
      ...state.predictions.data.runs.map((row, index) => rowItem(row, index, state.predictions.source, 'predicción')),
      ...state.predictions.data.outcomes.map((row, index) => rowItem(row, index, state.predictions.source, 'resultado observado')),
      ...state.predictions.data.learningEvents.map((row, index) => rowItem(row, index, state.predictions.source, 'aprendizaje')),
    ].slice(0, 140);
  }
  if (lens === 'memory') return state.amv.data.memories.slice(0, 140).map((row, index) => rowItem(row, index, state.amv.source, 'memoria'));
  if (lens === 'attractors') {
    return [
      ...state.amv.data.attractors.map((row, index) => rowItem(row, index, state.amv.source, 'atractor')),
      ...state.amv.data.ejectors.map((row, index) => rowItem(row, index, state.amv.source, 'fuerza de desvío')),
    ].slice(0, 140);
  }
  if (lens === 'agents') {
    return state.agents.data.agents.map((agent) => ({
      id: agent.id,
      title: agent.role || agent.id,
      kind: text(agent.state.value ?? agent.availability, 'estado no determinado'),
      summary: agent.error ? `No puede operar completamente: ${agent.error}` : text(agent.lastResult, 'Agente registrado. Selecciónalo para revisar su estado y posibles usos.'),
      source: state.agents.source,
      observedAt: agent.lastRun,
      confidence: agent.state.confidence,
      evidenceIds: agent.state.evidenceIds,
      payload: agent,
    }));
  }
  if (lens === 'history') {
    return [
      ...state.governance.data.events.map((row, index) => rowItem(row, index, state.governance.source, 'decisión')),
      ...state.governance.data.audits.map((row, index) => rowItem(row, index, state.governance.source, 'auditoría')),
      ...state.execution.data.recentActions.map((row, index) => rowItem(row, index, state.execution.source, 'acción')),
      ...state.predictions.data.outcomes.map((row, index) => rowItem(row, index, state.predictions.source, 'resultado')),
    ].sort((a, b) => String(b.observedAt ?? '').localeCompare(String(a.observedAt ?? ''))).slice(0, 140);
  }
  return state.system.data.matrix.map((item) => ({
    id: item.id,
    title: item.label,
    kind: text(item.state.value ?? item.state.status, 'estado no determinado'),
    summary: item.state.explanation,
    source: item.state.source,
    observedAt: item.state.observedAt,
    confidence: item.state.confidence,
    evidenceIds: item.state.evidenceIds,
    payload: item,
  }));
}

function selection(item: ObservableItem): RootSelection {
  return {
    kind: item.kind,
    id: item.id,
    title: item.title,
    source: item.source,
    observedAt: item.observedAt,
    confidence: item.confidence,
    evidenceIds: item.evidenceIds,
    warning: null,
    data: item.payload,
  };
}

function hash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function shortDate(value: string | null) {
  if (!value) return 'Fecha no disponible';
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? value : new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
}

export function RootGovernanceObservatory({
  state,
  refreshing,
  warning,
  onRefresh,
  onSelect,
  onAction,
}: {
  state: RootSovereignState;
  refreshing: boolean;
  warning: string | null;
  onRefresh: () => void;
  onSelect: (selection: RootSelection) => void;
  onAction: (action: RootActionRequest) => void;
}) {
  const [mode, setMode] = useState<RootMode>('observatory');
  const [lens, setLens] = useState<Lens>('signals');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const items = useMemo(() => itemsForLens(lens, state), [lens, state]);
  const selected = items.find((item) => item.id === selectedId) ?? null;

  const governanceCounts = {
    proposals: state.governance.data.proposals.length,
    pendingEvidence: state.predictions.data.evidenceRequests.length,
    warnings: state.warnings.length,
    capabilities: state.execution.data.capabilities.filter((capability) => capability.state === 'available').length,
  };

  function choose(item: ObservableItem) {
    setSelectedId(item.id);
    onSelect(selection(item));
  }

  function analyzeSelected() {
    if (!selected) return;
    onAction({
      id: `root-observe-${Date.now()}`,
      label: 'Analizar la selección con los agentes disponibles',
      effect: 'Consulta el grafo de evidencia y devuelve relaciones útiles sin modificar la evidencia original.',
      target: selected.title,
      endpoint: '/api/root/agentic/neural-graph',
      method: 'POST',
      body: { query: `${selected.title}\n${selected.summary}`, filters: [lens, selected.kind], generateInterpretation: true },
    });
  }

  function generateReport() {
    if (!selected) return;
    const type = lens === 'attractors' || lens === 'memory' ? 'amv_recurrence' : lens === 'evidence' ? 'neural_graph_evidence' : lens === 'hypotheses' ? 'calibration' : 'world_vector_internal';
    onAction({
      id: `root-report-${Date.now()}`,
      label: 'Generar una lectura de esta selección',
      effect: 'Genera un reporte interno sustentado por la información disponible. No publica ni envía nada.',
      target: selected.title,
      endpoint: '/api/root/agentic/report',
      method: 'POST',
      body: { type, subject: `${selected.title}\n${selected.summary}` },
    });
  }

  function runObservationCycle() {
    onAction({
      id: `root-worldspect-${Date.now()}`,
      label: 'Actualizar observación y aprendizaje',
      effect: 'Ejecuta observación, reportes y auditoría usando WorldSpect y las fuentes persistidas.',
      target: 'WorldSpect + evidencia institucional',
      endpoint: '/api/root/operational/trigger-observation?job=all',
      method: 'POST',
    });
  }

  const heading = mode === 'observatory' ? 'Observatorio de gobernanza' : mode === 'governance' ? 'Centro de decisiones' : 'Conversión económica';
  const description = mode === 'observatory'
    ? 'Explora lo que está cambiando, selecciona una señal y desencadena análisis, evidencia, proyección o reporte desde el mismo campo.'
    : mode === 'governance'
      ? 'Revisa propuestas, permisos, riesgos y cierres que requieren una decisión humana.'
      : 'Convierte señales verificables en empresas, dolores, contactos, propuestas y resultados sin abandonar ROOT.';

  return (
    <main className="rgo-root">
      <header className="rgo-header">
        <div><span>SYSTEM FRICTION INSTITUTE · ROOT</span><h1>{heading}</h1><p>{description}</p></div>
        <div className="rgo-mode-switch" role="tablist" aria-label="Modo ROOT">
          <button type="button" className={mode === 'observatory' ? 'active' : ''} onClick={() => setMode('observatory')}>OBSERVATORIO</button>
          <button type="button" className={mode === 'governance' ? 'active' : ''} onClick={() => setMode('governance')}>GOBERNANZA</button>
          <button type="button" className={mode === 'revenue' ? 'active' : ''} onClick={() => setMode('revenue')}>CONVERSIÓN</button>
          <button type="button" onClick={onRefresh} disabled={refreshing}>{refreshing ? 'ACTUALIZANDO' : 'ACTUALIZAR'}</button>
        </div>
      </header>

      {warning ? <div className="rgo-warning">No fue posible actualizar toda la información. Se mantiene visible el último estado confirmado.</div> : null}

      {mode === 'revenue' ? <RootRevenueWorkspace /> : null}

      {mode === 'governance' ? (
        <section className="rgo-governance" aria-label="Centro de decisiones ROOT">
          <article><span>PROPUESTAS</span><strong>{governanceCounts.proposals}</strong><p>Propuestas registradas que pueden requerir revisión, autorización o cierre.</p></article>
          <article><span>EVIDENCIA PENDIENTE</span><strong>{governanceCounts.pendingEvidence}</strong><p>Solicitudes que todavía necesitan evidencia suficiente.</p></article>
          <article><span>RIESGOS Y ADVERTENCIAS</span><strong>{governanceCounts.warnings}</strong><p>Condiciones degradadas o límites que impiden una acción segura.</p></article>
          <article><span>CAPACIDADES DISPONIBLES</span><strong>{governanceCounts.capabilities}</strong><p>Operaciones que ROOT puede ejecutar ahora.</p></article>
          <div className="rgo-decision-stream">
            <header><div><span>DECISIONES ABIERTAS</span><h2>Qué necesita realmente tu atención</h2></div><button type="button" onClick={runObservationCycle}>ACTUALIZAR OBSERVACIÓN Y APRENDIZAJE</button></header>
            {state.governance.data.proposals.length ? state.governance.data.proposals.slice(0, 12).map((row, index) => {
              const item = rowItem(row, index, state.governance.source, 'propuesta');
              return <button type="button" key={item.id} onClick={() => choose(item)}><span>{item.kind}</span><strong>{item.title}</strong><p>{item.summary}</p><small>{shortDate(item.observedAt)}</small></button>;
            }) : <div className="rgo-empty"><strong>No hay propuestas abiertas.</strong><p>ROOT puede seguir observando y aprendiendo sin pedirte una validación recurrente.</p></div>}
          </div>
        </section>
      ) : null}

      {mode === 'observatory' ? (
        <section className="rgo-observatory" aria-label="Observatorio exploratorio ROOT">
          <nav className="rgo-lenses" aria-label="Capas del observatorio">
            {LENSES.map((item) => <button type="button" key={item.id} className={lens === item.id ? 'active' : ''} onClick={() => { setLens(item.id); setSelectedId(null); }}><strong>{item.label}</strong><span>{item.description}</span></button>)}
          </nav>
          <div className="rgo-field-layout">
            <article className="rgo-field">
              <header><div><span>{LENSES.find((item) => item.id === lens)?.label}</span><h2>{LENSES.find((item) => item.id === lens)?.description}</h2></div><div><b>{items.length}</b><small>elementos observables</small></div></header>
              <svg viewBox="0 0 100 62" role="img" aria-label={`Campo exploratorio de ${lens}`}>
                <defs><radialGradient id="rgoHalo"><stop offset="0" stopColor="currentColor" stopOpacity=".75" /><stop offset="1" stopColor="currentColor" stopOpacity="0" /></radialGradient></defs>
                {items.slice(0, 90).map((item) => {
                  const seed = hash(item.id);
                  const x = 7 + ((seed % 8600) / 100);
                  const y = 7 + (((seed >>> 9) % 4800) / 100);
                  const confidence = item.confidence === null ? .45 : Math.max(.12, Math.min(1, item.confidence));
                  return <g key={item.id} className={`rgo-point ${selectedId === item.id ? 'selected' : ''}`} role="button" tabIndex={0} onClick={() => choose(item)} onKeyDown={(event) => { if (event.key === 'Enter') choose(item); }}><circle cx={x} cy={y} r={2.2 + confidence * 2.8} className="rgo-halo" /><circle cx={x} cy={y} r={.45 + confidence * .55} className="rgo-core" />{(selectedId === item.id || items.length < 18) ? <text x={x + 1.5} y={y - 1.2}>{item.title.slice(0, 30)}</text> : null}</g>;
                })}
              </svg>
              {!items.length ? <div className="rgo-empty field"><strong>No hay datos confirmados para esta capa.</strong><p>ROOT no mostrará puntos artificiales para llenar el espacio.</p></div> : null}
            </article>
            <aside className="rgo-focus">
              <span>PUNTO DE ENFOQUE</span>
              {selected ? <><h2>{selected.title}</h2><p>{selected.summary}</p><dl><div><dt>Qué es</dt><dd>{selected.kind}</dd></div><div><dt>Cuándo se observó</dt><dd>{shortDate(selected.observedAt)}</dd></div><div><dt>Solidez</dt><dd>{selected.confidence === null ? 'Todavía no se ha medido' : `${Math.round(selected.confidence * 100)}%`}</dd></div><div><dt>Evidencia relacionada</dt><dd>{selected.evidenceIds.length || 'Aún no vinculada'}</dd></div></dl><div className="rgo-actions"><button type="button" onClick={analyzeSelected}>ANALIZAR RELACIONES</button><button type="button" onClick={generateReport}>GENERAR LECTURA</button></div></> : <div className="rgo-empty"><strong>Selecciona un punto.</strong><p>ROOT mostrará qué significa, qué lo sostiene y qué acciones se pueden desencadenar.</p></div>}
            </aside>
          </div>
          <footer className="rgo-pipeline"><span>FLUJO ACTIVO</span><b>SELECCIONAR O CARGAR EVIDENCIA</b><i>→</i><b>OBSERVAR RELACIONES</b><i>→</i><b>EJECUTAR AGENTES</b><i>→</i><b>GENERAR LECTURA</b><i>→</i><b>PERSISTIR O CERRAR</b></footer>
        </section>
      ) : null}
    </main>
  );
}
