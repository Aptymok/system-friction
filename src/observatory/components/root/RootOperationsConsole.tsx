'use client';

import { useEffect, useMemo, useState } from 'react';

type RootTableState = {
  table: string;
  ok: boolean;
  count: number | null;
  latest: unknown[];
  warning?: string | null;
};

type RootRow = Record<string, unknown> & { id?: string; status?: string; created_at?: string };

type RootStateResponse = {
  ok?: boolean;
  data?: {
    identity?: { email?: string | null; role?: string | null; isRoot?: boolean };
    tables?: RootTableState[];
    warnings?: string[];
  };
  error?: string;
};

const GROUPS = {
  bitacora: ['logbook_mutations', 'epistemic_events', 'root_audit_events'],
  evidencia: ['root_evidence_entries', 'graph_nodes', 'graph_edges', 'action_proposals'],
  cuentas: ['accounts', 'account_members', 'usage_ledger', 'account_balance'],
};

export function RootOperationsConsole() {
  const [state, setState] = useState<RootStateResponse | null>(null);
  const [active, setActive] = useState<keyof typeof GROUPS>('bitacora');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetNodeId, setTargetNodeId] = useState('');
  const [proposalType, setProposalType] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const response = await fetch(`/api/root/state?ts=${Date.now()}`, { credentials: 'include' });
    setState(await response.json().catch(() => ({ ok: false, error: `HTTP_${response.status}` })));
  }

  async function submitEvidence(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch('/api/root/evidence', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: title.trim() || 'root.evidence',
          content,
          targetNodeId: targetNodeId.trim() || null,
          proposalType: proposalType.trim() || null,
          source: 'root_console',
        }),
      });
      const result = await response.json().catch(() => ({ ok: false, error: `HTTP_${response.status}` }));
      setMessage(result.ok ? (result.duplicate ? 'Evidencia ya existia. No se duplico.' : 'Evidencia registrada y distribuida.') : result.error ?? 'No se pudo registrar evidencia.');
      if (result.ok) {
        setTitle('');
        setContent('');
        setTargetNodeId('');
        setProposalType('');
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  async function closeMutation(id?: string) {
    if (!id) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/root/mutations/${id}/close`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ result: 'closed_from_root_console' }),
      });
      const result = await response.json().catch(() => ({ ok: false, error: `HTTP_${response.status}` }));
      setMessage(result.ok ? 'Mutacion cerrada con auditoria root.' : result.error ?? 'No se pudo cerrar mutacion.');
      if (result.ok) await load();
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const tablesByName = useMemo(() => new Map((state?.data?.tables ?? []).map((table) => [table.table, table])), [state]);
  const visibleTables = GROUPS[active].map((table) => tablesByName.get(table)).filter(Boolean) as RootTableState[];
  const mutations = (tablesByName.get('logbook_mutations')?.latest ?? []).filter((row): row is RootRow => Boolean(row && typeof row === 'object' && !Array.isArray(row)));

  return (
    <section className="border border-[#1e1c17] bg-[#0e0d0b]">
      <div className="flex items-start justify-between gap-3 border-b border-[#1e1c17] px-4 py-3">
        <div>
          <p className="font-mono text-[8px] uppercase tracking-[0.22em] text-[#8a7035]">Root operaciones</p>
          <h2 className="mt-1 font-serif text-lg text-[#c8a951]">Bitacora / Evidencia / Cuentas</h2>
          <p className="mt-1 font-mono text-[9px] text-[#7a7568]">{state?.data?.identity?.role ?? 'sin rol'} / {state?.data?.identity?.isRoot ? 'root verificado' : 'sin root'}</p>
        </div>
        <button type="button" onClick={() => void load()} className="border border-[#8a7035] bg-[#2e2410] px-3 py-1 font-mono text-[8px] uppercase tracking-[0.16em] text-[#c8a951]">Actualizar</button>
      </div>

      <div className="grid grid-cols-3 border-b border-[#1e1c17] font-mono text-[8px] uppercase tracking-[0.13em]">
        {Object.keys(GROUPS).map((key) => (
          <button key={key} type="button" onClick={() => setActive(key as keyof typeof GROUPS)} className={`border-r border-[#1e1c17] px-2 py-2 last:border-r-0 ${active === key ? 'bg-[#2e2410] text-[#c8a951]' : 'text-[#7a7568]'}`}>
            {key}
          </button>
        ))}
      </div>

      {state?.data?.warnings?.length ? (
        <div className="m-3 border border-[#5a2020] bg-[#5a2020]/10 p-3 font-mono text-[8px] leading-4 text-[#c87060]">
          {state.data.warnings.slice(0, 4).join(' / ')}
        </div>
      ) : null}

      <div className="grid gap-1 p-3 font-mono text-[9px]">
        {visibleTables.map((table) => (
          <div key={table.table} className="grid grid-cols-[1fr_auto] border border-[#1e1c17] bg-[#131210] p-2">
            <span className={table.ok ? 'text-[#ccc8bc]' : 'text-[#c87060]'}>{table.table}</span>
            <span className="text-[#c8a951]">{table.count ?? '-'}</span>
            {table.warning ? <span className="col-span-2 mt-1 text-[#c87060]">{table.warning}</span> : null}
          </div>
        ))}
      </div>

      {active === 'bitacora' ? (
        <div className="border-t border-[#1e1c17] p-3">
          <div className="font-mono text-[8px] uppercase tracking-[0.18em] text-[#8a7035]">Cerrar mutaciones</div>
          <div className="mt-2 grid gap-1">
            {mutations.slice(0, 5).map((mutation) => (
              <div key={String(mutation.id)} className="grid grid-cols-[1fr_auto] gap-2 border border-[#1e1c17] bg-[#131210] p-2 font-mono text-[8px]">
                <div>
                  <div className="text-[#ccc8bc]">{String(mutation.id ?? '-').slice(0, 12)}</div>
                  <div className="text-[#7a7568]">{String(mutation.status ?? '-')} / {String(mutation.created_at ?? '-').slice(0, 19)}</div>
                </div>
                {mutation.status !== 'closed' ? (
                  <button type="button" disabled={busy} onClick={() => void closeMutation(mutation.id)} className="border border-[#8a7035] px-2 py-1 uppercase tracking-[0.12em] text-[#c8a951] disabled:opacity-40">
                    Cerrar
                  </button>
                ) : <span className="px-2 py-1 uppercase tracking-[0.12em] text-[#5a5855]">cerrada</span>}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <form onSubmit={(event) => void submitEvidence(event)} className="border-t border-[#1e1c17] p-3">
        <div className="font-mono text-[8px] uppercase tracking-[0.18em] text-[#8a7035]">Registrar evidencia</div>
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="titulo" className="mt-2 w-full border border-[#1e1c17] bg-[#060605] p-2 font-mono text-xs text-[#ccc8bc] outline-none focus:border-[#8a7035]" />
        <textarea required value={content} onChange={(event) => setContent(event.target.value)} placeholder="evidencia" className="mt-2 min-h-24 w-full resize-none border border-[#1e1c17] bg-[#060605] p-2 font-mono text-xs text-[#ccc8bc] outline-none focus:border-[#8a7035]" />
        <input value={targetNodeId} onChange={(event) => setTargetNodeId(event.target.value)} placeholder="graph node destino opcional" className="mt-2 w-full border border-[#1e1c17] bg-[#060605] p-2 font-mono text-xs text-[#ccc8bc] outline-none focus:border-[#8a7035]" />
        <input value={proposalType} onChange={(event) => setProposalType(event.target.value)} placeholder="proposalType opcional" className="mt-2 w-full border border-[#1e1c17] bg-[#060605] p-2 font-mono text-xs text-[#ccc8bc] outline-none focus:border-[#8a7035]" />
        <button disabled={busy || !content.trim()} className="mt-3 border border-[#8a7035] bg-[#2e2410] px-3 py-2 font-mono text-[8px] uppercase tracking-[0.16em] text-[#c8a951] disabled:opacity-40">
          {busy ? 'Guardando' : 'Guardar evidencia'}
        </button>
        {message ? <div className="mt-3 border border-[#2e2c24] bg-[#131210] p-2 font-mono text-[8px] text-[#c8a951]">{message}</div> : null}
      </form>
    </section>
  );
}
