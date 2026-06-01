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
    <section className="mt-4 rounded-2xl border border-gold/20 bg-black/30 p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-gold/70">ACP Proposal Console</p>
          <h2 className="mt-1 font-display text-lg text-gold">Cola de decisión</h2>
          <p className="mt-1 text-xs text-zinc-400">Vista raíz de propuestas y evidencia de campo.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="rounded-full border border-gold/30 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-gold disabled:opacity-50">
          {loading ? 'Cargando' : 'Actualizar'}
        </button>
      </div>

      <div className="mb-4 grid grid-cols-4 gap-2 text-center text-xs">
        {[
          ['total', counts?.total ?? 0],
          ['proposed', counts?.proposed ?? 0],
          ['approved', counts?.approved ?? 0],
          ['rejected', counts?.rejected ?? 0],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-white/10 bg-white/[0.03] p-2">
            <div className="font-mono text-[10px] uppercase text-zinc-500">{label}</div>
            <div className="mt-1 text-lg text-paper">{value}</div>
          </div>
        ))}
      </div>

      {message ? <div className="mb-3 rounded-xl border border-gold/20 bg-gold/10 p-3 text-xs text-gold">{message}</div> : null}
      {!state?.ok && state?.error ? <div className="mb-3 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-200">{state.error}</div> : null}

      <div className="space-y-3">
        {proposals.map((proposal) => {
          const evidence = proposal.seedEvidenceSummary ?? {};
          const route = routeFor(proposal.status);
          return (
            <article key={proposal.id} className="rounded-2xl border border-white/10 bg-ink/50 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-gold/30 px-2 py-0.5 font-mono text-[10px] uppercase text-gold">{proposal.status}</span>
                    <span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] uppercase text-zinc-400">{proposal.proposalType}</span>
                    <span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] uppercase text-zinc-400">risk {proposal.risk_level}</span>
                  </div>
                  <h3 className="mt-2 text-sm text-paper">{proposal.title}</h3>
                  <p className="mt-1 font-mono text-[10px] text-zinc-500">{proposal.id}</p>
                </div>
                {route ? (
                  <button type="button" onClick={() => void advance(proposal)} disabled={busy === proposal.id} className="rounded-full border border-teal-300/30 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-teal-100 disabled:opacity-50">
                    {busy === proposal.id ? 'Procesando' : labelFor(proposal.status)}
                  </button>
                ) : <span className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-zinc-500">cerrada</span>}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs lg:grid-cols-6">
                <div className="rounded-xl bg-white/[0.03] p-2"><span className="text-zinc-500">nodes</span><br /><span className="text-paper">{evidence.nodes ?? 0}</span></div>
                <div className="rounded-xl bg-white/[0.03] p-2"><span className="text-zinc-500">patterns</span><br /><span className="text-paper">{evidence.patterns ?? 0}</span></div>
                <div className="rounded-xl bg-white/[0.03] p-2"><span className="text-zinc-500">docs</span><br /><span className="text-paper">{evidence.documents ?? 0}</span></div>
                <div className="rounded-xl bg-white/[0.03] p-2"><span className="text-zinc-500">MIHM</span><br /><span className="text-paper">{evidence.mihmSourceState ?? '—'}</span></div>
                <div className="rounded-xl bg-white/[0.03] p-2"><span className="text-zinc-500">access</span><br /><span className="text-paper">{evidence.accessMode ?? '—'}</span></div>
                <div className="rounded-xl bg-white/[0.03] p-2"><span className="text-zinc-500">hash</span><br /><span className="text-paper">{shortHash(proposal.seedHash ?? proposal.specHash)}</span></div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
