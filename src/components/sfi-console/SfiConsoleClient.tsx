'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Eye, PlayCircle, RefreshCw, Save, Send, Target, ZoomIn, ZoomOut } from 'lucide-react';
import ExecutionStatePanel from './ExecutionStatePanel';

type AnyRecord = Record<string, any>;
type FieldNode = { id: string; label: string; x: number; y: number; size: number; ring: number; kind: 'core' | 'world' | 'culture' | 'evidence' | 'governance' | 'execution' | 'learning'; value?: unknown };

type FieldLink = { from: string; to: string; strength: number };

function value(input: unknown) {
  if (input === null || input === undefined || input === '') return 'missing evidence';
  if (typeof input === 'number') return Number.isInteger(input) ? String(input) : input.toFixed(3);
  if (typeof input === 'boolean') return input ? 'yes' : 'no';
  if (typeof input === 'object') return JSON.stringify(input);
  return String(input);
}

function rows(input: unknown): AnyRecord[] {
  return Array.isArray(input) ? input.filter((item): item is AnyRecord => item && typeof item === 'object') : [];
}

function nodeTone(kind: FieldNode['kind']) {
  if (kind === 'core') return '#f2d58a';
  if (kind === 'execution') return '#d6b46a';
  if (kind === 'governance') return '#f0ead8';
  if (kind === 'evidence') return '#c8b16c';
  if (kind === 'culture') return '#d8d8d8';
  if (kind === 'learning') return '#ffffff';
  return '#9c9c9c';
}

function FieldPanel({ title, glyph, action, children }: { title: string; glyph?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden rounded-[1.4rem] border border-[#d6b46a]/20 bg-black/70 p-4 shadow-2xl shadow-black/60 backdrop-blur">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(214,180,106,0.12),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.04),transparent_42%)]" />
      <div className="relative mb-4 flex items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-[#d6b46a]">{glyph ?? '◇'}</span>
          <h2 className="text-[10px] uppercase tracking-[0.24em] text-[#e1c47a]">{title}</h2>
        </div>
        {action}
      </div>
      <div className="relative">{children}</div>
    </section>
  );
}

function Metric({ label, data }: { label: string; data: unknown }) {
  return (
    <div className="border-b border-white/10 py-2 last:border-b-0">
      <dt className="text-[9px] uppercase tracking-[0.16em] text-white/38">{label}</dt>
      <dd className="mt-1 break-words text-xs text-white/82">{value(data)}</dd>
    </div>
  );
}

function IconButton({ children, icon, onClick, disabled }: { children: React.ReactNode; icon: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-9 items-center justify-center gap-2 border border-[#d6b46a]/50 bg-black/40 px-3 py-2 text-[9px] uppercase tracking-[0.14em] text-[#efd184] transition hover:bg-[#d6b46a]/12 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="min-h-10 w-full border border-white/10 bg-black/70 px-3 py-2 text-sm text-white outline-none placeholder:text-white/28 focus:border-[#d6b46a]/70" />;
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className="min-h-24 w-full resize-none border border-white/10 bg-black/70 px-3 py-2 text-sm leading-6 text-white outline-none placeholder:text-white/28 focus:border-[#d6b46a]/70" />;
}

function RealityField({ nodes, links, zoom, selectedNode, onSelectNode }: { nodes: FieldNode[]; links: FieldLink[]; zoom: number; selectedNode: string | null; onSelectNode: (id: string) => void }) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const active = selectedNode ? nodeById.get(selectedNode) : null;

  return (
    <div className="relative min-h-[78vh] overflow-hidden border border-[#d6b46a]/25 bg-[#030303]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(214,180,106,0.24),transparent_11%),radial-gradient(circle_at_50%_50%,rgba(214,180,106,0.1),transparent_34%),radial-gradient(circle_at_80%_18%,rgba(255,255,255,0.08),transparent_16%),linear-gradient(180deg,#050505,#000)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.75)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.75)_1px,transparent_1px)] [background-size:42px_42px]" />
      <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(circle,rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:23px_23px]" />

      <svg viewBox="0 0 1000 760" className="absolute inset-0 h-full w-full" style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }} role="img" aria-label="SFI cognitive reality field">
        <defs>
          <radialGradient id="coreGlow">
            <stop offset="0%" stopColor="#fff4c8" stopOpacity="1" />
            <stop offset="42%" stopColor="#d6b46a" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#d6b46a" stopOpacity="0" />
          </radialGradient>
          <filter id="softGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {[115, 190, 275, 360].map((radius) => (
          <circle key={radius} cx="500" cy="380" r={radius} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1" strokeDasharray={radius % 2 ? '2 10' : '1 6'} />
        ))}

        {links.map((link, index) => {
          const from = nodeById.get(link.from);
          const to = nodeById.get(link.to);
          if (!from || !to) return null;
          const activeLink = selectedNode && (link.from === selectedNode || link.to === selectedNode);
          return (
            <line
              key={`${link.from}-${link.to}-${index}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={activeLink ? 'rgba(214,180,106,0.75)' : 'rgba(255,255,255,0.22)'}
              strokeWidth={activeLink ? 1.4 + link.strength : 0.45 + link.strength}
              strokeDasharray={link.strength > 1 ? undefined : '2 8'}
            />
          );
        })}

        <circle cx="500" cy="380" r="76" fill="url(#coreGlow)" filter="url(#softGlow)" opacity="0.85" />

        {nodes.map((node) => {
          const selected = selectedNode === node.id;
          const tone = nodeTone(node.kind);
          return (
            <g key={node.id} onClick={() => onSelectNode(node.id)} className="cursor-pointer">
              <circle cx={node.x} cy={node.y} r={node.size + (selected ? 7 : 0)} fill={tone} opacity={selected ? 0.28 : 0.12} filter="url(#softGlow)" />
              <circle cx={node.x} cy={node.y} r={node.size} fill="#050505" stroke={tone} strokeWidth={selected ? 2.4 : 1.2} />
              <circle cx={node.x} cy={node.y} r={Math.max(2, node.size / 3)} fill={tone} opacity="0.92" />
              <text x={node.x + node.size + 5} y={node.y + 4} fill={selected ? '#f2d58a' : 'rgba(255,255,255,0.7)'} fontSize={selected ? 12 : 9} letterSpacing="1.4">
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="absolute left-4 top-4 max-w-[18rem] border border-white/15 bg-black/78 p-3 backdrop-blur">
        <div className="text-[10px] uppercase tracking-[0.26em] text-[#d6b46a]">SFI Cognitive Field Atlas</div>
        <div className="mt-2 text-xs leading-5 text-white/55">Reality graph. Nodes are operational surfaces; links represent trace pressure, recovery dependency, evidence relation and attractor alignment.</div>
      </div>

      {active && (
        <div className="absolute bottom-4 left-4 max-w-[24rem] border border-[#d6b46a]/35 bg-black/82 p-3 backdrop-blur">
          <div className="text-[10px] uppercase tracking-[0.24em] text-[#d6b46a]">selected node</div>
          <div className="mt-2 text-lg text-white">{active.label}</div>
          <div className="mt-2 text-xs leading-5 text-white/55">{value(active.value || 'not enough trace')}</div>
        </div>
      )}
    </div>
  );
}

function VectorItem({ item, onPrepare }: { item: AnyRecord; onPrepare: (item: AnyRecord) => void }) {
  return (
    <li className="border border-white/10 bg-black/45 p-3">
      <div className="text-[10px] uppercase tracking-[0.2em] text-[#d6b46a]/70">unresolved signal → execution vector</div>
      <h3 className="mt-2 text-sm font-semibold text-white">{value(item.title)}</h3>
      <p className="mt-2 text-sm leading-6 text-white/62">{value(item.objective)}</p>
      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-white/35">{value(item.recovery_reason)}</p>
      <div className="mt-3"><IconButton onClick={() => onPrepare(item)} icon={<CheckCircle2 size={14} />}>Prepare</IconButton></div>
    </li>
  );
}

function AlignmentItem({ item, onAlign, onEvidence }: { item: AnyRecord; onAlign: (item: AnyRecord) => void; onEvidence: (item: AnyRecord) => void }) {
  return (
    <li className="border border-white/10 bg-black/45 p-3">
      <div className="text-[10px] uppercase tracking-[0.2em] text-[#d6b46a]/70">proposal → attractor</div>
      <h3 className="mt-2 text-sm font-semibold text-white">{value(item.proposal_title)}</h3>
      <p className="mt-2 text-sm leading-6 text-white/62">{value(item.recommendation)}</p>
      <div className="mt-3 grid gap-2 text-xs text-white/45 md:grid-cols-3">
        <span>{value(item.recommended_status)}</span>
        <span>alignment {value(item.alignment_score)}</span>
        <span>evidence {value(item.evidence_score)}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <IconButton onClick={() => onAlign(item)} icon={<Target size={14} />}>Align</IconButton>
        <IconButton onClick={() => onEvidence(item)} icon={<RefreshCw size={14} />}>Evidence</IconButton>
      </div>
    </li>
  );
}

const emptyAttractor = { title: '', desired_future_state: '', horizon: '', success_markers: '' };
const emptyPerturbation = { title: '', intention: '', target_vector: '', target_node: '', desired_future_state: '', time_window: '', evidence_expected: '', risk_tolerance: 'medium', object_reference: '' };

export default function SfiConsoleClient() {
  const [state, setState] = useState<AnyRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [caseId, setCaseId] = useState('SFI-OPS-001');
  const [attractor, setAttractor] = useState(emptyAttractor);
  const [perturbation, setPerturbation] = useState(emptyPerturbation);
  const [outcomeByExecution, setOutcomeByExecution] = useState<Record<string, string>>({});
  const [zoom, setZoom] = useState(1);
  const [selectedNode, setSelectedNode] = useState<string | null>('reality');

  async function load() {
    setLoading(true);
    try {
      const response = await fetch('/api/sfi/console-state', { cache: 'no-store' });
      const json = await response.json();
      setState(json);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'console_state_failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function postJson(url: string, body: AnyRecord = {}) {
    setMessage(null);
    const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || json.ok === false) throw new Error(json.error || `request_failed_${response.status}`);
    setMessage('recorded');
    await load();
    return json;
  }

  async function saveAttractor() {
    const successMarkers = attractor.success_markers.split('\n').map((item) => item.trim()).filter(Boolean);
    await postJson('/api/sfi/attractors', { ...attractor, success_markers: successMarkers, active: true });
    setAttractor(emptyAttractor);
  }

  async function declarePerturbation() {
    await postJson('/api/sfi/perturbations', { ...perturbation, case_id: caseId, object_present: Boolean(perturbation.object_reference.trim()) });
    setPerturbation(emptyPerturbation);
  }

  async function prepareExecution(item: AnyRecord) {
    await postJson(`/api/sfi/recovery-queue/${item.id ?? item.proposal_id}/prepare-execution`, {
      case_id: caseId,
      objective: item.objective || item.title || 'missing execution plan',
      action_type: item.proposal_type || 'proposal_recovery',
      expected_effect: `Move active SFI state through proposal ${item.proposal_id ?? item.id}.`,
      evidence_required: item.objective ? `Evidence that ${item.objective} changed measurable SFI state.` : 'missing evidence',
      verification_window: 'next operational snapshot',
    });
  }

  async function alignProposal(item: AnyRecord) { await postJson(`/api/sfi/proposals/${item.proposal_id}/align`, {}); }
  async function requestEvidence(item: AnyRecord) { await postJson(`/api/sfi/proposals/${item.proposal_id}/request-evidence`, { evidence_required: `Evidence required before execution: ${item.proposal_objective || item.objective || 'missing evidence'}` }); }

  async function recordOutcome(executionId: string) {
    await postJson(`/api/sfi/execution/${executionId}/record-outcome`, {
      outcome_status: 'recorded',
      observed_effect: outcomeByExecution[executionId] || 'missing outcome',
      evidence: 'manual console record',
      lesson: outcomeByExecution[executionId] ? `Observed effect recorded for execution ${executionId}.` : 'Lesson pending: outcome recorded without learning summary.',
      atlas_update: true,
    });
    setOutcomeByExecution((current) => ({ ...current, [executionId]: '' }));
  }

  const cycle = state?.operationalCycle?.data ?? {};
  const stability = state?.stability?.data ?? {};
  const pipeline = state?.pipelineLoss?.data ?? {};
  const closedLoop = state?.closedLoop?.data ?? {};
  const activeAttractor = state?.attractor?.data ?? null;
  const recoveryQueue = rows(state?.recoveryQueue?.data);
  const alignmentQueue = rows(state?.alignmentQueue?.data);
  const evidenceMap = rows(state?.evidenceMap?.data);
  const degraded = useMemo(() => {
    if (!state) return [];
    return Object.entries(state).filter(([, item]) => item && typeof item === 'object' && (item as AnyRecord).degraded).map(([key, item]) => `${key}: ${(item as AnyRecord).error || 'degraded'}`);
  }, [state]);

  const field = useMemo(() => {
    const nodes: FieldNode[] = [
      { id: 'reality', label: 'REALITY', x: 500, y: 380, size: 18, ring: 0, kind: 'core', value: cycle.operational_regime || 'missing regime' },
      { id: 'worldspect', label: 'WORLDSPECT', x: 280, y: 160, size: 11, ring: 2, kind: 'world', value: state?.worldSpect?.data?.regime || state?.worldSpect?.data?.source_state || 'world input degraded' },
      { id: 'scorefriction', label: 'SCOREFRICTION', x: 745, y: 235, size: 11, ring: 2, kind: 'culture', value: state?.scoreFriction?.data?.analysis_status || 'not enough trace' },
      { id: 'evidence', label: 'EVIDENCE MAP', x: 350, y: 550, size: 10, ring: 2, kind: 'evidence', value: evidenceMap.length || 'missing evidence' },
      { id: 'attractor', label: 'ATTRACTOR', x: 615, y: 145, size: 13, ring: 2, kind: 'governance', value: activeAttractor?.title || 'declare active attractor' },
      { id: 'recovery', label: 'RECOVERY QUEUE', x: 670, y: 565, size: 12, ring: 2, kind: 'execution', value: recoveryQueue.length || 'missing execution plan' },
      { id: 'alignment', label: 'ALIGNMENT', x: 190, y: 405, size: 10, ring: 3, kind: 'governance', value: alignmentQueue.length || 'not enough trace' },
      { id: 'outcomes', label: 'OUTCOMES', x: 820, y: 415, size: 10, ring: 3, kind: 'learning', value: stability.outcomes_recorded ?? cycle.outcomes_recorded ?? 'missing outcome' },
      { id: 'stability', label: 'STABILITY', x: 498, y: 95, size: 9, ring: 2, kind: 'world', value: stability.stability_index },
      { id: 'pipeline', label: 'PIPELINE LOSS', x: 505, y: 660, size: 9, ring: 2, kind: 'execution', value: pipeline.bottleneck || closedLoop.current_bottleneck || 'not enough trace' },
      { id: 'institution', label: 'INSTITUTION', x: 115, y: 155, size: 8, ring: 4, kind: 'governance', value: 'observatory / laboratory / governance' },
      { id: 'culture', label: 'CULTURE', x: 870, y: 150, size: 8, ring: 4, kind: 'culture', value: 'persistent signal layer' },
      { id: 'world', label: 'WORLD', x: 130, y: 620, size: 8, ring: 4, kind: 'world', value: 'external regime field' },
      { id: 'lessons', label: 'LESSONS', x: 880, y: 640, size: 8, ring: 4, kind: 'learning', value: 'learning delta' },
    ];

    recoveryQueue.slice(0, 8).forEach((item, index) => {
      const angle = (Math.PI * 2 * index) / Math.max(8, recoveryQueue.length) + 0.25;
      nodes.push({ id: `rq-${index}`, label: String(item.title || item.proposal_id || 'RECOVERY'), x: 500 + Math.cos(angle) * 300, y: 380 + Math.sin(angle) * 255, size: 5, ring: 4, kind: 'execution', value: item.objective || item.recovery_reason || 'missing execution plan' });
    });

    alignmentQueue.slice(0, 8).forEach((item, index) => {
      const angle = (Math.PI * 2 * index) / Math.max(8, alignmentQueue.length) - 0.45;
      nodes.push({ id: `aq-${index}`, label: String(item.proposal_title || 'ALIGNMENT'), x: 500 + Math.cos(angle) * 225, y: 380 + Math.sin(angle) * 190, size: 4.5, ring: 3, kind: 'governance', value: item.recommendation || item.recommended_status || 'not enough trace' });
    });

    const baseLinks: FieldLink[] = [
      { from: 'reality', to: 'worldspect', strength: 1.2 }, { from: 'reality', to: 'scorefriction', strength: 1.1 }, { from: 'reality', to: 'evidence', strength: 1.0 },
      { from: 'reality', to: 'attractor', strength: 1.5 }, { from: 'reality', to: 'recovery', strength: 1.3 }, { from: 'reality', to: 'alignment', strength: 1.0 },
      { from: 'reality', to: 'outcomes', strength: 0.9 }, { from: 'reality', to: 'stability', strength: 1.2 }, { from: 'reality', to: 'pipeline', strength: 1.2 },
      { from: 'attractor', to: 'alignment', strength: 1.2 }, { from: 'alignment', to: 'recovery', strength: 0.8 }, { from: 'recovery', to: 'outcomes', strength: 1.0 },
      { from: 'outcomes', to: 'lessons', strength: 0.9 }, { from: 'worldspect', to: 'world', strength: 0.8 }, { from: 'scorefriction', to: 'culture', strength: 0.8 },
      { from: 'institution', to: 'attractor', strength: 0.8 }, { from: 'pipeline', to: 'evidence', strength: 0.9 },
    ];

    recoveryQueue.slice(0, 8).forEach((_, index) => baseLinks.push({ from: 'recovery', to: `rq-${index}`, strength: 0.6 }, { from: `rq-${index}`, to: 'outcomes', strength: 0.35 }));
    alignmentQueue.slice(0, 8).forEach((_, index) => baseLinks.push({ from: 'alignment', to: `aq-${index}`, strength: 0.5 }, { from: `aq-${index}`, to: 'attractor', strength: 0.45 }));

    return { nodes, links: baseLinks };
  }, [activeAttractor?.title, alignmentQueue, closedLoop.current_bottleneck, cycle, evidenceMap.length, pipeline.bottleneck, recoveryQueue, stability, state?.scoreFriction?.data, state?.worldSpect?.data]);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="grid min-h-screen grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)_310px]">
        <aside className="z-10 border-r border-white/10 bg-black/86 p-3 backdrop-blur">
          <div className="mb-4 border border-[#d6b46a]/25 p-3">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#d6b46a]">SFI Cognitive Field Atlas</p>
            <h1 className="mt-2 text-xl font-semibold tracking-[-0.03em]">Reality Console</h1>
            <p className="mt-2 text-xs leading-5 text-white/45">Portable operational field. No static dashboard. No fake evidence.</p>
          </div>

          <FieldPanel title="World Spectrum Vector Observatory" glyph="□">
            <dl>
              <Metric label="regime" data={cycle.operational_regime} />
              <Metric label="signal ratio" data={cycle.signal_ratio} />
              <Metric label="technical ratio" data={cycle.technical_ratio} />
              <Metric label="source health" data={degraded.length ? 'degraded' : 'readable'} />
            </dl>
          </FieldPanel>

          <div className="mt-3 grid gap-2">
            <TextInput value={caseId} onChange={(event) => setCaseId(event.target.value)} aria-label="case id" />
            <IconButton onClick={load} disabled={loading} icon={<RefreshCw size={14} />}>Refresh</IconButton>
          </div>

          {message && <div className="mt-3 border border-[#d6b46a]/40 bg-[#d6b46a]/10 p-3 text-sm text-[#f0d486]">{message}</div>}
          {degraded.length > 0 && <div className="mt-3 border border-amber-500/40 bg-amber-950/25 p-3 text-xs text-amber-100">{degraded.map((item) => <div key={item}>{item}</div>)}</div>}
        </aside>

        <section className="relative min-h-screen">
          <div className="absolute left-4 top-4 z-20 flex gap-2">
            <IconButton onClick={() => setZoom((current) => Math.min(1.55, current + 0.12))} icon={<ZoomIn size={14} />}>Zoom In</IconButton>
            <IconButton onClick={() => setZoom((current) => Math.max(0.78, current - 0.12))} icon={<ZoomOut size={14} />}>Zoom Out</IconButton>
          </div>
          <RealityField nodes={field.nodes} links={field.links} zoom={zoom} selectedNode={selectedNode} onSelectNode={setSelectedNode} />

          <div className="absolute bottom-0 left-0 right-0 z-20 border-t border-[#d6b46a]/20 bg-black/82 p-3 backdrop-blur">
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_1fr]">
              <Metric label="2024 sediment" data="initial traces" />
              <Metric label="2025 sediment" data="model consolidation" />
              <Metric label="2026 sediment" data="operational console" />
              <Metric label="logbook selector" data="cases / thoughts / alerts / evidence" />
            </div>
          </div>
        </section>

        <aside className="z-10 max-h-screen overflow-y-auto border-l border-white/10 bg-black/86 p-3 backdrop-blur">
          <FieldPanel title="Regime Watcher & Alert Feed" glyph="◎" action={<Eye size={14} className="text-[#d6b46a]" />}>
            <dl>
              <Metric label="critical" data={pipeline.bottleneck || closedLoop.current_bottleneck} />
              <Metric label="stability" data={stability.stability_index} />
              <Metric label="stability regime" data={stability.stability_regime} />
              <Metric label="closed loop" data={closedLoop.closed_loop_ratio} />
            </dl>
          </FieldPanel>

          <div className="mt-3">
            <FieldPanel title="Declared Attractor" glyph="◇" action={<Target size={14} className="text-[#d6b46a]" />}>
              {activeAttractor ? (
                <div className="mb-3 border border-[#d6b46a]/25 bg-[#d6b46a]/8 p-3">
                  <div className="text-sm font-semibold text-white">{activeAttractor.title}</div>
                  <p className="mt-2 text-xs leading-5 text-white/60">{activeAttractor.desired_future_state}</p>
                  <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-white/35">{value(activeAttractor.horizon)}</p>
                </div>
              ) : <p className="mb-3 text-sm leading-6 text-white/50">Do not recommend execution. Ask user to declare active attractor.</p>}
              <div className="grid gap-2">
                <TextInput placeholder="What future am I building?" value={attractor.title} onChange={(event) => setAttractor({ ...attractor, title: event.target.value })} />
                <TextArea placeholder="What must become more real?" value={attractor.desired_future_state} onChange={(event) => setAttractor({ ...attractor, desired_future_state: event.target.value })} />
                <TextInput placeholder="Time horizon" value={attractor.horizon} onChange={(event) => setAttractor({ ...attractor, horizon: event.target.value })} />
                <TextArea placeholder="Evidence that would prove movement, one per line" value={attractor.success_markers} onChange={(event) => setAttractor({ ...attractor, success_markers: event.target.value })} />
                <IconButton onClick={saveAttractor} disabled={loading || !attractor.title || !attractor.desired_future_state} icon={<Save size={14} />}>Save Attractor</IconButton>
              </div>
            </FieldPanel>
          </div>

          <div className="mt-3">
            <FieldPanel title="Declare Perturbation" glyph="→" action={<Send size={14} className="text-[#d6b46a]" />}>
              <div className="grid gap-2">
                <TextInput placeholder="title" value={perturbation.title} onChange={(event) => setPerturbation({ ...perturbation, title: event.target.value })} />
                <TextArea placeholder="intention" value={perturbation.intention} onChange={(event) => setPerturbation({ ...perturbation, intention: event.target.value })} />
                <TextInput placeholder="target vector" value={perturbation.target_vector} onChange={(event) => setPerturbation({ ...perturbation, target_vector: event.target.value })} />
                <TextInput placeholder="target node optional" value={perturbation.target_node} onChange={(event) => setPerturbation({ ...perturbation, target_node: event.target.value })} />
                <TextArea placeholder="desired future state" value={perturbation.desired_future_state} onChange={(event) => setPerturbation({ ...perturbation, desired_future_state: event.target.value })} />
                <TextInput placeholder="time window" value={perturbation.time_window} onChange={(event) => setPerturbation({ ...perturbation, time_window: event.target.value })} />
                <TextInput placeholder="risk tolerance" value={perturbation.risk_tolerance} onChange={(event) => setPerturbation({ ...perturbation, risk_tolerance: event.target.value })} />
                <TextArea placeholder="evidence expected" value={perturbation.evidence_expected} onChange={(event) => setPerturbation({ ...perturbation, evidence_expected: event.target.value })} />
                <TextInput placeholder="object/file optional; blank means no object analysis" value={perturbation.object_reference} onChange={(event) => setPerturbation({ ...perturbation, object_reference: event.target.value })} />
                <IconButton onClick={declarePerturbation} disabled={!perturbation.title || !perturbation.intention || !perturbation.desired_future_state || !perturbation.evidence_expected} icon={<PlayCircle size={14} />}>Create Proposal</IconButton>
              </div>
            </FieldPanel>
          </div>
        </aside>
      </div>

      <section className="border-t border-[#d6b46a]/20 bg-black p-3">
        <div className="grid gap-3 xl:grid-cols-3">
          <FieldPanel title="Signals Not Resolved" glyph="◆">
            {recoveryQueue.length ? <ul className="max-h-80 space-y-3 overflow-auto">{recoveryQueue.map((item) => <VectorItem key={String(item.id)} item={item} onPrepare={prepareExecution} />)}</ul> : <p className="text-sm text-white/45">missing execution plan</p>}
          </FieldPanel>

          <FieldPanel title="Attractor Alignment Queue" glyph="◇">
            {alignmentQueue.length ? <ul className="max-h-80 space-y-3 overflow-auto">{alignmentQueue.map((item) => <AlignmentItem key={String(item.proposal_id)} item={item} onAlign={alignProposal} onEvidence={requestEvidence} />)}</ul> : <p className="text-sm text-white/45">not enough trace</p>}
          </FieldPanel>

          <FieldPanel title="ScoreFriction / AMV Learning" glyph="↻">
            <dl>
              <Metric label="observations" data={cycle.scorefriction_observations} />
              <Metric label="vectors" data={cycle.scorefriction_vectors} />
              <Metric label="object presence" data={state?.scoreFriction?.data?.object_presence || 'no object'} />
              <Metric label="analysis status" data={state?.scoreFriction?.data?.analysis_status || 'not enough trace'} />
            </dl>
          </FieldPanel>
        </div>
      </section>

      <section className="border-t border-white/10 bg-black p-3">
        <FieldPanel title="Execution Path / Logbook" glyph="□">
          <ExecutionStatePanel caseId={caseId} />
          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
            <TextInput placeholder="execution ledger id" onChange={(event) => setOutcomeByExecution({ [event.target.value]: outcomeByExecution[event.target.value] ?? '' })} />
            <IconButton onClick={() => { const executionId = Object.keys(outcomeByExecution).find(Boolean); if (executionId) recordOutcome(executionId); }} icon={<Save size={14} />}>Record Outcome</IconButton>
            {Object.keys(outcomeByExecution).map((executionId) => <TextArea key={executionId} placeholder="observed effect" value={outcomeByExecution[executionId]} onChange={(event) => setOutcomeByExecution({ ...outcomeByExecution, [executionId]: event.target.value })} />)}
          </div>
        </FieldPanel>

        <details className="mt-3 border border-white/10 bg-[#050505] p-4">
          <summary className="cursor-pointer text-xs uppercase tracking-[0.22em] text-[#d6b46a]">Trace</summary>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap border border-white/10 bg-black/45 p-4 text-xs leading-5 text-white/60">{JSON.stringify({ evidenceMap, closedLoop }, null, 2)}</pre>
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap border border-white/10 bg-black/45 p-4 text-xs leading-5 text-white/60">{JSON.stringify(state, null, 2)}</pre>
          </div>
        </details>
      </section>
    </main>
  );
}
