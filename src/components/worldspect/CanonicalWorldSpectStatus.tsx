'use client';

import { useEffect, useState } from 'react';

type AnyRecord = Record<string, any>;

function num(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function pct(value: unknown) {
  return `${Math.round(num(value) * 100)}%`;
}

function text(value: unknown, fallback = 'unknown') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function tone(state: AnyRecord | null) {
  if (!state) return 'border-white/15 bg-black/80 text-white/60';
  if (state.ok && state.decision_strength === 'strong' && num(state.source_coverage) >= 1 && num(state.degradation_ratio) === 0) {
    return 'border-emerald-300/35 bg-emerald-950/45 text-emerald-100';
  }
  if (state.ok && state.decision_strength === 'strong') {
    return 'border-[#d6b46a]/40 bg-[#171309]/85 text-[#f0d58a]';
  }
  if (state.ok) {
    return 'border-amber-300/35 bg-amber-950/45 text-amber-100';
  }
  return 'border-red-300/35 bg-red-950/45 text-red-100';
}

export default function CanonicalWorldSpectStatus({ surface = 'surface' }: { surface?: string }) {
  const [state, setState] = useState<AnyRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setError(null);
      const response = await fetch('/api/worldspect/state', { cache: 'no-store' });
      const data = await response.json();
      setState(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'worldspect_state_failed');
      setState(null);
    }
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const domainQuorum = state?.domain_quorum ?? {};
  const degraded = Array.isArray(state?.degraded_sources) ? state.degraded_sources : [];
  const strong = Boolean(state?.ok && state?.decision_strength === 'strong');

  return (
    <aside
      data-worldspect-canonical-surface={surface}
      className={`fixed bottom-3 right-3 z-[80] max-w-[22rem] rounded-2xl border px-3 py-2 font-mono shadow-2xl shadow-black/60 backdrop-blur ${tone(state)}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-[8px] uppercase tracking-[0.22em] opacity-70">
          WorldSpect canonical · {surface}
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-full border border-current/25 px-2 py-0.5 text-[8px] uppercase tracking-[0.16em] opacity-80 hover:opacity-100"
        >
          refresh
        </button>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] uppercase tracking-[0.12em]">
        <span>state {text(state?.source_state, error ? 'error' : 'loading')}</span>
        <span>decision {text(state?.decision_strength, 'pending')}</span>
        <span>coverage {pct(state?.source_coverage)}</span>
        <span>degraded {degraded.length}</span>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] uppercase tracking-[0.12em] opacity-75">
        <span>sources {num(state?.active_source_count)}/{num(state?.total_source_count)}</span>
        <span>quorum {num(domainQuorum.quorum_domain_count)}/{num(domainQuorum.total_domain_count)}</span>
        <span>missing {num(domainQuorum.missing_domain_count)}</span>
        <span>single {num(domainQuorum.single_source_domain_count)}</span>
      </div>

      <div className="mt-1 text-[9px] leading-4 opacity-70">
        {error
          ? `error: ${error}`
          : strong
            ? 'External-only, fresh, quorum-aware WorldSpect.'
            : text(state?.interpretation, 'Waiting for canonical WorldSpect state.')}
      </div>
    </aside>
  );
}
