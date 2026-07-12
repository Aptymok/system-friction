'use client';

import { useState } from 'react';
import type { RootSovereignState } from '@/lib/root/sovereign/rootSovereignState';
import type { RootActionRequest, RootSelection } from '../sovereignTypes';
import { EvidenceGraph } from '../visual/EvidenceGraph';

const FILTERS = ['evidence','signal','hypothesis','prediction','outcome','report','atlas','moph','world_vector','amv'];

export function RootEvidenceAtlasView({ state, onSelect, onAction }: { state: RootSovereignState; onSelect: (selection: RootSelection) => void; onAction: (action: RootActionRequest) => void }) {
  const [active, setActive] = useState<string[]>([]); const [query, setQuery] = useState(''); const [result, setResult] = useState<Record<string, unknown> | null>(null); const [error, setError] = useState<string | null>(null); const [searching, setSearching] = useState(false);
  const [intakeTitle, setIntakeTitle] = useState(''); const [intakeContent, setIntakeContent] = useState(''); const [intakeType, setIntakeType] = useState('root_evidence');
  const filtered = active.length ? state.evidence.data.nodes.filter((node) => active.includes(node.type) || active.includes(node.source.replace('sfi_', ''))) : state.evidence.data.nodes;
  async function search() {
    setSearching(true); setError(null);
    try {
      const response = await fetch('/api/root/agentic/neural-graph', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, filters: active.length ? active : FILTERS, generateInterpretation: false }) });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok) throw new Error(body?.error ?? `HTTP ${response.status}`);
      setResult(body);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'graph_query_failed'); } finally { setSearching(false); }
  }
  return (
    <section className="rs-view">
      <div className="rs-view-title"><span>EVIDENCE / ATLAS</span><h1>REAL EVIDENCE GRAPH</h1><p>Solo nodos, aristas, pesos y relaciones persistidas.</p></div>
      <div className="rs-filter-row">{FILTERS.map((filter) => <button type="button" key={filter} className={active.includes(filter) ? 'active' : ''} onClick={() => setActive((current) => current.includes(filter) ? current.filter((item) => item !== filter) : [...current, filter])}>{filter}</button>)}</div>
      <EvidenceGraph nodes={filtered} edges={state.evidence.data.edges} onSelect={onSelect} />
      <div className="rs-stat-strip"><span><b>{filtered.length}</b>PERSISTED NODES</span><span><b>{state.evidence.data.edges.length}</b>PERSISTED EDGES</span><span><b>{state.evidence.data.entries.length + state.evidence.data.ledger.length}</b>EVIDENCE ENTRIES</span></div>
      <article><header>QUERY NEURAL GRAPH</header><form className="rs-form" onSubmit={(event) => { event.preventDefault(); void search(); }}><label>QUERY<input value={query} onChange={(event) => setQuery(event.target.value)} /></label><button type="submit" disabled={searching}>{searching ? 'QUERYING' : 'QUERY'}</button></form>{error ? <div className="rs-source-warning">{error}</div> : null}{result ? <pre className="rs-result">{JSON.stringify(result, null, 2)}</pre> : null}</article>
      <article>
        <header>EVIDENCE INTAKE</header>
        <p className="rs-view-note">Escribe a `root_evidence_entries`, crea un evento epistémico, un nodo de grafo y una entrada de bitácora auditada. No busca en internet — registra lo que tú documentas.</p>
        <form className="rs-form" onSubmit={(event) => {
          event.preventDefault();
          if (!intakeContent.trim()) return;
          onAction({
            id: `evidence-intake-${Date.now()}`,
            label: 'EVIDENCE INTAKE',
            effect: `Registra "${intakeTitle || 'root.evidence'}" en root_evidence_entries, con evento epistémico, nodo de grafo y auditoría.`,
            target: 'root_evidence_entries',
            endpoint: '/api/root/evidence',
            method: 'POST',
            body: { title: intakeTitle || undefined, content: intakeContent, evidenceType: intakeType, source: 'root_console' },
          });
        }}>
          <label>TÍTULO<input value={intakeTitle} onChange={(event) => setIntakeTitle(event.target.value)} placeholder="root.evidence" /></label>
          <label>TIPO<select value={intakeType} onChange={(event) => setIntakeType(event.target.value)}>
            <option value="root_evidence">root_evidence</option>
            <option value="signal">signal</option>
            <option value="hypothesis">hypothesis</option>
            <option value="report">report</option>
            <option value="atlas">atlas</option>
            <option value="moph">moph</option>
          </select></label>
          <label>CONTENIDO<textarea value={intakeContent} onChange={(event) => setIntakeContent(event.target.value)} rows={4} required /></label>
          <button type="submit" disabled={!intakeContent.trim()}>PREPARAR REGISTRO</button>
        </form>
      </article>
    </section>
  );
}
