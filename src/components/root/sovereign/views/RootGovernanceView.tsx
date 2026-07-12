'use client';

import { useState } from 'react';
import type { RootSovereignState, RootRow } from '@/lib/root/sovereign/rootSovereignState';
import { GovernancePipeline } from '../visual/GovernancePipeline';
import type { RootActionRequest, RootSelection } from '../sovereignTypes';

function evidenceIds(row: RootRow) {
  const payload = row.payload as Record<string, unknown> | undefined;
  return Array.isArray(payload?.evidenceIds) ? payload.evidenceIds.filter((item): item is string => typeof item === 'string') : [];
}

export function RootGovernanceView({ state, onSelect, onAction }: { state: RootSovereignState; onSelect: (selection: RootSelection) => void; onAction: (action: RootActionRequest) => void }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [source, setSource] = useState('root_console');
  const select = (kind: string, row: RootRow) => onSelect({
    kind,
    id: String(row.id ?? 'SIN ID'),
    title: String(row.title ?? row.mutation_key ?? row.action ?? row.id ?? 'SIN TÍTULO'),
    source: kind === 'proposal' ? 'action_proposals' : kind === 'mutation' ? 'logbook_mutations' : 'root_audit_events',
    observedAt: typeof row.updated_at === 'string' ? row.updated_at : typeof row.created_at === 'string' ? row.created_at : null,
    confidence: typeof row.confidence === 'number' ? row.confidence : null,
    evidenceIds: evidenceIds(row),
    warning: null,
    data: row,
  });

  return (
    <section className="rs-view">
      <div className="rs-view-title"><span>GOVERNANCE</span><h1>REAL GOVERNANCE BOARD</h1><p>Propuestas, mutaciones, evidencia y auditoría persistidas.</p></div>
      {state.governance.error ? <div className="rs-source-warning">FUENTE DEGRADADA · {state.governance.error}</div> : null}
      <GovernancePipeline proposals={state.governance.data.proposals} unavailable={Boolean(state.governance.error)} />
      <div className="rs-governance-grid">
        <article>
          <header>PROPOSALS</header>
          <div className="rs-card-list">
            {state.governance.error ? <div className="rs-empty"><b>FUENTE NO DISPONIBLE</b></div>
              : state.governance.data.proposals.length ? state.governance.data.proposals.map((proposal) => <button type="button" key={String(proposal.id)} onClick={() => select('proposal', proposal)}><span>{String(proposal.status ?? 'draft')}</span><strong>{String(proposal.title ?? proposal.objective ?? proposal.id)}</strong><em>{String(proposal.created_at ?? 'NO MEDIDO').slice(0, 16)}</em></button>)
                : <div className="rs-empty"><b>SIN PROPUESTAS</b></div>}
          </div>
        </article>
        <article>
          <header>OPEN MUTATIONS</header>
          <div className="rs-card-list">
            {state.governance.data.mutations.filter((mutation) => String(mutation.status) !== 'closed').map((mutation) => <div className="rs-card-action" key={String(mutation.id)}><button type="button" onClick={() => select('mutation', mutation)}><span>{String(mutation.status ?? 'SIN DATO')}</span><strong>{String(mutation.mutation_key ?? mutation.target ?? mutation.id)}</strong><em>{String(mutation.created_at ?? 'NO MEDIDO').slice(0, 16)}</em></button><button type="button" className="rs-inline-action" onClick={() => onAction({ id: `close-${mutation.id}`, label: 'CLOSE MUTATION', effect: 'Marca la mutación persistida como closed y registra auditoría ROOT.', target: String(mutation.id), endpoint: `/api/root/mutations/${mutation.id}/close`, method: 'POST', body: { result: 'closed_from_sovereign_console' } })}>CLOSE</button></div>)}
          </div>
        </article>
        <article>
          <header>RECORD EVIDENCE</header>
          <form className="rs-form" onSubmit={(event) => {
            event.preventDefault();
            if (!content.trim()) return;
            onAction({ id: 'record-evidence', label: 'RECORD EVIDENCE', effect: 'Persiste evidencia, evento epistemológico, nodo de grafo, mutación y auditoría.', target: title || 'root.evidence', endpoint: '/api/root/evidence', method: 'POST', body: { title: title || 'root.evidence', content, source } });
          }}>
            <label>TITLE<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
            <label>SOURCE<input value={source} onChange={(event) => setSource(event.target.value)} required /></label>
            <label>CONTENT<textarea value={content} onChange={(event) => setContent(event.target.value)} required /></label>
            <button type="submit" disabled={!content.trim()}>REVIEW MUTATION</button>
          </form>
        </article>
        <article>
          <header>LATEST AUDIT</header>
          <div className="rs-card-list">{state.governance.data.audits.slice(0, 12).map((audit) => <button type="button" key={String(audit.id)} onClick={() => select('audit', audit)}><span>{String(audit.action ?? 'SIN ACCIÓN')}</span><strong>{String(audit.target ?? audit.id)}</strong><em>{String(audit.created_at ?? 'NO MEDIDO').slice(0, 16)}</em></button>)}</div>
        </article>
      </div>
    </section>
  );
}
