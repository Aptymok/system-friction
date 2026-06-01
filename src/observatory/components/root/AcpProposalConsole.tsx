'use client';

import { useEffect, useState } from 'react';

type Proposal = {
  id: string;
  title: string;
  status: string;
  risk_level: string;
  proposalType: string;
  seedHash: string | null;
  specHash: string | null;
  seedEvidenceSummary?: {
    nodes?: number;
    patterns?: number;
    documents?: number;
    mihmSourceState?: string | null;
    accessMode?: string | null;
  };
};

type ApiState = {
  ok: boolean;
  data?: {
    counts?: { total: number; proposed: number; approved: number; rejected: number };
    proposals?: Proposal[];
  };
  error?: string;
};

function shortHash(value?: string | null) {
  return value ? `${value.slice(0, 8)}…${value.slice(-6)}` : 'sin hash';
}

function routeFor(status: string) {
  if (status === 'proposed') return 'approve';
  if (status === 'design_approved') return 'prepare';
  if (status === 'queued') return 'outcome';
  return null;
}

function labelFor(status: string) {
  if (status === 'proposed') return 'Aprobar';
  if (status === 'design_approved') return 'Preparar';
  if (status === 'queued') return 'Cerrar';
  return 'Cerrada';
}

function payloadFor(route: string) {
  if (route === 'outcome') {
    return {
      outcome_status: 'observed_effect',
      next_state: 'closed',
      field_effect: { ihg_delta: 0, nti_delta: 0, risk_delta: 0, notes: 'Cierre desde consola ACP.' },
      notes: 'ACP outcome recorded from root console.',
    };
  }
  return { note: 'ACP state advanced from root console.' };
}

export function AcpProposalConsole() {
  const [state, setState] = useState<ApiState | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const result = await fetch(`/api/acp/proposals?ts=${Date.now()}`, { credentials: 'include' }).then((res) => res.json());
      setState(result);
    } finally {
      setLoading(false);
    }
  }

  async function advance(proposal: Proposal) {
    const route = routeFor(proposal.status);
    if (!route) return;
    setBusy(proposal.id);
    setMessage(null);
    try {
      const result = await fetch(`/api/acp/proposals/${proposal.id}/${route}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payloadFor(route)),
      }).then((res) => res.json());
      if (!result.ok) setMessage(result.error ?? 'No fue posible avanzar la propuesta.');
      else {
        setMessage(`Propuesta ${proposal.id.slice(0, 8)} actualizada.`);
        await load();
      }
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const counts = state?.data?.counts;
  const proposals = state?.data?.proposals ?? [];

  return (
    <section className="border border-[#1e1c17] bg-[#0e0d0b]">
      <div className="flex items-start justify-between gap-3 border-b border-[#1e1c17] px-4 py-3">
        <div>
          <p className="font-mono text-[8px] uppercase tracking-[0.22em] text-[#8a7035]">ACP Proposal Console</p>
          <h2 className="mt-1 font-serif text-lg text-[#c8a951]">Cola de decisión</h2>
          <p className="mt-1 font-mono text-[9px] tracking-[0.08em] text-[#7a7568]">Propuestas, evidencia y transición gobernada.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="border border-[#8a7035] bg-[#2e2410] px-3 py-1 font-mono text-[8px] uppercase tracking-[0.16em] text-[#c8a951] disabled:opacity-40">
          {loading ? 'Cargando' : 'Actualizar'}
        </button>
      </div>

      <div className="grid grid-cols-4 border-b border-[#1e1c17] text-center font-mono text-[9px]">
        {[
          ['total', counts?.total ?? 0],
          ['proposed', counts?.proposed ?? 0],
          ['approved', counts?.approved ?? 0],
          ['rejected', counts?.rejected ?? 0],
        ].map(([label, value]) => (
          <div key={String(label)} className="border-r border-[#1e1c17] p-3 last:border-r-0">
            <div className="text-[8px] uppercase tracking-[0.16em] text-[#35312a]">{label}</div>
            <div className="mt-1 text-base text-[#c8a951]">{value}</div>
          </div>
        ))}
      </div>

      {message ? <div className="m-3 border border-[#8a7035] bg-[#2e2410] p-3 font-mono text-[9px] text-[#c8a951]">{message}</div> : null}
      {!state?.ok && state?.error ? <div className="m-3 border border-[#5a2020] bg-[#5a2020]/20 p-3 font-mono text-[9px] text-[#c87060]">{state.error}</div> : null}

      <div className="flex flex-col gap-1 p-3">
        {proposals.map((proposal) => {
          const evidence = proposal.seedEvidenceSummary ?? {};
          const route = routeFor(proposal.status);
          return (
            <article key={proposal.id} className="border border-[#1e1c17] bg-[#131210] p-3 hover:border-[#2e2c24]">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="border border-[#8a7035] px-2 py-px font-mono text-[8px] uppercase tracking-[0.12em] text-[#c8a951]">{proposal.status}</span>
                    <span className="border border-[#2e2c24] px-2 py-px font-mono text-[8px] uppercase tracking-[0.12em] text-[#7a7568]">{proposal.proposalType}</span>
                    <span className="border border-[#2e2c24] px-2 py-px font-mono text-[8px] uppercase tracking-[0.12em] text-[#7a7568]">risk {proposal.risk_level}</span>
                  </div>
                  <h3 className="mt-2 text-sm text-[#ccc8bc]">{proposal.title}</h3>
                  <p className="mt-1 font-mono text-[9px] text-[#35312a]">{proposal.id}</p>
                </div>
                {route ? (
                  <button type="button" onClick={() => void advance(proposal)} disabled={busy === proposal.id} className="border border-[#2a5a3a] px-3 py-1.5 font-mono text-[8px] uppercase tracking-[0.18em] text-[#6ab88a] disabled:opacity-40">
                    {busy === proposal.id ? 'Procesando' : labelFor(proposal.status)}
                  </button>
                ) : <span className="border border-[#1e1c17] px-3 py-1.5 font-mono text-[8px] uppercase tracking-[0.18em] text-[#35312a]">cerrada</span>}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-1 font-mono text-[9px] lg:grid-cols-6">
                <div className="bg-[#181614] p-2"><span className="text-[#35312a]">nodes</span><br /><span className="text-[#ccc8bc]">{evidence.nodes ?? 0}</span></div>
                <div className="bg-[#181614] p-2"><span className="text-[#35312a]">patterns</span><br /><span className="text-[#ccc8bc]">{evidence.patterns ?? 0}</span></div>
                <div className="bg-[#181614] p-2"><span className="text-[#35312a]">docs</span><br /><span className="text-[#ccc8bc]">{evidence.documents ?? 0}</span></div>
                <div className="bg-[#181614] p-2"><span className="text-[#35312a]">MIHM</span><br /><span className="text-[#ccc8bc]">{evidence.mihmSourceState ?? '—'}</span></div>
                <div className="bg-[#181614] p-2"><span className="text-[#35312a]">access</span><br /><span className="text-[#ccc8bc]">{evidence.accessMode ?? '—'}</span></div>
                <div className="bg-[#181614] p-2"><span className="text-[#35312a]">hash</span><br /><span className="text-[#ccc8bc]">{shortHash(proposal.seedHash ?? proposal.specHash)}</span></div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
