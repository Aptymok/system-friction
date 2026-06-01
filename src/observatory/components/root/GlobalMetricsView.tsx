// src/components/root/GlobalMetricsView.tsx
'use client';
import { useEffect, useMemo, useState } from 'react';

type GlobalMetrics = {
  globalAverageIHG?: number | null;
  globalVolatility?: number | null;
  totalAudits?: number | null;
  lastUpdated?: string | null;
};

type TwinState = {
  ok?: boolean;
  data?: {
    seed?: {
      nodeCatalog?: unknown[];
      documentCatalog?: unknown[];
      patternCatalog?: unknown[];
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
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(3) : '—';
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
      volatility: typeof metrics?.globalVolatility === 'number' ? metrics.globalVolatility : matrix?.phi,
      audits: typeof metrics?.totalAudits === 'number' ? metrics.totalAudits : seed?.documentCatalog?.length,
      updated: metrics?.lastUpdated,
      nodes: seed?.nodeCatalog?.length,
      patterns: seed?.patternCatalog?.length,
      source: matrix?.sourceState,
      regime: matrix?.regime,
    };
  }, [metrics, twin]);

  return (
    <section className="border border-[#1e1c17] bg-[#0e0d0b]">
      <div className="border-b border-[#1e1c17] px-4 py-3">
        <p className="font-mono text-[8px] uppercase tracking-[0.22em] text-[#8a7035]">Observed Metrics</p>
        <h3 className="mt-1 font-serif text-lg text-[#c8a951]">Métricas observadas</h3>
        <p className="mt-1 font-mono text-[9px] tracking-[0.08em] text-[#7a7568]">Global metrics con fallback a Twin/MIHM. No muestra fechas inválidas.</p>
      </div>
      <div className="grid grid-cols-2 gap-1 p-3 font-mono text-[9px]">
        <div className="bg-[#131210] p-2"><span className="text-[#35312a]">IHG</span><br /><span className="text-[#c8a951]">{fmt(observed.ihg)}</span></div>
        <div className="bg-[#131210] p-2"><span className="text-[#35312a]">Volatilidad / Φ</span><br /><span className="text-[#c8a951]">{fmt(observed.volatility)}</span></div>
        <div className="bg-[#131210] p-2"><span className="text-[#35312a]">Evidencias</span><br /><span className="text-[#c8a951]">{observed.audits ?? '—'}</span></div>
        <div className="bg-[#131210] p-2"><span className="text-[#35312a]">Nodos</span><br /><span className="text-[#c8a951]">{observed.nodes ?? '—'}</span></div>
        <div className="bg-[#131210] p-2"><span className="text-[#35312a]">Patrones</span><br /><span className="text-[#c8a951]">{observed.patterns ?? '—'}</span></div>
        <div className="bg-[#131210] p-2"><span className="text-[#35312a]">Fuente</span><br /><span className="text-[#c8a951]">{observed.source ?? '—'}</span></div>
      </div>
      <div className="border-t border-[#1e1c17] px-3 py-2 font-mono text-[8px] uppercase tracking-[0.12em] text-[#35312a]">
        Régimen: <span className="text-[#8a7035]">{observed.regime ?? '—'}</span> · Última actualización: <span className="text-[#8a7035]">{safeDate(observed.updated)}</span>
      </div>
    </section>
  );
}
