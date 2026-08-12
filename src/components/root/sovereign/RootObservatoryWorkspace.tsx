'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { RootEvidenceEdge, RootEvidenceNode, RootRow, RootSovereignState } from '@/lib/root/sovereign/rootSovereignState';
import type { RootActionRequest, RootSelection } from './sovereignTypes';
import { PredictionOutcomeTree } from './visual/PredictionOutcomeTree';
import { DynamicAttractorField } from './visual/DynamicAttractorField';
import './root-observatory.css';
import './root-operational-enhancements.css';

type TopologyId = 'I' | 'II' | 'III';
type AccessMode = 'sovereign' | 'observer';
type StatusContext = 'CLASE' | 'SALUD' | 'ESTADO' | 'MODO';
type SurfaceSpec = { title: string; href: string };
type ModuleTool = { label: string; kind: 'surface' | 'event' | 'api'; target: string };
type ModuleSpec = { id: string; label: string; tools: ModuleTool[] };
type SurfaceLauncher = ModuleTool & { code: string; title: string; sovereignOnly?: boolean };
type PanelProps = {
  id: string;
  module: string;
  label: string;
  status?: string;
  statusContext?: StatusContext;
  source?: string;
  width?: 's' | 'm' | 'l' | 'xl';
  children: ReactNode;
  onOpen?: () => void;
};
type LiveRow = { name: string; sub?: string; status?: string; statusContext?: StatusContext; onClick?: () => void };

type ToolStatus = { text: string; tone: 'ok' | 'bad' | 'idle' } | null;

const TOPOLOGIES: Record<TopologyId, { title: string; question: string }> = {
  I: { title: 'SISTEMA', question: '¿Qué existe y qué responde?' },
  II: { title: 'CAMPO COGNITIVO', question: '¿Qué está comprendiendo SFI y qué podría hacer?' },
  III: { title: 'TRAYECTORIA', question: '¿Qué cambió y qué aprendimos?' },
};

const MODULES: ModuleSpec[] = [
  { id: '01', label: 'Estado Institucional', tools: [
    { label: 'INSTITUCIONALIZACIÓN', kind: 'surface', target: '/root/institutionalization' },
    { label: 'REPORTES DE AGENTES', kind: 'surface', target: '/root/reports' },
  ] },
  { id: '02', label: 'Sistema / Infraestructura', tools: [
    { label: 'FIELD', kind: 'surface', target: '/field' },
    { label: 'FIELD MAP', kind: 'surface', target: '/field/map' },
    { label: 'STUDIO', kind: 'surface', target: '/studio' },
    { label: 'OBSERVATORY', kind: 'surface', target: '/interface/observatory' },
    { label: 'LIBRARY', kind: 'surface', target: '/library' },
  ] },
  { id: '03', label: 'Identidad / Autoridad', tools: [
    { label: 'CONTRATOS', kind: 'surface', target: '/root/readiness' },
    { label: 'AGENT PASSPORTS', kind: 'surface', target: '/root/agents' },
  ] },
  { id: '04', label: 'SFI / Evidencia / Grafo', tools: [
    { label: 'CHAT CON SFI', kind: 'event', target: 'sfi:open-friccionauta' },
    { label: 'RECONCILIAR GRAFO', kind: 'api', target: '/api/root/evidence/reconcile' },
  ] },
  { id: '05', label: 'Cognitive Runtime', tools: [
    { label: 'CHAT CON SFI', kind: 'event', target: 'sfi:open-friccionauta' },
    { label: 'REPORTES DE AGENTES', kind: 'surface', target: '/root/reports' },
  ] },
  { id: '06', label: 'Cognitive Twin', tools: [
    { label: 'CHAT CON SFI', kind: 'event', target: 'sfi:open-friccionauta' },
    { label: 'COGNITIVE TWIN', kind: 'surface', target: '/root/cognitive-twin' },
  ] },
  { id: '07', label: 'Proyección / Predicción', tools: [{ label: 'PREDICTION CASES', kind: 'surface', target: '/root/predictions' }] },
  { id: '08', label: 'Atractores / PPOI', tools: [{ label: 'ATTRACTOR WORKBENCH', kind: 'surface', target: '/root/attractor' }] },
  { id: '09', label: 'Memoria / Trayectoria', tools: [
    { label: 'LONGITUDINAL MEMORY', kind: 'surface', target: '/root/longitudinal' },
    { label: 'REPORTES DE AGENTES', kind: 'surface', target: '/root/reports' },
  ] },
  { id: '10', label: 'Gobernanza / Operación', tools: [
    { label: 'MEJORAR SISTEMA · DECISION QUEUE', kind: 'surface', target: '/root/decisions' },
    { label: 'RESOLUCIÓN METODOLÓGICA', kind: 'event', target: 'sfi:open-methodology' },
    { label: 'CONTINUIDAD', kind: 'surface', target: '/root/readiness' },
  ] },
];

const ROOT_SURFACES: SurfaceLauncher[] = [
  { code: 'SF', title: 'Chat SFI', label: 'CHAT CON SFI', kind: 'event', target: 'sfi:open-friccionauta' },
  { code: 'IN', title: 'Institutionalization', label: 'INSTITUCIONALIZACIÓN', kind: 'surface', target: '/root/institutionalization' },
  { code: 'RP', title: 'Reportes de agentes', label: 'REPORTES DE AGENTES', kind: 'surface', target: '/root/reports' },
  { code: 'FD', title: 'Field', label: 'FIELD', kind: 'surface', target: '/field' },
  { code: 'FM', title: 'Field Map', label: 'FIELD MAP', kind: 'surface', target: '/field/map' },
  { code: 'ST', title: 'Studio', label: 'STUDIO', kind: 'surface', target: '/studio' },
  { code: 'OB', title: 'Observatory', label: 'OBSERVATORY', kind: 'surface', target: '/interface/observatory' },
  { code: 'LB', title: 'Library', label: 'LIBRARY', kind: 'surface', target: '/library' },
  { code: 'CN', title: 'Contracts', label: 'CONTRATOS', kind: 'surface', target: '/root/readiness' },
  { code: 'AP', title: 'Agent Passports', label: 'AGENT PASSPORTS', kind: 'surface', target: '/root/agents' },
  { code: 'TW', title: 'Cognitive Twin', label: 'COGNITIVE TWIN', kind: 'surface', target: '/root/cognitive-twin' },
  { code: 'CO', title: 'Continuity', label: 'CONTINUIDAD', kind: 'surface', target: '/root/readiness' },
];

const DIVERGENCE_FACT: Record<string, string> = {
  'reader-errors': 'source-health',
  'cognitive-continuity': 'cognitive-execution',
  'graph-traceability': 'traceability',
  'capability-gap': 'execution-capability',
  'attractor-reader-gap': 'institutional-attractor',
  'institutional-position-gap': 'institutional-position',
};

function text(value: unknown, fallback = '—') {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return fallback;
}
function rec(value: unknown): RootRow {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as RootRow : {};
}
function strings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}
function rowDate(row: RootRow) {
  return text(row.observed_at ?? row.occurred_at ?? row.executed_at ?? row.finished_at ?? row.updated_at ?? row.created_at ?? row.timestamp, '') || null;
}
function rid(row: RootRow, fallback: string) {
  return text(row.id ?? row.event_id ?? row.run_id ?? row.task_id ?? row.decision_id ?? row.memory_key ?? row.node_key ?? row.node_id ?? row.attractor_key ?? row.hypothesis_id, fallback);
}
function when(value: string | null | undefined) {
  if (!value) return 'SIN FECHA';
  const date = new Date(value);
  return Number.isFinite(date.valueOf()) ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(date) : value;
}
function millis(value: string | null | undefined) {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}
function tone(value: string | null | undefined) {
  const status = (value ?? '').toLowerCase();
  if (['observed', 'imported', 'operational', 'available', 'accepted', 'verified', 'active', 'canonical', 'approved', 'released', 'closed', 'win'].includes(status)) return 'ok';
  if (['derived', 'thin', 'declared', 'candidate', 'registered', 'ready', 'planning', 'policy_check', 'executing', 'evidence_pending', 'verifying', 'proposed', 'waiting_evidence', 'inferred', 'extracted', 'inconclusive', 'pending'].includes(status)) return 'warn';
  if (['degraded', 'conflicted', 'blocked', 'error', 'blocking', 'rejected', 'loss'].includes(status)) return 'bad';
  return 'idle';
}
function statusLabel(status: string, context: StatusContext = 'ESTADO') {
  return `${context} · ${status.toUpperCase()}`;
}
function systemStatusContext(id: string): StatusContext {
  if (id.startsWith('mihm-') && id !== 'mihm-llm-providers') return 'CLASE';
  return 'SALUD';
}
function systemCountLabel(id: string, value: number | null) {
  if (value === null) return undefined;
  if (id === 'governance' || id === 'predictive') return `${value} abiertos`;
  if (id === 'neural-graph') return `${value} nodos`;
  if (id === 'cognitive-runtime') return `${value} agentes`;
  if (id === 'cognitive-twin') return `${value} registros`;
  if (id === 'evidence') return `${value} objetos`;
  if (id === 'amv') return `${value} registros`;
  return `${value} registros`;
}
function sel(input: {
  kind: string;
  id: string;
  title: string;
  source: string;
  observedAt?: string | null;
  evidenceIds?: string[];
  warning?: string | null;
  data: unknown;
}): RootSelection {
  return {
    kind: input.kind,
    id: input.id,
    title: input.title,
    source: input.source,
    observedAt: input.observedAt ?? null,
    confidence: null,
    evidenceIds: input.evidenceIds ?? [],
    warning: input.warning ?? null,
    data: input.data,
  };
}
function compactWarning(value: string) {
  if (value.length <= 520) return value;
  const timeouts = [...value.matchAll(/\b([a-z0-9_]+_timeout)\b/gi)].map((match) => match[1]);
  const constraints = [...value.matchAll(/(?:violates|unique constraint) "([^"]+)"/g)].map((match) => match[1]);
  const missingColumns = [...value.matchAll(/column ([a-z0-9_.]+) does not exist/gi)].map((match) => match[1]);
  const timeoutSummary = [...new Set(timeouts)].slice(0, 8).join(', ');
  const constraintSummary = [...new Set(constraints)].join(', ');
  const columnSummary = [...new Set(missingColumns)].join(', ');
  return `${value.slice(0, 280)}…${timeoutSummary ? ` · TIMEOUTS: ${timeoutSummary}` : ''}${columnSummary ? ` · COLUMNAS: ${columnSummary}` : ''}${constraintSummary ? ` · CONSTRAINTS: ${constraintSummary}` : ''}`;
}

function Panel({ id, module, label, status, statusContext = 'ESTADO', source, width = 'm', children, onOpen }: PanelProps) {
  return <section id={id} className={`row-panel pw-${width} ${onOpen ? 'is-clickable' : ''}`} onClick={onOpen}>
    <header><div><b>{module}</b><span>{label}</span></div>{status ? <em data-tone={tone(status)}>{statusLabel(status, statusContext)}</em> : null}</header>
    <div className="row-panel-body">{children}</div>
    {source ? <footer>fuente: <strong>{source}</strong></footer> : null}
  </section>;
}

function Rows({ rows }: { rows: LiveRow[] }) {
  return <div className="live-list">
    {rows.length ? rows.map((row, index) => <button key={`${row.name}-${index}`} type="button" onClick={(event) => { event.stopPropagation(); row.onClick?.(); }}>
      <span>{row.name}{row.sub ? <small>{row.sub}</small> : null}</span>
      {row.status ? <i data-tone={tone(row.status)}>{statusLabel(row.status, row.statusContext)}</i> : null}
    </button>) : <p className="empty">MISSING · no hay registros persistidos para este panel.</p>}
  </div>;
}

function graphDegrees(nodes: RootEvidenceNode[], edges: RootEvidenceEdge[]) {
  const degree = new Map(nodes.map((node) => [node.id, 0]));
  edges.forEach((edge) => {
    degree.set(edge.from, (degree.get(edge.from) ?? 0) + 1);
    degree.set(edge.to, (degree.get(edge.to) ?? 0) + 1);
  });
  return degree;
}

function graphLevels(anchor: string | null, nodes: RootEvidenceNode[], edges: RootEvidenceEdge[]) {
  const levels = new Map<string, number>();
  if (!anchor) return levels;
  const adjacency = new Map<string, string[]>();
  edges.forEach((edge) => {
    adjacency.set(edge.from, [...(adjacency.get(edge.from) ?? []), edge.to]);
    adjacency.set(edge.to, [...(adjacency.get(edge.to) ?? []), edge.from]);
  });
  const queue = [anchor];
  levels.set(anchor, 0);
  while (queue.length) {
    const current = queue.shift()!;
    const nextLevel = (levels.get(current) ?? 0) + 1;
    for (const neighbor of adjacency.get(current) ?? []) {
      if (levels.has(neighbor)) continue;
      levels.set(neighbor, nextLevel);
      queue.push(neighbor);
    }
  }
  const maxLevel = Math.max(0, ...levels.values());
  nodes.forEach((node) => { if (!levels.has(node.id)) levels.set(node.id, maxLevel + 1); });
  return levels;
}

function EvidenceGraph({ state, onSelect }: { state: RootSovereignState; onSelect: (selection: RootSelection) => void }) {
  const allNodes = state.evidence.data.nodes;
  const allEdges = state.evidence.data.edges;
  const timeline = useMemo(() => Array.from(new Set(allNodes.map((node) => node.observedAt).filter((value): value is string => Boolean(value) && millis(value) > 0))).sort((a, b) => millis(a) - millis(b)), [allNodes]);
  const [cursor, setCursor] = useState(Math.max(0, timeline.length - 1));
  const [focusId, setFocusId] = useState<string | null>(null);
  const [depth, setDepth] = useState<1 | 2 | 3 | 'all'>(2);

  useEffect(() => { setCursor(Math.max(0, timeline.length - 1)); }, [timeline.length]);
  const cutoff = timeline[Math.min(cursor, Math.max(0, timeline.length - 1))] ?? state.generatedAt;
  const cutoffMs = millis(cutoff) || Date.now();
  const timeNodes = useMemo(() => allNodes.filter((node) => !node.observedAt || millis(node.observedAt) <= cutoffMs), [allNodes, cutoffMs]);
  const timeIds = useMemo(() => new Set(timeNodes.map((node) => node.id)), [timeNodes]);
  const timeEdges = useMemo(() => allEdges.filter((edge) => timeIds.has(edge.from) && timeIds.has(edge.to) && (!edge.observedAt || millis(edge.observedAt) <= cutoffMs)), [allEdges, timeIds, cutoffMs]);
  const degrees = useMemo(() => graphDegrees(timeNodes, timeEdges), [timeNodes, timeEdges]);
  const anchor = focusId && timeIds.has(focusId) ? focusId : [...timeNodes].sort((a, b) => (degrees.get(b.id) ?? 0) - (degrees.get(a.id) ?? 0))[0]?.id ?? null;
  const levels = useMemo(() => graphLevels(anchor, timeNodes, timeEdges), [anchor, timeNodes, timeEdges]);
  const maxDepth = depth === 'all' ? Number.POSITIVE_INFINITY : depth;
  const displayNodes = useMemo(() => timeNodes.filter((node) => (levels.get(node.id) ?? Number.POSITIVE_INFINITY) <= maxDepth).sort((a, b) => (levels.get(a.id) ?? 99) - (levels.get(b.id) ?? 99) || (degrees.get(b.id) ?? 0) - (degrees.get(a.id) ?? 0)).slice(0, 72), [timeNodes, levels, maxDepth, degrees]);
  const displayIds = useMemo(() => new Set(displayNodes.map((node) => node.id)), [displayNodes]);
  const displayEdges = useMemo(() => timeEdges.filter((edge) => displayIds.has(edge.from) && displayIds.has(edge.to)).slice(0, 160), [timeEdges, displayIds]);
  const points = useMemo(() => {
    const byLevel = new Map<number, RootEvidenceNode[]>();
    displayNodes.forEach((node) => {
      const level = levels.get(node.id) ?? 0;
      byLevel.set(level, [...(byLevel.get(level) ?? []), node]);
    });
    const map = new Map<string, { x: number; y: number }>();
    for (const [level, nodes] of byLevel.entries()) {
      if (level === 0) { nodes.forEach((node) => map.set(node.id, { x: 50, y: 50 })); continue; }
      const radius = Math.min(43, 11 + level * 12);
      nodes.sort((a, b) => (degrees.get(b.id) ?? 0) - (degrees.get(a.id) ?? 0) || a.label.localeCompare(b.label));
      nodes.forEach((node, index) => {
        const angle = -Math.PI / 2 + (index / Math.max(1, nodes.length)) * Math.PI * 2 + level * 0.37;
        map.set(node.id, { x: 50 + Math.cos(angle) * radius, y: 50 + Math.sin(angle) * radius });
      });
    }
    return map;
  }, [displayNodes, levels, degrees]);
  const anchorNode = displayNodes.find((node) => node.id === anchor) ?? null;

  return <div className="evidence-graph-live" onClick={(event) => event.stopPropagation()}>
    <div className="graph-controls">
      <span>{state.evidence.data.objects.length} OBJ · {displayNodes.length}/{timeNodes.length} N · {displayEdges.length}/{timeEdges.length} E</span>
      <div>{([1, 2, 3, 'all'] as const).map((value) => <button type="button" key={String(value)} className={depth === value ? 'active' : ''} onClick={() => setDepth(value)}>{value === 'all' ? 'TODO' : `${value} SALTO${value > 1 ? 'S' : ''}`}</button>)}</div>
      <button type="button" onClick={() => setFocusId(null)}>AUTOFOCO</button>
    </div>
    <svg className="graph-svg" viewBox="0 0 100 100" role="img" aria-label="Grafo relacional de evidencia persistida">
      <defs><marker id="root-evidence-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" /></marker></defs>
      {displayEdges.map((edge) => {
        const from = points.get(edge.from);
        const to = points.get(edge.to);
        if (!from || !to) return null;
        const highlight = edge.from === anchor || edge.to === anchor;
        return <g key={edge.id} className={highlight ? 'edge-focus' : ''}>
          <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} markerEnd="url(#root-evidence-arrow)" />
          {highlight ? <text className="edge-label" x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 1}>{edge.relation.slice(0, 34)}</text> : null}
        </g>;
      })}
      {displayNodes.map((node) => {
        const point = points.get(node.id);
        if (!point) return null;
        const focused = node.id === anchor;
        return <g key={node.id} className={focused ? 'node-focus' : ''} onClick={(event) => {
          event.stopPropagation();
          setFocusId(node.id);
          onSelect(sel({ kind: 'evidence-node', id: node.id, title: node.label, source: node.source, observedAt: node.observedAt, evidenceIds: node.evidenceIds, data: { ...node.payload, nodeType: node.type, epistemicClass: node.epistemicClass, confidence: node.confidence, lineage: node.lineage, degree: degrees.get(node.id) ?? 0 } }));
        }}>
          <circle cx={point.x} cy={point.y} r={focused ? 3.1 : Math.min(2.4, 1.35 + (degrees.get(node.id) ?? 0) * .09)} data-tone={tone(node.epistemicClass)} />
          <text x={point.x} y={point.y + (focused ? 5.6 : 4)}>{node.label.slice(0, focused ? 28 : 17)}</text>
          <title>{`${node.label}\n${node.type} · ${node.epistemicClass}\n${degrees.get(node.id) ?? 0} relaciones\n${when(node.observedAt)}`}</title>
        </g>;
      })}
      {!displayNodes.length ? <text x="50" y="50" textAnchor="middle" className="graph-empty">MISSING</text> : null}
    </svg>
    <div className="graph-timeline">
      <span>{anchorNode ? `FOCO · ${anchorNode.label}` : 'SIN FOCO'}</span>
      <input aria-label="Mover el grafo de evidencia longitudinalmente" type="range" min={0} max={Math.max(0, timeline.length - 1)} value={Math.min(cursor, Math.max(0, timeline.length - 1))} onChange={(event) => { setCursor(Number(event.target.value)); setFocusId(null); }} disabled={!timeline.length} />
      <span>{when(cutoff)} · corte {timeline.length ? cursor + 1 : 0}/{timeline.length}</span>
    </div>
  </div>;
}

export function RootObservatoryWorkspace({ state, accessMode, actorLabel, refreshing, warning, onRefresh, onSelect, onAction }: {
  state: RootSovereignState;
  accessMode: AccessMode;
  actorLabel: string;
  refreshing: boolean;
  warning: string | null;
  onRefresh: () => void;
  onSelect: (value: RootSelection) => void;
  onAction: (action: RootActionRequest) => void;
}) {
  const [filter, setFilter] = useState<'all' | TopologyId>('all');
  const [clock, setClock] = useState(() => new Date());
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [surface, setSurface] = useState<SurfaceSpec | null>(null);
  const [toolStatus, setToolStatus] = useState<ToolStatus>(null);
  useEffect(() => { const id = window.setInterval(() => setClock(new Date()), 1000); return () => window.clearInterval(id); }, []);

  const phiFact = state.interpretation.facts.find((fact) => fact.id === 'institutional-position');
  const phi = phiFact?.value.match(/([0-9]+(?:\.[0-9]+)?)/)?.[1] ?? '—';
  const agents = state.cognitiveRuntime.data.agents;
  const executed = agents.filter((agent) => agent.status === 'operational').length;
  const capabilities = state.execution.data.capabilities;
  const available = capabilities.filter((capability) => capability.state === 'available').length;
  const evidenceCount = state.evidence.data.objects.length;
  const graphStatus = state.evidence.error ? 'DEGRADED' : state.evidence.data.nodes.length ? (state.evidence.data.nodes.length > 1 && !state.evidence.data.edges.length ? 'DEGRADED' : 'OBSERVED') : 'MISSING';
  const attractor = state.amv.data.attractors[0] ?? null;
  const divergenceCount = state.interpretation.divergences.length;
  const sources = [state.system, state.governance, state.agents, state.predictions, state.amv, state.evidence, state.execution, state.telemetry, state.cognitiveRuntime, state.cognitiveTwin];
  const sourceOk = sources.filter((source) => !source.error).length;
  const hypotheses = [...state.predictions.data.runs, ...state.predictions.data.legacyEntries];
  const recentEvents = state.cognitiveRuntime.data.eventGraph.recentEvents.slice(0, 30);
  const cognitiveTwinRows = [
    ...state.cognitiveTwin.data.memory.map((row) => ({ kind: 'memory', row })),
    ...state.cognitiveTwin.data.decisions.map((row) => ({ kind: 'decision', row })),
    ...state.cognitiveTwin.data.runs.map((row) => ({ kind: 'run', row })),
  ].sort((a, b) => millis(rowDate(b.row)) - millis(rowDate(a.row)));
  const trajectory = [
    ...state.evidence.data.objects.map((row) => ({ kind: 'evidence', row })),
    ...hypotheses.map((row) => ({ kind: 'prediction', row })),
    ...state.predictions.data.outcomes.map((row) => ({ kind: 'outcome', row })),
    ...state.predictions.data.learningEvents.map((row) => ({ kind: 'learning', row })),
    ...state.governance.data.audits.map((row) => ({ kind: 'audit', row })),
  ].sort((a, b) => new Date(rowDate(b.row) ?? 0).valueOf() - new Date(rowDate(a.row) ?? 0).valueOf()).slice(0, 40);

  const governanceOpen = state.governance.data.proposals.filter((row) => !['executed', 'blocked', 'rejected', 'closed'].includes(text(row.status, '').toLowerCase())).length
    + state.governance.data.mutations.filter((row) => !['executed', 'closed', 'rejected'].includes(text(row.status, '').toLowerCase())).length;
  const predictionOpen = state.predictions.data.runs.filter((row) => ['OPEN', 'WAITING_EVIDENCE', 'DUE', 'PROPOSED'].includes(text(row.status, '').toUpperCase())).length
    + state.predictions.data.legacyEntries.filter((row) => !['verified', 'closed', 'falsified'].includes(text(row.estado_observacion, '').toLowerCase())).length;
  const latestEvidenceAt = state.evidence.data.objects.map(rowDate).filter((value): value is string => Boolean(value)).sort((a, b) => millis(b) - millis(a))[0] ?? null;
  const activeAttractors = state.amv.data.attractors.filter((row) => !['archived', 'retired', 'closed'].includes(text(row.status, '').toLowerCase())).length;

  const byFamily = new Map<string, typeof capabilities>();
  for (const capability of capabilities) {
    const family = capability.id === 'daily' || capability.id === 'audit' ? 'OBSERVAR'
      : capability.id === 'evidence' || capability.id === 'amv-ingest' ? 'INTEGRAR'
        : capability.id === 'amv-search' || capability.id === 'graph' ? 'CONSULTAR'
          : capability.id === 'simulation' ? 'MODELAR'
            : capability.id === 'report' || capability.id === 'reports' ? 'REPORTAR'
              : capability.id === 'all' || capability.id === 'institutional-cycle' ? 'ORQUESTAR' : 'GOBERNAR';
    byFamily.set(family, [...(byFamily.get(family) ?? []), capability]);
  }

  const focus = (topology: TopologyId) => filter === 'all' || filter === topology;
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'center' });
  const agentEvidenceIds = (agentId: string) => recentEvents.filter((event) => event.sourceId === agentId && event.eventId).map((event) => event.eventId);
  const relatedFact = (divergenceId: string) => state.interpretation.facts.find((fact) => fact.id === DIVERGENCE_FACT[divergenceId]) ?? null;
  const institutionalEvidence = Array.from(new Set(state.interpretation.facts.flatMap((fact) => fact.evidenceIds)));
  const moduleSpec = MODULES.find((module) => module.id === activeModule) ?? null;

  const openTool = async (tool: ModuleTool) => {
    setToolStatus(null);
    if (tool.kind === 'event') { window.dispatchEvent(new Event(tool.target)); return; }
    if (tool.kind === 'surface') { setSurface({ title: tool.label, href: tool.target }); return; }
    if (accessMode !== 'sovereign') { setToolStatus({ text: 'Esta acción de mantenimiento requiere ROOT soberano.', tone: 'bad' }); return; }
    setToolStatus({ text: `${tool.label} · ejecutando`, tone: 'idle' });
    try {
      const response = await fetch(tool.target, { method: 'POST', credentials: 'include' });
      const body = await response.json().catch(() => null) as Record<string, unknown> | null;
      if (!response.ok || !body?.ok) throw new Error(text(body?.error, `HTTP ${response.status}`));
      const reconciliation = rec(body.reconciliation);
      setToolStatus({ text: `${tool.label} · ${text(reconciliation.canonicalEvidenceObjects, '0')} objetos · ${text(reconciliation.nodesCreated, '0')} nodos · ${text(reconciliation.edgesCreated, '0')} relaciones · ${text(reconciliation.nodesRemoved, '0')} nodos previos retirados · ${Array.isArray(reconciliation.warnings) ? reconciliation.warnings.length : 0} warnings`, tone: Array.isArray(reconciliation.warnings) && reconciliation.warnings.length ? 'idle' : 'ok' });
      onRefresh();
    } catch (error) {
      setToolStatus({ text: error instanceof Error ? error.message : 'No fue posible ejecutar la acción.', tone: 'bad' });
    }
  };

  return <div className="root-observatory">
    <header className="root-hdr">
      <strong>SFI · ROOT</strong><b>ΦSFI <em>{phi}</em></b>
      <span className="hdr-health" data-tone={sourceOk === sources.length ? 'ok' : 'bad'}>FUENTES <i>{sourceOk}/{sources.length}</i></span>
      <span>EVIDENCIA <i>{evidenceCount} OBJ</i></span><span>GRAFO <i data-tone={tone(graphStatus)}>{state.evidence.data.nodes.length}N/{state.evidence.data.edges.length}E · {graphStatus}</i></span>
      <span>COLA <i>{governanceOpen}</i></span><span>PRED <i>{predictionOpen} abiertas · {state.predictions.data.outcomes.length} outcomes</i></span>
      <span>AGENTES <i>{executed}/{agents.length || '—'}</i></span><span>ATR <i>{activeAttractors}</i></span>
      <span className="hdr-evidence-time">ÚLTIMA EVIDENCIA <i>{when(latestEvidenceAt)}</i></span>
      <div className="root-hdr-right"><button type="button" onClick={onRefresh}>{refreshing ? 'ACTUALIZANDO' : 'ACTUALIZAR'}</button><span>{actorLabel} · {accessMode === 'sovereign' ? 'SOVEREIGN' : 'OBSERVER'}</span><time>{clock.toLocaleTimeString('es-MX')}</time></div>
    </header>

    <aside className="root-side">
      <small>TOPOLOGÍA</small>{(['all', 'I', 'II', 'III'] as const).map((topology) => <button key={topology} className={filter === topology ? 'active' : ''} onClick={() => setFilter(topology)}>{topology === 'all' ? 'Ø' : topology}</button>)}
      <small>MÓDULOS</small>{MODULES.map((module) => <button key={module.id} className={activeModule === module.id ? 'active' : ''} onClick={() => { jump(`mod-${module.id}`); setActiveModule((current) => current === module.id ? null : module.id); }}>{module.id}<span>{module.label}{module.tools.length ? ` · ${module.tools.length} herramientas` : ''}</span></button>)}
      <small>SUPERFICIES</small>{ROOT_SURFACES.map((tool) => <button key={tool.code} type="button" className={`surface-code ${tool.code === 'SF' ? 'chat' : ''}`} title={tool.title} onClick={() => void openTool(tool)}>{tool.code}<span>{tool.title}</span></button>)}
    </aside>

    {moduleSpec ? <div className="root-module-menu">
      <header><div><b>{moduleSpec.id}</b><span>{moduleSpec.label}</span></div><button type="button" onClick={() => setActiveModule(null)}>×</button></header>
      <button type="button" onClick={() => { jump(`mod-${moduleSpec.id}`); setActiveModule(null); }}>VER PANEL EN ROOT</button>
      {moduleSpec.tools.map((tool) => <button type="button" key={`${tool.kind}:${tool.target}`} onClick={() => void openTool(tool)}>{tool.label}<small>{tool.kind === 'surface' ? 'FRAME INTERNO' : tool.kind === 'event' ? 'RUNTIME INTERNO' : 'ACCIÓN ACOTADA'}</small></button>)}
      {toolStatus ? <p className="tool-status" data-tone={toolStatus.tone}>{toolStatus.text}</p> : null}
    </div> : null}

    <main className="root-observatory-main">
      {warning ? <div className="root-warning"><b>DEGRADACIÓN DE LECTURA</b><span>{compactWarning(warning)}</span></div> : null}

      <section className={`topology-row ${focus('I') ? '' : 'dim'}`}>
        <header><b>I</b><strong>{TOPOLOGIES.I.title}</strong><em>{TOPOLOGIES.I.question}</em></header>
        <div className="panel-strip">
          <Panel id="mod-01" module="01 · ESTADO INSTITUCIONAL" label="ΦSFI · lectura compuesta" status={phiFact?.status ?? 'missing'} statusContext="MODO" source={phiFact?.source} width="l" onOpen={() => phiFact && onSelect(sel({
            kind: 'institutional-position', id: phiFact.id, title: state.interpretation.headline, source: phiFact.source, observedAt: phiFact.observedAt, evidenceIds: institutionalEvidence, warning: phiFact.warning,
            data: { phiFact, headline: state.interpretation.headline, narrative: state.interpretation.narrative, divergences: state.interpretation.divergences, facts: state.interpretation.facts, sourceHealth: { ok: sourceOk, total: sources.length } },
          }))}>
            <div className="phi-live"><strong>{phi}</strong><span>{state.interpretation.headline}</span><small>{sourceOk}/{sources.length} fuentes sin error · {divergenceCount} divergencias · {when(state.generatedAt)}</small></div>
          </Panel>

          <Panel id="mod-02" module="02 · SISTEMA" label="Salud de superficies" status={state.system.error ? 'degraded' : state.system.dataClass} statusContext="SALUD" source={state.system.source}>
            <Rows rows={state.system.data.matrix.map((item) => ({ name: item.label, sub: systemCountLabel(item.id, item.openItems.value), status: item.state.status, statusContext: systemStatusContext(item.id), onClick: () => onSelect(sel({ kind: 'system-item', id: item.id, title: item.label, source: item.state.source, observedAt: item.state.observedAt, evidenceIds: item.state.evidenceIds, warning: item.state.warning, data: item })) }))} />
          </Panel>

          <Panel id="mod-03" module="03 · IDENTIDAD" label="Sesión / autoridad" status="observed" statusContext="ESTADO" source="server user context"><Rows rows={[{ name: actorLabel, sub: accessMode === 'sovereign' ? 'ROOT · SOVEREIGN' : 'ROOT · OBSERVER', status: 'observed', statusContext: 'ESTADO' }]} /></Panel>

          <Panel id="mod-institution" module="01a · INSTITUCIONALIZACIÓN" label="Founder dependency / transferencia" status="declared" statusContext="CLASE" source="FEP-01 + Cognitive Twin memory" width="l"><div className="intake-live"><p>Observa dónde SFI todavía depende del fundador, separa criterio transferible de autoridad reservada y exige reproducción antes de declarar capacidad institucional.</p><button type="button" onClick={() => setSurface({ title: 'INSTITUCIONALIZACIÓN', href: '/root/institutionalization' })}>ABRIR INSTITUTIONALIZATION →</button><button type="button" onClick={() => setSurface({ title: 'REPORTES DE AGENTES', href: '/root/reports' })}>LEER REPORTES DE AGENTES →</button></div></Panel>

          <Panel id="mod-04-chat" module="04a · SFI" label="Chat / mantenimiento contextual" status="available" statusContext="ESTADO" source="Friccionauta + Cognitive Twin" width="l"><div className="chat-root-panel"><p>El chat con SFI permanece disponible. La evidencia se agrega desde el nodo/hipótesis/atractor seleccionado; el intake global deja de ocupar este espacio.</p><button type="button" onClick={() => window.dispatchEvent(new Event('sfi:open-friccionauta'))}>ABRIR CHAT CON SFI →</button>{accessMode === 'sovereign' ? <button type="button" onClick={() => void openTool({ label: 'RECONCILIAR GRAFO', kind: 'api', target: '/api/root/evidence/reconcile' })}>RECONCILIAR GRAFO PERSISTIDO →</button> : null}<small>Leer ROOT no ejecuta reconciliación. La reconciliación reconstruye una proyección canónica; no duplica una evidencia por cada tabla que la persiste.</small></div></Panel>

          <Panel id="mod-10" module="10 · GOBERNANZA" label="Capacidades ejecutables" status={state.execution.error ? 'degraded' : state.execution.dataClass} statusContext="SALUD" source={state.execution.source} width="l"><div className="cap-groups">{[...byFamily.entries()].map(([family, items]) => <div key={family}><b>{family}</b>{items.map((capability) => <button key={capability.id} type="button" data-tone={tone(capability.state)} onClick={(event) => { event.stopPropagation(); onAction({ id: capability.id, label: capability.label, effect: capability.description, target: capability.endpoint ?? capability.id, endpoint: capability.endpoint, method: 'POST' }); }}>{capability.label}<i>{statusLabel(capability.state, 'ESTADO')}</i></button>)}</div>)}</div></Panel>
        </div>
      </section>

      <section className={`topology-row ${focus('II') ? '' : 'dim'}`}>
        <header><b>II</b><strong>{TOPOLOGIES.II.title}</strong><em>{TOPOLOGIES.II.question}</em></header>
        <div className="panel-strip">
          <Panel id="mod-04" module="04 · EVIDENCIA" label="Grafo canónico relacional / longitudinal" status={graphStatus} statusContext="SALUD" source={state.evidence.source} width="xl"><EvidenceGraph state={state} onSelect={onSelect} /></Panel>
          <Panel id="mod-05" module="05 · RUNTIME" label={`${agents.length} agentes`} status={state.cognitiveRuntime.data.status} statusContext="SALUD" source={state.cognitiveRuntime.source} width="l"><Rows rows={agents.map((agent) => ({ name: agent.name, sub: `${agent.layer} · ${agent.domain}`, status: agent.status, statusContext: 'ESTADO', onClick: () => onSelect(sel({ kind: 'agent', id: agent.id, title: agent.name, source: state.cognitiveRuntime.source, observedAt: state.cognitiveRuntime.observedAt, evidenceIds: agentEvidenceIds(agent.id), data: agent })) }))} /></Panel>
          <Panel id="mod-06" module="06 · COGNITIVE TWIN" label="Memoria / decisiones / ejecuciones" status={state.cognitiveTwin.error ? 'degraded' : state.cognitiveTwin.dataClass} statusContext="ESTADO" source={state.cognitiveTwin.source}><Rows rows={cognitiveTwinRows.slice(0, 20).map((item, index) => {
            const content = rec(item.row.content);
            const title = text(content.title ?? content.statement ?? content.summary ?? item.row.general_rule ?? item.row.situation ?? item.row.objective ?? item.row.memory_key ?? item.row.decision_id ?? item.row.task_id, `${item.kind} ${index + 1}`);
            return { name: title, sub: `${item.kind.toUpperCase()} · ${when(rowDate(item.row))}`, status: text(item.row.status, item.kind === 'memory' ? 'candidate' : 'observed'), statusContext: item.kind === 'run' ? 'ESTADO' as const : 'CLASE' as const, onClick: () => onSelect(sel({ kind: `cognitive-twin-${item.kind}`, id: rid(item.row, `ct-${item.kind}-${index}`), title, source: state.cognitiveTwin.source, observedAt: rowDate(item.row), evidenceIds: strings(item.row.evidence_refs), data: item.row })) };
          })} /></Panel>
          <Panel id="mod-07" module="07 · PROYECCIÓN" label="Prediction Outcome · ramas longitudinales" status={state.predictions.error ? 'degraded' : state.predictions.dataClass} statusContext="SALUD" source={state.predictions.source} width="xl"><PredictionOutcomeTree state={state} onSelect={onSelect} /></Panel>
          <Panel id="mod-08" module="08 · ATRACTORES" label="Campo dinámico / longitudinal" status={attractor ? text(attractor.status, 'declared') : 'missing'} statusContext="CLASE" source={state.amv.source} width="xl"><DynamicAttractorField state={state} onSelect={onSelect} /></Panel>
        </div>
      </section>

      <section className={`topology-row ${focus('III') ? '' : 'dim'}`}>
        <header><b>III</b><strong>{TOPOLOGIES.III.title}</strong><em>{TOPOLOGIES.III.question}</em></header>
        <div className="panel-strip">
          <Panel id="mod-09" module="09 · TRAYECTORIA" label="Evidencia → aprendizaje" status={trajectory.length ? 'derived' : 'missing'} statusContext="MODO" source="canonical evidence + prediction + outcome + learning + audit" width="xl"><div className="trajectory-live">{trajectory.map((item, index) => <button key={`${item.kind}-${rid(item.row, String(index))}`} type="button" onClick={(event) => { event.stopPropagation(); onSelect(sel({ kind: item.kind, id: rid(item.row, `${item.kind}-${index}`), title: text(item.row.title ?? item.row.event_name ?? item.row.action ?? item.row.status, item.kind), source: item.kind, observedAt: rowDate(item.row), evidenceIds: strings(item.row.evidence_refs), data: item.row })); }}><time>{when(rowDate(item.row))}</time><i>{item.kind}</i><span>{text(item.row.title ?? item.row.event_name ?? item.row.action ?? item.row.status ?? item.row.learning_state, item.kind)}</span></button>)}</div></Panel>
          <Panel id="mod-09-memory" module="09 · MEMORIA" label="AMV / Cognitive Twin / MIHM" status={state.amv.error || state.cognitiveTwin.error ? 'degraded' : 'observed'} statusContext="SALUD" source="AMV + Cognitive Twin"><div className="metric-cluster"><b>{state.amv.data.memories.length}<small>AMV MEMORY</small></b><b>{text(state.cognitiveTwin.data.counts.memory, '0')}<small>COGNITIVE TWIN</small></b><b>{state.predictions.data.learningEvents.length}<small>LEARNING EVENTS</small></b><b>{state.governance.data.audits.length}<small>AUDITED ACTIONS</small></b></div></Panel>
          <Panel id="mod-10-log" module="10 · GOBERNANZA" label="Bitácora / eventos cognitivos" status={state.governance.error ? 'degraded' : state.governance.dataClass} statusContext="SALUD" source={state.governance.source} width="l"><Rows rows={[
            ...recentEvents.map((event) => ({ name: event.eventName, sub: `${when(event.occurredAt)} · ${event.sourceId ?? 'runtime'}`, status: event.epistemicClass, statusContext: 'CLASE' as const, onClick: () => onSelect(sel({ kind: 'cognitive-event', id: event.eventId, title: event.eventName, source: event.sourceId ?? state.cognitiveRuntime.source, observedAt: event.occurredAt, data: event })) })),
            ...state.governance.data.audits.slice(0, 10).map((row, index) => ({ name: text(row.action, `audit ${index + 1}`), sub: when(rowDate(row)), status: 'observed', statusContext: 'ESTADO' as const, onClick: () => onSelect(sel({ kind: 'audit', id: rid(row, `audit-${index}`), title: text(row.action, 'Audit'), source: state.governance.source, observedAt: rowDate(row), data: row })) })),
          ]} /></Panel>
          <Panel id="mod-10-div" module="10 · GOBERNANZA" label="Divergencias" status={divergenceCount ? 'degraded' : 'observed'} statusContext="SALUD" source="institutional interpretation"><Rows rows={state.interpretation.divergences.map((divergence) => {
            const fact = relatedFact(divergence.id);
            return { name: divergence.title, sub: divergence.observation, status: divergence.status, statusContext: 'SALUD', onClick: () => onSelect(sel({ kind: 'divergence', id: divergence.id, title: divergence.title, source: divergence.source, observedAt: fact?.observedAt ?? state.generatedAt, evidenceIds: fact?.evidenceIds ?? [], warning: fact?.warning ?? null, data: { ...divergence, relatedFact: fact } })) };
          })} /></Panel>
        </div>
      </section>
    </main>

    {surface ? <div className="root-surface-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSurface(null); }}>
      <section className="root-surface-window" role="dialog" aria-modal="true" aria-label={surface.title}>
        <header><div><span>ROOT · SUPERFICIE INTERNA</span><strong>{surface.title}</strong></div><button type="button" onClick={() => setSurface(null)}>CERRAR</button></header>
        <iframe src={surface.href} title={surface.title} />
      </section>
    </div> : null}
  </div>;
}
