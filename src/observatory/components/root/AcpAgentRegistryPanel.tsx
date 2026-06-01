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
    <section className="border border-[#1e1c17] bg-[#0e0d0b]">
      <div className="flex items-start justify-between gap-3 border-b border-[#1e1c17] px-4 py-3">
        <div>
          <p className="font-mono text-[8px] uppercase tracking-[0.22em] text-[#8a7035]">ACP Agent Registry</p>
          <h2 className="mt-1 font-serif text-lg text-[#c8a951]">Registro multiagente</h2>
          <p className="mt-1 font-mono text-[9px] tracking-[0.08em] text-[#7a7568]">Roles operativos sin autoridad externa.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="border border-[#8a7035] bg-[#2e2410] px-3 py-1 font-mono text-[8px] uppercase tracking-[0.16em] text-[#c8a951] disabled:opacity-40">
          {loading ? 'Cargando' : 'Actualizar'}
        </button>
      </div>

      {contract ? (
        <div className="border-b border-[#1e1c17] bg-[#131210] p-3 font-mono text-[9px] leading-6 text-[#7a7568]">
          <div><span className="text-[#35312a]">modo</span> <span className="text-[#c8a951]">{contract.currentMode ?? '—'}</span></div>
          <div><span className="text-[#35312a]">ejecución</span> <span className={contract.executionAuthority ? 'text-[#6ab88a]' : 'text-[#c87060]'}>{contract.executionAuthority ? 'autorizada' : 'bloqueada'}</span></div>
          <div><span className="text-[#35312a]">loop activo</span> {(contract.activeLoop ?? []).join(' → ')}</div>
          <div><span className="text-[#35312a]">faltante</span> {(contract.missingLoop ?? []).join(' · ')}</div>
        </div>
      ) : null}

      {!state?.ok && state?.error ? <div className="m-3 border border-[#5a2020] bg-[#5a2020]/20 p-3 font-mono text-[9px] text-[#c87060]">{state.error}</div> : null}

      <div className="flex flex-col gap-1 p-3">
        {agents.map((agent) => (
          <article key={agent.agentId} className="border border-[#1e1c17] bg-[#131210] p-3 hover:border-[#2e2c24]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="border border-[#8a7035] px-2 py-px font-mono text-[8px] uppercase tracking-[0.12em] text-[#c8a951]">{agent.role}</span>
              <span className="border border-[#2e2c24] px-2 py-px font-mono text-[8px] uppercase tracking-[0.12em] text-[#7a7568]">{agent.executionAuthority ? 'execution on' : 'execution off'}</span>
            </div>
            <h3 className="mt-2 text-sm text-[#ccc8bc]">{agent.label}</h3>
            <p className="mt-1 font-mono text-[9px] text-[#35312a]">{agent.agentId}</p>
            <p className="mt-3 text-xs leading-6 text-[#7a7568]">{agent.responsibility}</p>
            <div className="mt-3 grid grid-cols-1 gap-1 font-mono text-[8px] md:grid-cols-2">
              <div className="bg-[#181614] p-2"><span className="text-[#35312a]">allowed</span><br />{agent.allowedActions.join(' · ')}</div>
              <div className="bg-[#181614] p-2"><span className="text-[#35312a]">forbidden</span><br />{agent.forbiddenActions.join(' · ')}</div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
