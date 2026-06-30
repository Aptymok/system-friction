'use client';

import { useEffect, useState } from 'react';

interface WorldVectorHealthResponse {
  ok: boolean;
  pulse?: {
    latest_snapshot_available?: boolean;
    latest_observed_at?: string | null;
  };
  memory?: {
    enabled?: boolean;
    reason?: string | null;
  };
  current_cycle_day?: {
    dayOfWeek?: string | null;
    sector?: string | null;
    sectorLabel?: string | null;
    isCycleClose?: boolean | null;
  } | number | string | null;
  observation?: {
    observed_at?: string | null;
    status?: string | null;
    dominant_signal?: string | null;
    warnings?: string[];
  };
  reports?: {
    internal_daily?: boolean;
    public_weekly?: boolean;
  };
  blocked?: string[];
  warnings?: string[];
}

function formatFlag(value: boolean | undefined, positive: string, negative: string) {
  if (value === true) return positive;
  if (value === false) return negative;
  return 'unknown';
}

function formatCycleDay(value: WorldVectorHealthResponse['current_cycle_day']) {
  if (value == null) return 'unknown';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  const day = value.dayOfWeek ?? 'unknown day';
  const sector = value.sectorLabel ?? value.sector ?? 'unknown sector';
  return `${day} / ${sector}${value.isCycleClose ? ' / cycle close' : ''}`;
}

export default function WorldVectorRuntimePanel() {
  const [health, setHealth] = useState<WorldVectorHealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadHealth() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/world-vector/agents/health', {
          cache: 'no-store',
          credentials: 'same-origin',
          signal: controller.signal,
        });
        const body = await response.json().catch(() => null) as WorldVectorHealthResponse | null;

        if (!active) return;
        if (!response.ok || !body) {
          setError(`health_unavailable_${response.status}`);
          setHealth(null);
          return;
        }
        setHealth(body);
      } catch {
        if (!active) return;
        setError('health_fetch_failed');
        setHealth(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadHealth();

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const blocked = health?.blocked ?? [];
  const warnings = [...(health?.warnings ?? []), ...(health?.observation?.warnings ?? [])];

  return (
    <section className="border border-[#2f2a1e] bg-[#0b0b09] p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">Runtime health</div>
          <h2 className="mt-2 text-2xl font-semibold text-[#f5eedc]">
            {loading ? 'Checking World Vector runtime' : health?.ok ? 'Observation runtime available' : 'Observation runtime blocked'}
          </h2>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8f8878]">
          client fetch / no secret
        </div>
      </div>

      {error ? (
        <p className="mt-5 border border-[#5f2f28] bg-[#170d0b] p-4 text-sm text-[#d69a8b]">{error}</p>
      ) : null}

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="border border-[#2f2a1e] bg-[#060605] p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8f8878]">Pulse</div>
          <div className="mt-2 text-lg text-[#f5eedc]">
            {formatFlag(health?.pulse?.latest_snapshot_available, 'active', 'missing')}
          </div>
          <div className="mt-2 break-all font-mono text-[11px] text-[#8f8878]">{health?.pulse?.latest_observed_at ?? 'no snapshot timestamp'}</div>
        </div>
        <div className="border border-[#2f2a1e] bg-[#060605] p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8f8878]">Memory</div>
          <div className="mt-2 text-lg text-[#f5eedc]">{formatFlag(health?.memory?.enabled, 'ready', 'blocked')}</div>
          <div className="mt-2 font-mono text-[11px] text-[#8f8878]">{health?.memory?.reason ?? 'reason unavailable'}</div>
        </div>
        <div className="border border-[#2f2a1e] bg-[#060605] p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8f8878]">Cycle day</div>
          <div className="mt-2 text-lg text-[#f5eedc]">{formatCycleDay(health?.current_cycle_day)}</div>
          <div className="mt-2 font-mono text-[11px] text-[#8f8878]">observation={health?.observation?.status ?? 'unknown'}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="border border-[#2f2a1e] bg-[#060605] p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8f8878]">Reports</div>
          <div className="mt-2 font-mono text-xs text-[#d8d2c2]">
            internal_daily={formatFlag(health?.reports?.internal_daily, 'present', 'missing')}
          </div>
          <div className="mt-1 font-mono text-xs text-[#d8d2c2]">
            public_weekly={formatFlag(health?.reports?.public_weekly, 'present', 'missing')}
          </div>
        </div>
        <div className="border border-[#2f2a1e] bg-[#060605] p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8f8878]">Dominant signal</div>
          <div className="mt-2 text-sm text-[#d8d2c2]">{health?.observation?.dominant_signal ?? 'unresolved'}</div>
          <div className="mt-2 font-mono text-[11px] text-[#8f8878]">observed_at={health?.observation?.observed_at ?? 'none'}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="border border-[#2f2a1e] bg-[#060605] p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8f8878]">Blocked reasons</div>
          <div className="mt-3 space-y-2 text-sm text-[#d8d2c2]">
            {blocked.length ? blocked.map((item) => <div key={item}>{item}</div>) : <div>none</div>}
          </div>
        </div>
        <div className="border border-[#2f2a1e] bg-[#060605] p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8f8878]">Warnings</div>
          <div className="mt-3 space-y-2 text-sm text-[#d8d2c2]">
            {warnings.length ? [...new Set(warnings)].map((item) => <div key={item}>{item}</div>) : <div>none</div>}
          </div>
        </div>
      </div>
    </section>
  );
}
