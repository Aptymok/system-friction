'use client';

import { useEffect, useState } from 'react';

type Row = Record<string, unknown>;

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}

export function SelfObservabilityPanel() {
  const [state, setState] = useState<Row | null>(null);

  useEffect(() => {
    fetch('/api/root/self-observability', { cache: 'no-store' })
      .then((response) => response.json())
      .then(setState)
      .catch((error) => setState({ ok: false, system_health: 'critical', missing_parts: [error instanceof Error ? error.message : 'self_observability_failed'] }));
  }, []);

  const proposals = rows(state?.reconstruction_proposals);

  return (
    <div className="border border-[#1e1c17] bg-[#080706] p-3 font-mono text-[10px] text-[#9c9282]">
      <div className="mb-2 text-[9px] uppercase tracking-[0.18em] text-[#c8a951]">Self Observability</div>
      <div>salud: <b className="text-[#d8d0bd]">{String(state?.system_health ?? 'sin chequeo')}</b></div>
      <div>faltantes: {rows(state?.missing_parts).length || (Array.isArray(state?.missing_parts) ? state?.missing_parts.length : 0)}</div>
      {proposals.slice(0, 5).map((proposal, index) => (
        <div key={index} className="mt-2 border-t border-[#1e1c17] pt-2">
          <b className="text-[#d8d0bd]">{String(proposal.part ?? 'pieza faltante')}</b>
          <div>{String(proposal.proposal ?? 'proponer reconstruccion')}</div>
          <div>QA: npm run typecheck</div>
        </div>
      ))}
      {!proposals.length ? <div className="mt-2">sin reconstruccion pendiente</div> : null}
    </div>
  );
}

