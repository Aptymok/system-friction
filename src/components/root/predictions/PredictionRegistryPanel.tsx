'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { SfiPredictionEntry, SfiPredictionHealth } from '@/lib/sfi/predictions/types';

type ListState =
  | { status: 'loading'; error: null; health: null; entries: [] }
  | { status: 'ready'; error: null; health: SfiPredictionHealth | null; entries: SfiPredictionEntry[] }
  | { status: 'blocked'; error: string; health: SfiPredictionHealth | null; entries: SfiPredictionEntry[] };

export default function PredictionRegistryPanel() {
  const [state, setState] = useState<ListState>({
    status: 'loading',
    error: null,
    health: null,
    entries: [],
  });

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadRegistry() {
      try {
        const [healthResponse, listResponse] = await Promise.all([
          fetch('/api/sfi/predictions/health', { cache: 'no-store', signal: controller.signal }),
          fetch('/api/sfi/predictions', { cache: 'no-store', credentials: 'include', signal: controller.signal }),
        ]);
        const health = await healthResponse.json().catch(() => null) as SfiPredictionHealth | null;
        const listBody = await listResponse.json().catch(() => null) as { entries?: SfiPredictionEntry[]; error?: string } | null;

        if (!active) return;
        if (!listResponse.ok) {
          setState({
            status: 'blocked',
            error: listBody?.error ?? `prediction_registry_blocked_${listResponse.status}`,
            health,
            entries: [],
          });
          return;
        }

        setState({
          status: 'ready',
          error: null,
          health,
          entries: listBody?.entries ?? [],
        });
      } catch {
        if (!active) return;
        setState({
          status: 'blocked',
          error: 'prediction_registry_fetch_failed',
          health: null,
          entries: [],
        });
      }
    }

    void loadRegistry();

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const health = state.health;

  return (
    <div className="space-y-6">
      <section className="grid gap-3 md:grid-cols-4">
        <div className="border border-[#2f2a1e] bg-[#0b0b09] p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8f8878]">Table</div>
          <div className="mt-2 text-lg text-[#f5eedc]">{health?.table_available ? 'available' : 'blocked'}</div>
        </div>
        <div className="border border-[#2f2a1e] bg-[#0b0b09] p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8f8878]">Entries</div>
          <div className="mt-2 text-lg text-[#f5eedc]">{health?.entries_count ?? 'unknown'}</div>
        </div>
        <div className="border border-[#2f2a1e] bg-[#0b0b09] p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8f8878]">Pending returns</div>
          <div className="mt-2 text-lg text-[#f5eedc]">{health?.pending_returns_count ?? 'unknown'}</div>
        </div>
        <div className="border border-[#2f2a1e] bg-[#0b0b09] p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8f8878]">Agents</div>
          <div className="mt-2 text-lg text-[#f5eedc]">{health?.agents.evidenceStateAgent.ok && health.agents.returnWindowAgent.ok ? 'ready' : 'blocked'}</div>
        </div>
      </section>

      {state.status === 'blocked' ? (
        <section className="border border-[#5f2f28] bg-[#170d0b] p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#d69a8b]">Blocked</div>
          <p className="mt-3 text-sm text-[#d69a8b]">{state.error}</p>
          <div className="mt-3 space-y-1 font-mono text-[11px] text-[#c8a951]">
            {(health?.blocked ?? []).map((item) => <div key={item}>{item}</div>)}
          </div>
        </section>
      ) : null}

      <section className="border border-[#2f2a1e] bg-[#0b0b09] p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">ROOT Registry</div>
            <h2 className="mt-2 text-2xl font-semibold text-[#f5eedc]">Prediction entries</h2>
          </div>
          <Link href="/root/predictions/new" className="border border-[#c8a95166] px-4 py-2 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-[#c8a951]">
            New prediction
          </Link>
        </div>

        <div className="mt-5 space-y-3">
          {state.status === 'loading' ? <div className="text-sm text-[#8f8878]">Loading private registry state.</div> : null}
          {state.entries.length === 0 && state.status !== 'loading' ? <div className="text-sm text-[#8f8878]">No prediction entries available to this ROOT session.</div> : null}
          {state.entries.map((entry) => (
            <Link
              key={entry.hypothesis_id}
              href={`/root/predictions/${encodeURIComponent(entry.hypothesis_id)}`}
              className="grid gap-3 border border-[#2f2a1e] bg-[#060605] p-4 text-sm text-[#d8d2c2] md:grid-cols-[1fr_180px_140px]"
            >
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#c8a951]">{entry.hypothesis_id}</div>
                <div className="mt-1 text-[#f5eedc]">{entry.case_label || entry.case_id}</div>
                <div className="mt-2 text-xs leading-5 text-[#8f8878]">{entry.prediccion_explicita}</div>
              </div>
              <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#8f8878]">
                phenotype={entry.fenotipo_estimado}
              </div>
              <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#8f8878]">
                {entry.is_predictive_evidence ? 'predictive' : 'retrospective'}<br />
                {entry.evidence_state}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
