import { useState } from 'react';
import type { RootSovereignState } from '@/lib/root/sovereign/rootSovereignState';
import type { RootActionRequest, RootSelection } from '../sovereignTypes';

const STATUS_LABEL: Record<string, string> = {
  observed: 'Ejecución observada',
  derived: 'Estado derivado de evidencia',
  operational: 'Ejecución observada reciente',
  gated: 'Registrado, sin ejecución reciente',
  degraded: 'Degradado',
  missing: 'Sin soporte suficiente',
  available: 'Disponible',
  partial: 'Parcial',
};

export function RootAgentsView({ state, onSelect, onAction }: { state: RootSovereignState; onSelect: (selection: RootSelection) => void; onAction: (action: RootActionRequest) => void }) {
  const cognitive = state.cognitiveRuntime.data.agents;
  const cognitiveOperational = cognitive.filter((agent) => agent.status === 'operational').length;
  const cognitiveGated = cognitive.filter((agent) => agent.status === 'gated').length;
  const cognitiveDegraded = cognitive.filter((agent) => ['degraded', 'missing'].includes(agent.status)).length;

  return (
    <section className="rs-view">
      <div className="rs-view-title">
        <span>AGENTES</span>
        <h1>QUIÉN PUEDE HACER QUÉ — Y QUÉ YA HA SIDO OBSERVADO</h1>
        <p>El registro de un agente no prueba que esté funcionando. Esta vista separa capacidades operativas generales de los agentes del Cognitive Runtime y conserva su evidencia de ejecución.</p>
      </div>

      <div className="rs-stat-strip">
        <span><b>{state.agents.data.agents.length}</b>AGENTES OPERATIVOS REGISTRADOS</span>
        <span><b>{cognitive.length}</b>CONTRATOS COGNITIVOS</span>
        <span><b>{cognitiveOperational}</b>EJECUCIÓN COGNITIVA OBSERVADA</span>
        <span><b>{cognitiveGated}</b>REGISTRADOS SIN EJECUCIÓN RECIENTE</span>
        <span><b>{cognitiveDegraded}</b>DEGRADADOS / SIN SOPORTE</span>
      </div>

      <article>
        <header>AGENTES OPERATIVOS GENERALES</header>
        <p className="rs-view-note">Este inventario refleja agentes y servicios operativos fuera del contrato específico del Cognitive Runtime.</p>
        <div className="rs-table-wrap">
          <table className="rs-table">
            <thead><tr><th>AGENTE</th><th>FUNCIÓN</th><th>ESTADO</th><th>PROVEEDOR / MODELO</th><th>ÚLTIMA EJECUCIÓN</th><th>ÚLTIMO RESULTADO</th><th>PROBLEMA</th></tr></thead>
            <tbody>{state.agents.data.agents.map((agent) => (
              <tr key={agent.id} tabIndex={0} onClick={() => onSelect({ kind: 'agent', id: agent.id, title: agent.role, source: agent.state.source, observedAt: agent.lastRun, confidence: null, evidenceIds: [], warning: agent.error, data: agent })} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.click(); }}>
                <th>{agent.id}</th>
                <td>{agent.role}</td>
                <td><span className={`rs-status status-${agent.state.status}`}>{STATUS_LABEL[agent.state.status] ?? agent.state.value ?? agent.state.status}</span></td>
                <td>{[agent.provider, agent.model].filter(Boolean).join(' / ') || 'No medido'}</td>
                <td>{agent.lastRun ?? 'Sin ejecución registrada'}</td>
                <td>{agent.lastResult ?? 'Sin resultado registrado'}</td>
                <td>{agent.error ?? 'Sin error registrado'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </article>

      <article>
        <header>AGENTES DEL COGNITIVE RUNTIME</header>
        <p className="rs-view-note">Aquí el estado se reconcilia contra ejecuciones `SFI_AGENT_EXECUTED` y las fuentes persistentes que cada contrato declara. Un contrato sin evidencia permanece GATED.</p>
        <div className="rs-card-list horizontal">
          {cognitive.map((agent) => (
            <button type="button" key={agent.id} onClick={() => onSelect({
              kind: 'cognitive agent',
              id: agent.id,
              title: agent.name,
              source: agent.evidence.observedTables.join(' + ') || 'Contrato sin fuente disponible',
              observedAt: state.cognitiveRuntime.observedAt,
              confidence: null,
              evidenceIds: [...agent.readsMemory, ...agent.writesMemory].map((item) => item.memory),
              warning: agent.evidence.warnings.join(' | ') || null,
              data: agent,
            })}>
              <span className={`rs-status status-${agent.status}`}>{STATUS_LABEL[agent.status] ?? agent.status}</span>
              <strong>{agent.name}</strong>
              <em>{agent.purpose}</em>
            </button>
          ))}
          {!cognitive.length ? <div className="rs-empty"><b>SIN CONTRATOS COGNITIVOS</b><p>No se inventan agentes para completar la vista.</p></div> : null}
        </div>
      </article>

      <article>
        <header>EJECUCIONES MANUALES GOBERNADAS</header>
        <p className="rs-view-note">Estos botones disparan jobs existentes y auditables. No cambian por sí solos el estado de un agente a operativo.</p>
        <div className="rs-action-grid">{(['daily','reports','audit','all'] as const).map((job) => <button type="button" key={job} onClick={() => onAction({ id: `sync-${job}`, label: `ROOT SYNC · ${job.toUpperCase()}`, effect: `Ejecuta el job ${job}; puede persistir observaciones, reportes o auditoría y mostrar resultados parciales.`, target: job, endpoint: `/api/root/operational/trigger-observation?job=${job}`, method: 'POST' })}>EJECUTAR {job.toUpperCase()}</button>)}</div>
      </article>

      <article className="rs-agents-research">
        <header>PROSPECT / CLIENT CORRELATION</header>
        <RootClientFinderForm onAction={onAction} />
        <RootNameScoutForm onAction={onAction} />
      </article>
    </section>
  );
}

function RootClientFinderForm({ onAction }: { onAction: (action: RootActionRequest) => void }) {
  const [entityName, setEntityName] = useState('');
  const [publicSignal, setPublicSignal] = useState('');
  return (
    <form className="rs-form" onSubmit={(event) => {
      event.preventDefault();
      if (!entityName.trim()) return;
      onAction({
        id: `client-finder-${Date.now()}`,
        label: 'CLIENT FINDER',
        effect: `Correlaciona "${entityName}" contra el grafo y la memoria AMV internos; genera una oferta sugerida a partir de evidencia ya persistida.`,
        target: 'client_finder',
        endpoint: '/api/root/agentic/client-finder',
        method: 'POST',
        body: { entityName, publicSignal: publicSignal || undefined },
      });
    }}>
      <label>ENTIDAD<input value={entityName} onChange={(event) => setEntityName(event.target.value)} required /></label>
      <label>SEÑAL PÚBLICA<input value={publicSignal} onChange={(event) => setPublicSignal(event.target.value)} /></label>
      <button type="submit" disabled={!entityName.trim()}>PREPARAR CORRELACIÓN</button>
    </form>
  );
}

function RootNameScoutForm({ onAction }: { onAction: (action: RootActionRequest) => void }) {
  const [vector, setVector] = useState('');
  return (
    <form className="rs-form" onSubmit={(event) => {
      event.preventDefault();
      if (!vector.trim()) return;
      onAction({
        id: `name-scout-${Date.now()}`,
        label: 'NAME SCOUT',
        effect: `Genera candidatos deterministas a partir del vector "${vector}" y las semillas internas.`,
        target: 'prospect_scout',
        endpoint: '/api/root/agentic/name-scout',
        method: 'POST',
        body: { vector },
      });
    }}>
      <label>VECTOR<input value={vector} onChange={(event) => setVector(event.target.value)} required /></label>
      <button type="submit" disabled={!vector.trim()}>PREPARAR SCOUT</button>
    </form>
  );
}
