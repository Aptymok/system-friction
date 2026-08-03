'use client';

import { useMemo, useState, type ReactNode } from 'react';
import type { RootSovereignState, RootEvidenceNode, RootEvidenceEdge, RootRow } from '@/lib/root/sovereign/rootSovereignState';
import type { RootSelection, RootViewId } from '../sovereignTypes';
import './root-cartography.css';

type ModuleId = 'topology' | 'neural' | 'attractors' | 'predictions' | 'timeline';
type EmbeddedView = Exclude<RootViewId, 'overview'>;

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
  { id: 'topology', label: 'TOPOLOGÍA', description: 'Estado de las partes del sistema y carga pendiente.' },
  { id: 'neural', label: 'RED DE EVIDENCIA', description: 'Registros y relaciones explícitas entre ellos.' },
  { id: 'attractors', label: 'CAMPO DE ATRACTORES', description: 'Direcciones persistentes y fuerzas de desvío registradas.' },
  { id: 'predictions', label: 'PROYECCIONES', description: 'Predicciones, resultados posteriores y aprendizaje.' },
  { id: 'timeline', label: 'HISTORIA', description: 'Cambios registrados, acciones y posibles puntos de bifurcación.' },
];

const PANEL_TITLES: Record<EmbeddedView, string> = {
  'cognitive-runtime': 'Procesos cognitivos y gemelos',
  governance: 'Decisiones, permisos y revisión humana',
  agents: 'Agentes disponibles y ejecución',
  predictions: 'Proyecciones y resultados',
  amv: 'Atractores, desvíos y memoria del campo',
  evidence: 'Evidencia por proposición y casos',
  execution: 'Simular, comparar y ejecutar acciones',
  telemetry: 'Historia de cambios y observaciones',
};

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
  return new Intl.NumberFormat('es-MX', { notation: value >= 1000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value);
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
      kind: index < state.predictions.data.runs.length ? 'prediction' : index < state.predictions.data.runs.length + state.predictions.data.outcomes.length ? 'result' : 'learning',
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
    label: text(row.label ?? row.event_type ?? row.action ?? row.type ?? row.status, `CAMBIO ${index + 1}`),
    kind: text(row.event_type ?? row.type ?? row.status, 'event'),
    confidence: numeric(row.confidence),
    observedAt: rowTime(row),
    source: 'registros de decisiones, ejecución y aprendizaje',
    evidenceIds: Array.isArray(row.evidence_ids) ? row.evidence_ids.map(String) : [],
    payload: row,
  }));
}

function topologyPoints(state: RootSovereignState): Point[] {
  return state.system.data.matrix.map((item, index) => {
    const total = Math.max(1, state.system.data.matrix.length);
    const lane = index % 3;
    const x = 8 + (index / Math.max(1, total - 1)) * 84;
    const load = Math.min(28, item.openItems.value ?? 0);
    const confidence = item.state.confidence ?? 0.5;
    const y = 70 - load * 1.25 - confidence * 18 + lane * 9;
    return {
      id: item.id,
      x,
      y: Math.max(10, Math.min(88, y)),
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

function orderedPath(points: Point[], offset = 0) {
  const ordered = [...points].sort((a, b) => a.x - b.x);
  return ordered.map((point) => `${point.x},${Math.max(3, Math.min(97, point.y + offset))}`).join(' ');
}

export function RootCartographyView({
  state,
  onSelect,
  embeddedView,
  embeddedPanel,
  onOpenPanel,
  onClosePanel,
}: {
  state: RootSovereignState;
  onSelect: (selection: RootSelection) => void;
  embeddedView: EmbeddedView | null;
  embeddedPanel: ReactNode;
  onOpenPanel: (view: EmbeddedView) => void;
  onClosePanel: () => void;
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
    fecha: state.generatedAt,
    vista: MODULES.find((item) => item.id === module)?.label,
    resumen: {
      partesDelSistema: state.system.data.matrix.length,
      partesObservadas: observedSystems,
      registrosDeEvidencia: state.evidence.data.nodes.length,
      relacionesDeEvidencia: state.evidence.data.edges.length,
      atractores: state.amv.data.attractors.length,
      fuerzasDeDesvio: state.amv.data.ejectors.length,
      predicciones: state.predictions.data.runs.length,
      resultadosObservados: state.predictions.data.outcomes.length,
      agentesDisponibles: activeAgents,
    },
    advertencias: state.warnings,
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
    anchor.download = `reporte-root-${state.generatedAt.replace(/[:.]/g, '-')}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function choose(point: Point) {
    setSelected(point.id);
    onSelect(selectionFromPoint(point));
  }

  const selectedPoint = selected ? pointById.get(selected) ?? null : null;
  const openLoad = state.system.data.matrix.reduce((sum, item) => sum + (item.openItems.value ?? 0), 0);
  const evidenceDensity = state.evidence.data.nodes.length ? state.evidence.data.edges.length / state.evidence.data.nodes.length : null;

  return (
    <section className="rc-root" aria-label="Mapa operativo de ROOT">
      <header className="rc-head">
        <div><span>ROOT · ENTORNO DE OPERACIÓN</span><h1>CARTOGRAFÍA DE LO AÚN NO EXPLORADO</h1><p>Observa relaciones, abre herramientas y actúa sin abandonar este espacio.</p></div>
        <div className="rc-head-metrics">
          <span><b>{observedSystems}/{state.system.data.matrix.length}</b>PARTES OBSERVADAS</span>
          <span><b>{compact(state.evidence.data.nodes.length)}</b>REGISTROS</span>
          <span><b>{state.amv.data.attractors.length}</b>ATRACTORES</span>
          <span><b>{activeAgents}/{state.agents.data.agents.length}</b>AGENTES LISTOS</span>
        </div>
      </header>

      <div className="rc-main">
        <article className="rc-stage">
          <div className="rc-stage-head">
            <div><span>{MODULES.find((item) => item.id === module)?.label}</span><strong>{MODULES.find((item) => item.id === module)?.description}</strong></div>
            <div className="rc-stage-actions">
              <button type="button" onClick={() => onOpenPanel('agents')}>EJECUTAR AGENTES</button>
              <button type="button" onClick={() => onOpenPanel('evidence')}>AGREGAR EVIDENCIA</button>
              <button type="button" onClick={() => onOpenPanel('execution')}>ABRIR SIMULADOR</button>
              <button type="button" onClick={() => onOpenPanel('predictions')}>VER PROYECCIONES</button>
              <button type="button" onClick={() => void copyReport()}>{copied ? 'REPORTE COPIADO' : 'COPIAR REPORTE'}</button>
              <button type="button" onClick={downloadReport}>DESCARGAR REPORTE</button>
            </div>
          </div>

          <div className={`rc-graph is-${module}`}>
            <svg viewBox="0 0 100 100" role="img" aria-label={`Gráfico de ${MODULES.find((item) => item.id === module)?.label}`}>
              <defs>
                <radialGradient id="rcGlow"><stop offset="0" stopColor="currentColor" stopOpacity=".85" /><stop offset="1" stopColor="currentColor" stopOpacity="0" /></radialGradient>
                <linearGradient id="rcField" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#54d7d0" stopOpacity=".28" /><stop offset=".45" stopColor="#d33c8f" stopOpacity=".62" /><stop offset="1" stopColor="#ef9e3f" stopOpacity=".32" /></linearGradient>
              </defs>

              {points.length > 1 ? (
                <>
                  <polyline className="rc-field-line" points={orderedPath(points)} />
                  <polyline className="rc-field-line dim" points={orderedPath(points, 6)} />
                  <polyline className="rc-field-line faint" points={orderedPath(points, 12)} />
                </>
              ) : null}

              {points.map((point) => (
                <line key={`stem-${point.id}`} x1={point.x} y1={92} x2={point.x} y2={point.y} className="rc-stem" style={{ opacity: .08 + (point.confidence ?? .35) * .3 }} />
              ))}

              {edges.map((edge, index) => {
                const from = pointById.get(edge.from);
                const to = pointById.get(edge.to);
                if (!from || !to) return null;
                return <line key={`${edge.from}-${edge.to}-${index}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} className="rc-edge" style={{ opacity: .12 + Math.min(.6, Number(edge.weight) * .5) }} />;
              })}

              {module === 'attractors' ? points.map((point) => (
                <g key={`field-${point.id}`} className={point.kind === 'attractor' ? 'rc-attractor-contour' : 'rc-ejector-contour'}>
                  <circle cx={point.x} cy={point.y} r={4 + (point.confidence ?? .4) * 7} />
                  <circle cx={point.x} cy={point.y} r={7 + (point.confidence ?? .4) * 9} />
                </g>
              )) : null}

              {points.map((point) => (
                <g key={point.id} className={`rc-node ${selected === point.id ? 'is-selected' : ''}`} onClick={() => choose(point)} tabIndex={0} role="button" onKeyDown={(event) => { if (event.key === 'Enter') choose(point); }}>
                  <circle cx={point.x} cy={point.y} r={selected === point.id ? 4.5 : 2.4} className="rc-node-glow" />
                  <circle cx={point.x} cy={point.y} r={selected === point.id ? 1.25 : .72} className="rc-node-core" />
                  {(selected === point.id || points.length < 24) ? <text x={point.x + 1.8} y={point.y - 1.5}>{point.label.slice(0, 28)}</text> : null}
                </g>
              ))}
            </svg>

            {!points.length ? <div className="rc-empty">AÚN NO HAY INFORMACIÓN REGISTRADA PARA ESTA CAPA</div> : null}
            <div className="rc-graph-contract">La posición muestra la organización visual de esta capa. Haz clic en un punto para conocer su fuente, fecha y evidencia.</div>
          </div>

          <div className="rc-module-strip">
            {MODULES.map((item) => (
              <button key={item.id} type="button" className={module === item.id ? 'active' : ''} onClick={() => { setModule(item.id); setSelected(null); }}>
                <span>{item.label}</span>
                <strong>{item.id === 'neural' ? state.evidence.data.nodes.length : item.id === 'attractors' ? state.amv.data.attractors.length + state.amv.data.ejectors.length : item.id === 'predictions' ? state.predictions.data.runs.length : item.id === 'timeline' ? latestRows(state).length : state.system.data.matrix.length}</strong>
                <small>{item.description}</small>
              </button>
            ))}
          </div>
        </article>

        <aside className="rc-side">
          <article><header>CARGA Y RELACIONES</header><dl><div><dt>ASUNTOS ABIERTOS</dt><dd>{openLoad}</dd></div><div><dt>RELACIONES POR REGISTRO</dt><dd>{evidenceDensity === null ? 'SIN DATO' : evidenceDensity.toFixed(3)}</dd></div><div><dt>ATRACTORES / DESVÍOS</dt><dd>{state.amv.data.attractors.length}/{state.amv.data.ejectors.length}</dd></div><div><dt>RESULTADOS OBSERVADOS</dt><dd>{state.predictions.data.outcomes.length}</dd></div></dl></article>
          <article><header>PUNTO SELECCIONADO</header>{selectedPoint ? <div className="rc-selected"><span>{selectedPoint.kind}</span><strong>{selectedPoint.label}</strong><p>{selectedPoint.source}</p><small>{selectedPoint.observedAt || 'SIN FECHA REGISTRADA'}</small>{module === 'timeline' ? <button type="button" onClick={() => onOpenPanel('execution')}>RECREAR CONDICIONES Y REVISAR DESVÍOS</button> : null}</div> : <div className="rc-empty compact">SELECCIONA UN PUNTO DEL GRÁFICO</div>}</article>
          <article><header>HERRAMIENTAS ROOT</header><div className="rc-ops"><button type="button" onClick={() => onOpenPanel('cognitive-runtime')}>PROCESOS COGNITIVOS Y GEMELOS</button><button type="button" onClick={() => onOpenPanel('amv')}>ATRACTORES Y FUERZAS DE DESVÍO</button><button type="button" onClick={() => onOpenPanel('governance')}>DECISIONES Y PERMISOS</button><button type="button" onClick={() => onOpenPanel('telemetry')}>HISTORIA DE CAMBIOS</button></div></article>
          <article><header>INTEGRIDAD DE LA INFORMACIÓN</header><ul className="rc-warnings">{state.warnings.slice(0, 6).map((warning) => <li key={warning}>{warning}</li>)}{!state.warnings.length ? <li>NO HAY ADVERTENCIAS ACTIVAS</li> : null}</ul></article>
        </aside>
      </div>

      <section className="rc-dashboard-grid" aria-label="Módulos operativos de ROOT">
        <button type="button" onClick={() => onSelect({ kind: 'estado mundial', id: 'world-vector', title: 'Estado mundial observado', source: state.system.source, observedAt: state.system.observedAt, confidence: null, evidenceIds: [], warning: state.system.error, data: state.system.data.worldVector })}><span>ESTADO MUNDIAL</span><b>{state.system.data.worldVector ? 'DISPONIBLE' : 'SIN LECTURA'}</b><small>Contexto mundial registrado para ROOT.</small></button>
        <button type="button" onClick={() => setModule('neural')}><span>RED DE EVIDENCIA</span><b>{state.evidence.data.nodes.length} puntos · {state.evidence.data.edges.length} relaciones</b><small>Abre la red y explora conexiones documentadas.</small></button>
        <button type="button" onClick={() => onOpenPanel('execution')}><span>SIMULADOR</span><b>{state.execution.data.capabilities.length} capacidades</b><small>Compara escenarios y ejecuta acciones confirmadas.</small></button>
        <button type="button" onClick={() => onOpenPanel('predictions')}><span>PROYECCIONES</span><b>{state.predictions.data.runs.length} predicciones</b><small>Revisa horizontes, resultados y aprendizaje.</small></button>
        <button type="button" onClick={() => setModule('timeline')}><span>HISTORIA</span><b>{latestRows(state).length} cambios recientes</b><small>Localiza eventos y posibles bifurcaciones.</small></button>
        <button type="button" onClick={() => onOpenPanel('evidence')}><span>EVIDENCIA</span><b>{state.evidence.data.nodes.length} registros</b><small>Agrega evidencia asociada a una proposición concreta.</small></button>
        <button type="button" onClick={() => onOpenPanel('predictions')}><span>REGISTRO DE PREDICCIONES</span><b>{state.predictions.data.outcomes.length} resultados</b><small>Compara lo esperado con lo que ocurrió.</small></button>
        <button type="button" onClick={() => onOpenPanel('governance')}><span>REVISIÓN HUMANA</span><b>{state.governance.data.proposals.length} propuestas</b><small>Autoriza, rechaza o revisa cambios.</small></button>
        <button type="button" onClick={() => onOpenPanel('agents')}><span>ESTADO OPERATIVO</span><b>{activeAgents}/{state.agents.data.agents.length} agentes listos</b><small>Consulta disponibilidad y bloqueos.</small></button>
      </section>

      {embeddedView && embeddedPanel ? (
        <section className="rc-workbench-overlay" role="dialog" aria-modal="true" aria-label={PANEL_TITLES[embeddedView]}>
          <header><div><span>HERRAMIENTA ABIERTA DENTRO DE ROOT</span><strong>{PANEL_TITLES[embeddedView]}</strong></div><button type="button" onClick={onClosePanel}>CERRAR Y VOLVER AL MAPA</button></header>
          <div className="rc-workbench-body">{embeddedPanel}</div>
        </section>
      ) : null}
    </section>
  );
}
