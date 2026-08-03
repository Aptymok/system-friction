'use client';

import { useMemo, useState } from 'react';
import type { RootSovereignState, RootEvidenceNode, RootEvidenceEdge, RootRow } from '@/lib/root/sovereign/rootSovereignState';
import type { RootSelection, RootViewId } from '../sovereignTypes';
import './root-cartography.css';

type ModuleId = 'topology' | 'neural' | 'attractors' | 'predictions' | 'timeline';

type Point = {
  id: string;
  x: number;
  y: number;
  label: string;
  kind: string;
  confidence: number | null;
  observedAt: string | null;
  source: string;
  evidenceIds: string[];
  payload: unknown;
};

const MODULES: Array<{ id: ModuleId; label: string; description: string }> = [
  { id: 'topology', label: 'TOPOLOGY', description: 'Variables cruzadas, densidad y fricción.' },
  { id: 'neural', label: 'NEURAL GRAPH', description: 'Evidencia y relaciones explícitas.' },
  { id: 'attractors', label: 'ATTRACTOR FIELD', description: 'Atractores y ejectores persistidos.' },
  { id: 'predictions', label: 'PROJECTIVE', description: 'Runs, outcomes y aprendizaje.' },
  { id: 'timeline', label: 'TIMELINE', description: 'Eventos persistidos y bifurcaciones.' },
];

function hash(value: string) {
  let output = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    output ^= value.charCodeAt(index);
    output = Math.imul(output, 16777619);
  }
  return output >>> 0;
}

function numeric(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function text(value: unknown, fallback = '—') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function rowId(row: RootRow, fallback: string) {
  return text(row.id ?? row.event_id ?? row.run_id ?? row.prediction_id ?? row.created_at, fallback);
}

function rowTime(row: RootRow) {
  return text(row.observed_at ?? row.created_at ?? row.executed_at ?? row.updated_at ?? row.timestamp, '');
}

function compact(value: number) {
  return new Intl.NumberFormat('en-US', { notation: value >= 1000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value);
}

function latestRows(state: RootSovereignState) {
  const rows = [
    ...state.governance.data.events,
    ...state.governance.data.audits,
    ...state.execution.data.recentActions,
    ...state.predictions.data.learningEvents,
    ...state.predictions.data.outcomes,
  ];
  return rows
    .filter((row) => row && typeof row === 'object')
    .sort((a, b) => rowTime(b).localeCompare(rowTime(a)))
    .slice(0, 36);
}

function evidencePoints(nodes: RootEvidenceNode[]): Point[] {
  return nodes.slice(0, 160).map((node, index) => {
    const seed = hash(node.id || `${node.label}-${index}`);
    const ring = 0.18 + ((seed % 1000) / 1000) * 0.72;
    const angle = ((seed >>> 8) % 6283) / 1000;
    return {
      id: node.id,
      x: 50 + Math.cos(angle) * ring * 44,
      y: 50 + Math.sin(angle) * ring * 40,
      label: node.label,
      kind: node.type,
      confidence: node.confidence,
      observedAt: node.observedAt,
      source: node.source,
      evidenceIds: node.evidenceIds,
      payload: node,
    };
  });
}

function attractorPoints(state: RootSovereignState): Point[] {
  const rows = [...state.amv.data.attractors, ...state.amv.data.ejectors];
  return rows.slice(0, 80).map((row, index) => {
    const id = rowId(row, `amv-${index}`);
    const seed = hash(id);
    const angle = ((seed >>> 5) % 6283) / 1000;
    const radius = 0.15 + ((seed % 1000) / 1000) * 0.76;
    return {
      id,
      x: 50 + Math.cos(angle) * radius * 42,
      y: 50 + Math.sin(angle) * radius * 38,
      label: text(row.label ?? row.name ?? row.attractor_type ?? row.ejector_type, id),
      kind: index < state.amv.data.attractors.length ? 'attractor' : 'ejector',
      confidence: numeric(row.confidence),
      observedAt: rowTime(row) || state.amv.observedAt,
      source: state.amv.source,
      evidenceIds: Array.isArray(row.evidence_ids) ? row.evidence_ids.map(String) : [],
      payload: row,
    };
  });
}

function predictionPoints(state: RootSovereignState): Point[] {
  const rows = [...state.predictions.data.runs, ...state.predictions.data.outcomes, ...state.predictions.data.learningEvents];
  return rows.slice(0, 100).map((row, index) => {
    const id = rowId(row, `prediction-${index}`);
    const horizon = numeric(row.horizon_days ?? row.horizon ?? row.window_days) ?? index;
    const score = numeric(row.confidence ?? row.predicted_value ?? row.outcome_value ?? row.error) ?? 0.5;
    return {
      id,
      x: 7 + ((horizon % 365) / 365) * 86,
      y: 88 - Math.max(0, Math.min(1, score > 1 ? score / 100 : score)) * 72,
      label: text(row.title ?? row.name ?? row.prediction_key ?? row.event_type, id),
      kind: index < state.predictions.data.runs.length ? 'run' : index < state.predictions.data.runs.length + state.predictions.data.outcomes.length ? 'outcome' : 'learning',
      confidence: numeric(row.confidence),
      observedAt: rowTime(row) || state.predictions.observedAt,
      source: state.predictions.source,
      evidenceIds: Array.isArray(row.evidence_ids) ? row.evidence_ids.map(String) : [],
      payload: row,
    };
  });
}

function timelinePoints(state: RootSovereignState): Point[] {
  const rows = latestRows(state);
  return rows.map((row, index) => ({
    id: rowId(row, `event-${index}`),
    x: rows.length <= 1 ? 50 : 5 + (index / (rows.length - 1)) * 90,
    y: 50 + Math.sin(index * 1.7) * 18,
    label: text(row.label ?? row.event_type ?? row.action ?? row.type ?? row.status, `EVENT ${index + 1}`),
    kind: text(row.event_type ?? row.type ?? row.status, 'event'),
    confidence: numeric(row.confidence),
    observedAt: rowTime(row),
    source: 'governance + execution + prediction persistence',
    evidenceIds: Array.isArray(row.evidence_ids) ? row.evidence_ids.map(String) : [],
    payload: row,
  }));
}

function topologyPoints(state: RootSovereignState): Point[] {
  return state.system.data.matrix.map((item, index) => {
    const angle = (index / Math.max(1, state.system.data.matrix.length)) * Math.PI * 2 - Math.PI / 2;
    const openness = item.openItems.value ?? 0;
    return {
      id: item.id,
      x: 50 + Math.cos(angle) * (25 + Math.min(18, openness)),
      y: 50 + Math.sin(angle) * (22 + Math.min(16, openness)),
      label: item.label,
      kind: item.state.value ?? item.state.status,
      confidence: item.state.confidence,
      observedAt: item.state.observedAt,
      source: item.state.source,
      evidenceIds: item.state.evidenceIds,
      payload: item,
    };
  });
}

function modulePoints(module: ModuleId, state: RootSovereignState) {
  if (module === 'neural') return evidencePoints(state.evidence.data.nodes);
  if (module === 'attractors') return attractorPoints(state);
  if (module === 'predictions') return predictionPoints(state);
  if (module === 'timeline') return timelinePoints(state);
  return topologyPoints(state);
}

function selectionFromPoint(point: Point): RootSelection {
  return {
    kind: point.kind,
    id: point.id,
    title: point.label,
    source: point.source,
    observedAt: point.observedAt,
    confidence: point.confidence,
    evidenceIds: point.evidenceIds,
    warning: null,
    data: point.payload,
  };
}

function graphEdges(module: ModuleId, points: Point[], evidenceEdges: RootEvidenceEdge[]) {
  const ids = new Set(points.map((point) => point.id));
  if (module === 'neural') {
    return evidenceEdges
      .filter((edge) => ids.has(edge.from) && ids.has(edge.to))
      .slice(0, 260)
      .map((edge) => ({ from: edge.from, to: edge.to, weight: edge.weight ?? edge.confidence ?? 0.4 }));
  }
  return points.slice(1).map((point, index) => ({
    from: points[index].id,
    to: point.id,
    weight: point.confidence ?? 0.4,
  }));
}

export function RootCartographyView({ state, onSelect, onNavigate }: {
  state: RootSovereignState;
  onSelect: (selection: RootSelection) => void;
  onNavigate: (view: RootViewId) => void;
}) {
  const [module, setModule] = useState<ModuleId>('topology');
  const [selected, setSelected] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const points = useMemo(() => modulePoints(module, state), [module, state]);
  const edges = useMemo(() => graphEdges(module, points, state.evidence.data.edges), [module, points, state.evidence.data.edges]);
  const pointById = useMemo(() => new Map(points.map((point) => [point.id, point])), [points]);
  const observedSystems = state.system.data.matrix.filter((item) => item.state.value !== null).length;
  const activeAgents = state.agents.data.agents.filter((agent) => ['available', 'operational', 'active', 'ready'].includes(String(agent.state.value ?? agent.availability).toLowerCase())).length;
  const report = useMemo(() => ({
    generatedAt: state.generatedAt,
    activeModule: module,
    sources: { system: state.system.source, evidence: state.evidence.source, amv: state.amv.source, predictions: state.predictions.source, execution: state.execution.source },
    counts: { systems: state.system.data.matrix.length, observedSystems, evidenceNodes: state.evidence.data.nodes.length, evidenceEdges: state.evidence.data.edges.length, attractors: state.amv.data.attractors.length, ejectors: state.amv.data.ejectors.length, predictionRuns: state.predictions.data.runs.length, outcomes: state.predictions.data.outcomes.length, agents: state.agents.data.agents.length, activeAgents },
    warnings: state.warnings,
  }), [activeAgents, module, observedSystems, state]);

  async function copyReport() {
    await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  function downloadReport() {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `sfi-root-cartography-${state.generatedAt.replace(/[:.]/g, '-')}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function choose(point: Point) {
    setSelected(point.id);
    onSelect(selectionFromPoint(point));
  }

  const selectedPoint = selected ? pointById.get(selected) ?? null : null;

  return (
    <section className="rc-root" aria-label="ROOT cartography of the unexplored">
      <header className="rc-head">
        <div><span>ROOT · FOUNDER OPERATING ENVIRONMENT</span><h1>CARTOGRAPHY OF THE UNEXPLORED</h1><p>Un solo espacio para observar, reconstruir, proyectar y actuar sobre trazas persistidas.</p></div>
        <div className="rc-head-metrics">
          <span><b>{observedSystems}/{state.system.data.matrix.length}</b>SYSTEMS</span>
          <span><b>{compact(state.evidence.data.nodes.length)}</b>EVIDENCE NODES</span>
          <span><b>{state.amv.data.attractors.length}</b>ATTRACTORS</span>
          <span><b>{activeAgents}/{state.agents.data.agents.length}</b>AGENTS READY</span>
        </div>
      </header>
      <div className="rc-main">
        <article className="rc-stage">
          <div className="rc-stage-head">
            <div><span>{MODULES.find((item) => item.id === module)?.label}</span><strong>{MODULES.find((item) => item.id === module)?.description}</strong></div>
            <div className="rc-stage-actions">
              <button type="button" onClick={() => onNavigate('agents')}>EXECUTE AGENTS</button>
              <button type="button" onClick={() => onNavigate('evidence')}>UPLOAD EVIDENCE BY PROPOSITION</button>
              <button type="button" onClick={() => onNavigate('execution')}>OPEN SIMULATOR</button>
              <button type="button" onClick={() => onNavigate('predictions')}>PROJECTIVE ENGINE</button>
              <button type="button" onClick={() => void copyReport()}>{copied ? 'COPIED' : 'COPY REPORT'}</button>
              <button type="button" onClick={downloadReport}>DOWNLOAD</button>
            </div>
          </div>
          <div className={`rc-graph is-${module}`}>
            <svg viewBox="0 0 100 100" role="img" aria-label={`${module} graph from persistent ROOT state`}>
              <defs><radialGradient id="rcGlow"><stop offset="0" stopColor="currentColor" stopOpacity=".85" /><stop offset="1" stopColor="currentColor" stopOpacity="0" /></radialGradient><linearGradient id="rcField" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#54d7d0" stopOpacity=".24" /><stop offset=".45" stopColor="#d33c8f" stopOpacity=".5" /><stop offset="1" stopColor="#ef9e3f" stopOpacity=".26" /></linearGradient></defs>
              <path className="rc-field-line" d="M0 75 C12 57 18 83 30 62 S48 69 58 43 S76 72 100 35" /><path className="rc-field-line dim" d="M0 84 C18 67 24 78 36 70 S55 82 67 54 S85 59 100 50" />
              {edges.map((edge, index) => { const from = pointById.get(edge.from); const to = pointById.get(edge.to); if (!from || !to) return null; return <line key={`${edge.from}-${edge.to}-${index}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} className="rc-edge" style={{ opacity: .12 + Math.min(.6, Number(edge.weight) * .5) }} />; })}
              {points.map((point) => <g key={point.id} className={`rc-node ${selected === point.id ? 'is-selected' : ''}`} onClick={() => choose(point)} tabIndex={0} role="button" onKeyDown={(event) => { if (event.key === 'Enter') choose(point); }}><circle cx={point.x} cy={point.y} r={selected === point.id ? 4.5 : 2.4} className="rc-node-glow" /><circle cx={point.x} cy={point.y} r={selected === point.id ? 1.25 : .72} className="rc-node-core" />{(selected === point.id || points.length < 24) ? <text x={point.x + 1.8} y={point.y - 1.5}>{point.label.slice(0, 28)}</text> : null}</g>)}
            </svg>
            {!points.length ? <div className="rc-empty">NO PERSISTED DATA FOR THIS LAYER</div> : null}
            <div className="rc-graph-contract">CLICK A POINT TO INSPECT · NO SYNTHETIC NODES · SOURCE: {module === 'neural' ? state.evidence.source : module === 'attractors' ? state.amv.source : module === 'predictions' ? state.predictions.source : module === 'timeline' ? 'governance + execution + prediction stores' : state.system.source}</div>
          </div>
          <div className="rc-module-strip">
            {MODULES.map((item) => <button key={item.id} type="button" className={module === item.id ? 'active' : ''} onClick={() => { setModule(item.id); setSelected(null); }}><span>{item.label}</span><strong>{item.id === 'neural' ? state.evidence.data.nodes.length : item.id === 'attractors' ? state.amv.data.attractors.length + state.amv.data.ejectors.length : item.id === 'predictions' ? state.predictions.data.runs.length : item.id === 'timeline' ? latestRows(state).length : state.system.data.matrix.length}</strong><small>{item.description}</small></button>)}
          </div>
        </article>
        <aside className="rc-side">
          <article><header>VISCOSITY / CROSS VARIABLES</header><dl><div><dt>OPEN SYSTEM LOAD</dt><dd>{state.system.data.matrix.reduce((sum, item) => sum + (item.openItems.value ?? 0), 0)}</dd></div><div><dt>EVIDENCE DENSITY</dt><dd>{state.evidence.data.nodes.length ? (state.evidence.data.edges.length / state.evidence.data.nodes.length).toFixed(3) : '—'}</dd></div><div><dt>AMV FIELD</dt><dd>{state.amv.data.attractors.length}/{state.amv.data.ejectors.length}</dd></div><div><dt>PREDICTIVE RETURNS</dt><dd>{state.predictions.data.outcomes.length}</dd></div></dl></article>
          <article><header>SELECTED POINT</header>{selectedPoint ? <div className="rc-selected"><span>{selectedPoint.kind}</span><strong>{selectedPoint.label}</strong><p>{selectedPoint.source}</p><small>{selectedPoint.observedAt || 'NO OBSERVED TIME'}</small>{module === 'timeline' ? <button type="button" onClick={() => onNavigate('execution')}>RECREATE CONDITIONS / REVIEW BIFURCATION</button> : null}</div> : <div className="rc-empty compact">SELECT A NODE</div>}</article>
          <article><header>ROOT OPERATIONS</header><div className="rc-ops"><button type="button" onClick={() => onNavigate('cognitive-runtime')}>COGNITIVE TWINS / RUNTIME</button><button type="button" onClick={() => onNavigate('amv')}>ATTRACTORS + EJECTORS</button><button type="button" onClick={() => onNavigate('governance')}>GOVERNANCE</button><button type="button" onClick={() => onNavigate('telemetry')}>PHENOMENOLOGICAL OBSERVATORY</button></div></article>
          <article><header>DATA INTEGRITY</header><ul className="rc-warnings">{state.warnings.slice(0, 6).map((warning) => <li key={warning}>{warning}</li>)}{!state.warnings.length ? <li>NO ACTIVE ROOT WARNINGS</li> : null}</ul></article>
        </aside>
      </div>
    </section>
  );
}
