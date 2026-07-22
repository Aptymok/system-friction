'use client';

import { useMemo, useState } from 'react';
import type { RootSovereignState } from '@/lib/root/sovereign/rootSovereignState';
import type { SfiTaskGraph } from '@/lib/sfi/cognitive-runtime/types';
import type { RootSelection } from '../sovereignTypes';

type PlanResponse = {
  ok: boolean;
  taskGraph?: SfiTaskGraph;
  error?: string;
  details?: string | null;
};

function statusClass(status: string) {
  return status === 'operational'
    ? 'observed'
    : status === 'gated'
      ? 'gated'
      : status === 'degraded'
        ? 'degraded'
        : 'missing';
}

export function RootCognitiveRuntimeView({ state, onSelect }: {
  state: RootSovereignState;
  onSelect: (selection: RootSelection) => void;
}) {
  const runtime = state.cognitiveRuntime.data;
  const [question, setQuestion] = useState('Por que REM618 perdio trayectoria despues de junio?');
  const [planning, setPlanning] = useState(false);
  const [plan, setPlan] = useState<SfiTaskGraph | null>(null);
  const [error, setError] = useState<string | null>(null);

  const grouped = useMemo(() => runtime.layers.map((layer) => ({
    ...layer,
    contracts: runtime.agents.filter((agent) => agent.layer === layer.id),
  })), [runtime.agents, runtime.layers]);

  async function createTask() {
    setPlanning(true);
    setError(null);
    try {
      const response = await fetch('/api/root/cognitive-runtime', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const body = await response.json().catch(() => null) as PlanResponse | null;
      if (!response.ok || !body?.ok || !body.taskGraph) throw new Error(body?.details ?? body?.error ?? `HTTP ${response.status}`);
      setPlan(body.taskGraph);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'task_graph_failed');
    } finally {
      setPlanning(false);
    }
  }

  return (
    <section className="rs-view rs-cognitive-runtime">
      <div className="rs-view-title">
        <span>COGNITIVE RUNTIME</span>
        <h1>SFI EVENT GRAPH CONTROL</h1>
        <p>Contratos, memoria, autoridad y simulacion declarados antes de activar cualquier agente.</p>
      </div>

      <div className="rs-stat-strip">
        <span><b>{runtime.contract.registeredAgents}</b>REGISTERED AGENTS</span>
        <span><b>{runtime.contract.humanApprovalAgents}</b>HUMAN APPROVAL</span>
        <span><b>{runtime.eventGraph.recentEvents.length}</b>RECENT EVENTS</span>
      </div>

      <article>
        <header>ORCHESTRATION POLICY</header>
        <div className="rs-cognitive-policy">
          <strong>{runtime.orchestrationPolicy.principle}</strong>
          <span>{runtime.orchestrationPolicy.executionRule}</span>
          <span>{runtime.orchestrationPolicy.memoryRule}</span>
          <span>{runtime.orchestrationPolicy.simulationRule}</span>
          <span>{runtime.orchestrationPolicy.calibrationRule}</span>
        </div>
      </article>

      <article>
        <header>META ORCHESTRATION</header>
        <form className="rs-form" onSubmit={(event) => { event.preventDefault(); void createTask(); }}>
          <label>QUESTION<input value={question} onChange={(event) => setQuestion(event.target.value)} required /></label>
          <button type="submit" disabled={planning || !question.trim()}>{planning ? 'PLANNING' : 'CREATE TASK GRAPH'}</button>
        </form>
        {error ? <div className="rs-source-warning">{error}</div> : null}
        {plan ? (
          <div className="rs-task-graph">
            <div className="rs-task-flow">
              {plan.nodes.map((node) => (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => onSelect({
                    kind: 'cognitive task node',
                    id: node.id,
                    title: node.label,
                    source: 'SFI_TASK_CREATED',
                    observedAt: new Date().toISOString(),
                    confidence: null,
                    evidenceIds: node.requiresEvidence,
                    warning: node.humanApprovalRequired ? 'HUMAN_APPROVAL_REQUIRED' : null,
                    data: node,
                  })}
                >
                  <span>{node.authorityLevel}</span>
                  <strong>{node.label}</strong>
                  <em>{node.requiresEvidence.slice(0, 3).join(' / ') || 'NO MEMORY'}</em>
                </button>
              ))}
            </div>
            <pre className="rs-result">{JSON.stringify(plan, null, 2)}</pre>
          </div>
        ) : null}
      </article>

      <article>
        <header>PASSIVE FIELD OBSERVATION</header>
        <div className="rs-card-list horizontal">
          {runtime.modes.map((mode) => (
            <button
              type="button"
              key={mode.id}
              onClick={() => onSelect({
                kind: 'runtime mode',
                id: mode.id,
                title: mode.name,
                source: 'sfi_cognitive_runtime_modes',
                observedAt: runtime.generatedAt,
                confidence: null,
                evidenceIds: mode.readsMemory.map((item) => item.memory),
                warning: mode.warning,
                data: mode,
              })}
            >
              <span>{mode.status}</span>
              <strong>{mode.name}</strong>
              <em>{mode.principle}</em>
            </button>
          ))}
        </div>
      </article>

      <div className="rs-cognitive-grid">
        {grouped.map((layer) => (
          <article key={layer.id}>
            <header>{layer.id.toUpperCase()}</header>
            <div className="rs-section-head">
              <span>QUESTION</span>
              <strong>{layer.question}</strong>
            </div>
            <div className="rs-card-list">
              {layer.contracts.length ? layer.contracts.map((agent) => (
                <button
                  type="button"
                  key={agent.id}
                  onClick={() => onSelect({
                    kind: 'cognitive agent',
                    id: agent.id,
                    title: agent.name,
                    source: agent.evidence.sourceTables.join(' + ') || 'contract only',
                    observedAt: runtime.generatedAt,
                    confidence: null,
                    evidenceIds: [...agent.readsMemory, ...agent.writesMemory].map((item) => item.memory),
                    warning: agent.evidence.warnings.join(' | ') || (agent.status === 'gated' ? 'CAPABILITY_GATED' : null),
                    data: agent,
                  })}
                >
                  <span className={`rs-status status-${statusClass(agent.status)}`}>{agent.status}</span>
                  <strong>{agent.name}</strong>
                  <em>{agent.authorityLevel} / {agent.domain} / emits {agent.emits.join(', ')}</em>
                </button>
              )) : <div className="rs-empty compact"><b>NO CONTRACTS</b></div>}
            </div>
          </article>
        ))}
      </div>

      <article>
        <header>EVENT GRAPH</header>
        <div className="rs-card-list horizontal">
          {runtime.eventGraph.recentEvents.length ? runtime.eventGraph.recentEvents.map((event) => (
            <button
              type="button"
              key={event.eventId}
              onClick={() => onSelect({
                kind: 'event graph',
                id: event.eventId,
                title: event.eventName,
                source: runtime.eventGraph.source,
                observedAt: event.occurredAt,
                confidence: event.confidence,
                evidenceIds: [],
                warning: null,
                data: event,
              })}
            >
              <span>{event.epistemicClass}</span>
              <strong>{event.eventName}</strong>
              <em>{event.occurredAt ?? 'NO DATE'} / {event.sourceId ?? 'NO SOURCE'}</em>
            </button>
          )) : <div className="rs-empty"><b>EVENT GRAPH EMPTY</b><p>No readable epistemic events were returned by the existing store.</p></div>}
        </div>
      </article>
    </section>
  );
}
