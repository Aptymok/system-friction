'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { RootRow, RootSovereignState } from '@/lib/root/sovereign/rootSovereignState';
import type { RootActionRequest, RootSelection } from './sovereignTypes';
import './root-observatory.css';

type TopologyId = 'I' | 'II' | 'III';
type AccessMode = 'sovereign' | 'observer';

type PanelProps = {
  id: string;
  module: string;
  label: string;
  status?: string;
  source?: string;
  width?: 's' | 'm' | 'l' | 'xl';
  children: React.ReactNode;
  onOpen?: () => void;
};

const TOPOLOGIES: Record<TopologyId, { title: string; question: string }> = {
  I: { title: 'SISTEMA', question: '¿Qué existe y qué responde?' },
  II: { title: 'CAMPO COGNITIVO', question: '¿Qué está comprendiendo SFI y qué podría hacer?' },
  III: { title: 'TRAYECTORIA', question: '¿Qué cambió y qué aprendimos?' },
};

const MODULES = [
  ['01', 'Estado Institucional'], ['02', 'Sistema / Infraestructura'], ['03', 'Identidad / Autoridad'],
  ['04', 'Evidencia / Grafo'], ['05', 'Cognitive Runtime'], ['06', 'Cognitive Twin'], ['07', 'Proyección / Predicción'],
  ['08', 'Atractores / PPOI'], ['09', 'Memoria / Trayectoria'], ['10', 'Gobernanza / Operación'],
] as const;

function text(value: unknown, fallback = '—') { return typeof value === 'string' && value.trim() ? value.trim() : fallback; }
function record(value: unknown): RootRow { return value && typeof value === 'object' && !Array.isArray(value) ? value as RootRow : {}; }
function strings(value: unknown) { return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []; }
function dateLabel(value: string | null | undefined) {
  if (!value) return 'SIN FECHA';
  const d = new Date(value); if (!Number.isFinite(d.valueOf())) return value;
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
}
function statusTone(value: string | null | undefined) {
  const v = (value ?? '').toLowerCase();
  if (['observed', 'operational', 'available', 'accepted', 'verified', 'active'].includes(v)) return 'ok';
  if (['derived', 'thin', 'declared', 'proposed', 'waiting_evidence'].includes(v)) return 'warn';
  if (['degraded', 'conflicted', 'blocked', 'error'].includes(v)) return 'bad';
  return 'idle';
}
function select(input: { kind: string; id: string; title: string; source: string; observedAt?: string | null; evidenceIds?: string[]; warning?: string | null; data: unknown }): RootSelection {
  return { kind: input.kind, id: input.id, title: input.title, source: input.source, observedAt: input.observedAt ?? null, confidence: null, evidenceIds: input.evidenceIds ?? [], warning: input.warning ?? null, data: input.data };
}
function rowDate(row: RootRow) { return text(row.observed_at ?? row.occurred_at ?? row.executed_at ?? row.updated_at ?? row.created_at ?? row.timestamp, '') || null; }
function identityOf(row: RootRow, fallback: string) { return text(row.id ?? row.event_id ?? row.run_id ?? row.node_key ?? row.node_id ?? row.attractor_key ?? row.hypothesis_id, fallback); }

function Panel({ id, module, label, status, source, width = 'm', children, onOpen }: PanelProps) {
  return <section id={id} className={`row-panel pw-${width}`} onClick={onOpen}>
    <header><div><b>{module}</b><span>{label}</span></div>{status ? <em data-tone={statusTone(status)}>{status.toUpperCase()}</em> : null}</header>
    <div className="row-panel-body">{children}</div>
    {source ? <footer>fuente: <strong>{source}</strong></footer> : null}
  </section>;
}

function ListRows({ rows }: { rows: Array<{ name: string; sub?: string; status?: string; onClick?: () => void }> }) {
  return <div className="live-list">{rows.length ? rows.map((row, index) => <button key={`${row.name}-${index}`} type="button" onClick={(e) => { e.stopPropagation(); row.onClick?.(); }}><span>{row.name}{row.sub ? <small>{row.sub}</small> : null}</span>{row.status ? <i data-tone={statusTone(row.status)}>{row.status}</i> : null}</button>) : <p className="empty">MISSING · no hay registros persistidos para este panel.</p>}</div>;
}

function EvidenceGraph({ state, onSelect }: { state: RootSovereignState; onSelect: (s: RootSelection) => void }) {
  const nodes = state.evidence.data.nodes.slice(0, 28);
  const edges = state.evidence.data.edges.slice(0, 64);
  const size = 100;
  const coords = useMemo(() => new Map(nodes.map((n, index) => {
    const a = (index / Math.max(1, nodes.length)) * Math.PI * 2;
    const ring = 28 + (index % 3) * 7;
    return [n.id, { x: 50 + Math.cos(a) * ring, y: 50 + Math.sin(a) * ring }];
  })), [nodes]);
  return <svg className="graph-svg" viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Grafo persistido de evidencia">
    {edges.map((edge) => { const a = coords.get(edge.from); const b = coords.get(edge.to); return a && b ? <line key={edge.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} /> : null; })}
    {nodes.map((node) => { const p = coords.get(node.id)!; return <g key={node.id} onClick={(e) => { e.stopPropagation(); onSelect(select({ kind: 'evidence-node', id: node.id, title: node.label, source: node.source, observedAt: node.observedAt, evidenceIds: node.evidenceIds, data: node.payload })); }}><circle cx={p.x} cy={p.y} r="1.8" data-tone={statusTone(node.epistemicClass)} /><text x={p.x + 2.5} y={p.y + 1}>{node.label.slice(0, 18)}</text></g>; })}
    {!nodes.length ? <text x="50" y="50" textAnchor="middle" className="graph-empty">MISSING</text> : null}
  </svg>;
}

function AttractorField({ state, onSelect }: { state: RootSovereignState; onSelect: (s: RootSelection) => void }) {
  const attractor = state.amv.data.attractors[0] ?? null;
  const vector = record(attractor?.vector);
  const dims = strings(vector.dimensions);
  const supported = new Set(strings(vector.supportedDimensions));
  const contradicted = new Set(strings(vector.contradictedDimensions));
  const missing = new Set(strings(vector.missingDimensions));
  return <div className="attractor-field" onClick={(e) => { e.stopPropagation(); if (attractor) onSelect(select({ kind: 'attractor', id: identityOf(attractor, 'attractor'), title: text(attractor.label ?? attractor.attractor_key, 'Atractor'), source: state.amv.source, observedAt: rowDate(attractor), data: attractor })); }}>
    <div className="living-grid" />
    <div className="attractor-core"><span>{attractor ? text(attractor.label ?? attractor.attractor_key) : 'SIN ATRACTOR DECLARADO'}</span><small>{attractor ? text(attractor.status, 'DECLARED') : 'MISSING'}</small></div>
    {dims.map((d, i) => {
      const a = (i / Math.max(1, dims.length)) * Math.PI * 2;
      const x = 50 + Math.cos(a) * 32; const y = 50 + Math.sin(a) * 32;
      const s = contradicted.has(d) ? 'bad' : supported.has(d) ? 'ok' : missing.has(d) ? 'idle' : 'warn';
      return <span className="orbit-node" data-tone={s} key={d} style={{ left: `${x}%`, top: `${y}%` }} title={d}>{i + 1}</span>;
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

  const phiFact = state.interpretation.facts.find((f) => f.id === 'institutional-position');
  const phi = phiFact?.value?.match(/([0-9]+(?:\.[0-9]+)?)/)?.[1] ?? '—';
  const runtimeAgents = state.cognitiveRuntime.data.agents;
  const executed = runtimeAgents.filter((a) => a.status === 'operational').length;
  const caps = state.execution.data.capabilities;
  const availableCaps = caps.filter((c) => c.state === 'available').length;
  const evidenceCount = state.evidence.data.entries.length + state.evidence.data.ledger.length;
  const graphStatus = state.evidence.error ? 'DEGRADED' : state.evidence.data.nodes.length ? 'OBSERVED' : 'MISSING';
  const attractor = state.amv.data.attractors[0] ?? null;
  const divergences = state.interpretation.divergences.length;

  const sourceRows = [state.system, state.governance, state.agents, state.predictions, state.amv, state.evidence, state.execution, state.telemetry, state.cognitiveRuntime];
  const sourceOk = sourceRows.filter((s) => !s.error).length;
  const hypotheses = [...state.predictions.data.runs, ...state.predictions.data.legacyEntries];
  const recentEvents = state.cognitiveRuntime.data.eventGraph.recentEvents.slice(0, 30);
  const trajectory = [
    ...state.evidence.data.entries.map((r) => ({ kind: 'evidence', row: r })),
    ...hypotheses.map((r) => ({ kind: 'prediction', row: r })),
    ...state.predictions.data.outcomes.map((r) => ({ kind: 'outcome', row: r })),
    ...state.predictions.data.learningEvents.map((r) => ({ kind: 'learning', row: r })),
    ...state.governance.data.audits.map((r) => ({ kind: 'audit', row: r })),
  ].sort((a, b) => new Date(rowDate(b.row) ?? 0).valueOf() - new Date(rowDate(a.row) ?? 0).valueOf()).slice(0, 40);

  const capabilitiesByFamily = new Map<string, typeof caps>();
  for (const cap of caps) {
    const family = cap.id === 'daily' || cap.id === 'audit' ? 'OBSERVAR' : cap.id === 'evidence' || cap.id === 'amv-ingest' ? 'INTEGRAR' : cap.id === 'amv-search' || cap.id === 'graph' ? 'CONSULTAR' : cap.id === 'simulation' ? 'MODELAR' : cap.id === 'report' || cap.id === 'reports' ? 'REPORTAR' : cap.id === 'all' || cap.id === 'institutional-cycle' ? 'ORQUESTAR' : 'GOBERNAR';
    capabilitiesByFamily.set(family, [...(capabilitiesByFamily.get(family) ?? []), cap]);
  }

  const focus = (topology: TopologyId) => filter === 'all' || filter === topology;
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'center' });

  return <div className="root-observatory">
    <header className="root-hdr">
      <strong>SFI · ROOT</strong><span>01 · ESTADO INSTITUCIONAL</span><b>ΦSFI <em>{phi}</em></b>
      <span>AGENTES <i>{executed}/{runtimeAgents.length || '—'}</i></span><span>CAPACIDADES <i>{availableCaps}/{caps.length || '—'}</i></span>
      <span>EVIDENCIA <i>{evidenceCount}</i></span><span>GRAFO <i data-tone={statusTone(graphStatus)}>{graphStatus}</i></span>
      <span>ATRACTOR <i>{attractor ? text(attractor.status, 'DECLARED').toUpperCase() : 'MISSING'}</i></span><span>DIVERGENCIAS <i>{divergences}</i></span>
      <div className="root-hdr-right"><button type="button" onClick={onRefresh}>{refreshing ? 'ACTUALIZANDO' : 'ACTUALIZAR'}</button><span>{actorLabel} · {accessMode === 'sovereign' ? 'SOVEREIGN' : 'OBSERVER'}</span><time>{clock.toLocaleTimeString('es-MX')}</time></div>
    </header>

    <aside className="root-side">
      <small>TOPOLOGÍA</small>{(['all', 'I', 'II', 'III'] as const).map((t) => <button key={t} className={filter === t ? 'active' : ''} onClick={() => setFilter(t)}>{t === 'all' ? 'Ø' : t}</button>)}
      <small>MÓDULOS</small>{MODULES.map(([id, label]) => <button key={id} onClick={() => jump(`mod-${id}`)}>{id}<span>{label}</span></button>)}
      <small>SUPERFICIES</small><Link href="/field">FD</Link><Link href="/field/map">FM</Link><Link href="/studio">ST</Link><Link href="/interface/observatory">OB</Link><Link href="/library">LB</Link>
    </aside>

    <main className="root-observatory-main">
      {warning ? <div className="root-warning">{warning}</div> : null}
      <section className={`topology-row ${focus('I') ? '' : 'dim'}`}><header><b>I</b><strong>{TOPOLOGIES.I.title}</strong><em>{TOPOLOGIES.I.question}</em></header><div className="panel-strip">
        <Panel id="mod-01" module="01 · ESTADO INSTITUCIONAL" label="ΦSFI · interpretación" status={phiFact?.status ?? 'missing'} source={phiFact?.source} width="l" onOpen={() => phiFact && onSelect(select({ kind: 'institutional-fact', id: phiFact.id, title: phiFact.label, source: phiFact.source, observedAt: phiFact.observedAt, evidenceIds: phiFact.evidenceIds, warning: phiFact.warning, data: phiFact }))}><div className="phi-live"><strong>{phi}</strong><span>{state.interpretation.headline}</span><small>{sourceOk}/{sourceRows.length} fuentes sin error · {dateLabel(state.generatedAt)}</small></div></Panel>
        <Panel id="mod-02" module="02 · SISTEMA" label="Salud de superficies" status={state.system.error ? 'degraded' : state.system.dataClass} source={state.system.source} width="m"><ListRows rows={state.system.data.matrix.map((m) => ({ name: m.label, sub: m.openItems.value === null ? undefined : `${m.openItems.value} abiertos`, status: m.state.status, onClick: () => onSelect(select({ kind: 'system-item', id: m.id, title: m.label, source: m.state.source, observedAt: m.state.observedAt, evidenceIds: m.state.evidenceIds, warning: m.state.warning, data: m })) }))} /></Panel>
        <Panel id="mod-03" module="03 · IDENTIDAD" label="Sesión / autoridad" status="observed" source="server user context" width="m"><ListRows rows={[{ name: actorLabel, sub: accessMode === 'sovereign' ? 'ROOT · SOVEREIGN' : 'ROOT · OBSERVER', status: 'observed' }]} /></Panel>
        <Panel id="mod-04-intake" module="04a · EVIDENCIA" label="Evidence Intake" status="observed" source="root_evidence_entries" width="l"><div className="intake-live"><p>Captura evidencia con procedencia explícita. El contenido no se autopromueve a CANONICAL.</p><Link href="/root/evidence/intake">REGISTRAR / VINCULAR EVIDENCIA →</Link></div></Panel>
        <Panel id="mod-10" module="10 · GOBERNANZA" label="Capacidades ejecutables" status={state.execution.error ? 'degraded' : state.execution.dataClass} source={state.execution.source} width="l"><div className="cap-groups">{[...capabilitiesByFamily.entries()].map(([family, items]) => <div key={family}><b>{family}</b>{items.map((cap) => <button key={cap.id} type="button" data-tone={statusTone(cap.state)} onClick={(e) => { e.stopPropagation(); onAction({ id: cap.id, label: cap.label, effect: cap.description, target: cap.endpoint ?? cap.id, endpoint: cap.endpoint, method: 'POST' }); }}>{cap.label}<i>{cap.state}</i></button>)}</div>)}</div></Panel>
      </div></section>

      <section className={`topology-row ${focus('II') ? '' : 'dim'}`}><header><b>II</b><strong>{TOPOLOGIES.II.title}</strong><em>{TOPOLOGIES.II.question}</em></header><div className="panel-strip">
        <Panel id="mod-04" module="04 · EVIDENCIA" label="Grafo de evidencia" status={graphStatus} source={state.evidence.source} width="l"><EvidenceGraph state={state} onSelect={onSelect} /></Panel>
        <Panel id="mod-05" module="05 · RUNTIME" label={`${runtimeAgents.length} agentes`} status={state.cognitiveRuntime.data.status} source={state.cognitiveRuntime.source} width="l"><ListRows rows={runtimeAgents.map((a) => ({ name: a.name, sub: `${a.layer} · ${a.domain}`, status: a.status, onClick: () => onSelect(select({ kind: 'agent', id: a.id, title: a.name, source: state.cognitiveRuntime.source, observedAt: state.cognitiveRuntime.observedAt, evidenceIds: a.evidence.map((e) => e.id), data: a })) }))} /></Panel>
        <Panel id="mod-06" module="06 · COGNITIVE TWIN" label="Hipótesis / contradicciones" status={hypotheses.length ? 'derived' : 'missing'} source={state.predictions.source} width="m"><ListRows rows={hypotheses.slice(0, 20).map((r, i) => ({ name: text(r.title ?? r.hypothesis ?? r.status, `Hipótesis ${i + 1}`), sub: text(r.learning_state ?? r.status, ''), status: text(r.epistemic_class ?? r.status, 'derived'), onClick: () => onSelect(select({ kind: 'hypothesis', id: identityOf(r, `hyp-${i}`), title: text(r.title ?? r.hypothesis, `Hipótesis ${i + 1}`), source: state.predictions.source, observedAt: rowDate(r), evidenceIds: strings(r.evidence_refs), data: r })) }))} /></Panel>
        <Panel id="mod-07" module="07 · PROYECCIÓN" label="Predicción / outcome" status={state.predictions.error ? 'degraded' : state.predictions.dataClass} source={state.predictions.source} width="m"><div className="metric-cluster"><b>{state.predictions.data.runs.length + state.predictions.data.legacyEntries.length}<small>PREDICCIONES</small></b><b>{state.predictions.data.outcomes.length}<small>OUTCOMES</small></b><b>{state.predictions.data.learningEvents.length}<small>LEARNING</small></b></div></Panel>
        <Panel id="mod-08" module="08 · ATRACTORES" label="Campo institucional" status={attractor ? text(attractor.status, 'declared') : 'missing'} source={state.amv.source} width="xl"><AttractorField state={state} onSelect={onSelect} /></Panel>
      </div></section>

      <section className={`topology-row ${focus('III') ? '' : 'dim'}`}><header><b>III</b><strong>{TOPOLOGIES.III.title}</strong><em>{TOPOLOGIES.III.question}</em></header><div className="panel-strip">
        <Panel id="mod-09" module="09 · TRAYECTORIA" label="Evidencia → aprendizaje" status={trajectory.length ? 'derived' : 'missing'} source="evidence + prediction + outcome + learning + audit" width="xl"><div className="trajectory-live">{trajectory.map((item, i) => <button key={`${item.kind}-${identityOf(item.row, String(i))}`} type="button" onClick={(e) => { e.stopPropagation(); onSelect(select({ kind: item.kind, id: identityOf(item.row, `${item.kind}-${i}`), title: text(item.row.title ?? item.row.event_name ?? item.row.action ?? item.row.status, item.kind), source: item.kind, observedAt: rowDate(item.row), evidenceIds: strings(item.row.evidence_refs), data: item.row })); }}><time>{dateLabel(rowDate(item.row))}</time><i>{item.kind}</i><span>{text(item.row.title ?? item.row.event_name ?? item.row.action ?? item.row.status ?? item.row.learning_state, item.kind)}</span></button>)}</div></Panel>
        <Panel id="mod-09-memory" module="09 · MEMORIA" label="AMV / MIHM" status={state.amv.error ? 'degraded' : state.amv.dataClass} source={state.amv.source} width="m"><div className="metric-cluster"><b>{state.amv.data.memories.length}<small>AMV MEMORY</small></b><b>{state.predictions.data.learningEvents.length}<small>LEARNING EVENTS</small></b><b>{state.governance.data.audits.length}<small>AUDITED ACTIONS</small></b></div></Panel>
        <Panel id="mod-10-log" module="10 · GOBERNANZA" label="Bitácora / eventos cognitivos" status={state.governance.error ? 'degraded' : state.governance.dataClass} source={state.governance.source} width="l"><ListRows rows={[...recentEvents.map((e) => ({ name: e.eventName, sub: `${dateLabel(e.occurredAt)} · ${e.sourceId ?? 'runtime'}`, status: e.epistemicClass, onClick: () => onSelect(select({ kind: 'cognitive-event', id: e.eventId, title: e.eventName, source: e.sourceId ?? state.cognitiveRuntime.source, observedAt: e.occurredAt, data: e })) })), ...state.governance.data.audits.slice(0, 10).map((r, i) => ({ name: text(r.action, `audit ${i + 1}`), sub: dateLabel(rowDate(r)), status: 'observed', onClick: () => onSelect(select({ kind: 'audit', id: identityOf(r, `audit-${i}`), title: text(r.action, 'Audit'), source: state.governance.source, observedAt: rowDate(r), data: r })) }))]} /></Panel>
        <Panel id="mod-10-div" module="10 · GOBERNANZA" label="Divergencias" status={divergences ? 'degraded' : 'observed'} source="institutional interpretation" width="m"><ListRows rows={state.interpretation.divergences.map((d) => ({ name: d.title, sub: d.observation, status: d.status, onClick: () => onSelect(select({ kind: 'divergence', id: d.id, title: d.title, source: d.source, data: d })) }))} /></Panel>
      </div></section>
    </main>
  </div>;
}
