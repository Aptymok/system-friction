'use client';

import { useEffect, useMemo, useState } from 'react';
import { Clock3, RefreshCw } from 'lucide-react';

type Frame = {
  observedAt: string;
  wsi: number | null;
  nti: number | null;
  confidence: number | null;
  sourceState: string;
  ingestMode: string;
  vectors: Array<{ id: string; label: string; value: number | null; sourceCount: number; trust: number | null }>;
};

type Response = {
  ok: boolean;
  horizonDays?: number;
  generatedAt?: string;
  frames?: Frame[];
  limits?: string[];
  error?: string;
  details?: string;
};

function value(number: number | null) {
  return number === null ? 'n/d' : number.toFixed(3);
}

function date(value: string | null | undefined) {
  if (!value) return 'SIN FECHA';
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return value;
  return parsed.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC';
}

export function PublicObservatoryTimelineNavigator() {
  const [data, setData] = useState<Response | null>(null);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const response = await fetch('/api/observatory/timeline', { cache: 'no-store' });
      const body = await response.json() as Response;
      if (!response.ok || !body.ok) throw new Error(body.details ?? body.error ?? `HTTP ${response.status}`);
      setData(body);
      setIndex(Math.max(0, (body.frames?.length ?? 1) - 1));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'observatory_timeline_failed');
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  const frames = data?.frames ?? [];
  const frame = frames[Math.min(index, Math.max(0, frames.length - 1))] ?? null;
  const activeVectors = useMemo(() => frame?.vectors.filter((vector) => vector.value !== null) ?? [], [frame]);

  return (
    <section id="time-movement" className="border-y border-[#78592f66] bg-[#07090b] px-4 py-5 text-[#ddd7c9] md:px-6">
      <div className="mx-auto max-w-[1900px]">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.2em] text-[#d79742]"><Clock3 className="h-4 w-4" /> TIME MOVEMENT · WORLD VECTOR</div>
            <h2 className="mt-2 text-xl tracking-[-0.02em] text-[#f2e5c8]">Mover el observatorio por estados realmente persistidos.</h2>
            <p className="mt-2 max-w-4xl font-mono text-[10px] leading-5 text-[#7f786c]">El cursor no interpola ni inventa días. Cada posición corresponde a un snapshot WorldSpect almacenado y reconstruye únicamente los dominios que tenían fuentes utilizables en ese instante.</p>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 border border-[#78592f] px-3 py-2 font-mono text-[8px] uppercase tracking-[0.15em] text-[#d7a85e]"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> RECARGAR SERIE</button>
        </header>

        {error ? <div className="mt-4 border border-[#6d3f32] bg-[#24110d] p-3 font-mono text-[10px] text-[#d98670]">{error}</div> : null}

        {frame ? <>
          <div className="mt-5 grid gap-px bg-[#6b512d55] md:grid-cols-4">
            {[
              ['FRAME', date(frame.observedAt), frame.sourceState.toUpperCase()],
              ['WSV', value(frame.wsi), 'estado mundial agregado'],
              ['NTI', value(frame.nti), 'tensión del snapshot'],
              ['CONFIANZA', value(frame.confidence), frame.ingestMode.toUpperCase()],
            ].map(([label, metric, meta]) => <div key={label} className="bg-[#0a0c0f] p-4"><span className="font-mono text-[8px] tracking-[0.15em] text-[#7f786c]">{label}</span><strong className="mt-2 block text-lg font-normal text-[#e7c987]">{metric}</strong><small className="mt-1 block font-mono text-[8px] text-[#665f55]">{meta}</small></div>)}
          </div>

          <div className="mt-5 border border-[#78592f55] bg-[#050708] p-4">
            <div className="flex items-center justify-between gap-3 font-mono text-[8px] uppercase tracking-[0.14em] text-[#8f816b]"><span>{date(frames[0]?.observedAt)}</span><span>{index + 1}/{frames.length} · {data?.horizonDays ?? 90} DÍAS</span><span>{date(frames.at(-1)?.observedAt)}</span></div>
            <input aria-label="Mover la línea temporal del Observatorio Público" type="range" min={0} max={Math.max(0, frames.length - 1)} value={Math.min(index, Math.max(0, frames.length - 1))} onChange={(event) => setIndex(Number(event.target.value))} className="mt-4 w-full accent-[#d79742]" />
          </div>

          <div className="mt-5 grid gap-px bg-[#6b512d55] sm:grid-cols-2 lg:grid-cols-5">
            {frame.vectors.map((vector) => <article key={vector.id} className={`bg-[#090b0d] p-4 ${vector.value === null ? 'opacity-45' : ''}`}><span className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#887960]">{vector.label}</span><strong className="mt-2 block text-2xl font-normal text-[#e7c987]">{value(vector.value)}</strong><div className="mt-2 h-1 border border-[#6e542f55] bg-[#030405]"><i className="block h-full bg-[#b84e9a]" style={{ width: `${Math.max(0, Math.min(1, vector.value ?? 0)) * 100}%` }} /></div><small className="mt-2 block font-mono text-[8px] leading-4 text-[#685f53]">{vector.sourceCount} fuentes · trust {value(vector.trust)}</small></article>)}
          </div>

          {!activeVectors.length ? <div className="mt-4 border border-[#604d2d] p-3 font-mono text-[10px] text-[#a38655]">Este snapshot existe, pero no contiene dominios públicos calculables. Se conserva como ausencia observada, no se rellena.</div> : null}

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[8px] leading-4 text-[#625c53]">{(data?.limits ?? []).map((limit) => <span key={limit}>· {limit}</span>)}</div>
        </> : !loading ? <div className="mt-5 border border-[#604d2d] p-5 font-mono text-[10px] text-[#a38655]">NO EXISTEN SNAPSHOTS PERSISTIDOS EN EL HORIZONTE PÚBLICO.</div> : null}
      </div>
    </section>
  );
}