'use client';

import { useMemo, useState } from 'react';
import { EntityLink } from '@/components/entity/EntityLink';
import { HumanReadableRecord } from '@/components/shared/HumanReadableRecord';
import type { RootSovereignState } from '@/lib/root/sovereign/rootSovereignState';
import type { SfiTaskGraph } from '@/lib/sfi/cognitive-runtime/types';
import type { RootSelection } from '../sovereignTypes';

type PlanResponse = {
  ok: boolean;
  taskGraph?: SfiTaskGraph;
  error?: string;
  details?: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  operational: 'OPERATIVO OBSERVADO',
  gated: 'DISPONIBLE, SIN EJECUCIÓN RECIENTE',
  degraded: 'DEGRADADO',
  missing: 'SIN SOPORTE SUFICIENTE',
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
  const [question, setQuestion] = useState('');
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
      setError(cause instanceof Error ? cause.message : 'No fue posible crear el plan cognitivo.');
    } finally {
      setPlanning(false);
    }
  }

  return (
    <section className="rs-view rs-cognitive-runtime">
      <div className="rs-view-title">
        <span>RUNTIME COGNITIVO</span>
        <h1>CONTROL DEL GRAFO DE EJECUCIÓN</h1>
        <p>{runtime.summary}</p>
      </div>

      <div className="rs-stat-strip">
        <span><b>{runtime.contract.registeredAgents}</b>AGENTES REGISTRADOS</span>
        <span><b>{runtime.contract.executorAgents}</b>EJECUCIÓN OBSERVADA</span>
        <span><b>{runtime.contract.humanApprovalAgents}</b>REQUIEREN AUTORIDAD HUMANA</span>
        <span><b>{runtime.eventGraph.recentEvents.length}</b>EVENTOS RECIENTES</span>
      </div>

      <article>
        <header>REGLAS DE ORQUESTACIÓN</header>
        <div className="rs-cognitive-policy">
          <strong>{runtime.orchestrationPolicy.principle}</strong>
          <span>{runtime.orchestrationPolicy.executionRule}</span>
          <span>{runtime.orchestrationPolicy.memoryRule}</span>
          <span>{runtime.orchestrationPolicy.simulationRule}</span>
          <span>{runtime.orchestrationPolicy.calibrationRule}</span>
        </div>
      </article>

      <article>
        <header>PLANIFICAR UNA PREGUNTA</header>
        <form className="rs-form" onSubmit={(event) => { event.preventDefault(); void createTask(); }}>
          <label>PREGUNTA<input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Escribe la pregunta que SFI debe descomponer en tareas verificables" required /></label>
          <button type="submit" disabled={planning || !question.trim()}>{planning ? 'PLANIFICANDO' : 'CREAR GRAFO DE TAREAS'}</button>
        </form>
        {error ? <div className="rs-source-warning">{error}</div> : null}
        {plan ? (
          <div className="rs-task-graph">
            <div className="rs-section-head">
              <span>PLAN CREADO Y REGISTRADO</span>
              <strong>{plan.nodes.length} tarea(s) · {plan.edges.length} dependencia(s) · {plan.minimumEvidence.length} requisito(s) de evidencia</strong>
            </div>
            <div className="rs-task-flow">
              {plan.nodes.map((node) => (
                <div key={node.id}>
                  <button
                    type="button"
                    onClick={() => onSelect({
                      kind: 'cognitive task node',
                      id: node.id,
                      title: node.label,
                      source: 'SFI_TASK_CREATED',
                      observedAt: new Date().toISOString(),
                      confidence: null,
                      evidenceIds: node.requiresEvidence,
                      warning: node.humanApprovalRequired ? 'REQUIERE_APROBACION_HUMANA' : null,
                      data: node,
                    })}
                  >
                    <span>{node.authorityLevel}</span>
                    <strong>{node.label}</strong>
                    <em>{node.humanApprovalRequired ? 'Requiere aprobación humana' : 'Puede continuar bajo su contrato'} · {node.requiresEvidence.length ? `${node.requiresEvidence.length} fuentes requeridas` : 'Sin fuentes adicionales declaradas'}</em>
                  </button>
                  <EntityLink entityId={node.agentId} entityType="AGENT" compact className="rs-inline-action" />
                </div>
              ))}
            </div>
            <HumanReadableRecord value={plan} title="Qué significa este plan" />
          </div>
        ) : null}
      </article>

      <article>
        <header>OBSERVACIÓN PASIVA DEL CAMPO</header>
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
              <span>{STATUS_LABEL[mode.status] ?? mode.status}</span>
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
              <span>PREGUNTA DE ESTA CAPA</span>
              <strong>{layer.question}</strong>
            </div>
            <div className="rs-card-list">
              {layer.contracts.length ? layer.contracts.map((agent) => (
                <div key={agent.id}>
                  <button
                    type="button"
                    onClick={() => onSelect({
                      kind: 'cognitive agent',
                      id: agent.id,
                      title: agent.name,
                      source: agent.evidence.sourceTables.join(' + ') || 'Sólo contrato; sin fuente persistente declarada',
                      observedAt: runtime.generatedAt,
                      confidence: null,
                      evidenceIds: [...agent.readsMemory, ...agent.writesMemory].map((item) => item.memory),
                      warning: agent.evidence.warnings.join(' | ') || (agent.status === 'gated' ? 'CAPACIDAD_SIN_EJECUCION_RECIENTE' : null),
                      data: agent,
                    })}
                  >
                    <span className={`rs-status status-${statusClass(agent.status)}`}>{STATUS_LABEL[agent.status] ?? agent.status}</span>
                    <strong>{agent.name}</strong>
                    <em>{agent.purpose}</em>
                  </button>
                  <EntityLink entityId={agent.id} entityType="AGENT" compact className="rs-inline-action" />
                </div>
              )) : <div className="rs-empty compact"><b>SIN AGENTES REGISTRADOS EN ESTA CAPA</b></div>}
            </div>
          </article>
        ))}
      </div>

      <article>
        <header>EVENTOS OBSERVADOS</header>
        <div className="rs-card-list horizontal">
          {runtime.eventGraph.recentEvents.length ? runtime.eventGraph.recentEvents.map((event) => (
            <div key={event.eventId}>
              <button
                type="button"
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
                <em>{event.occurredAt ?? 'Sin fecha'} · {event.sourceId ?? 'Sin agente/fuente atribuida'}</em>
              </button>
              <EntityLink entityId={event.eventId} entityType="EVENT" compact className="rs-inline-action" />
            </div>
          )) : <div className="rs-empty"><b>SIN EVENTOS OBSERVADOS</b><p>No se mostrará actividad inventada. El panel permanecerá vacío hasta que existan eventos persistidos.</p></div>}
        </div>
      </article>
    </section>
  );
}
