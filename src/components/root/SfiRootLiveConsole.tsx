'use client';

import { useMemo, useState, type ReactNode } from 'react';
import {
  Activity,
  BarChart3,
  BookOpen,
  Boxes,
  CheckCircle2,
  CircleDot,
  Cpu,
  Database,
  Gauge,
  GitBranch,
  Grid2X2,
  Hexagon,
  Layers3,
  LockKeyhole,
  Network,
  Orbit,
  RadioTower,
  ShieldCheck,
  Sparkles,
  Target,
  Waypoints,
} from 'lucide-react';
import type { AgenticRootState } from '@/lib/agents/sfiAgents';

type QueueAction = 'approve' | 'deny' | 'route' | 'hold' | 'inspect';

type MetricTone = 'stable' | 'watch' | 'degraded' | 'critical' | 'neutral';

type MetricCardData = {
  title: string;
  value: string;
  status: string;
  tone: MetricTone;
  icon: ReactNode;
  trend: string;
  metaA: string;
  metaB: string;
};

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

function clamp01(value: unknown, fallback = 0) {
  return Math.max(0, Math.min(1, num(value, fallback)));
}

function pct(value: unknown, fallback = 0) {
  return `${Math.round(clamp01(value, fallback) * 100)}%`;
}

function toneClass(tone: MetricTone) {
  if (tone === 'stable') return 'text-[#8bd27c]';
  if (tone === 'watch') return 'text-[#d8b651]';
  if (tone === 'degraded') return 'text-[#e19a3a]';
  if (tone === 'critical') return 'text-[#e36a52]';
  return 'text-[#f5e9ca]';
}

function priorityTone(value: unknown): MetricTone {
  const raw = text(value, '').toLowerCase();
  if (/(critical|high|failed|error|overdue|degraded)/.test(raw)) return 'critical';
  if (/(medium|warn|queued|pending|review)/.test(raw)) return 'watch';
  if (/(active|stable|ok|approved|operational)/.test(raw)) return 'stable';
  return 'neutral';
}

function Sparkline({ tone = 'watch' }: { tone?: MetricTone }) {
  const stroke = tone === 'stable' ? '#8bd27c' : tone === 'critical' ? '#e36a52' : tone === 'degraded' ? '#e19a3a' : '#d8b651';
  return (
    <svg viewBox="0 0 112 28" className="h-7 w-full opacity-90" aria-hidden="true">
      <path d="M0 18 L10 16 L18 19 L28 9 L38 14 L49 7 L59 13 L70 11 L82 5 L94 10 L112 7" fill="none" stroke={stroke} strokeWidth="1.5" />
      <path d="M0 26 L112 26" stroke="#3a2c14" strokeWidth="1" />
    </svg>
  );
}

function HexGlyph({ children, tone = 'watch' }: { children: ReactNode; tone?: MetricTone }) {
  return (
    <div className={`grid h-12 w-12 place-items-center border border-[#d4af37]/25 bg-black/40 [clip-path:polygon(25%_4%,75%_4%,100%_50%,75%_96%,25%_96%,0_50%)] ${toneClass(tone)}`}>
      {children}
    </div>
  );
}

function MetricCard({ card }: { card: MetricCardData }) {
  return (
    <div className="relative grid grid-cols-[64px_1fr_140px] gap-3 border border-[#2d2618] bg-[#080806]/80 p-4 shadow-[inset_0_1px_0_rgba(212,175,55,0.08)]">
      <div className="flex items-center justify-center"><HexGlyph tone={card.tone}>{card.icon}</HexGlyph></div>
      <div>
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#8e836c]">{card.title}</div>
        <div className="mt-2 flex items-end gap-2">
          <span className={`font-mono text-3xl tracking-[-0.06em] ${toneClass(card.tone)}`}>{card.value}</span>
          <span className={`mb-1 font-mono text-[10px] uppercase tracking-[0.14em] ${toneClass(card.tone)}`}>{card.status}</span>
        </div>
      </div>
      <div className="text-right font-mono text-[10px] uppercase tracking-[0.12em] text-[#8e836c]">
        <Sparkline tone={card.tone} />
        <div className="mt-1 flex justify-between gap-2"><span>Trend</span><span className={toneClass(card.tone)}>{card.trend}</span></div>
        <div className="mt-1 flex justify-between gap-2"><span>{card.metaA.split(':')[0]}</span><span className="text-[#e7d8b3]">{card.metaA.split(':').slice(1).join(':')}</span></div>
        <div className="mt-1 flex justify-between gap-2"><span>{card.metaB.split(':')[0]}</span><span className="text-[#e7d8b3]">{card.metaB.split(':').slice(1).join(':')}</span></div>
      </div>
    </div>
  );
}

function TopologyGraph({ domains }: { domains: Array<{ label: string; value: number; tone: MetricTone }> }) {
  const nodes = domains.slice(0, 6);
  const fallback = [
    { label: 'Affective', value: 0.72, tone: 'watch' as const },
    { label: 'Bio', value: 0.64, tone: 'watch' as const },
    { label: 'Climate', value: 0.67, tone: 'watch' as const },
    { label: 'Cultural', value: 0.74, tone: 'stable' as const },
    { label: 'Economy', value: 0.71, tone: 'watch' as const },
    { label: 'Digital', value: 0.69, tone: 'watch' as const },
  ];
  const data = nodes.length >= 6 ? nodes : fallback;
  const coords = [
    { x: 50, y: 16 },
    { x: 82, y: 34 },
    { x: 76, y: 72 },
    { x: 50, y: 86 },
    { x: 24, y: 72 },
    { x: 18, y: 34 },
  ];

  return (
    <div className="relative h-full min-h-[520px] overflow-hidden border border-[#2d2618] bg-[#070706]/90">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.12),transparent_42%),linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:100%_100%,42px_42px,42px_42px]" />
      <div className="relative flex items-center justify-between border-b border-[#2d2618] px-5 py-4">
        <div className="font-mono text-[12px] uppercase tracking-[0.18em] text-[#d4af37]">Institute Topology · Internal Observatory</div>
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#8e836c]"><span>View</span><span className="border border-[#3b301d] px-2 py-1 text-[#e7d8b3]">Systemic</span></div>
      </div>

      <svg viewBox="0 0 100 100" className="absolute inset-x-0 top-14 mx-auto h-[calc(100%-110px)] w-full max-w-[760px]" aria-hidden="true">
        {[12, 20, 28, 36, 44].map((r) => <circle key={r} cx="50" cy="50" r={r} fill="none" stroke="#5b481f" strokeOpacity="0.35" strokeWidth="0.35" />)}
        {coords.map((point, index) => (
          <g key={`spoke-${index}`}>
            <line x1="50" y1="50" x2={point.x} y2={point.y} stroke="#d4af37" strokeOpacity="0.42" strokeWidth="0.45" />
            <line x1={coords[index].x} y1={coords[index].y} x2={coords[(index + 1) % coords.length].x} y2={coords[(index + 1) % coords.length].y} stroke="#d4af37" strokeOpacity="0.7" strokeWidth="0.55" />
          </g>
        ))}
        {coords.map((point, index) => {
          const inner = 50 + (point.x - 50) * 0.48;
          const iny = 50 + (point.y - 50) * 0.48;
          return (
            <g key={`inner-${index}`}>
              <line x1={inner} y1={iny} x2={coords[(index + 2) % coords.length].x} y2={coords[(index + 2) % coords.length].y} stroke="#e7d8b3" strokeOpacity="0.26" strokeWidth="0.3" />
              <polygon points={`${inner},${iny - 2.2} ${inner + 2},${iny - 1.1} ${inner + 2},${iny + 1.1} ${inner},${iny + 2.2} ${inner - 2},${iny + 1.1} ${inner - 2},${iny - 1.1}`} fill="#14100a" stroke="#d4af37" strokeOpacity="0.75" strokeWidth="0.4" />
            </g>
          );
        })}
        {coords.map((point, index) => (
          <g key={`node-${data[index].label}`}>
            <circle cx={point.x} cy={point.y} r="3.9" fill="#090806" stroke="#d4af37" strokeOpacity="0.95" strokeWidth="0.55" />
            <text x={point.x} y={point.y + 1.1} textAnchor="middle" fill="#d4af37" fontSize="2.4" fontFamily="monospace">{data[index].value.toFixed(2)}</text>
          </g>
        ))}
        <circle cx="50" cy="50" r="8.5" fill="#080806" stroke="#d4af37" strokeWidth="0.65" />
        <circle cx="50" cy="50" r="6.7" fill="none" stroke="#7a622d" strokeWidth="0.35" />
        <text x="50" y="48.8" textAnchor="middle" fill="#d4af37" fontSize="3.2" fontFamily="monospace">ROOT</text>
        <text x="50" y="52.3" textAnchor="middle" fill="#a99d82" fontSize="2.2" fontFamily="monospace">OBSERVING</text>
        <text x="50" y="55" textAnchor="middle" fill="#a99d82" fontSize="2.2" fontFamily="monospace">SELF</text>
      </svg>

      <div className="absolute inset-x-6 bottom-14 grid grid-cols-6 gap-2 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-[#8e836c]">
        {data.map((item, index) => <div key={item.label} className={index % 2 ? 'translate-y-3' : ''}><div className={toneClass(item.tone)}>{item.label}</div></div>)}
      </div>
      <div className="absolute inset-x-8 bottom-5 flex flex-wrap items-center justify-center gap-5 border border-[#2d2618] bg-black/50 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[#8e836c]">
        <span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-[#8bd27c]" />Stable</span>
        <span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-[#d8b651]" />Watch</span>
        <span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-[#e19a3a]" />Degraded</span>
        <span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-[#e36a52]" />Critical</span>
        <span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-[#585858]" />No signal</span>
      </div>
    </div>
  );
}

function ProposalList({ title, items, onSelect }: { title: string; items: unknown[]; onSelect?: (item: unknown, action: QueueAction) => void }) {
  return (
    <div className="border border-[#2d2618] bg-[#080806]/85 p-4">
      <div className="mb-3 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.16em]">
        <span className="text-[#d4af37]">{title}</span>
        <span className="text-[#6f654e]">View all</span>
      </div>
      <div className="space-y-1">
        {items.slice(0, 5).map((item, index) => {
          const record = asRecord(item);
          const label = text(record.action ?? record.hypothesis_id ?? record.id ?? record.type, `SFI-${index + 1}`);
          const reason = text(record.reason ?? record.prediccion_explicita ?? record.prediction ?? record.expected_outcome ?? record.status, 'proposal awaiting evidence');
          const status = text(record.status ?? record.evidence_state ?? record.estado_observacion ?? 'queued').toUpperCase();
          const tone = priorityTone(status);
          return (
            <div key={`${title}-${index}`} className="grid grid-cols-[96px_1fr_76px] items-center gap-3 border-b border-[#1b1710] py-2 font-mono text-[11px] last:border-b-0">
              <span className="text-[#6f654e]">{label.slice(0, 14)}</span>
              <span className="truncate text-[#e7d8b3]" title={reason}>{reason}</span>
              <span className={`text-right ${toneClass(tone)}`}>{status.slice(0, 8)}</span>
            </div>
          );
        })}
        {items.length === 0 ? <div className="py-4 text-xs text-[#6f654e]">No current entries.</div> : null}
      </div>
      {onSelect ? (
        <div className="mt-4 space-y-2">
          {items.slice(0, 4).map((item, index) => (
            <div key={`actions-${index}`} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em]">
              <span className="truncate text-[#8e836c]">Decision {index + 1}</span>
              {(['approve', 'route', 'inspect'] as QueueAction[]).map((action) => (
                <button key={action} type="button" onClick={() => onSelect(item, action)} className="border border-[#3b301d] px-2 py-1 text-[#d4af37] hover:border-[#d4af37]">{action}</button>
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function BottomPanel({ title, children }: { title: string; children: ReactNode }) {
  return <div className="border border-[#2d2618] bg-[#080806]/85 p-4"><div className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#d4af37]">{title}</div>{children}</div>;
}

export default function SfiRootLiveConsole({ initialState, worldVector }: { initialState: AgenticRootState; worldVector: unknown }) {
  const [selected, setSelected] = useState<{ item: unknown; action: QueueAction } | null>(null);
  const world = asRecord(worldVector);
  const today = asRecord(world.today);
  const observation = asRecord(today.observation);
  const registry = asRecord(initialState.predictionRegistry);
  const registryHealth = asRecord(registry.health);
  const predictionEntries = asArray(registry.entries);
  const neural = asRecord(initialState.neuralGraph);
  const evidence = asArray(neural.evidence);
  const amv = asRecord(initialState.amv);
  const amvItems = asArray(amv.items);
  const systemHealth = asRecord(initialState.systemHealth);
  const warnings = asArray(systemHealth.warnings);
  const queue = asArray(initialState.executionQueue);
  const worldAgent = asRecord(initialState.worldVectorAgent);
  const twin = asRecord(initialState.cognitiveTwin);
  const confidence = clamp01(observation.confidence, 0.71);
  const friction = clamp01(warnings.length ? 0.63 + Math.min(0.24, warnings.length * 0.03) : 0.38, 0.63);
  const predictionPressure = clamp01((num(registryHealth.pending_returns_count, 0) * 0.06) + (predictionEntries.length * 0.04) + 0.42, 0.72);
  const evidenceLoad = clamp01(Math.min(1, evidence.length / 18), 0.68);
  const agentHealth = clamp01((num(systemHealth.llmProvidersAvailable, 0) > 0 ? 0.62 : 0.38) + (warnings.length ? -0.06 : 0.2), 0.82);
  const amvScore = clamp01(amvItems.length / 24, 0.76);
  const expansionPressure = clamp01((evidence.length * 0.03) + 0.34, 0.58);

  const domains = useMemo(() => {
    const fromWorld = asArray(asRecord(observation).domain_values ?? asRecord(today).domainBreakdown ?? asRecord(world).domainBreakdown);
    const mapped = fromWorld.map((item) => {
      const record = asRecord(item);
      const label = text(record.domain ?? record.label ?? record.name, '').replace(/_/g, ' ');
      const value = clamp01(record.value ?? record.score ?? record.weight, 0.5);
      return label ? { label: label.slice(0, 11), value, tone: value >= 0.75 ? 'stable' as const : value >= 0.55 ? 'watch' as const : value >= 0.34 ? 'degraded' as const : 'critical' as const } : null;
    }).filter((item): item is { label: string; value: number; tone: MetricTone } => Boolean(item));
    return mapped.length >= 6 ? mapped : [];
  }, [observation, today, world]);

  const metricCards: MetricCardData[] = [
    { title: 'Institute Friction', value: pct(friction), status: friction > 0.66 ? 'high' : friction > 0.5 ? 'degraded' : 'moderate', tone: friction > 0.66 ? 'critical' : friction > 0.5 ? 'degraded' : 'watch', icon: <CircleDot className="h-5 w-5" />, trend: warnings.length ? `+${Math.min(19, warnings.length * 3)}%` : '+1%', metaA: `Vector density:${friction.toFixed(2)}`, metaB: 'Resistance:moderate' },
    { title: 'Prediction Pressure', value: pct(predictionPressure), status: predictionPressure > 0.66 ? 'elevated' : 'watch', tone: predictionPressure > 0.66 ? 'degraded' : 'watch', icon: <Target className="h-5 w-5" />, trend: '+8%', metaA: `Open:${predictionEntries.length}`, metaB: `Pending:${registryHealth.pending_returns_count ?? 0}` },
    { title: 'Evidence Load', value: pct(evidenceLoad), status: evidenceLoad > 0.66 ? 'high' : 'active', tone: evidenceLoad > 0.66 ? 'degraded' : 'watch', icon: <Database className="h-5 w-5" />, trend: '+3%', metaA: `Graph:${evidence.length}`, metaB: `AMV:${amvItems.length}` },
    { title: 'Agent Health', value: pct(agentHealth), status: agentHealth > 0.75 ? 'stable' : 'degraded', tone: agentHealth > 0.75 ? 'stable' : 'watch', icon: <Cpu className="h-5 w-5" />, trend: warnings.length ? '-2%' : '+1%', metaA: `LLM:${systemHealth.llmProvidersAvailable ?? 0}`, metaB: `Warnings:${warnings.length}` },
    { title: 'AMV Memory', value: pct(amvScore), status: text(amv.status, 'active'), tone: amvScore > 0.6 ? 'stable' : 'watch', icon: <Boxes className="h-5 w-5" />, trend: '+2%', metaA: `Items:${amvItems.length}`, metaB: 'Retention:good' },
    { title: 'Expansion Pressure', value: pct(expansionPressure), status: expansionPressure > 0.66 ? 'high' : 'moderate', tone: expansionPressure > 0.66 ? 'degraded' : 'watch', icon: <Sparkles className="h-5 w-5" />, trend: '+4%', metaA: `Evidence:${evidence.length}`, metaB: 'Constraints:moderate' },
  ];

  const proposals = predictionEntries.length ? predictionEntries : evidence;
  const founderQueue = queue.length ? queue : predictionEntries;
  const rootReading = text(worldAgent.root_interpretation ?? observation.interpretation, 'Institute stability is constrained by prediction pressure, evidence load and agent availability. ROOT should inspect pending hypotheses before allowing calibration or expansion.');

  return (
    <main className="min-h-screen bg-[#030302] text-[#f4ead0]">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_42%,rgba(212,175,55,0.11),transparent_35%),linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:100%_100%,46px_46px,46px_46px]" />
      <div className="relative grid min-h-screen grid-cols-[74px_1fr] grid-rows-[66px_1fr_34px]">
        <header className="col-span-2 grid grid-cols-[280px_1fr_520px] items-center border-b border-[#2d2618] bg-black/75 px-6">
          <div className="flex items-center gap-3"><div className="font-serif text-4xl tracking-[-0.08em] text-[#d4af37]">SFI</div><div className="font-mono text-[10px] uppercase leading-4 tracking-[0.14em] text-[#8e836c]">System Friction<br />Institute</div></div>
          <div className="text-center font-mono text-lg uppercase tracking-[0.24em] text-[#e7d8b3]">SFI ROOT · Live Institute Console</div>
          <div className="grid grid-cols-3 items-center gap-5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#8e836c]">
            <div className="flex items-center gap-2"><LockKeyhole className="h-4 w-4 text-[#d4af37]" /><span><b className="block text-[#d4af37]">Root Access</b>Level Omega</span></div>
            <div><b className="block text-[#d4af37]">Generated</b>{initialState.generated_at}</div>
            <div><b className="block text-[#8bd27c]">Status · Live ●</b>{text(systemHealth.predictionStatus, 'operational')}</div>
          </div>
        </header>

        <aside className="row-span-2 flex flex-col items-center gap-6 border-r border-[#2d2618] bg-black/70 py-7 text-[#8e836c]">
          {[Orbit, Grid2X2, Network, Layers3, BarChart3, ShieldCheck, BookOpen].map((Icon, index) => <Icon key={index} className="h-5 w-5" />)}
          <div className="mt-auto flex flex-col gap-5"><Waypoints className="h-5 w-5" /><Gauge className="h-5 w-5" /></div>
        </aside>

        <section className="grid gap-4 p-4 xl:grid-cols-[31%_44%_25%]">
          <div className="grid gap-3">
            <div className="border border-[#2d2618] bg-[#080806]/85 p-4">
              <div className="font-mono text-[12px] uppercase tracking-[0.18em] text-[#d4af37]">Total Institute State</div>
              <div className="mt-3 text-xs uppercase tracking-[0.16em] text-[#8e836c]">Institute Stability Index</div>
              <div className="mt-4 grid grid-cols-[128px_1fr] items-center gap-5">
                <div className="font-mono text-6xl tracking-[-0.08em] text-[#f5e9ca]">{confidence.toFixed(2)}</div>
                <Sparkline tone={confidence > 0.7 ? 'stable' : 'watch'} />
              </div>
              <div className="mt-4 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.14em]"><span className="border border-[#7a2f24] px-2 py-1 text-[#e36a52]">{confidence > 0.78 ? 'Stable' : 'Inestable'}</span><span className="text-[#8e836c]">Trend <b className="text-[#e7d8b3]">-0.03 / 24h</b></span></div>
            </div>
            {metricCards.map((card) => <MetricCard key={card.title} card={card} />)}
          </div>

          <TopologyGraph domains={domains} />

          <div className="grid gap-4">
            <ProposalList title="Active Proposals" items={proposals} />
            <div className="border border-[#2d2618] bg-[#080806]/85 p-4">
              <div className="font-mono text-[12px] uppercase tracking-[0.18em] text-[#d4af37]">Reading of the day</div>
              <div className="mt-4 border-l border-[#d4af37]/45 pl-3 font-mono text-sm uppercase tracking-[0.16em] text-[#e7d8b3]">Systemic Reflection</div>
              <p className="mt-4 text-sm leading-7 text-[#a99d82]">{rootReading}</p>
              <div className="mt-5 font-mono text-[10px] uppercase tracking-[0.16em] text-[#d4af37]">Read full analysis →</div>
            </div>
            <ProposalList title="Founder Decision Queue" items={founderQueue} onSelect={(item, action) => setSelected({ item, action })} />
          </div>

          <div className="xl:col-span-3 grid gap-4 lg:grid-cols-[1.25fr_0.68fr_0.7fr_0.8fr_0.75fr]">
            <BottomPanel title="System Pulse"><Sparkline tone={friction > 0.66 ? 'critical' : 'watch'} /><div className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#8e836c]">24h window · evidence and prediction pressure</div></BottomPanel>
            <BottomPanel title="Signal Quality"><div className="grid grid-cols-[62px_1fr] gap-3"><div className="grid h-14 w-14 place-items-center rounded-full border-4 border-[#d4af37]/55 font-mono text-sm text-[#e7d8b3]">{pct(confidence)}</div><div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#8e836c]"><div>Coherence <b className="float-right text-[#e7d8b3]">{confidence.toFixed(2)}</b></div><div>Coverage <b className="float-right text-[#e7d8b3]">{evidenceLoad.toFixed(2)}</b></div><div>Integrity <b className="float-right text-[#e7d8b3]">{agentHealth.toFixed(2)}</b></div></div></div></BottomPanel>
            <BottomPanel title="Decision Velocity"><div className="font-mono text-3xl text-[#d4af37]">0.64</div><div className="mt-2 flex items-end gap-1">{Array.from({ length: 18 }).map((_, index) => <span key={index} className="w-1 bg-[#d4af37]" style={{ height: `${8 + ((index * 7) % 24)}px` }} />)}</div></BottomPanel>
            <BottomPanel title="Institute Capacity"><div className="flex items-center gap-4"><div className="grid grid-cols-9 gap-1">{Array.from({ length: 45 }).map((_, index) => <span key={index} className={`h-2 w-2 rounded-full ${index < 32 ? 'bg-[#d4af37]' : 'border border-[#4b3a1c]'}`} />)}</div><div className="font-mono text-3xl text-[#d4af37]">72%</div></div></BottomPanel>
            <BottomPanel title="Root Notes"><p className="text-sm leading-6 text-[#a99d82]">{selected ? `${selected.action.toUpperCase()} selected. Inspect payload before mutation: ${JSON.stringify(asRecord(selected.item)).slice(0, 110)}...` : text(twin.single_action, 'No critical alerts. System within operational thresholds.')}</p><CheckCircle2 className="mt-3 h-7 w-7 text-[#8bd27c]" /></BottomPanel>
          </div>
        </section>

        <footer className="col-span-2 flex items-center justify-between border-t border-[#2d2618] bg-black/75 px-6 font-mono text-[10px] uppercase tracking-[0.2em] text-[#6f654e]">
          <span>SFI © 2026 System Friction Institute.</span>
          <span>Observe · Model · Decide · Evolve</span>
        </footer>
      </div>
    </main>
  );
}
