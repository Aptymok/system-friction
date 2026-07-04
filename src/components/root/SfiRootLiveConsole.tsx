'use client';

import { useMemo, useState } from 'react';
import type { AgenticRootState } from '@/lib/agents/sfiAgents';
import { buildRootTopologyModel, type RootTopologyNodeId } from './rootTopologyModel';
import { ROOT_VIEW_DEFINITIONS, getRootViewDefinition, type RootViewId } from './rootViews';
import { ROOT_FUNCTIONS_CATALOG, getFunctionAvailability } from './rootFunctionsCatalog';
import { buildRootExpansionModel } from './rootExpansionModel';
import PredictionViewEngine from './engines/predictionViewEngine';
import AgentViewEngine from './engines/agentViewEngine';

type Tone = 'ok' | 'watch' | 'bad' | 'muted';

type DataSnapshot = {
  confidence: number;
  predictions: unknown[];
  graphNodes: unknown[];
  evidence: unknown[];
  amvItems: unknown[];
  warnings: unknown[];
  queue: unknown[];
  agentCount: number;
  worldAgent: Record<string, unknown>;
  systemHealth: Record<string, unknown>;
  amv: Record<string, unknown>;
  cognitiveTwin: Record<string, unknown>;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function asArray(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function text(value: unknown, fallback = 'not_available') { return typeof value === 'string' && value.trim() ? value.trim() : fallback; }
function num(value: unknown, fallback = 0) { const parsed = Number(value ?? fallback); return Number.isFinite(parsed) ? parsed : fallback; }
function bounded(value: unknown, fallback = 0) { return Math.max(0, Math.min(1, num(value, fallback))); }
function pct(value: unknown, fallback = 0) { return `${Math.round(bounded(value, fallback) * 100)}%`; }
function toneClass(tone: Tone) { return tone === 'ok' ? 'tone-ok' : tone === 'bad' ? 'tone-bad' : tone === 'watch' ? 'tone-watch' : 'tone-muted'; }
function statusTone(value: unknown): Tone {
  const raw = text(value, '').toLowerCase();
  if (/(fail|error|critical|degraded|collapsed|missing|deny|reject)/.test(raw)) return 'bad';
  if (/(pending|queued|warn|review|watch|medium|study|hold|partial|gated)/.test(raw)) return 'watch';
  if (/(ok|live|active|stable|operational|observed|available|build|approved)/.test(raw)) return 'ok';
  return 'muted';
}

function Spark({ tone = 'watch', seed = 0 }: { tone?: Tone; seed?: number }) {
  const paths = [
    'M2 20 L14 15 L24 19 L38 9 L50 12 L64 7 L78 15 L92 10 L112 6 L144 11',
    'M2 18 L18 13 L32 18 L46 15 L60 21 L72 8 L88 11 L104 7 L120 14 L144 10',
    'M2 23 L18 21 L30 14 L44 17 L58 11 L70 12 L86 8 L102 15 L120 9 L144 6',
  ];
  return <svg viewBox="0 0 150 28" className={`spark ${toneClass(tone)}`} aria-hidden="true"><path d={paths[seed % paths.length]} fill="none" stroke="currentColor" strokeWidth="1" /><path d="M2 25 L148 25" stroke="currentColor" strokeOpacity="0.16" /></svg>;
}

function RingGauge({ value, tone }: { value: number; tone: Tone }) {
  const dash = Math.round(bounded(value) * 100);
  return <svg viewBox="0 0 40 40" className={`ring ${toneClass(tone)}`} aria-hidden="true"><circle cx="20" cy="20" r="15" /><circle cx="20" cy="20" r="15" pathLength="100" strokeDasharray={`${dash} 100`} /><text x="20" y="22" textAnchor="middle">{dash}</text></svg>;
}

function Matrix({ count }: { count: number }) {
  const lit = Math.max(1, Math.min(18, count || 6));
  return <div className="matrix">{Array.from({ length: 18 }, (_, i) => <span key={i} className={i < lit ? 'lit' : ''} />)}</div>;
}

function Metric({ label, value, meta, tone, index }: { label: string; value: string; meta: string; tone: Tone; index: number }) {
  return <div className="metric"><div className={`metric-icon ${toneClass(tone)}`}>◇</div><div><span>{label}</span><b className={toneClass(tone)}>{value}</b><em>{meta}</em></div><Spark tone={tone} seed={index} /></div>;
}

function MiniPanel({ title, value, tone, count }: { title: string; value: string; tone: Tone; count: number }) {
  return <div className="mini"><div><span>{title}</span><b className={toneClass(tone)}>{value}</b></div><Matrix count={count} /></div>;
}

function FloatingList({ title, items, actions = false }: { title: string; items: unknown[]; actions?: boolean }) {
  return <section className="panel list"><header><b>{title}</b><span>{items.length} records</span></header>{items.slice(0, 7).map((item, index) => { const record = asRecord(item); const label = text(record.action ?? record.label ?? record.hypothesis_id ?? record.id ?? record.theme ?? record.type ?? record.status, `SFI-${index + 1}`); const body = text(record.reason ?? record.description ?? record.prediccion_explicita ?? record.prediction ?? record.summary ?? record.expected_outcome ?? record.source ?? record.status, 'sin descripcion'); const tone = statusTone(record.status ?? record.recommendation ?? record.evidence_state ?? record.estado_observacion ?? record.current_signal_state); return <div className="row" key={`${title}-${index}`}><div><span className={`dot ${toneClass(tone)}`} /><b>{label}</b><p>{body}</p></div>{actions ? <div className="actions"><button>INSPECT</button><button>ROUTE</button></div> : <i className={toneClass(tone)}>{tone}</i>}</div>; })}{items.length === 0 ? <p className="empty">No hay registros disponibles.</p> : null}</section>;
}

function CoreTopology({ viewId, data }: { viewId: RootViewId; data: DataSnapshot }) {
  const view = getRootViewDefinition(viewId);
  const model = useMemo(() => buildRootTopologyModel({ confidence: data.confidence, graphNodeCount: data.graphNodes.length, evidenceCount: data.evidence.length, predictionCount: data.predictions.length, amvCount: data.amvItems.length, queueCount: data.queue.length, warningCount: data.warnings.length, agentCount: data.agentCount }), [data]);
  const byId = Object.fromEntries(model.nodes.map((node) => [node.id, node])) as Record<RootTopologyNodeId, (typeof model.nodes)[number]>;
  const label = viewId === 'founder-governance' ? 'DECIDE' : viewId === 'institute-functions' ? 'TOOLS' : viewId === 'expansion-investigation' ? 'FIELD' : 'SFI';
  return <div className={`core view-${viewId}`}><div className="engine-title"><span>{view.centerTitle}</span><b>{view.centerSubtitle}</b></div><svg viewBox="0 0 100 100" className="core-svg" aria-hidden="true"><defs><radialGradient id={`glow-${viewId}`} cx="50%" cy="50%" r="52%"><stop offset="0%" stopColor="#f4d987" stopOpacity="0.42" /><stop offset="55%" stopColor="#c8a951" stopOpacity="0.10" /><stop offset="100%" stopColor="#000" stopOpacity="0" /></radialGradient></defs><circle cx="50" cy="50" r="47" fill={`url(#glow-${viewId})`} />{model.rings.map((ring, i) => <circle key={ring.id} cx="50" cy="50" r={ring.radius} fill="none" stroke="#c8a951" strokeOpacity={0.12 + ring.weight * 0.30} strokeWidth={i === 3 ? '0.32' : '0.2'} />)}{Array.from({ length: 36 }, (_, i) => { const a = i * 10 * Math.PI / 180; return <line key={i} x1={50 + Math.cos(a) * 42} y1={50 + Math.sin(a) * 42} x2={50 + Math.cos(a) * 48} y2={50 + Math.sin(a) * 48} stroke="#c8a951" strokeOpacity="0.16" strokeWidth="0.16" />; })}{model.microSignals.map((signal) => <circle key={signal.id} cx={signal.x} cy={signal.y} r={signal.radius} fill="#f0cf78" opacity={signal.opacity} />)}{model.edges.map((edge) => { const from = byId[edge.from]; const to = byId[edge.to]; return <line key={edge.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={edge.kind === 'cross' ? '#f0cf78' : '#c8a951'} strokeOpacity={edge.weight * 0.72} strokeWidth={edge.kind === 'cycle' ? '0.34' : '0.18'} />; })}{model.nodes.map((node) => <g key={node.id}><circle cx={node.x} cy={node.y} r="4.2" fill="#060504" stroke="#f0cf78" strokeWidth="0.38" /><text x={node.x} y={node.y - 0.8} textAnchor="middle" fill="#f0cf78" fontSize="1.7" fontFamily="monospace">{node.label}</text><text x={node.x} y={node.y + 2.2} textAnchor="middle" fill="#e7dcc1" fontSize="1.8" fontFamily="monospace">{node.value}</text></g>)}<circle cx="50" cy="50" r="10" fill="#050403" stroke="#f0cf78" strokeWidth="0.5" /><text x="50" y="51" textAnchor="middle" fill="#f0cf78" fontSize="2.7" fontFamily="monospace">{label}</text></svg><div className="readout"><span>nodes {model.nodes.length}</span><span>edges {model.edges.length}</span><span>micro {model.microSignals.length}</span><span>{view.dataClass}</span></div></div>;
}

function CenterStage({ viewId, data }: { viewId: RootViewId; data: DataSnapshot }) {
  if (viewId === 'prediction-registry') return <PredictionViewEngine entries={data.predictions} confidence={data.confidence} />;
  if (viewId === 'agentic-operations') return <AgentViewEngine worldVectorStatus={data.worldAgent.current_signal_state} graphStatus={data.systemHealth.graphStatus} amvStatus={data.amv.status} predictionStatus={data.systemHealth.predictionStatus} providerCount={data.agentCount} amvCount={data.amvItems.length} evidenceCount={data.evidence.length} predictionCount={data.predictions.length} warningCount={data.warnings.length} />;
  return <CoreTopology viewId={viewId} data={data} />;
}

export default function SfiRootLiveConsole({ initialState, worldVector }: { initialState: AgenticRootState; worldVector: unknown }) {
  const [activeView, setActiveView] = useState<RootViewId>('institute-state');
  const view = getRootViewDefinition(activeView);
  const registry = asRecord(initialState.predictionRegistry);
  const graph = asRecord(initialState.neuralGraph);
  const amv = asRecord(initialState.amv);
  const systemHealth = asRecord(initialState.systemHealth);
  const world = asRecord(worldVector);
  const today = asRecord(world.today);
  const observation = asRecord(today.observation);
  const confidence = bounded(observation.confidence, 0.71);
  const data: DataSnapshot = {
    confidence,
    predictions: asArray(registry.entries),
    graphNodes: asArray(graph.nodes),
    evidence: asArray(graph.evidence),
    amvItems: asArray(amv.items),
    warnings: asArray(systemHealth.warnings),
    queue: asArray(initialState.executionQueue),
    agentCount: num(systemHealth.llmProvidersAvailable, 0),
    worldAgent: asRecord(initialState.worldVectorAgent),
    systemHealth,
    amv,
    cognitiveTwin: asRecord(initialState.cognitiveTwin),
  };
  const functionsAvailability = getFunctionAvailability();
  const expansion = useMemo(() => buildRootExpansionModel({ confidence: data.confidence, amvCount: data.amvItems.length, predictionCount: data.predictions.length, evidenceCount: data.evidence.length }), [data.confidence, data.amvItems.length, data.predictions.length, data.evidence.length]);
  const rootTone: Tone = data.warnings.length ? 'watch' : 'ok';
  const agentItems = [
    { label: 'World Vector Agent', description: text(data.worldAgent.current_signal_state), status: data.worldAgent.current_signal_state },
    { label: 'Neural Graph Agent', description: `${data.graphNodes.length} nodes · ${data.evidence.length} evidence`, status: data.systemHealth.graphStatus },
    { label: 'AMV Agent', description: `${data.amvItems.length} memory items`, status: data.amv.status },
    { label: 'Prediction Registry', description: `${data.predictions.length} predictions`, status: data.systemHealth.predictionStatus },
  ];
  const leftItems = activeView === 'prediction-registry' ? data.predictions : activeView === 'agentic-operations' ? agentItems : activeView === 'founder-governance' ? (data.queue.length ? data.queue : data.predictions) : activeView === 'institute-functions' ? ROOT_FUNCTIONS_CATALOG.filter((item) => ['evaluate', 'calculate', 'model'].includes(item.family)) : activeView === 'expansion-investigation' ? expansion.themes : data.evidence;
  const rightItems = activeView === 'agentic-operations' ? agentItems : activeView === 'institute-functions' ? ROOT_FUNCTIONS_CATALOG.filter((item) => ['scorefriction', 'moph', 'vectors', 'evidence'].includes(item.family)) : activeView === 'expansion-investigation' ? expansion.investigations : (data.queue.length ? data.queue : data.predictions);
  const primaryValue = activeView === 'institute-functions' ? pct(functionsAvailability.score) : activeView === 'expansion-investigation' ? pct(expansion.attractorIndex) : data.confidence.toFixed(2);
  const primaryLabel = activeView === 'institute-functions' ? 'Tool availability score' : activeView === 'expansion-investigation' ? 'Attractor persistence index' : 'Institute stability index';

  return <main className="root-hi"><aside className="rail"><div className="rail-mark">SFI</div>{ROOT_VIEW_DEFINITIONS.map((rootView) => <button key={rootView.id} className={activeView === rootView.id ? 'active' : ''} onClick={() => setActiveView(rootView.id)} title={rootView.title}>{rootView.glyph}</button>)}<span className="rail-line" /></aside><section className="canvas"><header className="topbar"><div><b>ROOT ACCESS</b><span>LEVEL OMEGA</span></div><div className="title"><b>{view.title}</b><span>{view.subtitle}</span></div><div className="status"><b>{asRecord(registry.health).ok === true ? 'LIVE' : 'DEGRADED'}</b><span>{initialState.generated_at}</span></div></header><div className="scene"><div className="left-stack"><section className="primary"><span>{view.leftTitle}</span><div><b>{primaryValue}</b><RingGauge value={activeView === 'institute-functions' ? functionsAvailability.score : activeView === 'expansion-investigation' ? expansion.attractorIndex : data.confidence} tone={rootTone} /></div><em>{primaryLabel}</em><Spark tone={rootTone} /></section><div className="micro-grid"><MiniPanel title="View" value={activeView.split('-')[0].toUpperCase()} tone="watch" count={leftItems.length} /><MiniPanel title="Data" value={view.dataClass.toUpperCase()} tone={view.dataClass === 'real' ? 'ok' : 'watch'} count={rightItems.length} /></div><Metric label="Institute Friction" value={`${data.warnings.length}`} meta={data.warnings.length ? 'warnings active' : 'stable'} tone={data.warnings.length ? 'watch' : 'ok'} index={0} /><Metric label="Prediction Pressure" value={`${data.predictions.length}`} meta="registry entries" tone={data.predictions.length ? 'watch' : 'ok'} index={1} /><Metric label="Evidence Load" value={`${data.evidence.length}`} meta="graph evidence" tone={data.evidence.length ? 'watch' : 'muted'} index={2} /><Metric label="Agent Health" value={`${data.agentCount}`} meta="llm providers" tone={data.agentCount > 0 ? 'ok' : 'bad'} index={3} /><Metric label="AMV Memory" value={`${data.amvItems.length}`} meta={text(data.amv.status, 'memory')} tone={data.amvItems.length ? 'ok' : 'watch'} index={4} /><Metric label="Signal Quality" value={pct(data.confidence)} meta="world vector" tone={data.confidence > 0.72 ? 'ok' : 'watch'} index={5} /></div><CenterStage viewId={activeView} data={data} /><div className="right-stack"><div className="micro-grid"><MiniPanel title="Hub" value={activeView.split('-')[0].toUpperCase()} tone="watch" count={rightItems.length} /><MiniPanel title="Queue" value={`${data.queue.length}`} tone={data.queue.length ? 'watch' : 'muted'} count={data.queue.length} /></div><FloatingList title={view.rightTitle} items={rightItems} actions={activeView === 'founder-governance' || activeView === 'prediction-registry'} /><section className="panel reading"><header><b>{view.readingTitle}</b><span>{view.dataClass}</span></header><p>{activeView === 'institute-functions' ? 'The functional matrix separates available instruments from partial and gated capabilities.' : activeView === 'expansion-investigation' ? 'Expansion is represented as a derived opportunity field based on confidence, memory, prediction load and evidence availability.' : text(data.worldAgent.root_interpretation ?? observation.interpretation, 'Institute stability is constrained by prediction pressure, evidence load and agent availability.')}</p><div className="chips"><span>source traced</span><span>derived allowed</span><span>gated marked</span></div></section><FloatingList title={activeView === 'expansion-investigation' ? 'Research Queue' : 'Founder Decision Queue'} items={activeView === 'expansion-investigation' ? expansion.investigations : (data.queue.length ? data.queue : data.predictions)} actions /></div></div><footer className="bottom-strip"><span>System Pulse <b>{data.warnings.length ? 'WATCH' : 'STABLE'}</b></span><span>Signal Quality <b>{pct(data.confidence)}</b></span><span>Decision Velocity <b>{data.queue.length ? 'ROUTING' : 'LOW'}</b></span><span>Institute Capacity <b>{activeView === 'institute-functions' ? pct(functionsAvailability.score) : 'DATA GATED'}</b></span><span>ROOT Notes <b>{text(data.cognitiveTwin.single_action, 'No critical alerts')}</b></span></footer></section><style jsx>{`
.root-hi{min-height:100vh;display:grid;grid-template-columns:64px 1fr;background:#020201;color:#e7dcc1;overflow:hidden;font-family:var(--sfi-font-mono),'JetBrains Mono',monospace}.rail{border-right:1px solid rgba(200,169,81,.18);background:linear-gradient(180deg,#050403,#0b0905);display:flex;flex-direction:column;align-items:center;gap:10px;padding:18px 0}.rail-mark{font-family:var(--sfi-font-display),serif;color:#f0cf78;font-size:16px;letter-spacing:.15em;margin-bottom:10px}.rail button{width:36px;height:36px;border:1px solid transparent;background:transparent;color:rgba(231,220,193,.40);font-size:17px;cursor:pointer}.rail button.active{border-color:rgba(240,207,120,.50);color:#f0cf78;background:rgba(200,169,81,.08);box-shadow:0 0 22px rgba(200,169,81,.12)}.rail-line{margin-top:auto;width:1px;height:108px;background:linear-gradient(transparent,#c8a951,transparent);opacity:.32}.canvas{position:relative;min-height:100vh;background:radial-gradient(circle at 50% 42%,rgba(200,169,81,.13),transparent 34%),radial-gradient(circle at 82% 20%,rgba(130,43,33,.12),transparent 30%),linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px),#050504;background-size:100% 100%,100% 100%,34px 34px,34px 34px}.canvas:after{content:'';pointer-events:none;position:absolute;inset:0;background:radial-gradient(circle at center,transparent 46%,rgba(0,0,0,.42) 100%),repeating-linear-gradient(0deg,rgba(255,255,255,.018),rgba(255,255,255,.018) 1px,transparent 1px,transparent 4px);mix-blend-mode:screen;opacity:.34}.topbar{height:58px;border-bottom:1px solid rgba(200,169,81,.18);background:rgba(0,0,0,.56);display:grid;grid-template-columns:230px 1fr 285px;align-items:center;padding:0 22px;gap:14px}.topbar b{display:block;font-size:9px;letter-spacing:.17em;color:#f0cf78;font-weight:500}.topbar span{display:block;margin-top:4px;font-size:7px;letter-spacing:.13em;color:rgba(231,220,193,.46)}.title{text-align:center}.title b{font-size:13px;color:#e7dcc1}.status{text-align:right}.scene{height:calc(100vh - 104px);min-height:700px;display:grid;grid-template-columns:minmax(300px,29%) minmax(540px,1fr) minmax(320px,28%);gap:13px;padding:13px 17px;position:relative;z-index:1}.left-stack,.right-stack{display:grid;gap:8px;align-content:start}.primary,.metric,.panel,.mini,.core,.prediction-engine,.agent-engine{position:relative;border:1px solid rgba(200,169,81,.20);background:linear-gradient(180deg,rgba(17,14,8,.76),rgba(5,4,3,.74));box-shadow:inset 0 1px 0 rgba(240,207,120,.07),0 18px 54px rgba(0,0,0,.30);backdrop-filter:blur(14px)}.primary{padding:13px 14px}.primary span,.metric span{font-size:8.5px;letter-spacing:.17em;color:rgba(231,220,193,.46);text-transform:uppercase}.primary>div{display:grid;grid-template-columns:1fr 50px;align-items:center;gap:8px}.primary b{display:block;margin-top:8px;font-size:44px;letter-spacing:-.075em;color:#f5e9ca;line-height:1}.primary em,.metric em{display:block;font-style:normal;font-size:8px;letter-spacing:.12em;color:#6f654e;text-transform:uppercase}.micro-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.mini{padding:8px 9px;min-height:54px}.mini>div{display:flex;justify-content:space-between;gap:8px;align-items:center}.mini span{font-size:7.5px;letter-spacing:.13em;text-transform:uppercase;color:#6f654e}.mini b{font-size:11px;letter-spacing:.08em;font-weight:500}.matrix{display:grid;grid-template-columns:repeat(6,1fr);gap:2px;margin-top:8px}.matrix span{height:4px;background:rgba(200,169,81,.13)}.matrix span.lit{background:#d8b651;box-shadow:0 0 8px rgba(216,182,81,.22)}.metric{display:grid;grid-template-columns:32px minmax(0,1fr) 110px;gap:9px;align-items:center;padding:8px 10px;min-height:58px}.metric-icon{width:25px;height:25px;display:grid;place-items:center;color:#8e836c;border:1px solid rgba(200,169,81,.18);font-size:13px}.metric b{display:block;font-size:21px;line-height:1;letter-spacing:-.04em}.spark{width:100%;height:24px}.tone-ok{color:#8bd27c}.tone-watch{color:#d8b651}.tone-bad{color:#e36a52}.tone-muted{color:#8e836c}.ring{width:44px;height:44px}.ring circle:first-child{fill:none;stroke:rgba(200,169,81,.16);stroke-width:3}.ring circle:nth-child(2){fill:none;stroke:currentColor;stroke-width:3;transform:rotate(-90deg);transform-origin:20px 20px}.ring text{fill:currentColor;font-size:7px;font-family:monospace}.core,.prediction-engine,.agent-engine{min-height:100%;overflow:hidden;background:radial-gradient(circle at center,rgba(240,207,120,.12),transparent 45%),rgba(0,0,0,.16)}.core:before,.prediction-engine:before,.agent-engine:before{content:'';position:absolute;inset:0;background:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);background-size:28px 28px;mask-image:radial-gradient(circle at center,black 38%,transparent 82%)}.engine-title{position:absolute;z-index:2;left:18px;right:18px;top:14px;display:flex;justify-content:space-between;font-size:8.5px;letter-spacing:.15em;text-transform:uppercase;color:#8e836c}.engine-title b{color:#f0cf78;font-weight:500}.core-svg{position:absolute;inset:5% 2% 8%;width:96%;height:87%;filter:drop-shadow(0 0 28px rgba(200,169,81,.16))}.prediction-svg,.agent-svg{position:absolute;left:5%;right:5%;top:16%;width:90%;height:62%;filter:drop-shadow(0 0 24px rgba(200,169,81,.15))}.readout,.prediction-readout,.agent-readout{position:absolute;z-index:2;left:20px;right:20px;bottom:14px;display:flex;justify-content:center;gap:18px;border:1px solid rgba(200,169,81,.16);background:rgba(0,0,0,.45);padding:9px;font-size:8.5px;letter-spacing:.13em;color:#8e836c;text-transform:uppercase}.readout b,.prediction-readout b,.agent-readout b{color:#f0cf78}.panel{padding:10px 12px}.panel header{display:flex;justify-content:space-between;gap:10px;border-bottom:1px solid rgba(200,169,81,.10);padding-bottom:8px;margin-bottom:8px}.panel header b{font-size:8.5px;letter-spacing:.15em;color:#f0cf78;font-weight:500}.panel header span{font-size:7px;letter-spacing:.11em;color:#6f654e;text-transform:uppercase}.row{display:grid;grid-template-columns:1fr auto;gap:8px;border-bottom:1px solid rgba(200,169,81,.08);padding:0 0 6px;margin-bottom:6px}.row b{font-size:8.5px;letter-spacing:.11em;text-transform:uppercase;color:#e7dcc1;font-weight:500}.row p{margin:3px 0 0;font-size:10px;line-height:1.42;color:#a99d82;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.dot{display:inline-block;width:5px;height:5px;border-radius:99px;background:currentColor;margin-right:7px}.row i{font-size:7px;text-transform:uppercase;letter-spacing:.11em;font-style:normal}.actions{display:flex;gap:4px;align-items:start}.actions button{font-size:7px;letter-spacing:.09em;color:#f0cf78;border:1px solid rgba(200,169,81,.28);background:transparent;padding:3px 5px}.reading p{margin:0;font-size:11.5px;line-height:1.68;color:#b9ad93}.chips{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}.chips span{border:1px solid rgba(200,169,81,.16);padding:4px 6px;font-size:7px;letter-spacing:.1em;color:#6f654e;text-transform:uppercase}.empty{font-size:10px;color:#6f654e;padding:12px 0}.bottom-strip{height:46px;border-top:1px solid rgba(200,169,81,.16);display:grid;grid-template-columns:1fr 1fr 1.1fr 1fr 1.6fr;align-items:center;background:rgba(0,0,0,.58);font-size:8px;letter-spacing:.11em;text-transform:uppercase;color:#6f654e;position:relative;z-index:1}.bottom-strip span{padding:0 14px;border-right:1px solid rgba(200,169,81,.10);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.bottom-strip b{color:#f0cf78;font-weight:500}@media(max-width:1200px){.root-hi{grid-template-columns:54px 1fr}.scene{height:auto;grid-template-columns:1fr}.core,.prediction-engine,.agent-engine{min-height:610px}.topbar{grid-template-columns:1fr;height:auto;gap:8px;padding:12px 16px}.status{text-align:center}.bottom-strip{grid-template-columns:1fr;height:auto}.bottom-strip span{padding:9px 14px}.metric{grid-template-columns:32px 1fr 100px}}`}</style></main>;
}
