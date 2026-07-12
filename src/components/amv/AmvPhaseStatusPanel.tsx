'use client';

import { useEffect, useState } from 'react';

type Phase = {
  id: number;
  label: string;
  state: string;
  observed: number | null;
  required: number | null;
  explanation: string;
  warning: string | null;
};

type Status = {
  generatedAt: string;
  maturity: string;
  epistemicLabel: string;
  publicPredictiveOutputAllowed: boolean;
  phases: Phase[];
  counts?: Record<string, number | null>;
  calibration?: { closedCases: number | null; requiredClosedCases: number; nonMusicalClosedCases: number | null };
  warnings?: string[];
};

export function AmvPhaseStatusPanel({
  endpoint,
  compact = false,
  title = 'AMV INSTRUMENT PHASES',
}: {
  endpoint: string;
  compact?: boolean;
  title?: string;
}) {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(endpoint, { cache: 'no-store', credentials: 'include', signal: controller.signal });
        const body = await response.json().catch(() => null);
        if (!response.ok || !body?.ok || !body.status) throw new Error(body?.details ?? body?.error ?? `HTTP ${response.status}`);
        setStatus(body.status);
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'instrument_status_failed');
      }
    })();
    return () => controller.abort();
  }, [endpoint]);

  return (
    <section className="border border-[#2f2a1e] bg-[#0b0b09] p-4 text-[#d8d2c2]">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#2f2a1e] pb-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">{title}</div>
          <div className="mt-1 font-mono text-xs text-[#f5eedc]">{status ? `${status.maturity} · ${status.epistemicLabel}` : error ? 'DEGRADED' : 'LOADING'}</div>
        </div>
        {status ? <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#8f8878]">PUBLIC PREDICTION · {status.publicPredictiveOutputAllowed ? 'ALLOWED' : 'GATED'}</div> : null}
      </div>
      {error ? <div className="mt-3 border border-[#6f3d37] p-3 font-mono text-xs text-[#d79b91]">{error}</div> : null}
      {status ? (
        <div className={`mt-3 grid gap-2 ${compact ? 'md:grid-cols-3' : 'md:grid-cols-2 xl:grid-cols-3'}`}>
          {status.phases.map((phase) => (
            <article key={phase.id} className="border border-[#2f2a1e] bg-[#080807] p-3">
              <div className="flex items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.12em]">
                <span className="text-[#8f8878]">PHASE {phase.id}</span>
                <strong className="text-[#c8a951]">{phase.state}</strong>
              </div>
              <h3 className="mt-2 text-sm font-medium text-[#f5eedc]">{phase.label}</h3>
              {!compact ? <p className="mt-2 text-xs leading-5 text-[#9f9788]">{phase.explanation}</p> : null}
              {phase.observed !== null ? <div className="mt-2 font-mono text-[10px] text-[#b9b19f]">{phase.observed}{phase.required !== null ? ` / ${phase.required}` : ''}</div> : null}
              {phase.warning ? <div className="mt-2 font-mono text-[9px] text-[#d79b91]">{phase.warning}</div> : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
