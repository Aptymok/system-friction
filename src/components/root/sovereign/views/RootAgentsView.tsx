import { useState } from 'react';
import type { RootSovereignState } from '@/lib/root/sovereign/rootSovereignState';
import type { RootActionRequest, RootSelection } from '../sovereignTypes';

export function RootAgentsView({ state, onSelect, onAction }: { state: RootSovereignState; onSelect: (selection: RootSelection) => void; onAction: (action: RootActionRequest) => void }) {
  return <section className="rs-view"><div className="rs-view-title"><span>AGENTS</span><h1>AGENT STATUS MATRIX</h1><p>Disponibilidad y último resultado, sin health inventado.</p></div><div className="rs-table-wrap"><table className="rs-table"><thead><tr><th>ID</th><th>ROLE</th><th>STATE</th><th>PROVIDER / MODEL</th><th>LAST RUN</th><th>LAST RESULT</th><th>ERROR</th></tr></thead><tbody>{state.agents.data.agents.map((agent) => <tr key={agent.id} tabIndex={0} onClick={() => onSelect({ kind: 'agent', id: agent.id, title: agent.role, source: agent.state.source, observedAt: agent.lastRun, confidence: null, evidenceIds: [], warning: agent.error, data: agent })} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.click(); }}><th>{agent.id}</th><td>{agent.role}</td><td><span className={`rs-status status-${agent.state.status}`}>{agent.state.value ?? 'SIN DATO'}</span></td><td>{[agent.provider, agent.model].filter(Boolean).join(' / ') || 'NO MEDIDO'}</td><td>{agent.lastRun ?? 'NO MEDIDO'}</td><td>{agent.lastResult ?? 'SIN DATO'}</td><td>{agent.error ?? '—'}</td></tr>)}</tbody></table></div><div className="rs-action-grid">{(['daily','reports','audit','all'] as const).map((job) => <button type="button" key={job} onClick={() => onAction({ id: `sync-${job}`, label: `ROOT SYNC · ${job.toUpperCase()}`, effect: `Ejecuta el job ${job}; puede persistir observaciones, reportes o auditoría y mostrar resultados parciales.`, target: job, endpoint: `/api/root/operational/trigger-observation?job=${job}`, method: 'POST' })}>RUN {job.toUpperCase()}</button>)}</div>
    <article className="rs-agents-research">
      <header>PROSPECT / CLIENT CORRELATION</header>
      <p className="rs-view-note">Estos dos agentes correlacionan evidencia YA PERSISTIDA en tus tablas (grafo, AMV, señales). No navegan internet ni consultan APIs externas — la señal de entrada la escribes tú. Si buscas investigación web autónoma real, ese motor no existe todavía; ver DT-INSTRUMENT-01 backlog.</p>
      <RootClientFinderForm onAction={onAction} />
      <RootNameScoutForm onAction={onAction} />
    </article>
  </section>;
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
      <label>SEÑAL PÚBLICA (tú la documentas)<input value={publicSignal} onChange={(event) => setPublicSignal(event.target.value)} /></label>
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
        effect: `Genera candidatos deterministas a partir del vector "${vector}" y las semillas internas — no es búsqueda web.`,
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
