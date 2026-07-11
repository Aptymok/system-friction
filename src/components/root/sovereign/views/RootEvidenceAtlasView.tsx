'use client';
import { useState } from 'react';
import type { RootSovereignState } from '@/lib/root/sovereign/rootSovereignState';
import type { RootSelection } from '../sovereignTypes';
import { EvidenceGraph } from '../visual/EvidenceGraph';

const FILTERS = ['evidence','signal','hypothesis','prediction','outcome','report','atlas','moph','world_vector','amv'];
export function RootEvidenceAtlasView({ state, onSelect }: { state: RootSovereignState; onSelect: (selection: RootSelection) => void }) {
  const [active, setActive] = useState<string[]>([]); const filtered = active.length ? state.evidence.data.nodes.filter((node) => active.includes(node.type) || active.includes(node.source.replace('sfi_', ''))) : state.evidence.data.nodes;
  return <section className="rs-view"><div className="rs-view-title"><span>EVIDENCE / ATLAS</span><h1>REAL EVIDENCE GRAPH</h1><p>Solo nodos, aristas, pesos y relaciones persistidas.</p></div><div className="rs-filter-row">{FILTERS.map((filter) => <button type="button" key={filter} className={active.includes(filter) ? 'active' : ''} onClick={() => setActive((current) => current.includes(filter) ? current.filter((item) => item !== filter) : [...current, filter])}>{filter}</button>)}</div><EvidenceGraph nodes={filtered} edges={state.evidence.data.edges} onSelect={onSelect} /><div className="rs-stat-strip"><span><b>{filtered.length}</b>PERSISTED NODES</span><span><b>{state.evidence.data.edges.length}</b>PERSISTED EDGES</span><span><b>{state.evidence.data.entries.length + state.evidence.data.ledger.length}</b>EVIDENCE ENTRIES</span></div></section>;
}
