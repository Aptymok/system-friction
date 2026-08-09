'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { RootRow, RootSovereignState } from '@/lib/root/sovereign/rootSovereignState';
import type { RootActionRequest, RootSelection } from './sovereignTypes';
import './root-observatory.css';

type TopologyId = 'I' | 'II' | 'III';
type AccessMode = 'sovereign' | 'observer';
type StatusContext = 'CLASE' | 'SALUD' | 'ESTADO';
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

const TOPOLOGIES: Record<TopologyId, { title: string; question: string }> = {
  I: { title: 'SISTEMA', question: '¿Qué existe y qué responde?' },
  II: { title: 'CAMPO COGNITIVO', question: '¿Qué está comprendiendo SFI y qué podría hacer?' },
  III: { title: 'TRAYECTORIA', question: '¿Qué cambió y qué aprendimos?' },
};

const MODULES = [
  ['01', 'Estado Institucional'], ['02', 'Sistema / Infraestructura'], ['03', 'Identidad / Autoridad'], ['04', 'Evidencia / Grafo'], ['05', 'Cognitive Runtime'],
  ['06', 'Cognitive Twin'], ['07', 'Proyección / Predicción'], ['08', 'Atractores / PPOI'], ['09', 'Memoria / Trayectoria'], ['10', 'Gobernanza / Operación'],
] as const;

const DIVERGENCE_FACT: Record<string, string> = {
  'reader-errors': 'source-health',
  'cognitive-continuity': 'cognitive-execution',
  'graph-traceability': 'traceability',
  'capability-gap': 'execution-capability',
  'attractor-reader-gap': 'institutional-attractor',
  'institutional-position-gap': 'institutional-position',
};

function text(value: unknown, fallback = '—') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}
function rec(value: unknown): RootRow {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as RootRow : {};
}
function strings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}
function rowDate(row: RootRow) {
  return text(row.observed_at ?? row.occurred_at ?? row.executed_at ?? row.updated_at ?? row.created_at ?? row.timestamp, '') || null;
}
function rid(row: RootRow, fallback: string) {
  return text(row.id ?? row.event_id ?? row.run_id ?? row.node_key ?? row.node_id ?? row.attractor_key ?? row.hypothesis_id, fallback);
}
function when(value: string | null | undefined) {
  if (!value) return 'SIN FECHA';
  const date = new Date(value);
  return Number.isFinite(date.valueOf()) ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(date) : value;
}
function tone(value: string | null | undefined) {
  const status = (value ?? '').toLowerCase();
  if (['observed', 'imported', 'operational', 'available', 'accepted', 'verified', 'active', 'canonical'].includes(status)) return 'ok';
  if (['derived', 'thin', 'declared', 'proposed', 'waiting_evidence', 'inferred', 'extracted'].includes(status)) return 'warn';
  if (['degraded', 'conflicted', 'blocked', 'error', 'blocking', 'rejected'].includes(status)) return 'bad';
  return 'idle';
}
function statusLabel(status: string, context: StatusContext = 'ESTADO') {
  return `${context} · ${status.toUpperCase()}`;
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

function EvidenceGraph({ state, onSelect }: { state: RootSovereignState; onSelect: (selection: RootSelection) => void }) {
  const nodes = state.evidence.data.nodes.slice(0, 28);
  const edges = state.evidence.data.edges.slice(0, 64);
  const points = useMemo(() => new Map(nodes.map((node, index) => {
    const angle = index / Math.max(1, nodes.length) * Math.PI * 2;
    const radius = 28 + (index % 3) * 7;
    return [node.id, { x: 50 + Math.cos(angle) * radius, y: 50 + Math.sin(angle) * radius }] as const;
  })), [nodes]);

  return <svg className="graph-svg" viewBox="0 0 100 100">
    {edges.map((edge) => {
      const from = points.get(edge.from);
      const to = points.get(edge.to);
      return from && to ? <line key={edge.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y} /> : null;
    })}
    {nodes.map((node) => {
      const point = points.get(node.id)!;
      return <g key={node.id} onClick={(event) => {
        event.stopPropagation();
        onSelect(sel({ kind: 'evidence-node', id: node.id, title: node.label, source: node.source, observedAt: node.observedAt, evidenceIds: node.evidenceIds, data: { ...node.payload, epistemicClass: node.epistemicClass, confidence: node.confidence, lineage: node.lineage } }));
      }}>
        <circle cx={point.x} cy={point.y} r="1.8" data-tone={tone(node.epistemicClass)} />
        <text x={point.x + 2.5} y={point.y + 1}>{node.label.slice(0, 18)}</text>
      </g>;
    })}
    {!nodes.length ? <text x="50" y="50" textAnchor="middle" className="graph-empty">MISSING</text> : null}
  </svg>;
}

function AttractorField({ state, onSelect }: { state: RootSovereignState; onSelect: (selection: RootSelection) => void }) {
  const attractor = state.amv.data.attractors[0] ?? null;
  const vector = rec(attractor?.vector);
  const dimensions = strings(vector.dimensions);
  const supported = new Set(strings(vector.supportedDimensions));
  const contradicted = new Set(strings(vector.contradictedDimensions));
  const missing = new Set(strings(vector.missingDimensions));
  return <div className="attractor-field" onClick={(event) => {
    event.stopPropagation();
    if (attractor) onSelect(sel({ kind: 'attractor', id: rid(attractor, 'attractor'), title: text(attractor.label ?? attractor.attractor_key, 'Atractor'), source: state.amv.source, observedAt: rowDate(attractor), data: attractor }));
  }}>
    <div className="living-grid" />
    <div className="attractor-core"><span>{attractor ? text(attractor.label ?? attractor.attractor_key) : 'SIN ATRACTOR DECLARADO'}</span><small>{attractor ? text(attractor.status, 'DECLARED') : 'MISSING'}</small></div>
    {dimensions.map((dimension, index) => {
      const angle = index / Math.max(1, dimensions.length) * Math.PI * 2;
      const x = 50 + Math.cos(angle) * 32;
      const y = 50 + Math.sin(angle) * 32;
      const status = contradicted.has(dimension) ? 'bad' : supported.has(dimension) ? 'ok' : missing.has(dimension) ? 'idle' : 'warn';
      return <span className="orbit-node" data-tone={status} key={dimension} style={{ left: `${x}%`, top: `${y}%` }} title={dimension}>{index + 1}</span>;
    })}
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
  useEffect(() => { const id = window.setInterval(() => setClock(new Date()), 1000); return () => window.clearInterval(id); }, []);

  const phiFact = state.interpretation.facts.find((fact) => fact.id === 'institutional-position');
  const phi = phiFact?.value.match(/([0-9]+(?:\.[0-9]+)?)/)?.[1] ?? '—';
  const agents = state.cognitiveRuntime.data.agents;
  const executed = agents.filter((agent) => agent.status === 'operational').length;
  const capabilities = state.execution.data.capabilities;
  const available = capabilities.filter((capability) => capability.state === 'available').length;
  const evidenceCount = state.evidence.data.entries.length + state.evidence.data.ledger.length;
  const graphStatus = state.evidence.error ? 'DEGRADED' : state.evidence.data.nodes.length ? 'OBSERVED' : 'MISSING';
  const attractor = state.amv.data.attractors[0] ?? null;
  const divergenceCount = state.interpretation.divergences.length;
  const sources = [state.system, state.governance, state.agents, state.predictions, state.amv, state.evidence, state.execution, state.telemetry, state.cognitiveRuntime];
  const sourceOk = sources.filter((source) => !source.error).length;
  const hypotheses = [...state.predictions.data.runs, ...state.predictions.data.legacyEntries];
  const recentEvents = state.cognitiveRuntime.data.eventGraph.recentEvents.slice(0, 30);
  const trajectory = [
    ...state.evidence.data.entries.map((row) => ({ kind: 'evidence', row })),
    ...hypotheses.map((row) => ({ kind: 'prediction', row })),
    ...state.predictions.data.outcomes.map((row) => ({ kind: 'outcome', row })),
    ...state.predictions.data.learningEvents.map((row) => ({ kind: 'learning', row })),
    ...state.governance.data.audits.map((row) => ({ kind: 'audit', row })),
  ].sort((a, b) => new Date(rowDate(b.row) ?? 0).valueOf() - new Date(rowDate(a.row) ?? 0).valueOf()).slice(0, 40);

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

  return <div className="root-observatory">
    <header className="root-hdr">
      <strong>SFI · ROOT</strong><span>01 · ESTADO INSTITUCIONAL</span><b>ΦSFI <em>{phi}</em></b>
      <span>AGENTES <i>{executed}/{agents.length || '—'}</i></span><span>CAPACIDADES <i>{available}/{capabilities.length || '—'}</i></span><span>EVIDENCIA <i>{evidenceCount}</i></span>
      <span>GRAFO <i data-tone={tone(graphStatus)}>{graphStatus}</i></span><span>ATRACTOR <i>{attractor ? text(attractor.status, 'DECLARED').toUpperCase() : 'MISSING'}</i></span><span>DIVERGENCIAS <i>{divergenceCount}</i></span>
      <div className="root-hdr-right"><button type="button" onClick={onRefresh}>{refreshing ? 'ACTUALIZANDO' : 'ACTUALIZAR'}</button><span>{actorLabel} · {accessMode === 'sovereign' ? 'SOVEREIGN' : 'OBSERVER'}</span><time>{clock.toLocaleTimeString('es-MX')}</time></div>
    </header>

    <aside className="root-side">
      <small>TOPOLOGÍA</small>{(['all', 'I', 'II', 'III'] as const).map((topology) => <button key={topology} className={filter === topology ? 'active' : ''} onClick={() => setFilter(topology)}>{topology === 'all' ? 'Ø' : topology}</button>)}
      <small>MÓDULOS</small>{MODULES.map(([id, label]) => <button key={id} onClick={() => jump(`mod-${id}`)}>{id}<span>{label}</span></button>)}
      <small>SUPERFICIES</small><Link href="/root/institutionalization" title="Institutionalization">IN</Link><Link href="/root/reports" title="Reportes de agentes">RP</Link><Link href="/field">FD</Link><Link href="/field/map">FM</Link><Link href="/studio">ST</Link><Link href="/interface/observatory">OB</Link><Link href="/library">LB</Link>
    </aside>

    <main className="root-observatory-main">
      {warning ? <div className="root-warning">{warning}</div> : null}

      <section className={`topology-row ${focus('I') ? '' : 'dim'}`}>
        <header><b>I</b><strong>{TOPOLOGIES.I.title}</strong><em>{TOPOLOGIES.I.question}</em></header>
        <div className="panel-strip">
          <Panel id="mod-01" module="01 · ESTADO INSTITUCIONAL" label="ΦSFI · interpretación" status={phiFact?.status ?? 'missing'} statusContext="CLASE" source={phiFact?.source} width="l" onOpen={() => phiFact && onSelect(sel({
            kind: 'institutional-position', id: phiFact.id, title: state.interpretation.headline, source: phiFact.source, observedAt: phiFact.observedAt, evidenceIds: institutionalEvidence, warning: phiFact.warning,
            data: { phiFact, headline: state.interpretation.headline, narrative: state.interpretation.narrative, divergences: state.interpretation.divergences, facts: state.interpretation.facts, sourceHealth: { ok: sourceOk, total: sources.length } },
          }))}>
            <div className="phi-live"><strong>{phi}</strong><span>{state.interpretation.headline}</span><small>{sourceOk}/{sources.length} fuentes sin error · {divergenceCount} divergencias · {when(state.generatedAt)}</small></div>
          </Panel>

          <Panel id="mod-02" module="02 · SISTEMA" label="Salud de superficies" status={state.system.error ? 'degraded' : state.system.dataClass} statusContext="SALUD" source={state.system.source}>
            <Rows rows={state.system.data.matrix.map((item) => ({ name: item.label, sub: item.openItems.value === null ? undefined : `${item.openItems.value} abiertos`, status: item.state.status, statusContext: 'SALUD', onClick: () => onSelect(sel({ kind: 'system-item', id: item.id, title: item.label, source: item.state.source, observedAt: item.state.observedAt, evidenceIds: item.state.evidenceIds, warning: item.state.warning, data: item })) }))} />
          </Panel>

          <Panel id="mod-03" module="03 · IDENTIDAD" label="Sesión / autoridad" status="observed" statusContext="ESTADO" source="server user context"><Rows rows={[{ name: actorLabel, sub: accessMode === 'sovereign' ? 'ROOT · SOVEREIGN' : 'ROOT · OBSERVER', status: 'observed', statusContext: 'ESTADO' }]} /></Panel>

          <Panel id="mod-institution" module="01a · INSTITUCIONALIZACIÓN" label="Founder dependency / transferencia" status="declared" statusContext="CLASE" source="FEP-01 + Cognitive Twin memory" width="l"><div className="intake-live"><p>Observa dónde SFI todavía depende del fundador, separa criterio transferible de autoridad reservada y exige reproducción antes de declarar capacidad institucional.</p><Link href="/root/institutionalization">ABRIR INSTITUTIONALIZATION →</Link><Link href="/root/reports">LEER REPORTES DE AGENTES →</Link></div></Panel>

          <Panel id="mod-04-intake" module="04a · EVIDENCIA" label="Evidence Intake" status="observed" statusContext="ESTADO" source="root_evidence_entries" width="l"><div className="intake-live"><p>Captura evidencia con procedencia explícita. El contenido no se autopromueve a CANONICAL.</p><Link href="/root/evidence/intake">REGISTRAR / VINCULAR EVIDENCIA →</Link></div></Panel>

          <Panel id="mod-10" module="10 · GOBERNANZA" label="Capacidades ejecutables" status={state.execution.error ? 'degraded' : state.execution.dataClass} statusContext="SALUD" source={state.execution.source} width="l"><div className="cap-groups">{[...byFamily.entries()].map(([family, items]) => <div key={family}><b>{family}</b>{items.map((capability) => <button key={capability.id} type="button" data-tone={tone(capability.state)} onClick={(event) => { event.stopPropagation(); onAction({ id: capability.id, label: capability.label, effect: capability.description, target: capability.endpoint ?? capability.id, endpoint: capability.endpoint, method: 'POST' }); }}>{capability.label}<i>{statusLabel(capability.state, 'ESTADO')}</i></button>)}</div>)}</div></Panel>
        </div>
      </section>

      <section className={`topology-row ${focus('II') ? '' : 'dim'}`}>
        <header><b>II</b><strong>{TOPOLOGIES.II.title}</strong><em>{TOPOLOGIES.II.question}</em></header>
        <div className="panel-strip">
          <Panel id="mod-04" module="04 · EVIDENCIA" label="Grafo de evidencia" status={graphStatus} statusContext="SALUD" source={state.evidence.source} width="l"><EvidenceGraph state={state} onSelect={onSelect} /></Panel>
          <Panel id="mod-05" module="05 · RUNTIME" label={`${agents.length} agentes`} status={state.cognitiveRuntime.data.status} statusContext="SALUD" source={state.cognitiveRuntime.source} width="l"><Rows rows={agents.map((agent) => ({ name: agent.name, sub: `${agent.layer} · ${agent.domain}`, status: agent.status, statusContext: 'ESTADO', onClick: () => onSelect(sel({ kind: 'agent', id: agent.id, title: agent.name, source: state.cognitiveRuntime.source, observedAt: state.cognitiveRuntime.observedAt, evidenceIds: agentEvidenceIds(agent.id), data: agent })) }))} /></Panel>
          <Panel id="mod-06" module="06 · COGNITIVE TWIN" label="Hipótesis / contradicciones" status={hypotheses.length ? 'derived' : 'missing'} statusContext="CLASE" source={state.predictions.source}><Rows rows={hypotheses.slice(0, 20).map((row, index) => ({ name: text(row.title ?? row.hypothesis ?? row.status, `Hipótesis ${index + 1}`), sub: text(row.learning_state ?? row.status, ''), status: text(row.epistemic_class ?? row.status, 'derived'), statusContext: 'CLASE', onClick: () => onSelect(sel({ kind: 'hypothesis', id: rid(row, `hyp-${index}`), title: text(row.title ?? row.hypothesis, `Hipótesis ${index + 1}`), source: state.predictions.source, observedAt: rowDate(row), evidenceIds: strings(row.evidence_refs), data: row })) }))} /></Panel>
          <Panel id="mod-07" module="07 · PROYECCIÓN" label="Predicción / outcome" status={state.predictions.error ? 'degraded' : state.predictions.dataClass} statusContext="SALUD" source={state.predictions.source}><div className="metric-cluster"><b>{state.predictions.data.runs.length + state.predictions.data.legacyEntries.length}<small>PREDICCIONES</small></b><b>{state.predictions.data.outcomes.length}<small>OUTCOMES</small></b><b>{state.predictions.data.learningEvents.length}<small>LEARNING</small></b></div></Panel>
          <Panel id="mod-08" module="08 · ATRACTORES" label="Campo institucional" status={attractor ? text(attractor.status, 'declared') : 'missing'} statusContext="CLASE" source={state.amv.source} width="xl"><AttractorField state={state} onSelect={onSelect} /></Panel>
        </div>
      </section>

      <section className={`topology-row ${focus('III') ? '' : 'dim'}`}>
        <header><b>III</b><strong>{TOPOLOGIES.III.title}</strong><em>{TOPOLOGIES.III.question}</em></header>
        <div className="panel-strip">
          <Panel id="mod-09" module="09 · TRAYECTORIA" label="Evidencia → aprendizaje" status={trajectory.length ? 'derived' : 'missing'} statusContext="CLASE" source="evidence + prediction + outcome + learning + audit" width="xl"><div className="trajectory-live">{trajectory.map((item, index) => <button key={`${item.kind}-${rid(item.row, String(index))}`} type="button" onClick={(event) => { event.stopPropagation(); onSelect(sel({ kind: item.kind, id: rid(item.row, `${item.kind}-${index}`), title: text(item.row.title ?? item.row.event_name ?? item.row.action ?? item.row.status, item.kind), source: item.kind, observedAt: rowDate(item.row), evidenceIds: strings(item.row.evidence_refs), data: item.row })); }}><time>{when(rowDate(item.row))}</time><i>{item.kind}</i><span>{text(item.row.title ?? item.row.event_name ?? item.row.action ?? item.row.status ?? item.row.learning_state, item.kind)}</span></button>)}</div></Panel>
          <Panel id="mod-09-memory" module="09 · MEMORIA" label="AMV / MIHM" status={state.amv.error ? 'degraded' : state.amv.dataClass} statusContext="SALUD" source={state.amv.source}><div className="metric-cluster"><b>{state.amv.data.memories.length}<small>AMV MEMORY</small></b><b>{state.predictions.data.learningEvents.length}<small>LEARNING EVENTS</small></b><b>{state.governance.data.audits.length}<small>AUDITED ACTIONS</small></b></div></Panel>
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
  </div>;
}
