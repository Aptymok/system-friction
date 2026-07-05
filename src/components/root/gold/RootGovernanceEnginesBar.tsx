'use client';

import type { RootGovernanceState } from '@/lib/root/gold/rootGovernanceState';

function value(value: number | null) {
  return value === null ? 'NULL' : value.toFixed(2);
}

export function RootGovernanceEnginesBar({ state }: { state: RootGovernanceState }) {
  return (
    <section className="sfi-root-gold__engines sfi-root-gold__panel">
      <div className="sfi-root-gold__panel-title"><h2>MOTORES DE GOBERNANZA</h2><span>{state.engines.length}</span></div>
      <div className="sfi-root-gold__engine-grid">
        {state.engines.map((engine) => (
          <div key={engine.id}>
            <svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="19" /><path d="M26 5 L37 26 L26 47 L15 26 Z" /><circle cx="26" cy="26" r="4" /></svg>
            <span>{engine.label}</span>
            <em>{engine.description}</em>
            <strong>{value(engine.value)}</strong>
            <i>{engine.state}</i>
          </div>
        ))}
      </div>
    </section>
  );
}
