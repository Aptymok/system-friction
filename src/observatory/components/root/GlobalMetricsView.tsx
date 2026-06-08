'use client';

import { useEffect, useMemo, useState } from 'react';
import { buildRootFieldState } from '@/lib/root/rootFieldState';
import { translateRootMihm } from '@/lib/root/rootMihmTranslator';
import { translateRootWsv } from '@/lib/root/rootWsvTranslator';

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

function safeDate(value?: string | null) {
  if (!value) return 'sin registro';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'sin registro' : date.toLocaleString();
}

function FieldLine({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p>
      <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#35312a]">{label}</span><br />
      <span className="text-[#c8a951]">{children}</span>
    </p>
  );
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

  const fieldState = useMemo(() => buildRootFieldState(twin ?? {}), [twin]);
  const wsv = useMemo(() => translateRootWsv(twin?.data?.worldspect ?? twin?.data?.seed?.latestWorldSpect), [twin]);
  const mihm = useMemo(() => translateRootMihm(twin?.data?.mihmRuntimeMatrix ?? twin?.data?.seed?.mihmRuntimeMatrix), [twin]);

  return (
    <section className="border border-[#1e1c17] bg-[#0e0d0b]">
      <div className="border-b border-[#1e1c17] px-4 py-3">
        <p className="font-mono text-[8px] uppercase tracking-[0.22em] text-[#8a7035]">WSV / MIHM</p>
        <h3 className="mt-1 font-serif text-lg text-[#c8a951]">Lecturas interpretables del campo</h3>
        <p className="mt-1 text-xs leading-5 text-[#8a7568]">WSV no se resume como OK. MIHM solo orienta decision cuando declara objeto focal.</p>
      </div>

      <div className="grid grid-cols-1 gap-2 p-3 text-xs leading-5 text-[#8a7568]">
        <section className="bg-[#131210] p-3">
          <div className="mb-2 font-mono text-[8px] uppercase tracking-[0.18em] text-[#8a7035]">{wsv.label}</div>
          <div className="grid gap-2">
            <FieldLine label="como esta el mundo observado hoy">{wsv.worldToday}</FieldLine>
            <FieldLine label="fuentes activas">{wsv.activeSources}</FieldLine>
            <FieldLine label="fuente degradada">{wsv.degradedSource}</FieldLine>
            <FieldLine label="campo dominante">{wsv.dominantField}</FieldLine>
            <FieldLine label="ultima lectura real">{wsv.lastRealReading}</FieldLine>
            <FieldLine label="integridad">{wsv.integrity}</FieldLine>
            <FieldLine label="implicacion para Aptymok">{wsv.implicationForAptymok}</FieldLine>
          </div>
        </section>

        <section className="bg-[#131210] p-3">
          <div className="mb-2 font-mono text-[8px] uppercase tracking-[0.18em] text-[#8a7035]">{mihm.label}</div>
          <div className="grid gap-2">
            <FieldLine label="objeto observado">{mihm.observedObject ?? 'MIHM basal · Aptymok / n_0'}</FieldLine>
            {mihm.decisionGrade ? mihm.indicators.map((indicator) => (
              <FieldLine key={indicator.key} label={indicator.key}>{indicator.value} / {indicator.reading}</FieldLine>
            )) : (
              <FieldLine label="indicadores">MIHM basal · sin evidencia nueva</FieldLine>
            )}
            <FieldLine label="regimen resultante">{mihm.resultingRegime}</FieldLine>
            <FieldLine label="direccion">{mihm.direction}</FieldLine>
            <FieldLine label="confianza">{mihm.confidence}</FieldLine>
            <FieldLine label="que falta">{mihm.missing}</FieldLine>
          </div>
        </section>

        <div className="bg-[#131210] p-2">
          <FieldLine label="RCE">{fieldState.rce}</FieldLine>
        </div>
      </div>

      <div className="border-t border-[#1e1c17] px-3 py-2 font-mono text-[8px] uppercase tracking-[0.12em] text-[#35312a]">
        Regimen: <span className="text-[#8a7035]">{fieldState.regime.label}</span> / Global metrics: <span className="text-[#8a7035]">{metrics ? safeDate(metrics.lastUpdated) : 'sin lectura'}</span> / WSV: <span className="text-[#8a7035]">{wsv.state.label}</span> / MIHM: <span className="text-[#8a7035]">{mihm.decisionGrade ? mihm.state.label : 'lectura incompleta'}</span>
      </div>
    </section>
  );
}
