'use client';

import { useEffect, useState } from 'react';

type Agent = {
  agentId: string;
  label: string;
  role: string;
  responsibility: string;
  allowedActions: string[];
  forbiddenActions: string[];
  executionAuthority: boolean;
};

type AgentResponse = {
  ok: boolean;
  data?: {
    agents?: Agent[];
    runtimeContract?: {
      executionAuthority?: boolean;
      currentMode?: string;
      activeLoop?: string[];
      missingLoop?: string[];
    };
  };
  error?: string;
};

export function AcpAgentRegistryPanel() {
  const [state, setState] = useState<AgentResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const result = await fetch(`/api/acp/agents?ts=${Date.now()}`, { credentials: 'include' }).then((res) => res.json());
      setState(result);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const agents = state?.data?.agents ?? [];
  const contract = state?.data?.runtimeContract;

  return (
    <section className="rounded-2xl border border-teal-300/20 bg-black/30 p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-teal-100/70">ACP Agent Registry</p>
          <h2 className="mt-1 font-display text-lg text-teal-100">Registro multiagente</h2>
          <p className="mt-1 text-xs text-zinc-400">Roles operativos activos. Ningún agente posee autoridad de ejecución externa.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="rounded-full border border-teal-300/30 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-teal-100 disabled:opacity-50">
          {loading ? 'Cargando' : 'Actualizar'}
        </button>
      </div>

      {contract ? (
        <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-zinc-300">
          <div><span className="text-zinc-500">modo</span> {contract.currentMode ?? '—'}</div>
          <div><span className="text-zinc-500">ejecución</span> {contract.executionAuthority ? 'autorizada' : 'bloqueada'}</div>
          <div><span className="text-zinc-500">loop activo</span> {(contract.activeLoop ?? []).join(' → ')}</div>
          <div><span className="text-zinc-500">faltante</span> {(contract.missingLoop ?? []).join(' · ')}</div>
        </div>
      ) : null}

      {!state?.ok && state?.error ? <div className="mb-3 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-200">{state.error}</div> : null}

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {agents.map((agent) => (
          <article key={agent.agentId} className="rounded-2xl border border-white/10 bg-ink/50 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-teal-300/30 px-2 py-0.5 font-mono text-[10px] uppercase text-teal-100">{agent.role}</span>
              <span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] uppercase text-zinc-400">{agent.executionAuthority ? 'execution on' : 'execution off'}</span>
            </div>
            <h3 className="mt-2 text-sm text-paper">{agent.label}</h3>
            <p className="mt-1 font-mono text-[10px] text-zinc-500">{agent.agentId}</p>
            <p className="mt-3 text-xs text-zinc-300">{agent.responsibility}</p>
            <div className="mt-3 grid grid-cols-1 gap-2 text-[10px] md:grid-cols-2">
              <div className="rounded-xl bg-white/[0.03] p-2"><span className="text-zinc-500">allowed</span><br />{agent.allowedActions.join(' · ')}</div>
              <div className="rounded-xl bg-white/[0.03] p-2"><span className="text-zinc-500">forbidden</span><br />{agent.forbiddenActions.join(' · ')}</div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
