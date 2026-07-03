'use client';

import { useMemo, useState } from 'react';
import type { AgenticRootState } from '@/lib/agents/sfiAgents';

type HubId = 'total' | 'predictions' | 'agents' | 'founder' | 'world';

type Tone = 'stable' | 'watch' | 'critical';

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

function pct(value: unknown, fallback = 0) {
  const bounded = Math.max(0, Math.min(1, num(value, fallback)));
  return `${Math.round(bounded * 100)}%`;
}

function Sparkline({ tone = 'watch' }: { tone?: Tone }) {
  const stroke = tone === 'stable' ? '#8bd27c' : tone === 'critical' ? '#e36a52' : '#d8b651';
  return <svg viewBox="0 0 112 28" className="h-7 w-full opacity-90" aria-hidden="true"><path d="M0 18 L10 16 L18 19 L28 9 L38 14 L49 7 L59 13 L70 11 L82 5 L94 10 L112 7" fill="none" stroke={stroke} strokeWidth="1.5" /><path d="M0 26 L112 26" stroke="#3a2c14" strokeWidth="1" /></svg>;
}

function ShellMetric({ label, value, state = 'watch' }: { label: string; value: string; state?: Tone }) {
  const stateClass = state === 'stable' ? 'text-emerald-200' : state === 'critical' ? 'text-red-200' : 'text-amber-200';
  return (
    <div className="border border-[#2d2618] bg-black/45 p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8e836c]">{label}</div>
      <div className={`mt-3 font-mono text-3xl tracking-[-0.06em] ${stateClass}`}>{value}</div>
      <div className="mt-3 h-1 bg-[#241c10]"><div className="h-1 w-2/3 bg-[#d4af37]" /></div>
    </div>
  );
}

function DataPanel({ title, items }: { title: string; items: unknown[] }) {
  return (
    <div className="border border-[#2d2618] bg-black/45 p-4">
      <div className="mb-3 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.16em]"><span className="text-[#d4af37]">{title}</span><span className="text-[#6f654e]">{items.length} records</span></div>
      <div className="space-y-2">
        {items.slice(0, 6).map((item, index) => {
          const record = asRecord(item);
          const label = text(record.action ?? record.hypothesis_id ?? record.id ?? record.type, `item_${index + 1}`);
          const body = text(record.reason ?? record.prediccion_explicita ?? record.prediction ?? record.summary ?? record.expected_outcome ?? record.status, 'sin descripcion');
          return <div key={`${title}-${index}`} className="border-b border-[#1d1810] pb-2 last:border-b-0"><div className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#f4ead0]">{label}</div><div className="mt-1 line-clamp-2 text-xs leading-5 text-[#a99d82]">{body}</div></div>;
        })}
        {items.length === 0 ? <div className="py-6 text-xs text-[#6f654e]">No hay registros disponibles.</div> : null}
      </div>
    </div>
  );
}

function InternalTopology() {
  const points = [{x:50,y:16},{x:82,y:34},{x:76,y:72},{x:50,y:86},{x:24,y:72},{x:18,y:34}];
  return (
    <div className="relative min-h-[520px] overflow-hidden border border-[#2d2618] bg-[#070706]/90">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.14),transparent_42%),linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:100%_100%,42px_42px,42px_42px]" />
      <div className="relative flex items-center justify-between border-b border-[#2d2618] px-5 py-4"><div className="font-mono text-[12px] uppercase tracking-[0.18em] text-[#d4af37]">Institute Topology · Internal Observatory</div><div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8e836c]">SYSTEMIC VIEW</div></div>
      <svg viewBox="0 0 100 100" className="absolute inset-x-0 top-14 mx-auto h-[calc(100%-110px)] w-full max-w-[760px]" aria-hidden="true">
        {[12, 20, 28, 36, 44].map((r) => <circle key={r} cx="50" cy="50" r={r} fill="none" stroke="#5b481f" strokeOpacity="0.38" strokeWidth="0.35" />)}
        {points.map((point, index) => <g key={index}><line x1="50" y1="50" x2={point.x} y2={point.y} stroke="#d4af37" strokeOpacity="0.42" strokeWidth="0.45" /><line x1={point.x} y1={point.y} x2={points[(index + 1) % points.length].x} y2={points[(index + 1) % points.length].y} stroke="#d4af37" strokeOpacity="0.7" strokeWidth="0.55" /><circle cx={point.x} cy={point.y} r="3.9" fill="#090806" stroke="#d4af37" strokeOpacity="0.95" strokeWidth="0.55" /></g>)}
        <circle cx="50" cy="50" r="8.5" fill="#080806" stroke="#d4af37" strokeWidth="0.65" />
        <text x="50" y="49" textAnchor="middle" fill="#d4af37" fontSize="3.2" fontFamily="monospace">ROOT</text>
        <text x="50" y="53" textAnchor="middle" fill="#a99d82" fontSize="2.2" fontFamily="monospace">OBSERVING SELF</text>
      </svg>
      <div className="absolute inset-x-8 bottom-5 flex flex-wrap justify-center gap-5 border border-[#2d2618] bg-black/50 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[#8e836c]"><span>Stable</span><span>Watch</span><span>Degraded</span><span>Critical</span><span>No signal</span></div>
    </div>
  );
}

export default function SfiRootLiveConsole({ initialState, worldVector }: { initialState: AgenticRootState; worldVector: unknown }) {
  const [activeHub, setActiveHub] = useState<HubId>('total');
  const registry = asRecord(initialState.predictionRegistry);
  const health = asRecord(registry.health);
  const predictions = asArray(registry.entries);
  const graph = asRecord(initialState.neuralGraph);
  const evidence = asArray(graph.evidence);
  const amv = asRecord(initialState.amv);
  const amvItems = asArray(amv.items);
  const systemHealth = asRecord(initialState.systemHealth);
  const warnings = asArray(systemHealth.warnings);
  const queue = asArray(initialState.executionQueue);
  const world = asRecord(worldVector);
  const today = asRecord(world.today);
  const observation = asRecord(today.observation);
  const confidence = num(observation.confidence, 0.71);

  const hubItems: Array<{ id: HubId; label: string; glyph: string }> = [
    { id: 'total', label: 'Estado total', glyph: '◎' },
    { id: 'predictions', label: 'Predicciones', glyph: '◇' },
    { id: 'agents', label: 'Agentes', glyph: '✦' },
    { id: 'founder', label: 'Fundador', glyph: '⬡' },
    { id: 'world', label: 'World Vector', glyph: '⌁' },
  ];

  const visibleItems = useMemo(() => {
    if (activeHub === 'predictions') return predictions;
    if (activeHub === 'founder') return queue.length ? queue : predictions;
    return evidence;
  }, [activeHub, evidence, predictions, queue]);

  return (
    <main className="min-h-screen bg-[#030302] text-[#f4ead0]">
      <div className="grid min-h-screen grid-cols-[74px_1fr] grid-rows-[66px_1fr_34px]">
        <header className="col-span-2 grid grid-cols-[280px_1fr_520px] items-center border-b border-[#2d2618] bg-black/75 px-6"><div className="flex items-center gap-3"><div className="font-serif text-4xl tracking-[-0.08em] text-[#d4af37]">SFI</div><div className="font-mono text-[10px] uppercase leading-4 tracking-[0.14em] text-[#8e836c]">System Friction<br />Institute</div></div><div className="text-center font-mono text-lg uppercase tracking-[0.24em] text-[#e7d8b3]">SFI ROOT · Live Institute Console</div><div className="grid grid-cols-3 items-center gap-5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#8e836c]"><div><b className="block text-[#d4af37]">Root Access</b>Level Omega</div><div><b className="block text-[#d4af37]">Generated</b>{initialState.generated_at}</div><div><b className="block text-[#8bd27c]">Status</b>{health.ok === true ? 'live' : 'degraded'}</div></div></header>
        <aside className="row-span-2 flex flex-col items-center gap-4 border-r border-[#2d2618] bg-black/70 py-7 text-[#8e836c]">{hubItems.map((hub) => <button key={hub.id} type="button" onClick={() => setActiveHub(hub.id)} className={`grid h-10 w-10 place-items-center border text-lg ${activeHub === hub.id ? 'border-[#d4af37] text-[#d4af37]' : 'border-transparent text-[#8e836c]'}`} title={hub.label}>{hub.glyph}</button>)}</aside>
        <section className="grid gap-4 bg-[radial-gradient(circle_at_50%_42%,rgba(212,175,55,0.10),transparent_35%)] p-4 xl:grid-cols-[31%_44%_25%]">
          <div className="grid gap-3"><div className="border border-[#2d2618] bg-[#080806]/85 p-4"><div className="font-mono text-[12px] uppercase tracking-[0.18em] text-[#d4af37]">Total Institute State</div><div className="mt-3 text-xs uppercase tracking-[0.16em] text-[#8e836c]">Institute Stability Index</div><div className="mt-4 grid grid-cols-[128px_1fr] items-center gap-5"><div className="font-mono text-6xl tracking-[-0.08em] text-[#f5e9ca]">{confidence.toFixed(2)}</div><Sparkline tone={confidence > 0.7 ? 'stable' : 'watch'} /></div></div><ShellMetric label="Institute Friction" value={warnings.length ? `${warnings.length} warnings` : 'stable'} state={warnings.length ? 'watch' : 'stable'} /><ShellMetric label="Prediction Pressure" value={`${predictions.length} entries`} state={predictions.length ? 'watch' : 'stable'} /><ShellMetric label="Evidence Load" value={`${evidence.length} graph`} /><ShellMetric label="Agent Health" value={`${systemHealth.llmProvidersAvailable ?? 0} llm`} state={Number(systemHealth.llmProvidersAvailable ?? 0) > 0 ? 'stable' : 'critical'} /><ShellMetric label="AMV Memory" value={`${amvItems.length} items`} /><ShellMetric label="Signal Quality" value={pct(confidence)} state={confidence > 0.7 ? 'stable' : 'watch'} /></div>
          <InternalTopology />
          <div className="grid gap-4"><DataPanel title={activeHub === 'predictions' ? 'Prediction Registry' : 'Active Proposals'} items={visibleItems} /><div className="border border-[#2d2618] bg-[#080806]/85 p-4"><div className="font-mono text-[12px] uppercase tracking-[0.18em] text-[#d4af37]">Reading of the day</div><div className="mt-4 border-l border-[#d4af37]/45 pl-3 font-mono text-sm uppercase tracking-[0.16em] text-[#e7d8b3]">Systemic Reflection</div><p className="mt-4 text-sm leading-7 text-[#a99d82]">{text(asRecord(initialState.worldVectorAgent).root_interpretation ?? observation.interpretation, 'Institute stability is constrained by prediction pressure, evidence load and agent availability. ROOT should inspect pending hypotheses before allowing calibration or expansion.')}</p></div><DataPanel title="Founder Decision Queue" items={queue.length ? queue : predictions} /></div>
          <div className="grid gap-4 xl:col-span-3 lg:grid-cols-[1.25fr_0.7fr_0.7fr_0.8fr]"><div className="border border-[#2d2618] bg-[#080806]/85 p-4"><div className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#d4af37]">System Pulse</div><Sparkline tone={warnings.length ? 'watch' : 'stable'} /></div><div className="border border-[#2d2618] bg-[#080806]/85 p-4"><div className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#d4af37]">Decision Velocity</div><div className="mt-2 font-mono text-3xl text-[#d4af37]">0.64</div></div><div className="border border-[#2d2618] bg-[#080806]/85 p-4"><div className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#d4af37]">Institute Capacity</div><div className="mt-2 font-mono text-3xl text-[#d4af37]">72%</div></div><div className="border border-[#2d2618] bg-[#080806]/85 p-4"><div className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#d4af37]">Root Notes</div><p className="mt-2 text-sm leading-6 text-[#a99d82]">{text(asRecord(initialState.cognitiveTwin).single_action, 'No critical alerts. System within operational thresholds.')}</p></div></div>
        </section>
        <footer className="col-span-2 flex items-center justify-between border-t border-[#2d2618] bg-black/75 px-6 font-mono text-[10px] uppercase tracking-[0.2em] text-[#6f654e]"><span>SFI © 2026 System Friction Institute.</span><span>Observe · Model · Decide · Evolve</span></footer>
      </div>
    </main>
  );
}
