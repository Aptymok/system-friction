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

export function AcpProposalConsole() {
  const [state, setState] = useState<ApiState | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const result = await fetch(`/api/acp/proposals?ts=${Date.now()}`, { credentials: 'include' }).then((res) => res.json());
      setState(result);
    } finally {
      setLoading(false);
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
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-full border border-gold/30 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-gold disabled:opacity-50"
        >
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

      {!state?.ok && state?.error ? <div className="mb-3 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-200">{state.error}</div> : null}

      <div className="space-y-3">
        {proposals.map((proposal) => {
          const evidence = proposal.seedEvidenceSummary ?? {};
          return (
            <article key={proposal.id} className="rounded-2xl border border-white/10 bg-ink/50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-gold/30 px-2 py-0.5 font-mono text-[10px] uppercase text-gold">{proposal.status}</span>
                <span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] uppercase text-zinc-400">{proposal.proposalType}</span>
                <span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] uppercase text-zinc-400">risk {proposal.risk_level}</span>
              </div>
              <h3 className="mt-2 text-sm text-paper">{proposal.title}</h3>
              <p className="mt-1 font-mono text-[10px] text-zinc-500">{proposal.id}</p>
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
