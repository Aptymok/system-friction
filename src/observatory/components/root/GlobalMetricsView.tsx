'use client';

import { useEffect, useMemo, useState } from 'react';
import { buildRootFieldState } from '@/lib/root/rootFieldState';

type GlobalMetrics = {
  globalAverageIHG?: number | null;
  globalVolatility?: number | null;
  totalAudits?: number | null;
  lastUpdated?: string | null;
};

type TwinState = {
  ok?: boolean;
  data?: {
    proposals?: unknown[];
    worldspect?: unknown;
    mihmRuntimeMatrix?: unknown;
    kernel?: unknown;
    warnings?: string[];
    seed?: {
      nodeCatalog?: unknown[];
      documentCatalog?: unknown[];
      patternCatalog?: unknown[];
      executionCatalog?: unknown[];
      recentEvents?: unknown[];
      latestWorldSpect?: unknown;
      mihmRuntimeMatrix?: {
        ihg?: number;
        nti?: number;
        ldi?: number;
        phi?: number;
        sourceState?: string;
        regime?: string;
      };
    };
  };
};

function fmt(value?: number | null) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(3) : '-';
}

function safeDate(value?: string | null) {
  if (!value) return 'sin registro';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'sin registro' : date.toLocaleString();
}

export function GlobalMetricsView() {
  const [metrics, setMetrics] = useState<GlobalMetrics | null>(null);
  const [twin, setTwin] = useState<TwinState | null>(null);

  useEffect(() => {
    fetch('/api/global-metrics')
      .then((res) => res.json())
      .then(setMetrics)
      .catch(() => setMetrics(null));

    fetch(`/api/twin/state?ts=${Date.now()}`, { credentials: 'include' })
      .then((res) => res.json())
      .then(setTwin)
      .catch(() => setTwin(null));
  }, []);

  const observed = useMemo(() => {
    const seed = twin?.data?.seed;
    const matrix = seed?.mihmRuntimeMatrix;
    return {
      ihg: typeof metrics?.globalAverageIHG === 'number' ? metrics.globalAverageIHG : matrix?.ihg,
      updated: metrics?.lastUpdated,
    };
  }, [metrics, twin]);
  const fieldState = useMemo(() => buildRootFieldState(twin ?? {}), [twin]);

  return (
    <section className="border border-[#1e1c17] bg-[#0e0d0b]">
      <div className="border-b border-[#1e1c17] px-4 py-3">
        <p className="font-mono text-[8px] uppercase tracking-[0.22em] text-[#8a7035]">Estado del Campo</p>
        <h3 className="mt-1 font-serif text-lg text-[#c8a951]">{fieldState.regime.label}</h3>
        <p className="mt-1 text-xs leading-5 text-[#8a7568]">{fieldState.regime.explanation}</p>
      </div>

      <div className="grid grid-cols-1 gap-1 p-3 text-xs leading-5 text-[#8a7568]">
        {fieldState.answers.slice(0, 4).map((item) => (
          <div key={item.question} className="bg-[#131210] p-2">
            <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#35312a]">{item.question}</span><br />
            <span className="text-[#c8a951]">{item.answer}</span>
          </div>
        ))}
        <div className="bg-[#131210] p-2">
          <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#35312a]">RCE</span><br />
          <span className="text-[#c8a951]">{fieldState.rce}</span>
        </div>
        <div className="bg-[#131210] p-2">
          <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#35312a]">MIHM</span><br />
          <span className="text-[#c8a951]">{fieldState.mihm.detail}</span>
        </div>
      </div>

      <div className="border-t border-[#1e1c17] px-3 py-2 font-mono text-[8px] uppercase tracking-[0.12em] text-[#35312a]">
        Regimen: <span className="text-[#8a7035]">{fieldState.regime.label}</span> / Ultima actualizacion: <span className="text-[#8a7035]">{safeDate(observed.updated)}</span> / IHG si existe: <span className="text-[#8a7035]">{fmt(observed.ihg)}</span>
      </div>
    </section>
  );
}
