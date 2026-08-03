'use client';

import type { ReactNode } from 'react';
import type { RootSovereignState } from '@/lib/root/sovereign/rootSovereignState';
import type { RootViewId } from './sovereignTypes';
import './root-migrated-workspace.css';

const MODULES: Array<{ id: RootViewId; label: string; group: string }> = [
  { id: 'overview', label: 'CARTOGRAPHY', group: 'FIELD' },
  { id: 'cognitive-runtime', label: 'COGNITIVE', group: 'RUNTIME' },
  { id: 'governance', label: 'GOVERNANCE', group: 'CONTROL' },
  { id: 'agents', label: 'AGENTS', group: 'EXECUTE' },
  { id: 'predictions', label: 'PROJECTIVE', group: 'MODEL' },
  { id: 'amv', label: 'ATTRACTORS', group: 'FIELD' },
  { id: 'evidence', label: 'EVIDENCE / ATLAS', group: 'MEMORY' },
  { id: 'execution', label: 'SIMULATOR', group: 'OPERATE' },
  { id: 'telemetry', label: 'TIMELINE', group: 'OBSERVE' },
];

const TITLES: Record<RootViewId, { eyebrow: string; title: string; description: string }> = {
  overview: { eyebrow: 'ROOT', title: 'CARTOGRAPHY OF THE UNEXPLORED', description: 'Persistent systemic topology and operational field.' },
  'cognitive-runtime': { eyebrow: 'ROOT · COGNITIVE', title: 'COGNITIVE RUNTIME', description: 'Canonical agents, task graph and cognitive execution state.' },
  governance: { eyebrow: 'ROOT · CONTROL', title: 'GOVERNANCE', description: 'Proposals, mutations, authorization and audit.' },
  agents: { eyebrow: 'ROOT · EXECUTE', title: 'AGENT OPERATIONS', description: 'Available, gated and degraded agents through existing canonical routes.' },
  predictions: { eyebrow: 'ROOT · MODEL', title: 'PROJECTIVE ENGINE', description: 'Runs, hypotheses, outcomes, calibration and learning.' },
  amv: { eyebrow: 'ROOT · FIELD', title: 'ATTRACTORS / EJECTORS', description: 'Persisted AMV memory and field structures.' },
  evidence: { eyebrow: 'ROOT · MEMORY', title: 'EVIDENCE / ATLAS', description: 'Evidence by proposition, reference cases and explicit graph relations.' },
  execution: { eyebrow: 'ROOT · OPERATE', title: 'SIMULATOR / EXECUTION', description: 'Canonical capabilities and confirmed operational mutations.' },
  telemetry: { eyebrow: 'ROOT · OBSERVE', title: 'PHENOMENOLOGICAL TIMELINE', description: 'Observed events, trajectories and longitudinal return.' },
};

export function RootMigratedWorkspace({
  view,
  state,
  refreshing,
  warning,
  onChange,
  onRefresh,
  children,
}: {
  view: RootViewId;
  state: RootSovereignState;
  refreshing: boolean;
  warning: string | null;
  onChange: (view: RootViewId) => void;
  onRefresh: () => void;
  children: ReactNode;
}) {
  const title = TITLES[view];
  const observedSystems = state.system.data.matrix.filter((item) => item.state.value !== null).length;
  const activeAgents = state.agents.data.agents.filter((agent) => ['available', 'operational', 'active', 'ready'].includes(String(agent.state.value ?? agent.availability).toLowerCase())).length;

  return (
    <section className="rm-root">
      <header className="rm-header">
        <div className="rm-title">
          <span>{title.eyebrow}</span>
          <h1>{title.title}</h1>
          <p>{title.description}</p>
        </div>
        <div className="rm-state">
          <span><b>{observedSystems}/{state.system.data.matrix.length}</b>SYSTEMS</span>
          <span><b>{state.evidence.data.nodes.length}</b>EVIDENCE</span>
          <span><b>{state.amv.data.attractors.length}</b>ATTRACTORS</span>
          <span><b>{activeAgents}/{state.agents.data.agents.length}</b>AGENTS</span>
          <button type="button" onClick={onRefresh} disabled={refreshing}>{refreshing ? 'REFRESHING' : 'REFRESH'}</button>
        </div>
      </header>

      <nav className="rm-modules" aria-label="ROOT migrated modules">
        {MODULES.map((module) => (
          <button
            key={module.id}
            type="button"
            className={view === module.id ? 'active' : ''}
            onClick={() => onChange(module.id)}
          >
            <span>{module.group}</span>
            <strong>{module.label}</strong>
          </button>
        ))}
      </nav>

      {warning ? <div className="rm-warning">{warning}</div> : null}
      <div className="rm-canvas" aria-live="polite">{children}</div>
    </section>
  );
}
