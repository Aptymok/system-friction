'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, GitBranch, Layers3, Lock, RefreshCw, Route, Shield, Target, Workflow } from 'lucide-react';
import type { FounderActionCapability, FounderConsoleMode, FounderConsoleState, FounderFieldNode, FounderTimelineItem } from '@/lib/founder-console/types';

type LoadState = { status: 'loading' | 'ready' | 'error'; message?: string };
type ActionState = { status: 'idle' | 'running' | 'done' | 'error'; message?: string };

const MODES: Array<{ id: FounderConsoleMode; label: string }> = [
  { id: 'field', label: 'Field' },
  { id: 'operations', label: 'Operations' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'evaluation', label: 'Evaluation' },
  { id: 'atlas', label: 'Atlas' },
  { id: 'my_panel', label: 'My Panel' },
  { id: 'founder_tasks', label: 'Founder Tasks' },
  { id: 'system_mutation', label: 'Mutations' },
  { id: 'route_disposition', label: 'Routes' },
];

function pct(value: number | null | undefined) {
  return `${Math.round((value ?? 0) * 100)}%`;
}

function tone(state: string) {
  if (state === 'alive') return '#6fcf8d';
  if (state === 'empty_live_table' || state === 'blocked') return '#d08b63';
  if (state === 'backup_reference') return '#6f9cc8';
  if (state === 'degraded') return '#c8a951';
  return '#9f6a54';
}

function safe(value: unknown, fallback = 'not_available') {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function ModeButton({ mode, active, onClick }: { mode: { id: FounderConsoleMode; label: string }; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active ? 'border-[#c8a951] bg-[#c8a951] text-[#050504]' : 'border-[#c8a951]/20 bg-[#080806] text-[#c8a951] hover:border-[#c8a951]/60'}
    >
      {mode.label}
    </button>
  );
}

function Metric({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="border border-[#272219] bg-[#080806] p-3">
      <div className="text-[9px] uppercase tracking-[0.18em] text-[#8c816b]">{label}</div>
      <div className="mt-2 break-words text-sm text-[#f0e7d0]">{String(value ?? 'not_available')}</div>
    </div>
  );
}

function ActionControl({ action, onRun, actionState }: { action: FounderActionCapability; onRun: (action: FounderActionCapability) => void; actionState: ActionState }) {
  const active = action.status === 'active' && Boolean(action.endpoint);
  return (
    <div className="border border-[#272219] bg-[#080806] p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm uppercase tracking-[0.14em] text-[#f0e7d0]">{action.label}</div>
          <p className="mt-2 text-xs leading-5 text-[#9c927f]">{action.reason}</p>
        </div>
        <span className="shrink-0 border border-[#2e2c24] px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-[#c8a951]">{action.status}</span>
      </div>
      <div className="mt-2 text-[10px] uppercase tracking-[0.12em] text-[#8c816b]">
        {action.endpoint ?? action.blocker ?? 'recommendation'}{action.sqlProposalRequired ? ' · sqlProposalRequired' : ''}
      </div>
      {active ? (
        <button type="button" disabled={actionState.status === 'running'} onClick={() => onRun(action)} className="mt-3 border border-[#c8a951]/50 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-[#c8a951] disabled:opacity-40">
          {actionState.status === 'running' ? 'running' : 'confirm action'}
        </button>
      ) : (
        <button type="button" disabled className="mt-3 border border-[#3a2b1d] px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-[#7f6f58]">
          recommended_decision_blocked
        </button>
      )}
    </div>
  );
}

function FieldNodeDrawer({ node }: { node: FounderFieldNode | null }) {
  if (!node) return (
    <aside className="border border-[#272219] bg-[#080806] p-4">
      <div className="text-[10px] uppercase tracking-[0.2em] text-[#c8a951]">Interpretation</div>
      <p className="mt-3 text-sm leading-6 text-[#9c927f]">Select a node to inspect source, evidence, trust, and next action.</p>
    </aside>
  );

  return (
    <aside className="border border-[#372d1a] bg-[#080806] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-[#c8a951]">{node.label}</div>
          <h2 className="mt-2 text-xl text-[#f0e7d0]">{node.observes}</h2>
        </div>
        <span className="border px-2 py-1 text-[9px] uppercase tracking-[0.14em]" style={{ borderColor: tone(node.state), color: tone(node.state) }}>{node.state}</span>
      </div>
      <div className="mt-4 grid gap-2">
        <Metric label="data source / api / table" value={node.source} />
        <Metric label="current state" value={node.state} />
        <Metric label="evidence basis" value={`weight ${pct(node.evidenceWeight)} / trust ${pct(node.trust)}`} />
        <Metric label="decision enabled" value={node.decisionEnabled} />
        <Metric label="minimal next action" value={node.nextAction} />
        <Metric label="repair / prune / protect state" value={node.repairState ?? (node.state === 'blocked' ? 'protected' : 'none')} />
      </div>
    </aside>
  );
}

function FieldMode({ state, selectedNode, onSelectNode }: { state: FounderConsoleState; selectedNode: string | null; onSelectNode: (id: string) => void }) {
  const selected = state.field.nodes.find((node) => node.id === selectedNode) ?? null;
  const regimeColor = state.regime.includes('critical') ? '#9f6a54' : state.regime.includes('stable') ? '#6fcf8d' : '#c8a951';
  const density = 0.18 + state.degradation * 0.32;
  const pulse = 8 - Math.min(5, state.urgency * 5);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <section className="relative min-h-[620px] overflow-hidden border border-[#2b2518] bg-[#050504]">
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 50% 42%, ${regimeColor}${Math.round(density * 255).toString(16).padStart(2, '0')}, transparent 34%), linear-gradient(180deg,#050504,#020201)`,
          }}
        />
        <svg viewBox="0 0 1000 680" className="absolute inset-0 h-full w-full" role="img" aria-label="Founder operational field">
          {state.field.connections.map((connection, index) => {
            const fromIndex = state.field.nodes.findIndex((node) => node.id === connection.from);
            const toIndex = state.field.nodes.findIndex((node) => node.id === connection.to);
            if (fromIndex < 0 || toIndex < 0) return null;
            const fromAngle = (Math.PI * 2 * fromIndex) / state.field.nodes.length - Math.PI / 2;
            const toAngle = (Math.PI * 2 * toIndex) / state.field.nodes.length - Math.PI / 2;
            const from = { x: 500 + Math.cos(fromAngle) * 260, y: 330 + Math.sin(fromAngle) * 210 };
            const to = { x: 500 + Math.cos(toAngle) * 260, y: 330 + Math.sin(toAngle) * 210 };
            return <line key={`${connection.from}-${connection.to}-${index}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#c8a951" strokeOpacity={0.12 + connection.strength * 0.42} strokeWidth={0.5 + connection.strength * 2.6} />;
          })}
          <circle cx="500" cy="330" r="82" fill="none" stroke={regimeColor} strokeOpacity="0.7" strokeWidth="1.5" />
          <text x="500" y="326" textAnchor="middle" fill="#f0e7d0" fontSize="16" letterSpacing="3">SFI-01</text>
          <text x="500" y="350" textAnchor="middle" fill="#9c927f" fontSize="9" letterSpacing="2">FOUNDER CONSOLE</text>
          {state.field.nodes.map((node, index) => {
            const angle = (Math.PI * 2 * index) / state.field.nodes.length - Math.PI / 2;
            const x = 500 + Math.cos(angle) * 260;
            const y = 330 + Math.sin(angle) * 210;
            const radius = 8 + node.importance * 13 + node.evidenceWeight * 8;
            const selected = node.id === selectedNode;
            return (
              <g key={node.id} className="cursor-pointer" onClick={() => onSelectNode(node.id)}>
                <circle cx={x} cy={y} r={radius + 7} fill="none" stroke={tone(node.state)} strokeOpacity={node.state === 'alive' ? 0.2 : 0.82} strokeWidth={node.state === 'alive' ? 1 : 2.2} />
                <circle cx={x} cy={y} r={radius} fill="#050504" stroke={tone(node.state)} strokeOpacity={0.42 + node.trust * 0.5} strokeWidth={selected ? 3 : 1.4}>
                  <animate attributeName="r" values={`${radius};${radius + node.urgency * 3};${radius}`} dur={`${pulse}s`} repeatCount="indefinite" />
                </circle>
                <circle cx={x} cy={y} r={Math.max(3, radius * 0.28)} fill={tone(node.state)} fillOpacity={node.trust} />
                <text x={x + radius + 8} y={y + 4} fill={selected ? '#f0e7d0' : '#b7aa91'} fontSize="9" letterSpacing="1.2">{node.label}</text>
              </g>
            );
          })}
        </svg>
        <div className="absolute left-4 top-4 grid grid-cols-2 gap-2 text-[10px] uppercase tracking-[0.14em] text-[#b7aa91]">
          <span>field color = regime</span>
          <span>density = degradation {pct(state.degradation)}</span>
          <span>pulse = urgency {pct(state.urgency)}</span>
          <span>opacity = trust {pct(state.trust)}</span>
        </div>
      </section>
      <FieldNodeDrawer node={selected} />
    </div>
  );
}

function OperationsMode({ state }: { state: FounderConsoleState }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Metric label="How is my system today?" value={`${state.regime} / trust ${pct(state.trust)} / degradation ${pct(state.degradation)}`} />
      <Metric label="What is alive?" value={state.myPanel.alive.slice(0, 8).join(' · ') || 'none'} />
      <Metric label="What is degraded?" value={state.myPanel.broken.slice(0, 8).join(' · ') || 'none'} />
      <Metric label="What is blocked?" value={state.myPanel.protected.join(' · ')} />
      <Metric label="What is contaminating?" value={state.myPanel.prune_candidates.join(' · ') || 'none'} />
      <Metric label="What should I observe?" value={state.worldSpect.repair_task?.title ?? 'WorldSpect current state and SFI evidence timeline'} />
      <Metric label="What should I close?" value={state.systemMutations.find((item) => item.state === 'empty_live_table')?.title ?? 'No closure candidate selected'} />
      <Metric label="What does AMV propose?" value={state.graphAmv.sfi_amv_memory.state === 'empty_live_table' ? 'AMV memory is empty; require rehydration decision before claiming memory.' : 'Review AMV scoped adapter output.'} />
      <Metric label="Owner decision required" value={state.myPanel.decision_required_now.slice(0, 4).join(' · ')} />
    </div>
  );
}

function TimelineMode({ items, onSelect }: { items: FounderTimelineItem[]; onSelect: (item: FounderTimelineItem) => void }) {
  return (
    <div className="grid gap-2">
      {items.map((item) => (
        <button key={item.id} type="button" onClick={() => onSelect(item)} className="grid gap-2 border border-[#272219] bg-[#080806] p-3 text-left hover:border-[#c8a951]/60 md:grid-cols-[180px_1fr_140px_160px]">
          <span className="text-[10px] uppercase tracking-[0.12em] text-[#c8a951]">{item.source_table}</span>
          <span className="text-sm text-[#f0e7d0]">{item.signal}</span>
          <span className="text-xs text-[#9c927f]">{item.observed_at ?? 'not_available'}</span>
          <span className="text-xs text-[#9c927f]">{item.decision_impact}</span>
        </button>
      ))}
    </div>
  );
}

function EvaluationMode({ state, selectedTimeline, onRunAction, actionState }: { state: FounderConsoleState; selectedTimeline: FounderTimelineItem | null; onRunAction: (action: FounderActionCapability) => void; actionState: ActionState }) {
  const card = selectedTimeline
    ? { ...state.observationCard, input_evidence: selectedTimeline, source: selectedTimeline.source_table, source_table: selectedTimeline.source_table, source_id: selectedTimeline.source_id, phenomenon: selectedTimeline.signal }
    : state.observationCard;
  const actions = state.actionCapabilities.filter((action) => action.scope === 'observation_card');

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <section className="border border-[#272219] bg-[#080806] p-4">
        <div className="text-[10px] uppercase tracking-[0.2em] text-[#c8a951]">Runtime ObservationCard</div>
        <pre className="mt-4 max-h-[620px] overflow-auto whitespace-pre-wrap text-xs leading-5 text-[#cfc3aa]">{JSON.stringify(card, null, 2)}</pre>
      </section>
      <aside className="grid content-start gap-3">
        {actions.map((action) => <ActionControl key={action.id} action={action} onRun={onRunAction} actionState={actionState} />)}
      </aside>
    </div>
  );
}

function AtlasMode({ state }: { state: FounderConsoleState }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {state.atlas.map((item) => (
        <article key={item.id} className="border border-[#272219] bg-[#080806] p-4">
          <div className="text-[10px] uppercase tracking-[0.16em] text-[#c8a951]">{item.category}</div>
          <h3 className="mt-2 text-lg text-[#f0e7d0]">{item.title}</h3>
          <p className="mt-3 text-sm leading-6 text-[#9c927f]">{item.description}</p>
          <div className="mt-3 text-xs text-[#b7aa91]">Evidence: {item.linked_evidence.join(' · ') || 'not_available'}</div>
          <div className="mt-1 text-xs text-[#b7aa91]">Next: {item.next_action}</div>
        </article>
      ))}
    </div>
  );
}

function MyPanelMode({ state }: { state: FounderConsoleState }) {
  const entries = [
    ['alive', state.myPanel.alive],
    ['broken', state.myPanel.broken],
    ['producing value', state.myPanel.producing_value],
    ['repair required', state.myPanel.repair_required],
    ['prune candidates', state.myPanel.prune_candidates],
    ['can be shown', state.myPanel.showable],
    ['must stay protected', state.myPanel.protected],
    ['decision now', state.myPanel.decision_required_now],
  ];
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {entries.map(([label, values]) => (
        <section key={label as string} className="border border-[#272219] bg-[#080806] p-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">{label as string}</div>
          <ul className="mt-3 space-y-2 text-sm text-[#cfc3aa]">
            {(values as string[]).map((value) => <li key={value}>{value}</li>)}
          </ul>
        </section>
      ))}
    </div>
  );
}

function TasksMode({ state, onRunAction, actionState }: { state: FounderConsoleState; onRunAction: (action: FounderActionCapability) => void; actionState: ActionState }) {
  return (
    <div className="grid gap-3">
      {state.founderTasks.map((task) => (
        <article key={task.id} className="grid gap-2 border border-[#272219] bg-[#080806] p-4 md:grid-cols-[1fr_170px_220px]">
          <div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-[#c8a951]">{task.source_table}</div>
            <h3 className="mt-2 text-lg text-[#f0e7d0]">{task.signal}</h3>
          </div>
          <Metric label="alignment" value={task.confidence === null ? 'not_available' : pct(task.confidence)} />
          <div className="grid gap-2">
            <Metric label="minimal perturbation / evidence" value={task.decision_impact} />
            {state.actionCapabilities
              .filter((action) => action.scope === 'founder_task' && action.target_id === task.source_id)
              .map((action) => <ActionControl key={action.id} action={action} onRun={onRunAction} actionState={actionState} />)}
          </div>
        </article>
      ))}
    </div>
  );
}

function MutationsMode({ state, onRunAction, actionState }: { state: FounderConsoleState; onRunAction: (action: FounderActionCapability) => void; actionState: ActionState }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {state.systemMutations.map((item) => (
        <article key={item.id} className="border border-[#272219] bg-[#080806] p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg text-[#f0e7d0]">{item.title}</h3>
            <span className="text-[10px] uppercase tracking-[0.14em]" style={{ color: tone(item.state) }}>{item.state}</span>
          </div>
          <p className="mt-3 text-sm leading-6 text-[#9c927f]">{item.reason}</p>
          <Metric label="minimal action" value={item.next_action} />
          <Metric label="rollback / closure condition" value={item.sqlProposalRequired ? 'owner-approved SQL or keep blocked' : 'close after verification'} />
          {state.actionCapabilities
            .filter((action) => action.scope === 'system_mutation' && action.target_id === item.id)
            .map((action) => <ActionControl key={action.id} action={action} onRun={onRunAction} actionState={actionState} />)}
        </article>
      ))}
    </div>
  );
}

function RouteDispositionMode({ state }: { state: FounderConsoleState }) {
  return (
    <div className="overflow-auto border border-[#272219]">
      <table className="w-full min-w-[980px] border-collapse bg-[#080806] text-left text-xs">
        <thead className="bg-[#120f09] text-[#c8a951]">
          <tr>
            {['route', 'current role', 'data source/API', 'founder-console mode', 'disposition', 'reason', 'action required'].map((head) => <th key={head} className="border-b border-[#272219] p-3 uppercase tracking-[0.14em]">{head}</th>)}
          </tr>
        </thead>
        <tbody>
          {state.routeDisposition.map((row) => (
            <tr key={row.route} className="border-b border-[#1c1811]">
              <td className="p-3 text-[#f0e7d0]">{row.route}</td>
              <td className="p-3 text-[#cfc3aa]">{row.current_role}</td>
              <td className="p-3 text-[#9c927f]">{row.data_source_api}</td>
              <td className="p-3 text-[#c8a951]">{row.founder_console_mode}</td>
              <td className="p-3" style={{ color: row.disposition.includes('remove') || row.disposition.includes('delete') ? '#d08b63' : '#6fcf8d' }}>{row.disposition}</td>
              <td className="p-3 text-[#9c927f]">{row.reason}</td>
              <td className="p-3 text-[#cfc3aa]">{row.action_proposed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function FounderConsoleClient({ initialState, surface = 'root' }: { initialState: FounderConsoleState; surface?: 'root' }) {
  const [state, setState] = useState(initialState);
  const [loadState, setLoadState] = useState<LoadState>({ status: 'ready' });
  const [actionState, setActionState] = useState<ActionState>({ status: 'idle' });
  const [mode, setMode] = useState<FounderConsoleMode>('field');
  const [selectedNode, setSelectedNode] = useState<string | null>('founder');
  const [selectedTimeline, setSelectedTimeline] = useState<FounderTimelineItem | null>(initialState.timeline[0] ?? null);

  async function refresh() {
    setLoadState({ status: 'loading' });
    try {
      const response = await fetch('/api/root/founder-state', { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? 'founder_console_state_failed');
      setState(json);
      setSelectedTimeline(json.timeline?.[0] ?? null);
      setLoadState({ status: 'ready' });
    } catch (error) {
      setLoadState({ status: 'error', message: error instanceof Error ? error.message : 'founder_console_state_failed' });
    }
  }

  async function runAction(action: FounderActionCapability) {
    if (action.status !== 'active' || !action.endpoint || !action.method) {
      setActionState({ status: 'error', message: action.blocker ?? 'action_not_executable' });
      return;
    }

    if (action.confirmationRequired && !window.confirm(action.confirmationText ?? `Run ${action.label}?`)) return;

    setActionState({ status: 'running', message: action.label });
    try {
      const response = await fetch(action.endpoint, {
        method: action.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.payload ?? {}),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || json?.ok === false) throw new Error(json?.error ?? json?.details ?? 'action_failed');
      setActionState({ status: 'done', message: `${action.label}: ok` });
      await refresh();
    } catch (error) {
      setActionState({ status: 'error', message: error instanceof Error ? error.message : 'action_failed' });
    }
  }

  useEffect(() => {
    const timer = window.setInterval(() => void refresh(), 90_000);
    return () => window.clearInterval(timer);
  }, []);

  const modeView = useMemo(() => {
    if (mode === 'field') return <FieldMode state={state} selectedNode={selectedNode} onSelectNode={setSelectedNode} />;
    if (mode === 'operations') return <OperationsMode state={state} />;
    if (mode === 'timeline') return <TimelineMode items={state.timeline} onSelect={(item) => { setSelectedTimeline(item); setMode('evaluation'); }} />;
    if (mode === 'evaluation') return <EvaluationMode state={state} selectedTimeline={selectedTimeline} onRunAction={(action) => void runAction(action)} actionState={actionState} />;
    if (mode === 'atlas') return <AtlasMode state={state} />;
    if (mode === 'my_panel') return <MyPanelMode state={state} />;
    if (mode === 'founder_tasks') return <TasksMode state={state} onRunAction={(action) => void runAction(action)} actionState={actionState} />;
    if (mode === 'system_mutation') return <MutationsMode state={state} onRunAction={(action) => void runAction(action)} actionState={actionState} />;
    return <RouteDispositionMode state={state} />;
  }, [actionState, mode, selectedNode, selectedTimeline, state]);

  return (
    <main className="min-h-screen bg-[#050504] text-[#cfc3aa]">
      <header className="sticky top-0 z-40 border-b border-[#272219] bg-[#050504]/95 px-5 py-4 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.28em] text-[#c8a951]">Founder Console · SFI-01</div>
            <h1 className="mt-1 text-2xl font-semibold text-[#f0e7d0]">WorldSpect → Evidence → Evaluation → Atlas → Decision</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.14em]">
            <span className="inline-flex items-center gap-1 border border-[#272219] px-2 py-1 text-[#9c927f]"><Shield size={12} /> protected</span>
            <span className="border border-[#272219] px-2 py-1 text-[#9c927f]">WorldSpect {state.worldSpect.longitudinal_status}</span>
            <span className="border border-[#272219] px-2 py-1 text-[#9c927f]">Graph {state.graphAmv.graph_nodes.state}</span>
            <button type="button" onClick={() => void refresh()} className="inline-flex items-center gap-2 border border-[#c8a951]/40 px-3 py-2 text-[#c8a951]"><RefreshCw size={13} /> Refresh</button>
          </div>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-4">
          <Metric label="regime" value={state.regime} />
          <Metric label="degradation / viscosity" value={pct(state.degradation)} />
          <Metric label="urgency / pulse" value={pct(state.urgency)} />
          <Metric label="trust / continuity" value={`${pct(state.trust)} / ${pct(state.continuity)}`} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {MODES.map((item) => <ModeButton key={item.id} mode={item} active={mode === item.id} onClick={() => setMode(item.id)} />)}
        </div>
      </header>

      {loadState.status === 'error' ? <div className="m-5 border border-[#9f6a54] bg-[#120806] p-3 text-sm text-[#f0e7d0]">{loadState.message}</div> : null}
      {actionState.status === 'done' || actionState.status === 'error' ? <div className="m-5 border border-[#272219] bg-[#080806] p-3 text-sm text-[#cfc3aa]">{actionState.message}</div> : null}

      <section className="p-5">{modeView}</section>

      <footer className="grid gap-3 border-t border-[#272219] p-5 text-xs text-[#9c927f] md:grid-cols-4">
        <div className="flex items-center gap-2"><Workflow size={14} className="text-[#c8a951]" /> SFI-01 line is rendered in this route only.</div>
        <div className="flex items-center gap-2"><Layers3 size={14} className="text-[#c8a951]" /> Atlas is derived, not persisted.</div>
        <div className="flex items-center gap-2"><GitBranch size={14} className="text-[#c8a951]" /> Route disposition is visible.</div>
        <div className="flex items-center gap-2"><AlertTriangle size={14} className="text-[#c8a951]" /> SQL blockers: {state.sqlRequiredBlockers.length}</div>
      </footer>
    </main>
  );
}
