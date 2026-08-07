'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { RootRow, RootSovereignState } from '@/lib/root/sovereign/rootSovereignState';
import type { RootActionRequest, RootSelection } from './sovereignTypes';

type TopologyId = 'I' | 'II' | 'III';

type StreamPoint = {
  id: string;
  label: string;
  kind: string;
  at: string | null;
  status: string;
  source: string;
  evidenceIds: string[];
  data: RootRow;
};

const TOPOLOGIES: Record<TopologyId, { title: string; question: string }> = {
  I: { title: 'SISTEMA', question: '¿Qué existe, qué responde y qué puede ejecutarse ahora?' },
  II: { title: 'CAMPO COGNITIVO', question: '¿Qué está observando, relacionando, proyectando y proponiendo SFI?' },
  III: { title: 'TRAYECTORIA', question: '¿Qué cambió, qué persistió y qué regresó a evidencia?' },
};

function text(value: unknown, fallback = '—') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function date(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.valueOf()) ? parsed.toISOString() : null;
}

function rowDate(value: RootRow) {
  return date(value.observed_at ?? value.occurred_at ?? value.executed_at ?? value.updated_at ?? value.created_at ?? value.timestamp);
}

function displayTime(value: string | null | undefined) {
  if (!value) return 'SIN FECHA';
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.valueOf())) return value;
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
}

function statusClass(value: string) {
  const state = value.toLowerCase();
  if (['operational', 'observed', 'derived', 'available', 'accepted', 'verified'].includes(state)) return 'observed';
  if (['degraded', 'partial', 'conflicted'].includes(state)) return 'degraded';
  if (['gated', 'blocked', 'needs_evidence'].includes(state)) return 'gated';
  return 'missing';
}

function selection(input: { kind: string; id: string; title: string; source: string; observedAt?: string | null; evidenceIds?: string[]; data: RootRow; warning?: string | null }): RootSelection {
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

function SourceRail({ state, onSelect }: { state: RootSovereignState; onSelect: (value: RootSelection) => void }) {
  const sources = [
    ['system', state.system], ['governance', state.governance], ['agents', state.agents], ['predictions', state.predictions],
    ['amv', state.amv], ['evidence', state.evidence], ['execution', state.execution], ['telemetry', state.telemetry], ['cognitive', state.cognitiveRuntime],
  ] as const;
  return (
    <section className="rtf-rail" aria-label="Fuentes ROOT">
      {sources.map(([id, source]) => (
        <button key={id} type="button" data-status={source.error ? 'degraded' : 'observed'} onClick={() => onSelect(selection({ kind: 'source', id, title: id.toUpperCase(), source: source.source, observedAt: source.observedAt, data: { dataClass: source.dataClass, error: source.error } }))}>
          <i /><span>{id}</span><b>{source.error ? 'DEGRADED' : source.dataClass.toUpperCase()}</b><time>{displayTime(source.observedAt)}</time>
        </button>
      ))}
    </section>
  );
}

function InstrumentTrace({ state, onSelect }: { state: RootSovereignState; onSelect: (value: RootSelection) => void }) {
  const instruments = state.telemetry.data.instruments.filter((item) => item.value !== null);
  const values = instruments.map((item) => Number(item.value)).filter(Number.isFinite);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const range = max - min;
  const points = instruments.map((item, index) => {
    const x = instruments.length <= 1 ? 50 : (index / (instruments.length - 1)) * 100;
    const numeric = Number(item.value);
    const y = range === 0 ? 50 : 88 - ((numeric - min) / range) * 76;
    return `${x},${y}`;
  }).join(' ');

  return (
    <section className="rtf-instruments">
      <header><span>INSTRUMENTOS</span><strong>{instruments.length ? `${instruments.length} CON LECTURA` : 'SIN LECTURAS'}</strong></header>
      {instruments.length ? (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Trazo relativo de instrumentos con lectura persistida">
          <line x1="0" y1="50" x2="100" y2="50" />
          {instruments.length > 1 ? <polyline points={points} /> : null}
          {instruments.map((item, index) => {
            const [x, y] = points.split(' ')[index].split(',').map(Number);
            return <circle key={item.id} cx={x} cy={y} r="1.8" />;
          })}
        </svg>
      ) : <div className="rtf-empty">El lector de telemetría no expone valores numéricos en este corte.</div>}
      <div className="rtf-instrument-labels">
        {state.telemetry.data.instruments.map((item) => (
          <button key={item.id} type="button" data-status={statusClass(item.status)} onClick={() => onSelect(selection({ kind: 'instrument', id: item.id, title: item.label, source: state.telemetry.source, observedAt: state.telemetry.observedAt, data: { symbol: item.symbol, value: item.value, status: item.status, warning: item.warning } }))}>
            <span>{item.symbol}</span><strong>{item.value ?? '—'}</strong><small>{item.status}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

function SystemTopology({ state, onSelect }: { state: RootSovereignState; onSelect: (value: RootSelection) => void }) {
  return (
    <div className="rtf-flow">
      <SourceRail state={state} onSelect={onSelect} />
      <InstrumentTrace state={state} onSelect={onSelect} />

      <section className="rtf-ledger-line">
        <header><span>CONTRATOS / EJECUCIÓN / EVIDENCIA / GOBERNANZA</span></header>
        <div>
          <button type="button" onClick={() => onSelect(selection({ kind: 'runtime', id: 'cognitive-runtime', title: 'Runtime cognitivo', source: state.cognitiveRuntime.source, observedAt: state.cognitiveRuntime.observedAt, evidenceIds: state.cognitiveRuntime.data.eventGraph.recentEvents.map((event) => event.eventId).filter(Boolean), data: { status: state.cognitiveRuntime.data.status, contract: state.cognitiveRuntime.data.contract, summary: state.cognitiveRuntime.data.summary } }))}>
            <span>AGENTES</span><strong>{state.cognitiveRuntime.data.contract.registeredAgents}</strong><small>{state.cognitiveRuntime.data.status}</small>
          </button>
          <button type="button" onClick={() => onSelect(selection({ kind: 'capabilities', id: 'execution-capabilities', title: 'Capacidades', source: state.execution.source, observedAt: state.execution.observedAt, data: { capabilities: state.execution.data.capabilities } }))}>
            <span>CAPACIDADES</span><strong>{state.execution.data.capabilities.filter((item) => item.state === 'available').length}/{state.execution.data.capabilities.length}</strong><small>available / total</small>
          </button>
          <button type="button" onClick={() => onSelect(selection({ kind: 'evidence', id: 'evidence-ledger', title: 'Evidencia persistida', source: state.evidence.source, observedAt: state.evidence.observedAt, evidenceIds: state.evidence.data.nodes.flatMap((node) => node.evidenceIds), data: { entries: state.evidence.data.entries.length, ledger: state.evidence.data.ledger.length, nodes: state.evidence.data.nodes.length, edges: state.evidence.data.edges.length } }))}>
            <span>EVIDENCIA</span><strong>{state.evidence.data.entries.length + state.evidence.data.ledger.length}</strong><small>{state.evidence.data.nodes.length} nodes · {state.evidence.data.edges.length} edges</small>
          </button>
          <button type="button" onClick={() => onSelect(selection({ kind: 'governance', id: 'governance', title: 'Gobernanza', source: state.governance.source, observedAt: state.governance.observedAt, data: { proposals: state.governance.data.proposals.length, mutations: state.governance.data.mutations.length, audits: state.governance.data.audits.length, events: state.governance.data.events.length } }))}>
            <span>GOBERNANZA</span><strong>{state.governance.data.audits.length + state.governance.data.events.length + state.governance.data.mutations.length}</strong><small>audits / events / mutations</small>
          </button>
        </div>
      </section>
    </div>
  );
}

function CognitiveTopology({ state, onSelect }: { state: RootSovereignState; onSelect: (value: RootSelection) => void }) {
  const events = state.cognitiveRuntime.data.eventGraph.recentEvents.slice(0, 80);
  const agents = state.cognitiveRuntime.data.agents;
  const attractors = state.amv.data.attractors;
  const hypotheses = [...state.predictions.data.runs, ...state.predictions.data.legacyEntries].slice(0, 30);
  const nodes = state.evidence.data.nodes.slice(0, 50);
  return (
    <div className="rtf-cognitive">
      <section className="rtf-agent-lanes">
        <header><span>AGENTES / EJECUCIÓN OBSERVADA</span><strong>{agents.filter((agent) => agent.status === 'operational').length}/{agents.length}</strong></header>
        <div className="rtf-agent-grid">
          {agents.map((agent) => (
            <button key={agent.id} type="button" data-status={statusClass(agent.status)} onClick={() => onSelect(selection({ kind: 'agent', id: agent.id, title: agent.name, source: state.cognitiveRuntime.source, observedAt: state.cognitiveRuntime.observedAt, data: { layer: agent.layer, domain: agent.domain, authority: agent.authorityLevel, status: agent.status, purpose: agent.purpose, evidence: agent.evidence } }))}>
              <i /><span>{agent.layer}</span><strong>{agent.name}</strong><small>{agent.status}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="rtf-field-map">
        <header><span>ATRACTOR / EVIDENCIA / HIPÓTESIS</span><strong>{attractors.length} · {nodes.length} · {hypotheses.length}</strong></header>
        <div className="rtf-field-columns">
          <div className="rtf-field-column attractor"><span>ATRACTOR</span>{attractors.length ? attractors.map((entry, index) => <button key={text(entry.id, String(index))} type="button" onClick={() => onSelect(selection({ kind: 'attractor', id: text(entry.id ?? entry.attractor_key, `attractor-${index}`), title: text(entry.label ?? entry.attractor_key, `Atractor ${index + 1}`), source: state.amv.source, observedAt: rowDate(entry), data: entry }))}><i />{text(entry.label ?? entry.attractor_key, 'ATRACTOR')}</button>) : <em>NO EXPUESTO</em>}</div>
          <div className="rtf-field-column evidence"><span>EVIDENCIA</span>{nodes.map((node) => <button key={node.id} type="button" data-status={statusClass(node.epistemicClass)} onClick={() => onSelect(selection({ kind: 'evidence', id: node.id, title: node.label, source: node.source, observedAt: node.observedAt, evidenceIds: node.evidenceIds, data: node.payload }))}><i />{node.label}</button>)}</div>
          <div className="rtf-field-column hypothesis"><span>HIPÓTESIS / PROYECCIÓN</span>{hypotheses.map((entry, index) => <button key={text(entry.id ?? entry.hypothesis_id, String(index))} type="button" onClick={() => onSelect(selection({ kind: 'hypothesis', id: text(entry.id ?? entry.hypothesis_id, `hypothesis-${index}`), title: text(entry.title ?? entry.hypothesis ?? entry.status, `Hipótesis ${index + 1}`), source: state.predictions.source, observedAt: rowDate(entry), evidenceIds: Array.isArray(entry.evidence_refs) ? entry.evidence_refs.map(String) : [], data: entry }))}><i />{text(entry.title ?? entry.hypothesis ?? entry.status, `Hipótesis ${index + 1}`)}</button>)}</div>
        </div>
      </section>

      <section className="rtf-event-stream">
        <header><span>EVENTOS COGNITIVOS RECIENTES</span><strong>{events.length}</strong></header>
        <div>{events.map((event) => <button key={event.eventId} type="button" onClick={() => onSelect(selection({ kind: 'event', id: event.eventId, title: event.eventName, source: event.sourceId ?? state.cognitiveRuntime.data.eventGraph.source, observedAt: event.occurredAt, data: { eventName: event.eventName, epistemicClass: event.epistemicClass, confidence: event.confidence, sourceId: event.sourceId } }))}><time>{displayTime(event.occurredAt)}</time><i /><strong>{event.eventName}</strong><span>{event.sourceId ?? 'sin agente atribuido'}</span><small>{event.epistemicClass}</small></button>)}</div>
      </section>

      <section className="rtf-proposals">
        <header><span>PERTURBACIONES / PROPUESTAS</span><strong>{state.governance.data.proposals.length}</strong></header>
        {state.governance.data.proposals.length ? state.governance.data.proposals.slice(0, 30).map((entry, index) => <button key={text(entry.id, String(index))} type="button" onClick={() => onSelect(selection({ kind: 'proposal', id: text(entry.id, `proposal-${index}`), title: text(entry.title ?? entry.action ?? entry.status, `Propuesta ${index + 1}`), source: state.governance.source, observedAt: rowDate(entry), data: entry }))}><strong>{text(entry.title ?? entry.action ?? entry.status, `Propuesta ${index + 1}`)}</strong><span>{text(entry.status, 'SIN ESTADO')}</span></button>) : <p>El lector de gobernanza no expone propuestas en este corte.</p>}
      </section>
    </div>
  );
}

function LongitudinalTopology({ state, onSelect }: { state: RootSovereignState; onSelect: (value: RootSelection) => void }) {
  const stream = useMemo<StreamPoint[]>(() => {
    const points: StreamPoint[] = [];
    const append = (rows: RootRow[], kind: string, source: string) => rows.forEach((entry, index) => points.push({
      id: text(entry.id ?? entry.event_id ?? entry.run_id, `${kind}-${index}`),
      label: text(entry.title ?? entry.label ?? entry.event_name ?? entry.action ?? entry.status ?? entry.learning_state, kind),
      kind,
      at: rowDate(entry),
      status: text(entry.status ?? entry.epistemic_class ?? entry.learning_state, 'observed'),
      source,
      evidenceIds: Array.isArray(entry.evidence_refs) ? entry.evidence_refs.map(String) : [],
      data: entry,
    }));
    append(state.governance.data.events, 'governance-event', state.governance.source);
    append(state.governance.data.audits, 'audit', state.governance.source);
    append(state.governance.data.mutations, 'mutation', state.governance.source);
    append(state.execution.data.recentActions, 'execution', state.execution.source);
    append(state.predictions.data.runs, 'prediction', state.predictions.source);
    append(state.predictions.data.outcomes, 'outcome', state.predictions.source);
    append(state.predictions.data.learningEvents, 'learning', state.predictions.source);
    append(state.evidence.data.entries, 'evidence', state.evidence.source);
    append(state.evidence.data.ledger, 'ledger', state.evidence.source);
    append(state.amv.data.memories, 'memory', state.amv.source);
    return points.sort((a, b) => String(b.at ?? '').localeCompare(String(a.at ?? ''))).slice(0, 120);
  }, [state]);

  return (
    <div className="rtf-longitudinal">
      <section className="rtf-time-stream">
        <header><span>TRAYECTORIA PERSISTIDA</span><strong>{stream.length}</strong></header>
        <div>{stream.map((point) => <button key={`${point.kind}-${point.id}`} type="button" data-status={statusClass(point.status)} onClick={() => onSelect(selection({ kind: point.kind, id: point.id, title: point.label, source: point.source, observedAt: point.at, evidenceIds: point.evidenceIds, data: point.data }))}><time>{displayTime(point.at)}</time><i /><span>{point.kind}</span><strong>{point.label}</strong><small>{point.status}</small></button>)}</div>
      </section>
      <section className="rtf-memory-line">
        <div><span>AMV MEMORY</span><strong>{state.amv.data.memories.length}</strong></div>
        <div><span>PREDICTIONS</span><strong>{state.predictions.data.runs.length}</strong></div>
        <div><span>OUTCOMES</span><strong>{state.predictions.data.outcomes.length}</strong></div>
        <div><span>LEARNING EVENTS</span><strong>{state.predictions.data.learningEvents.length}</strong></div>
        <div><span>AUDITED ACTIONS</span><strong>{state.execution.data.recentActions.length}</strong></div>
      </section>
    </div>
  );
}

function Inspector({ value, onClose }: { value: RootSelection | null; onClose: () => void }) {
  if (!value) return <aside className="rtf-inspector is-empty"><span>INSPECCIÓN</span><p>Selecciona una fuente, agente, evidencia, evento, hipótesis o propuesta para ver procedencia y payload técnico.</p></aside>;
  return (
    <aside className="rtf-inspector">
      <header><div><span>{value.kind}</span><h2>{value.title}</h2></div><button type="button" onClick={onClose}>×</button></header>
      <dl><div><dt>FUENTE</dt><dd>{value.source}</dd></div><div><dt>FECHA</dt><dd>{displayTime(value.observedAt)}</dd></div><div><dt>EVIDENCIA</dt><dd>{value.evidenceIds.length}</dd></div></dl>
      {value.warning ? <p className="rtf-warning-inline">{value.warning}</p> : null}
      <details><summary>DATOS TÉCNICOS</summary><pre>{JSON.stringify(value.data, null, 2)}</pre></details>
      <Link href="/root/evidence/intake">ADJUNTAR EVIDENCIA</Link>
    </aside>
  );
}

export function RootTopologyField({ state, refreshing, warning, onRefresh, onSelect, onAction, onLegacy }: { state: RootSovereignState; refreshing: boolean; warning: string | null; onRefresh: () => void; onSelect: (selection: RootSelection) => void; onAction: (action: RootActionRequest) => void; onLegacy: () => void }) {
  const [topology, setTopology] = useState<TopologyId>('I');
  const [selected, setSelected] = useState<RootSelection | null>(null);
  const choose = (value: RootSelection) => { setSelected(value); onSelect(value); };
  const cycle: RootActionRequest = {
    id: `root-cycle-${state.generatedAt}`,
    label: 'Ejecutar ciclo institucional',
    effect: 'Ejecuta el ciclo institucional existente y después ROOT vuelve a leer únicamente estados persistidos.',
    target: 'ROOT / WorldSpect / MIHM / evidence / cognitive runtime',
    endpoint: '/api/root/operational/trigger-observation?job=all',
    method: 'POST',
  };

  return (
    <main className="rtf-root">
      <header className="rtf-header">
        <div><strong>SFI</strong><span>ROOT / TOPOLOGÍAS I—III</span></div>
        <nav>{(['I', 'II', 'III'] as TopologyId[]).map((id) => <button key={id} type="button" className={topology === id ? 'active' : ''} onClick={() => setTopology(id)}>{id} · {TOPOLOGIES[id].title}</button>)}</nav>
        <div><button type="button" onClick={onRefresh}>{refreshing ? 'ACTUALIZANDO' : 'ACTUALIZAR'}</button><button type="button" onClick={() => onAction(cycle)}>EJECUTAR CICLO</button><button type="button" onClick={onLegacy}>OPERACIÓN</button></div>
      </header>

      <section className="rtf-question"><span>TOPOLOGÍA {topology}</span><h1>{TOPOLOGIES[topology].question}</h1><time>{displayTime(state.generatedAt)}</time></section>
      {warning || state.warnings.length ? <div className="rtf-warning">{warning ?? state.warnings.slice(0, 4).join(' · ')}</div> : null}

      <div className="rtf-layout">
        <section className="rtf-stage">
          {topology === 'I' ? <SystemTopology state={state} onSelect={choose} /> : null}
          {topology === 'II' ? <CognitiveTopology state={state} onSelect={choose} /> : null}
          {topology === 'III' ? <LongitudinalTopology state={state} onSelect={choose} /> : null}
        </section>
        <Inspector value={selected} onClose={() => setSelected(null)} />
      </div>

      <style jsx global>{`
        .rtf-root{background:#050504;color:#d7cfbd;min-height:70vh;font-family:var(--sfi-font-mono),ui-monospace,SFMono-Regular,Menlo,monospace}.rtf-header{position:sticky;top:0;z-index:30;display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:18px;align-items:center;padding:11px 18px;border-bottom:1px solid rgba(201,170,84,.22);background:rgba(5,5,4,.96);backdrop-filter:blur(12px)}.rtf-header>div:first-child{display:flex;align-items:baseline;gap:8px}.rtf-header strong{color:#e1c979}.rtf-header span,.rtf-header button{font-size:8px;letter-spacing:.1em}.rtf-header nav{display:flex;justify-content:center;gap:4px}.rtf-header button{border:0;background:transparent;color:#706b61;padding:7px 9px;cursor:pointer}.rtf-header button.active,.rtf-header button:hover{color:#dbc476}.rtf-header>div:last-child{display:flex;justify-content:flex-end}
        .rtf-question{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:20px;align-items:baseline;padding:25px 28px;border-bottom:1px solid rgba(255,255,255,.04)}.rtf-question>span{color:#8c7746;font-size:8px;letter-spacing:.15em}.rtf-question h1{margin:0;color:#e3d7be;font:400 clamp(18px,2.2vw,30px)/1.25 Georgia,serif}.rtf-question time{color:#625e55;font-size:8px}.rtf-warning{padding:10px 28px;border-bottom:1px solid rgba(164,92,66,.3);color:#b9896d;font-size:9px;line-height:1.5}.rtf-layout{display:grid;grid-template-columns:minmax(0,1fr) 330px;min-height:620px}.rtf-stage{min-width:0;border-right:1px solid rgba(201,170,84,.13)}
        .rtf-rail{display:grid;grid-template-columns:repeat(9,minmax(0,1fr));border-bottom:1px solid rgba(255,255,255,.05)}.rtf-rail button{min-width:0;padding:14px 8px;border:0;border-right:1px solid rgba(255,255,255,.04);background:transparent;color:#827c70;text-align:left;cursor:pointer}.rtf-rail i{display:block;width:100%;height:2px;margin-bottom:9px;background:#5b554a}.rtf-rail button[data-status=observed] i{background:#a88e50}.rtf-rail button[data-status=degraded] i{background:#9b613d}.rtf-rail span,.rtf-rail b,.rtf-rail time{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rtf-rail span{font-size:7px;text-transform:uppercase}.rtf-rail b{margin-top:5px;color:#b9ad94;font-size:8px}.rtf-rail time{margin-top:4px;color:#514d46;font-size:6px}
        .rtf-instruments{padding:24px 28px;border-bottom:1px solid rgba(255,255,255,.05)}.rtf-instruments header,.rtf-ledger-line header,.rtf-agent-lanes header,.rtf-field-map header,.rtf-event-stream header,.rtf-proposals header,.rtf-time-stream header{display:flex;justify-content:space-between;gap:15px;margin-bottom:14px}.rtf-instruments header span,.rtf-ledger-line header span,.rtf-agent-lanes header span,.rtf-field-map header span,.rtf-event-stream header span,.rtf-proposals header span,.rtf-time-stream header span{color:#8f7847;font-size:8px;letter-spacing:.14em}.rtf-instruments header strong,.rtf-agent-lanes header strong,.rtf-field-map header strong,.rtf-event-stream header strong,.rtf-proposals header strong,.rtf-time-stream header strong{color:#a99c82;font-size:9px}.rtf-instruments svg{width:100%;height:180px;overflow:visible}.rtf-instruments svg line{stroke:rgba(201,170,84,.08);stroke-width:.35}.rtf-instruments svg polyline{fill:none;stroke:#a88e50;stroke-width:.6;vector-effect:non-scaling-stroke}.rtf-instruments svg circle{fill:#e0c978;vector-effect:non-scaling-stroke}.rtf-instrument-labels{display:flex;flex-wrap:wrap;border-top:1px solid rgba(255,255,255,.04)}.rtf-instrument-labels button{display:grid;grid-template-columns:auto auto;gap:2px 9px;padding:9px 12px;border:0;border-right:1px solid rgba(255,255,255,.04);background:transparent;color:#766f63;cursor:pointer}.rtf-instrument-labels span{font-size:8px}.rtf-instrument-labels strong{font-size:10px;color:#c4b795}.rtf-instrument-labels small{grid-column:1/-1;font-size:6px;color:#5f5a51}.rtf-empty{padding:50px 0;color:#5f5a52;font-size:9px}
        .rtf-ledger-line{padding:22px 28px}.rtf-ledger-line>div{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid rgba(255,255,255,.05);border-bottom:1px solid rgba(255,255,255,.05)}.rtf-ledger-line button{padding:16px;border:0;border-right:1px solid rgba(255,255,255,.05);background:transparent;text-align:left;color:#7c7568;cursor:pointer}.rtf-ledger-line span,.rtf-ledger-line strong,.rtf-ledger-line small{display:block}.rtf-ledger-line span{font-size:7px}.rtf-ledger-line strong{margin:5px 0;color:#d3c29c;font:400 19px Georgia,serif}.rtf-ledger-line small{font-size:7px;color:#5f5a50}
        .rtf-agent-lanes,.rtf-field-map,.rtf-event-stream,.rtf-proposals,.rtf-time-stream{padding:22px 28px;border-bottom:1px solid rgba(255,255,255,.05)}.rtf-agent-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));border-top:1px solid rgba(255,255,255,.04)}.rtf-agent-grid button{display:grid;grid-template-columns:6px 1fr;gap:2px 9px;padding:10px 8px;border:0;border-right:1px solid rgba(255,255,255,.04);border-bottom:1px solid rgba(255,255,255,.04);background:transparent;color:#777065;text-align:left;cursor:pointer}.rtf-agent-grid i{grid-row:1/4;width:2px;height:100%;background:#5a554d}.rtf-agent-grid button[data-status=observed] i{background:#aa914f}.rtf-agent-grid button[data-status=degraded] i{background:#a06b3d}.rtf-agent-grid button[data-status=gated] i{background:#59647d}.rtf-agent-grid button[data-status=missing] i{background:#7c4545}.rtf-agent-grid span,.rtf-agent-grid small{font-size:6px;text-transform:uppercase}.rtf-agent-grid strong{font-size:8px;color:#b9ad94}.rtf-field-columns{display:grid;grid-template-columns:.7fr 1.3fr 1fr;min-height:300px;border-top:1px solid rgba(255,255,255,.05)}.rtf-field-column{padding:12px;border-right:1px solid rgba(255,255,255,.05)}.rtf-field-column>span{display:block;margin-bottom:10px;color:#665f53;font-size:7px;letter-spacing:.12em}.rtf-field-column button{display:flex;align-items:center;gap:8px;width:100%;padding:7px 0;border:0;border-bottom:1px solid rgba(255,255,255,.03);background:transparent;color:#938a78;text-align:left;font-size:7px;cursor:pointer}.rtf-field-column button i{width:5px;height:5px;border:1px solid #86713f;border-radius:50%}.rtf-field-column.attractor button{color:#d1b86f}.rtf-field-column.hypothesis button i{border-radius:0;transform:rotate(45deg)}.rtf-field-column em{color:#5e5548;font-size:8px;font-style:normal}
        .rtf-event-stream>div,.rtf-time-stream>div{max-height:420px;overflow:auto}.rtf-event-stream button,.rtf-time-stream button{display:grid;grid-template-columns:150px 12px minmax(180px,1fr) minmax(120px,.5fr) 110px;gap:8px;align-items:center;width:100%;padding:8px 0;border:0;border-bottom:1px solid rgba(255,255,255,.035);background:transparent;color:#766f63;text-align:left;cursor:pointer}.rtf-event-stream button i,.rtf-time-stream button i{width:5px;height:5px;border-radius:50%;background:#887441}.rtf-event-stream time,.rtf-time-stream time,.rtf-event-stream small,.rtf-time-stream small,.rtf-event-stream span,.rtf-time-stream span{font-size:7px}.rtf-event-stream strong,.rtf-time-stream strong{font-size:8px;color:#aea38c}.rtf-proposals button{display:flex;justify-content:space-between;width:100%;padding:9px 0;border:0;border-bottom:1px solid rgba(255,255,255,.035);background:transparent;color:#756e62;cursor:pointer}.rtf-proposals button strong{color:#aaa08a;font-size:8px}.rtf-proposals button span,.rtf-proposals p{font-size:7px;color:#625c53}.rtf-memory-line{display:grid;grid-template-columns:repeat(5,1fr);border-bottom:1px solid rgba(255,255,255,.05)}.rtf-memory-line div{padding:18px;border-right:1px solid rgba(255,255,255,.04)}.rtf-memory-line span,.rtf-memory-line strong{display:block}.rtf-memory-line span{color:#655f55;font-size:7px}.rtf-memory-line strong{margin-top:6px;color:#c8b995;font:400 18px Georgia,serif}
        .rtf-inspector{position:sticky;top:42px;align-self:start;max-height:calc(100vh - 42px);overflow:auto;padding:22px;background:#070706}.rtf-inspector>span,.rtf-inspector header span{color:#8a7547;font-size:8px;letter-spacing:.13em}.rtf-inspector h2{margin:5px 0 0;color:#d6c8a8;font:400 18px Georgia,serif}.rtf-inspector header{display:flex;justify-content:space-between;gap:10px}.rtf-inspector header button{border:0;background:transparent;color:#716b61;cursor:pointer}.rtf-inspector p{color:#777065;font-size:9px;line-height:1.6}.rtf-inspector dl{margin:18px 0}.rtf-inspector dl div{padding:8px 0;border-top:1px solid rgba(255,255,255,.04)}.rtf-inspector dt{color:#5f5a50;font-size:7px}.rtf-inspector dd{margin:3px 0 0;color:#9e9582;font-size:8px;overflow-wrap:anywhere}.rtf-inspector details{border-top:1px solid rgba(201,170,84,.15);padding-top:12px}.rtf-inspector summary{color:#8d7748;font-size:8px;cursor:pointer}.rtf-inspector pre{white-space:pre-wrap;overflow-wrap:anywhere;color:#777168;font-size:7px;line-height:1.5}.rtf-inspector>a{display:inline-block;margin-top:14px;border:1px solid #5e5032;padding:8px 10px;color:#bca35f;text-decoration:none;font-size:8px}.rtf-warning-inline{color:#a8775e!important}
        @media(max-width:980px){.rtf-header{grid-template-columns:1fr}.rtf-header nav{justify-content:flex-start;overflow:auto}.rtf-header>div:last-child{justify-content:flex-start}.rtf-layout{grid-template-columns:1fr}.rtf-stage{border-right:0}.rtf-inspector{position:relative;top:0;max-height:none;border-top:1px solid rgba(201,170,84,.13)}.rtf-rail{grid-template-columns:repeat(3,1fr)}.rtf-field-columns{grid-template-columns:1fr}.rtf-ledger-line>div{grid-template-columns:repeat(2,1fr)}.rtf-event-stream button,.rtf-time-stream button{grid-template-columns:110px 10px 1fr}.rtf-event-stream button span,.rtf-event-stream button small,.rtf-time-stream button span,.rtf-time-stream button small{display:none}.rtf-memory-line{grid-template-columns:repeat(2,1fr)}}
      `}</style>
    </main>
  );
}
