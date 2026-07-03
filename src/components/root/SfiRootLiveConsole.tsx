'use client';

import { useMemo, useState } from 'react';
import type { AgenticRootState } from '@/lib/agents/sfiAgents';

type HubId = 'total' | 'predictions' | 'agents' | 'founder' | 'world';
type Tone = 'ok' | 'watch' | 'bad' | 'muted';
type MetricIcon = 'friction' | 'prediction' | 'evidence' | 'agent' | 'memory' | 'signal';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown, fallback = 'not_available') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function num(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bounded(value: unknown, fallback = 0) {
  return Math.max(0, Math.min(1, num(value, fallback)));
}

function pct(value: unknown, fallback = 0) {
  return `${Math.round(bounded(value, fallback) * 100)}%`;
}

function toneClass(tone: Tone) {
  if (tone === 'ok') return 'tone-ok';
  if (tone === 'bad') return 'tone-bad';
  if (tone === 'watch') return 'tone-watch';
  return 'tone-muted';
}

function statusTone(value: unknown): Tone {
  const raw = text(value, '').toLowerCase();
  if (/(fail|error|critical|degraded|collapsed|missing)/.test(raw)) return 'bad';
  if (/(pending|queued|warn|review|watch|medium)/.test(raw)) return 'watch';
  if (/(ok|live|active|stable|operational|observed)/.test(raw)) return 'ok';
  return 'muted';
}

function MicroIcon({ kind, tone }: { kind: MetricIcon; tone: Tone }) {
  const cls = `micro-icon ${toneClass(tone)}`;
  if (kind === 'friction') return <svg className={cls} viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="9" /><path d="M6 14h16M14 6v16M8 8l12 12M20 8L8 20" /></svg>;
  if (kind === 'prediction') return <svg className={cls} viewBox="0 0 28 28" aria-hidden="true"><path d="M14 4l9 5v10l-9 5-9-5V9z" /><path d="M5 9l9 5 9-5M14 14v10" /></svg>;
  if (kind === 'evidence') return <svg className={cls} viewBox="0 0 28 28" aria-hidden="true"><circle cx="7" cy="8" r="2" /><circle cx="21" cy="8" r="2" /><circle cx="14" cy="20" r="2" /><path d="M9 9l10 0M8 10l5 8M20 10l-5 8" /></svg>;
  if (kind === 'agent') return <svg className={cls} viewBox="0 0 28 28" aria-hidden="true"><path d="M9 7h10l4 7-4 7H9l-4-7z" /><circle cx="11" cy="14" r="1.5" /><circle cx="17" cy="14" r="1.5" /><path d="M14 5v-2M14 25v-2" /></svg>;
  if (kind === 'memory') return <svg className={cls} viewBox="0 0 28 28" aria-hidden="true"><rect x="6" y="5" width="16" height="18" rx="2" /><path d="M10 9h8M10 13h8M10 17h5" /></svg>;
  return <svg className={cls} viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="3" /><path d="M14 3v5M14 20v5M3 14h5M20 14h5M6.2 6.2l3.5 3.5M18.3 18.3l3.5 3.5M21.8 6.2l-3.5 3.5M9.7 18.3l-3.5 3.5" /></svg>;
}

function SignalLine({ tone = 'watch', variant = 0 }: { tone?: Tone; variant?: number }) {
  const d = variant % 3 === 0
    ? 'M2 20 L12 18 L22 22 L34 10 L46 14 L58 7 L70 15 L84 11 L98 5 L114 12 L146 8'
    : variant % 3 === 1
      ? 'M2 18 L14 12 L26 17 L38 15 L50 20 L62 9 L75 11 L90 7 L104 15 L122 10 L146 13'
      : 'M2 23 L16 21 L28 14 L40 17 L52 11 L66 12 L80 8 L96 15 L112 9 L130 11 L146 6';
  return (
    <svg viewBox="0 0 150 28" className={`signal-line ${toneClass(tone)}`} aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.05" />
      <path d="M2 25 L148 25" stroke="currentColor" strokeOpacity="0.16" />
    </svg>
  );
}

function MetricInstrument({ label, value, meta, tone, icon, index }: { label: string; value: string; meta: string; tone: Tone; icon: MetricIcon; index: number }) {
  return (
    <div className="instrument">
      <MicroIcon kind={icon} tone={tone} />
      <div className="instrument-main">
        <div className="instrument-label">{label}</div>
        <div className="instrument-value-row"><b className={toneClass(tone)}>{value}</b><span>{meta}</span></div>
        <div className="micro-meta"><span>vector {index + 1}</span><span>{tone}</span><span>trace live</span></div>
      </div>
      <SignalLine tone={tone} variant={index} />
    </div>
  );
}

function MicroBarCluster({ tone, value }: { tone: Tone; value: number }) {
  return <div className={`bar-cluster ${toneClass(tone)}`}>{Array.from({ length: 12 }, (_, i) => <span key={i} style={{ opacity: i / 12 < value ? 1 : 0.18 }} />)}</div>;
}

function RingGauge({ value, tone }: { value: number; tone: Tone }) {
  const dash = Math.round(94 * bounded(value));
  return <svg viewBox="0 0 40 40" className={`ring-gauge ${toneClass(tone)}`} aria-hidden="true"><circle cx="20" cy="20" r="15" /><circle cx="20" cy="20" r="15" pathLength="100" strokeDasharray={`${dash} 100`} /><text x="20" y="22" textAnchor="middle">{Math.round(bounded(value) * 100)}</text></svg>;
}

function MiniMatrix({ items }: { items: unknown[] }) {
  const count = Math.max(1, Math.min(18, items.length || 6));
  return <div className="mini-matrix">{Array.from({ length: 18 }, (_, i) => <span key={i} className={i < count ? 'lit' : ''} />)}</div>;
}

function FloatingList({ title, items, mode }: { title: string; items: unknown[]; mode?: 'actions' | 'log' }) {
  return (
    <div className="float-panel list-panel">
      <header><b>{title}</b><span>{items.length} records</span></header>
      <div className="list-stack">
        {items.slice(0, 6).map((item, index) => {
          const record = asRecord(item);
          const label = text(record.action ?? record.hypothesis_id ?? record.id ?? record.type ?? record.status, `SFI-${index + 1}`);
          const body = text(record.reason ?? record.prediccion_explicita ?? record.prediction ?? record.summary ?? record.expected_outcome ?? record.status, 'sin descripcion');
          const tone = statusTone(record.status ?? record.evidence_state ?? record.estado_observacion ?? record.current_signal_state);
          return (
            <div className="list-row" key={`${title}-${index}`}>
              <div><span className={`dot ${toneClass(tone)}`} /><b>{label}</b><p>{body}</p></div>
              {mode === 'actions' ? <div className="row-actions"><button>INSPECT</button><button>ROUTE</button></div> : <span className={`tag ${toneClass(tone)}`}>{tone}</span>}
            </div>
          );
        })}
        {items.length === 0 ? <div className="empty">No hay registros disponibles para este hub.</div> : null}
      </div>
    </div>
  );
}

function MicroPanel({ title, value, tone, children }: { title: string; value: string; tone: Tone; children?: React.ReactNode }) {
  return <div className="micro-panel"><div><span>{title}</span><b className={toneClass(tone)}>{value}</b></div>{children}</div>;
}

function CoreTopology({ confidence, graphNodes, evidenceCount, predictionCount, amvCount }: { confidence: number; graphNodes: number; evidenceCount: number; predictionCount: number; amvCount: number }) {
  const nodes = useMemo(() => [
    { label: 'GRAPH', x: 50, y: 10, value: graphNodes },
    { label: 'PRED', x: 82, y: 27, value: predictionCount },
    { label: 'AMV', x: 80, y: 70, value: amvCount },
    { label: 'ROOT', x: 50, y: 90, value: Math.round(confidence * 100) },
    { label: 'EVID', x: 20, y: 70, value: evidenceCount },
    { label: 'WORLD', x: 18, y: 27, value: Math.round(confidence * 100) },
  ], [amvCount, confidence, evidenceCount, graphNodes, predictionCount]);

  const microNodes = useMemo(() => Array.from({ length: 58 }, (_, i) => {
    const angle = (i * 137.5) * Math.PI / 180;
    const radius = 9 + ((i * 7) % 37);
    return { x: 50 + Math.cos(angle) * radius, y: 50 + Math.sin(angle) * radius, r: 0.25 + (i % 5) * 0.06, opacity: 0.12 + (i % 6) * 0.045 };
  }), []);

  return (
    <div className="core-stage">
      <div className="stage-title"><span>INTERNAL OBSERVATORY</span><b>ROOT OBSERVING SELF</b></div>
      <div className="stage-corners"><i /><i /><i /><i /></div>
      <div className="stage-side left"><span>FIELD</span><span>MEMORY</span><span>HYPOTHESIS</span></div>
      <div className="stage-side right"><span>AGENTS</span><span>QUEUE</span><span>WORLD</span></div>
      <svg viewBox="0 0 100 100" className="core-svg" aria-hidden="true">
        <defs>
          <radialGradient id="rootGlowLayered" cx="50%" cy="50%" r="52%">
            <stop offset="0%" stopColor="#f4d987" stopOpacity="0.42" />
            <stop offset="46%" stopColor="#c8a951" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
          <filter id="softGlowLayered"><feGaussianBlur stdDeviation="0.55" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <circle cx="50" cy="50" r="47" fill="url(#rootGlowLayered)" />
        {[8, 14, 20, 26, 32, 38, 44, 48].map((r, i) => <circle key={r} cx="50" cy="50" r={r} fill="none" stroke="#c8a951" strokeOpacity={i % 2 ? '0.17' : '0.28'} strokeWidth={i === 4 ? '0.32' : '0.2'} />)}
        {Array.from({ length: 36 }, (_, i) => {
          const a = (i * 10) * Math.PI / 180;
          const x1 = 50 + Math.cos(a) * (i % 2 ? 40 : 44);
          const y1 = 50 + Math.sin(a) * (i % 2 ? 40 : 44);
          const x2 = 50 + Math.cos(a) * 48;
          const y2 = 50 + Math.sin(a) * 48;
          return <line key={`tick-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#c8a951" strokeOpacity={i % 3 ? '0.15' : '0.28'} strokeWidth="0.16" />;
        })}
        {Array.from({ length: 24 }, (_, i) => {
          const a = (i * 15) * Math.PI / 180;
          const x1 = 50 + Math.cos(a) * 7;
          const y1 = 50 + Math.sin(a) * 7;
          const x2 = 50 + Math.cos(a) * 47;
          const y2 = 50 + Math.sin(a) * 47;
          return <line key={`ray-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#c8a951" strokeOpacity="0.10" strokeWidth="0.16" />;
        })}
        {microNodes.map((node, i) => <circle key={`micro-${i}`} cx={node.x} cy={node.y} r={node.r} fill="#f0cf78" opacity={node.opacity} />)}
        {nodes.map((node, index) => {
          const next = nodes[(index + 1) % nodes.length];
          const cross = nodes[(index + 2) % nodes.length];
          const far = nodes[(index + 3) % nodes.length];
          return <g key={`edge-${node.label}`}><line x1={node.x} y1={node.y} x2={next.x} y2={next.y} stroke="#c8a951" strokeOpacity="0.48" strokeWidth="0.34" /><line x1={node.x} y1={node.y} x2={cross.x} y2={cross.y} stroke="#f0cf78" strokeOpacity="0.16" strokeWidth="0.2" /><line x1={node.x} y1={node.y} x2={far.x} y2={far.y} stroke="#c8a951" strokeOpacity="0.10" strokeWidth="0.16" /><line x1="50" y1="50" x2={node.x} y2={node.y} stroke="#c8a951" strokeOpacity="0.28" strokeWidth="0.24" /></g>;
        })}
        {nodes.map((node) => <g key={node.label} filter="url(#softGlowLayered)"><circle cx={node.x} cy={node.y} r="4.2" fill="#060504" stroke="#f0cf78" strokeOpacity="0.88" strokeWidth="0.40" /><circle cx={node.x} cy={node.y} r="2.15" fill="none" stroke="#c8a951" strokeOpacity="0.26" strokeWidth="0.18" /><text x={node.x} y={node.y - 0.8} textAnchor="middle" fill="#f0cf78" fontSize="1.7" fontFamily="monospace">{node.label}</text><text x={node.x} y={node.y + 2.15} textAnchor="middle" fill="#e7dcc1" fontSize="1.85" fontFamily="monospace">{node.value}</text></g>)}
        <circle cx="50" cy="50" r="10" fill="#050403" stroke="#f0cf78" strokeWidth="0.50" />
        <circle cx="50" cy="50" r="6.8" fill="none" stroke="#c8a951" strokeOpacity="0.42" strokeWidth="0.24" />
        <circle cx="50" cy="50" r="3.1" fill="none" stroke="#f0cf78" strokeOpacity="0.22" strokeWidth="0.18" />
        <text x="50" y="48.7" textAnchor="middle" fill="#f0cf78" fontSize="3.0" fontFamily="monospace">SFI</text>
        <text x="50" y="52.6" textAnchor="middle" fill="#a99d82" fontSize="1.85" fontFamily="monospace">CORE</text>
      </svg>
      <div className="stage-readout"><span>CONF {pct(confidence)}</span><span>GRAPH {graphNodes}</span><span>EVID {evidenceCount}</span><span>PRED {predictionCount}</span><span>AMV {amvCount}</span></div>
    </div>
  );
}

export default function SfiRootLiveConsole({ initialState, worldVector }: { initialState: AgenticRootState; worldVector: unknown }) {
  const [activeHub, setActiveHub] = useState<HubId>('total');
  const registry = asRecord(initialState.predictionRegistry);
  const health = asRecord(registry.health);
  const predictions = asArray(registry.entries);
  const graph = asRecord(initialState.neuralGraph);
  const graphNodes = asArray(graph.nodes);
  const evidence = asArray(graph.evidence);
  const amv = asRecord(initialState.amv);
  const amvItems = asArray(amv.items);
  const systemHealth = asRecord(initialState.systemHealth);
  const warnings = asArray(systemHealth.warnings);
  const queue = asArray(initialState.executionQueue);
  const world = asRecord(worldVector);
  const today = asRecord(world.today);
  const observation = asRecord(today.observation);
  const worldAgent = asRecord(initialState.worldVectorAgent);
  const cognitiveTwin = asRecord(initialState.cognitiveTwin);
  const confidence = bounded(observation.confidence, 0.71);
  const agentCount = num(systemHealth.llmProvidersAvailable, 0);
  const rootTone: Tone = warnings.length ? 'watch' : 'ok';

  const hubs = [
    { id: 'total' as const, label: 'Estado total', glyph: '◎' },
    { id: 'predictions' as const, label: 'Predicciones', glyph: '◇' },
    { id: 'agents' as const, label: 'Agentes', glyph: '✦' },
    { id: 'founder' as const, label: 'Fundador', glyph: '⬡' },
    { id: 'world' as const, label: 'World Vector', glyph: '⌁' },
  ];

  const activeItems = useMemo(() => {
    if (activeHub === 'predictions') return predictions;
    if (activeHub === 'founder') return queue.length ? queue : predictions;
    if (activeHub === 'agents') return [
      { action: 'World Vector Agent', reason: text(worldAgent.current_signal_state), status: worldAgent.current_signal_state },
      { action: 'Neural Graph Agent', reason: `${graphNodes.length} nodes · ${evidence.length} evidence`, status: systemHealth.graphStatus },
      { action: 'AMV Agent', reason: `${amvItems.length} memory items`, status: amv.status },
      { action: 'Prediction Registry', reason: `${predictions.length} predictions`, status: systemHealth.predictionStatus },
    ];
    return evidence;
  }, [activeHub, amv.status, amvItems.length, evidence, graphNodes.length, predictions, queue, systemHealth.graphStatus, systemHealth.predictionStatus, worldAgent.current_signal_state]);

  return (
    <main className="root-hi">
      <aside className="rail">
        <div className="rail-mark">SFI</div>
        {hubs.map((hub) => <button key={hub.id} className={activeHub === hub.id ? 'active' : ''} onClick={() => setActiveHub(hub.id)} title={hub.label}>{hub.glyph}</button>)}
        <span className="rail-line" />
      </aside>

      <section className="canvas">
        <header className="topbar">
          <div><b>ROOT ACCESS</b><span>LEVEL OMEGA</span></div>
          <div className="title"><b>SFI ROOT · LIVE INSTITUTE CONSOLE</b><span>INTERNAL OBSERVATORY · SYSTEM OBSERVING ITSELF</span></div>
          <div className="status"><b>{health.ok === true ? 'LIVE' : 'DEGRADED'}</b><span>{initialState.generated_at}</span></div>
        </header>

        <div className="scene">
          <div className="left-stack">
            <div className="primary-readout"><span>TOTAL INSTITUTE STATE</span><div><b>{confidence.toFixed(2)}</b><RingGauge value={confidence} tone={confidence > 0.72 ? 'ok' : 'watch'} /></div><em>Institute stability index</em><SignalLine tone={confidence > 0.72 ? 'ok' : 'watch'} /></div>
            <div className="micro-grid"><MicroPanel title="Root Mode" value={rootTone.toUpperCase()} tone={rootTone}><MicroBarCluster value={warnings.length ? 0.55 : 0.82} tone={rootTone} /></MicroPanel><MicroPanel title="Coverage" value={pct(confidence)} tone={confidence > 0.72 ? 'ok' : 'watch'}><MiniMatrix items={evidence} /></MicroPanel></div>
            <MetricInstrument label="Institute Friction" value={warnings.length ? `${warnings.length}` : '0'} meta={warnings.length ? 'warnings active' : 'stable'} tone={warnings.length ? 'watch' : 'ok'} icon="friction" index={0} />
            <MetricInstrument label="Prediction Pressure" value={`${predictions.length}`} meta="registry entries" tone={predictions.length ? 'watch' : 'ok'} icon="prediction" index={1} />
            <MetricInstrument label="Evidence Load" value={`${evidence.length}`} meta="graph evidence" tone={evidence.length ? 'watch' : 'muted'} icon="evidence" index={2} />
            <MetricInstrument label="Agent Health" value={`${agentCount}`} meta="llm providers" tone={agentCount > 0 ? 'ok' : 'bad'} icon="agent" index={3} />
            <MetricInstrument label="AMV Memory" value={`${amvItems.length}`} meta={text(amv.status, 'memory')} tone={amvItems.length ? 'ok' : 'watch'} icon="memory" index={4} />
            <MetricInstrument label="Signal Quality" value={pct(confidence)} meta="world vector" tone={confidence > 0.72 ? 'ok' : 'watch'} icon="signal" index={5} />
          </div>

          <CoreTopology confidence={confidence} graphNodes={graphNodes.length} evidenceCount={evidence.length} predictionCount={predictions.length} amvCount={amvItems.length} />

          <div className="right-stack">
            <div className="right-micro-grid"><MicroPanel title="Hub" value={activeHub.toUpperCase()} tone="watch"><MicroBarCluster value={0.66} tone="watch" /></MicroPanel><MicroPanel title="Queue" value={`${queue.length}`} tone={queue.length ? 'watch' : 'muted'}><MiniMatrix items={queue} /></MicroPanel></div>
            <FloatingList title={activeHub === 'predictions' ? 'Prediction Registry' : activeHub === 'agents' ? 'Agentic Operations' : 'Active Proposals'} items={activeItems} mode={activeHub === 'founder' ? 'actions' : 'log'} />
            <div className="float-panel reading"><header><b>READING OF THE DAY</b><span>SYSTEMIC REFLECTION</span></header><p>{text(worldAgent.root_interpretation ?? observation.interpretation, 'Institute stability is constrained by prediction pressure, evidence load and agent availability. ROOT should inspect pending hypotheses before allowing calibration or expansion.')}</p><div className="reading-micro"><span>world vector</span><span>evidence trace</span><span>root route</span></div></div>
            <FloatingList title="Founder Decision Queue" items={queue.length ? queue : predictions} mode="actions" />
          </div>
        </div>

        <footer className="bottom-strip"><span>System Pulse <b>{warnings.length ? 'WATCH' : 'STABLE'}</b></span><span>Signal Quality <b>{pct(confidence)}</b></span><span>Decision Velocity <MicroBarCluster value={queue.length ? 0.65 : 0.32} tone={queue.length ? 'watch' : 'muted'} /></span><span>Institute Capacity <b>DATA GATED</b></span><span>ROOT Notes <b>{text(cognitiveTwin.single_action, 'No critical alerts')}</b></span></footer>
      </section>

      <style jsx>{`
        .root-hi{min-height:100vh;display:grid;grid-template-columns:64px 1fr;background:#020201;color:#e7dcc1;overflow:hidden;font-family:var(--sfi-font-mono),'JetBrains Mono',monospace}.rail{border-right:1px solid rgba(200,169,81,.18);background:linear-gradient(180deg,#050403,#0b0905);display:flex;flex-direction:column;align-items:center;gap:10px;padding:18px 0}.rail-mark{font-family:var(--sfi-font-display),serif;color:#f0cf78;font-size:16px;letter-spacing:.15em;margin-bottom:10px}.rail button{width:36px;height:36px;border:1px solid transparent;background:transparent;color:rgba(231,220,193,.40);font-size:17px;cursor:pointer}.rail button.active{border-color:rgba(240,207,120,.50);color:#f0cf78;background:rgba(200,169,81,.08);box-shadow:0 0 22px rgba(200,169,81,.12)}.rail-line{margin-top:auto;width:1px;height:108px;background:linear-gradient(transparent,#c8a951,transparent);opacity:.32}.canvas{position:relative;min-height:100vh;background:radial-gradient(circle at 50% 42%,rgba(200,169,81,.13),transparent 34%),radial-gradient(circle at 82% 20%,rgba(130,43,33,.12),transparent 30%),linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px),#050504;background-size:100% 100%,100% 100%,34px 34px,34px 34px}.canvas:after{content:'';pointer-events:none;position:absolute;inset:0;background:radial-gradient(circle at center,transparent 46%,rgba(0,0,0,.42) 100%),repeating-linear-gradient(0deg,rgba(255,255,255,.018),rgba(255,255,255,.018) 1px,transparent 1px,transparent 4px);mix-blend-mode:screen;opacity:.34}.topbar{height:58px;border-bottom:1px solid rgba(200,169,81,.18);background:rgba(0,0,0,.56);display:grid;grid-template-columns:230px 1fr 285px;align-items:center;padding:0 22px;gap:14px}.topbar b{display:block;font-size:9px;letter-spacing:.17em;color:#f0cf78;font-weight:500}.topbar span{display:block;margin-top:4px;font-size:7px;letter-spacing:.13em;color:rgba(231,220,193,.46)}.title{text-align:center}.title b{font-size:13px;color:#e7dcc1}.status{text-align:right}.scene{height:calc(100vh - 104px);min-height:700px;display:grid;grid-template-columns:minmax(300px,29%) minmax(540px,1fr) minmax(320px,28%);gap:13px;padding:13px 17px;position:relative;z-index:1}.left-stack,.right-stack{display:grid;gap:8px;align-content:start}.primary-readout,.instrument,.float-panel,.micro-panel{position:relative;border:1px solid rgba(200,169,81,.20);background:linear-gradient(180deg,rgba(17,14,8,.76),rgba(5,4,3,.74));box-shadow:inset 0 1px 0 rgba(240,207,120,.07),0 18px 54px rgba(0,0,0,.30);backdrop-filter:blur(14px)}.primary-readout{padding:13px 14px}.primary-readout span,.instrument-label{font-size:8.5px;letter-spacing:.17em;color:rgba(231,220,193,.46);text-transform:uppercase}.primary-readout>div{display:grid;grid-template-columns:1fr 50px;align-items:center;gap:8px}.primary-readout b{display:block;margin-top:8px;font-size:48px;letter-spacing:-.075em;color:#f5e9ca;line-height:1}.primary-readout em{display:block;margin-top:2px;font-style:normal;font-size:8.5px;letter-spacing:.14em;color:#8e836c;text-transform:uppercase}.micro-grid,.right-micro-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.micro-panel{padding:8px 9px;min-height:54px}.micro-panel>div:first-child{display:flex;justify-content:space-between;gap:8px;align-items:center}.micro-panel span{font-size:7.5px;letter-spacing:.13em;text-transform:uppercase;color:#6f654e}.micro-panel b{font-size:11px;letter-spacing:.08em;font-weight:500}.mini-matrix{display:grid;grid-template-columns:repeat(6,1fr);gap:2px;margin-top:8px}.mini-matrix span{height:4px;background:rgba(200,169,81,.13)}.mini-matrix span.lit{background:#d8b651;box-shadow:0 0 8px rgba(216,182,81,.22)}.instrument{display:grid;grid-template-columns:32px minmax(0,1fr) 110px;gap:9px;align-items:center;padding:8px 10px;min-height:58px}.micro-icon{width:25px;height:25px;color:#8e836c}.micro-icon circle,.micro-icon path,.micro-icon rect{fill:none;stroke:currentColor;stroke-width:1.05;vector-effect:non-scaling-stroke}.instrument-value-row{display:flex;align-items:baseline;gap:8px;margin-top:3px}.instrument-value-row b{font-size:21px;line-height:1;letter-spacing:-.04em}.instrument-value-row span{font-size:8.5px;text-transform:uppercase;letter-spacing:.10em;color:#6f654e}.micro-meta{display:flex;gap:8px;margin-top:5px;font-size:7px;text-transform:uppercase;letter-spacing:.10em;color:#554a35}.signal-line{width:100%;height:24px}.tone-ok{color:#8bd27c}.tone-watch{color:#d8b651}.tone-bad{color:#e36a52}.tone-muted{color:#8e836c}.ring-gauge{width:44px;height:44px}.ring-gauge circle:first-child{fill:none;stroke:rgba(200,169,81,.16);stroke-width:3}.ring-gauge circle:nth-child(2){fill:none;stroke:currentColor;stroke-width:3;transform:rotate(-90deg);transform-origin:20px 20px}.ring-gauge text{fill:currentColor;font-size:7px;font-family:monospace}.core-stage{position:relative;min-height:100%;border:1px solid rgba(200,169,81,.20);background:radial-gradient(circle at center,rgba(240,207,120,.12),transparent 45%),rgba(0,0,0,.16);overflow:hidden}.core-stage:before{content:'';position:absolute;inset:0;background:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);background-size:28px 28px;mask-image:radial-gradient(circle at center,black 38%,transparent 82%)}.stage-title{position:absolute;z-index:2;left:18px;right:18px;top:14px;display:flex;justify-content:space-between;font-size:8.5px;letter-spacing:.15em;text-transform:uppercase;color:#8e836c}.stage-title b{color:#f0cf78;font-weight:500}.stage-corners i{position:absolute;width:42px;height:42px;border-color:rgba(240,207,120,.28);z-index:2}.stage-corners i:nth-child(1){left:14px;top:14px;border-left:1px solid;border-top:1px solid}.stage-corners i:nth-child(2){right:14px;top:14px;border-right:1px solid;border-top:1px solid}.stage-corners i:nth-child(3){left:14px;bottom:14px;border-left:1px solid;border-bottom:1px solid}.stage-corners i:nth-child(4){right:14px;bottom:14px;border-right:1px solid;border-bottom:1px solid}.stage-side{position:absolute;z-index:2;top:42%;display:grid;gap:16px;font-size:7px;letter-spacing:.18em;color:rgba(231,220,193,.32);writing-mode:vertical-rl;text-transform:uppercase}.stage-side.left{left:14px}.stage-side.right{right:14px}.core-svg{position:absolute;inset:5% 2% 8%;width:96%;height:87%;filter:drop-shadow(0 0 28px rgba(200,169,81,.16))}.stage-readout{position:absolute;z-index:2;left:20px;right:20px;bottom:14px;display:flex;justify-content:center;gap:18px;border:1px solid rgba(200,169,81,.16);background:rgba(0,0,0,.45);padding:9px;font-size:8.5px;letter-spacing:.13em;color:#8e836c}.float-panel{padding:10px 12px}.float-panel header{display:flex;justify-content:space-between;gap:10px;border-bottom:1px solid rgba(200,169,81,.10);padding-bottom:8px;margin-bottom:8px}.float-panel header b{font-size:8.5px;letter-spacing:.15em;color:#f0cf78;font-weight:500}.float-panel header span{font-size:7px;letter-spacing:.11em;color:#6f654e;text-transform:uppercase}.list-stack{display:grid;gap:6px}.list-row{display:grid;grid-template-columns:1fr auto;gap:8px;border-bottom:1px solid rgba(200,169,81,.08);padding-bottom:6px}.list-row b{font-size:8.5px;letter-spacing:.11em;text-transform:uppercase;color:#e7dcc1;font-weight:500}.list-row p{margin:3px 0 0;font-size:10px;line-height:1.42;color:#a99d82;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.dot{display:inline-block;width:5px;height:5px;border-radius:99px;background:currentColor;margin-right:7px}.tag{font-size:7px;text-transform:uppercase;letter-spacing:.11em}.row-actions{display:flex;gap:4px;align-items:start}.row-actions button{font-size:7px;letter-spacing:.09em;color:#f0cf78;border:1px solid rgba(200,169,81,.28);background:transparent;padding:3px 5px}.reading p{margin:0;font-size:11.5px;line-height:1.68;color:#b9ad93}.reading-micro{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}.reading-micro span{border:1px solid rgba(200,169,81,.16);padding:4px 6px;font-size:7px;letter-spacing:.1em;color:#6f654e;text-transform:uppercase}.empty{font-size:10px;color:#6f654e;padding:12px 0}.bottom-strip{height:46px;border-top:1px solid rgba(200,169,81,.16);display:grid;grid-template-columns:1fr 1fr 1.1fr 1fr 1.6fr;align-items:center;background:rgba(0,0,0,.58);font-size:8px;letter-spacing:.11em;text-transform:uppercase;color:#6f654e;position:relative;z-index:1}.bottom-strip span{padding:0 14px;border-right:1px solid rgba(200,169,81,.10);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.bottom-strip b{color:#f0cf78;font-weight:500}.bar-cluster{display:inline-flex;gap:2px;margin-left:8px;vertical-align:middle}.bar-cluster span{display:block;width:3px;height:14px;padding:0;border:0;background:currentColor}@media(max-width:1200px){.root-hi{grid-template-columns:54px 1fr}.scene{height:auto;grid-template-columns:1fr}.core-stage{min-height:610px}.topbar{grid-template-columns:1fr;height:auto;gap:8px;padding:12px 16px}.status{text-align:center}.bottom-strip{grid-template-columns:1fr;height:auto}.bottom-strip span{padding:9px 14px}.instrument{grid-template-columns:32px 1fr 100px}}`}</style>
    </main>
  );
}
