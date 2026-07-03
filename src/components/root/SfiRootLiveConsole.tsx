'use client';

import { useMemo, useState } from 'react';
import type { AgenticRootState } from '@/lib/agents/sfiAgents';

type HubId = 'total' | 'predictions' | 'agents' | 'founder' | 'world';
type Tone = 'ok' | 'watch' | 'bad' | 'muted';

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

function SignalLine({ tone = 'watch' }: { tone?: Tone }) {
  return (
    <svg viewBox="0 0 150 34" className={`signal-line ${toneClass(tone)}`} aria-hidden="true">
      <path d="M2 24 L14 22 L24 25 L36 14 L48 18 L61 8 L73 15 L88 12 L104 6 L118 13 L146 9" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2 30 L148 30" stroke="currentColor" strokeOpacity="0.22" />
    </svg>
  );
}

function MetricInstrument({ label, value, meta, tone }: { label: string; value: string; meta: string; tone: Tone }) {
  return (
    <div className="instrument">
      <div className="instrument-glyph"><span className={toneClass(tone)}>◆</span></div>
      <div className="instrument-body">
        <div className="instrument-label">{label}</div>
        <div className={`instrument-value ${toneClass(tone)}`}>{value}</div>
        <div className="instrument-meta">{meta}</div>
      </div>
      <SignalLine tone={tone} />
    </div>
  );
}

function FloatingList({ title, items, mode }: { title: string; items: unknown[]; mode?: 'actions' | 'log' }) {
  return (
    <div className="float-panel list-panel">
      <header><b>{title}</b><span>{items.length} records</span></header>
      <div className="list-stack">
        {items.slice(0, 5).map((item, index) => {
          const record = asRecord(item);
          const label = text(record.action ?? record.hypothesis_id ?? record.id ?? record.type ?? record.status, `SFI-${index + 1}`);
          const body = text(record.reason ?? record.prediccion_explicita ?? record.prediction ?? record.summary ?? record.expected_outcome ?? record.status, 'sin descripcion');
          const tone = statusTone(record.status ?? record.evidence_state ?? record.estado_observacion ?? record.current_signal_state);
          return (
            <div className="list-row" key={`${title}-${index}`}>
              <div>
                <span className={`dot ${toneClass(tone)}`} />
                <b>{label}</b>
                <p>{body}</p>
              </div>
              {mode === 'actions' ? <div className="row-actions"><button>INSPECT</button><button>ROUTE</button></div> : <span className={`tag ${toneClass(tone)}`}>{tone}</span>}
            </div>
          );
        })}
        {items.length === 0 ? <div className="empty">No hay registros disponibles para este hub.</div> : null}
      </div>
    </div>
  );
}

function CoreTopology({ confidence, graphNodes, evidenceCount, predictionCount, amvCount }: { confidence: number; graphNodes: number; evidenceCount: number; predictionCount: number; amvCount: number }) {
  const nodes = useMemo(() => [
    { label: 'GRAPH', x: 50, y: 12, value: graphNodes },
    { label: 'PRED', x: 82, y: 30, value: predictionCount },
    { label: 'AMV', x: 78, y: 70, value: amvCount },
    { label: 'ROOT', x: 50, y: 88, value: Math.round(confidence * 100) },
    { label: 'EVID', x: 22, y: 70, value: evidenceCount },
    { label: 'WORLD', x: 18, y: 30, value: Math.round(confidence * 100) },
  ], [amvCount, confidence, evidenceCount, graphNodes, predictionCount]);

  return (
    <div className="core-stage">
      <div className="stage-title"><span>INTERNAL OBSERVATORY</span><b>ROOT OBSERVING SELF</b></div>
      <svg viewBox="0 0 100 100" className="core-svg" aria-hidden="true">
        <defs>
          <radialGradient id="rootGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f0cf78" stopOpacity="0.46" />
            <stop offset="55%" stopColor="#c8a951" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="46" fill="url(#rootGlow)" />
        {[14, 22, 30, 38, 46].map((r) => <circle key={r} cx="50" cy="50" r={r} fill="none" stroke="#c8a951" strokeOpacity={r === 30 ? '0.46' : '0.22'} strokeWidth="0.35" />)}
        {nodes.map((node, index) => {
          const next = nodes[(index + 1) % nodes.length];
          const cross = nodes[(index + 2) % nodes.length];
          return <g key={`edge-${node.label}`}><line x1={node.x} y1={node.y} x2={next.x} y2={next.y} stroke="#c8a951" strokeOpacity="0.55" strokeWidth="0.42" /><line x1={node.x} y1={node.y} x2={cross.x} y2={cross.y} stroke="#f0cf78" strokeOpacity="0.20" strokeWidth="0.24" /><line x1="50" y1="50" x2={node.x} y2={node.y} stroke="#c8a951" strokeOpacity="0.34" strokeWidth="0.34" /></g>;
        })}
        {nodes.map((node) => <g key={node.label}><circle cx={node.x} cy={node.y} r="5" fill="#070605" stroke="#f0cf78" strokeOpacity="0.86" strokeWidth="0.55" /><text x={node.x} y={node.y - 0.6} textAnchor="middle" fill="#f0cf78" fontSize="2.1" fontFamily="monospace">{node.label}</text><text x={node.x} y={node.y + 2.6} textAnchor="middle" fill="#e7dcc1" fontSize="2.2" fontFamily="monospace">{node.value}</text></g>)}
        <circle cx="50" cy="50" r="9.4" fill="#050403" stroke="#f0cf78" strokeWidth="0.75" />
        <circle cx="50" cy="50" r="6.7" fill="none" stroke="#c8a951" strokeOpacity="0.45" strokeWidth="0.35" />
        <text x="50" y="49" textAnchor="middle" fill="#f0cf78" fontSize="3.4" fontFamily="monospace">SFI</text>
        <text x="50" y="53" textAnchor="middle" fill="#a99d82" fontSize="2.1" fontFamily="monospace">CORE</text>
      </svg>
      <div className="stage-readout">
        <span>CONFIDENCE {pct(confidence)}</span><span>GRAPH {graphNodes}</span><span>EVIDENCE {evidenceCount}</span><span>PREDICTIONS {predictionCount}</span>
      </div>
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
  const confidence = bounded(observation.confidence, 0.71);
  const agentCount = num(systemHealth.llmProvidersAvailable, 0);

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
            <div className="primary-readout"><span>TOTAL INSTITUTE STATE</span><b>{confidence.toFixed(2)}</b><em>Institute stability index</em><SignalLine tone={confidence > 0.72 ? 'ok' : 'watch'} /></div>
            <MetricInstrument label="Institute Friction" value={warnings.length ? `${warnings.length}` : '0'} meta={warnings.length ? 'warnings active' : 'stable'} tone={warnings.length ? 'watch' : 'ok'} />
            <MetricInstrument label="Prediction Pressure" value={`${predictions.length}`} meta="registry entries" tone={predictions.length ? 'watch' : 'ok'} />
            <MetricInstrument label="Evidence Load" value={`${evidence.length}`} meta="graph evidence" tone={evidence.length ? 'watch' : 'muted'} />
            <MetricInstrument label="Agent Health" value={`${agentCount}`} meta="llm providers" tone={agentCount > 0 ? 'ok' : 'bad'} />
            <MetricInstrument label="AMV Memory" value={`${amvItems.length}`} meta={text(amv.status, 'memory')} tone={amvItems.length ? 'ok' : 'watch'} />
          </div>

          <CoreTopology confidence={confidence} graphNodes={graphNodes.length} evidenceCount={evidence.length} predictionCount={predictions.length} amvCount={amvItems.length} />

          <div className="right-stack">
            <FloatingList title={activeHub === 'predictions' ? 'Prediction Registry' : activeHub === 'agents' ? 'Agentic Operations' : 'Active Proposals'} items={activeItems} mode={activeHub === 'founder' ? 'actions' : 'log'} />
            <div className="float-panel reading"><header><b>READING OF THE DAY</b><span>SYSTEMIC REFLECTION</span></header><p>{text(worldAgent.root_interpretation ?? observation.interpretation, 'Institute stability is constrained by prediction pressure, evidence load and agent availability. ROOT should inspect pending hypotheses before allowing calibration or expansion.')}</p></div>
            <FloatingList title="Founder Decision Queue" items={queue.length ? queue : predictions} mode="actions" />
          </div>
        </div>

        <footer className="bottom-strip"><span>System Pulse <b>{warnings.length ? 'WATCH' : 'STABLE'}</b></span><span>Signal Quality <b>{pct(confidence)}</b></span><span>Decision Velocity <b>DATA GATED</b></span><span>Institute Capacity <b>DATA GATED</b></span><span>ROOT Notes <b>{text(asRecord(initialState.cognitiveTwin).single_action, 'No critical alerts')}</b></span></footer>
      </section>

      <style jsx>{`
        .root-hi{min-height:100vh;display:grid;grid-template-columns:74px 1fr;background:#020201;color:#e7dcc1;overflow:hidden;font-family:var(--sfi-font-mono),'JetBrains Mono',monospace}.rail{border-right:1px solid rgba(200,169,81,.2);background:linear-gradient(180deg,#050403,#0b0905);display:flex;flex-direction:column;align-items:center;gap:12px;padding:20px 0}.rail-mark{font-family:var(--sfi-font-display),serif;color:#f0cf78;font-size:18px;letter-spacing:.16em;margin-bottom:12px}.rail button{width:42px;height:42px;border:1px solid transparent;background:transparent;color:rgba(231,220,193,.42);font-size:19px;cursor:pointer}.rail button.active{border-color:rgba(240,207,120,.55);color:#f0cf78;background:rgba(200,169,81,.08);box-shadow:0 0 26px rgba(200,169,81,.12)}.rail-line{margin-top:auto;width:1px;height:120px;background:linear-gradient(transparent,#c8a951,transparent);opacity:.35}.canvas{position:relative;min-height:100vh;background:radial-gradient(circle at 50% 42%,rgba(200,169,81,.13),transparent 34%),radial-gradient(circle at 82% 20%,rgba(130,43,33,.12),transparent 30%),linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px),#050504;background-size:100% 100%,100% 100%,46px 46px,46px 46px}.topbar{height:70px;border-bottom:1px solid rgba(200,169,81,.2);background:rgba(0,0,0,.52);display:grid;grid-template-columns:260px 1fr 300px;align-items:center;padding:0 28px;gap:18px}.topbar b{display:block;font-size:10px;letter-spacing:.18em;color:#f0cf78;font-weight:500}.topbar span{display:block;margin-top:5px;font-size:8px;letter-spacing:.14em;color:rgba(231,220,193,.46)}.title{text-align:center}.title b{font-size:14px;color:#e7dcc1}.status{text-align:right}.scene{height:calc(100vh - 118px);min-height:720px;display:grid;grid-template-columns:minmax(320px,31%) minmax(520px,1fr) minmax(320px,28%);gap:18px;padding:18px 22px}.left-stack,.right-stack{display:grid;gap:12px;align-content:start}.primary-readout,.instrument,.float-panel{position:relative;border:1px solid rgba(200,169,81,.22);background:linear-gradient(180deg,rgba(17,14,8,.78),rgba(5,4,3,.76));box-shadow:inset 0 1px 0 rgba(240,207,120,.08),0 20px 60px rgba(0,0,0,.32);backdrop-filter:blur(14px)}.primary-readout{padding:18px}.primary-readout span,.instrument-label{font-size:10px;letter-spacing:.18em;color:rgba(231,220,193,.46);text-transform:uppercase}.primary-readout b{display:block;margin-top:10px;font-size:64px;letter-spacing:-.08em;color:#f5e9ca;line-height:1}.primary-readout em{display:block;margin-top:5px;font-style:normal;font-size:10px;letter-spacing:.14em;color:#8e836c;text-transform:uppercase}.instrument{display:grid;grid-template-columns:46px 1fr 132px;gap:12px;align-items:center;padding:13px}.instrument-glyph{width:34px;height:34px;border:1px solid rgba(200,169,81,.25);display:grid;place-items:center;background:rgba(0,0,0,.26)}.instrument-value{font-size:27px;line-height:1;margin-top:5px;letter-spacing:-.04em}.instrument-meta{font-size:9px;text-transform:uppercase;letter-spacing:.12em;color:#6f654e;margin-top:4px}.signal-line{width:100%;height:30px}.tone-ok{color:#8bd27c}.tone-watch{color:#d8b651}.tone-bad{color:#e36a52}.tone-muted{color:#8e836c}.core-stage{position:relative;min-height:100%;border:1px solid rgba(200,169,81,.2);background:radial-gradient(circle at center,rgba(240,207,120,.12),transparent 45%),rgba(0,0,0,.18);overflow:hidden}.core-stage:before{content:'';position:absolute;inset:0;background:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);background-size:32px 32px;mask-image:radial-gradient(circle at center,black 40%,transparent 82%)}.stage-title{position:absolute;z-index:2;left:22px;right:22px;top:18px;display:flex;justify-content:space-between;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#8e836c}.stage-title b{color:#f0cf78;font-weight:500}.core-svg{position:absolute;inset:7% 4% 9%;width:92%;height:84%;filter:drop-shadow(0 0 26px rgba(200,169,81,.16))}.stage-readout{position:absolute;z-index:2;left:26px;right:26px;bottom:18px;display:flex;justify-content:center;gap:22px;border:1px solid rgba(200,169,81,.18);background:rgba(0,0,0,.45);padding:12px;font-size:10px;letter-spacing:.14em;color:#8e836c}.float-panel{padding:14px}.float-panel header{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid rgba(200,169,81,.10);padding-bottom:10px;margin-bottom:10px}.float-panel header b{font-size:10px;letter-spacing:.16em;color:#f0cf78;font-weight:500}.float-panel header span{font-size:8px;letter-spacing:.12em;color:#6f654e;text-transform:uppercase}.list-stack{display:grid;gap:8px}.list-row{display:grid;grid-template-columns:1fr auto;gap:10px;border-bottom:1px solid rgba(200,169,81,.08);padding-bottom:8px}.list-row b{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#e7dcc1;font-weight:500}.list-row p{margin:4px 0 0;font-size:11px;line-height:1.45;color:#a99d82;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.dot{display:inline-block;width:6px;height:6px;border-radius:99px;background:currentColor;margin-right:8px}.tag{font-size:8px;text-transform:uppercase;letter-spacing:.12em}.row-actions{display:flex;gap:5px;align-items:start}.row-actions button{font-size:8px;letter-spacing:.1em;color:#f0cf78;border:1px solid rgba(200,169,81,.32);background:transparent;padding:4px 6px}.reading p{margin:0;font-size:13px;line-height:1.75;color:#b9ad93}.empty{font-size:11px;color:#6f654e;padding:14px 0}.bottom-strip{height:48px;border-top:1px solid rgba(200,169,81,.18);display:grid;grid-template-columns:repeat(5,1fr);align-items:center;background:rgba(0,0,0,.55);font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:#6f654e}.bottom-strip span{padding:0 18px;border-right:1px solid rgba(200,169,81,.12);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.bottom-strip b{color:#f0cf78;font-weight:500}@media(max-width:1200px){.scene{height:auto;grid-template-columns:1fr}.core-stage{min-height:600px}.topbar{grid-template-columns:1fr}.status{text-align:center}.bottom-strip{grid-template-columns:1fr;height:auto}.bottom-strip span{padding:10px 18px}}`}</style>
    </main>
  );
}
