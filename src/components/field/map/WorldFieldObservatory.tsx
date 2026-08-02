'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Aperture, CircleDot, RefreshCw, Route, ShieldCheck } from 'lucide-react';

type Reading = {
  systemic_friction: number;
  interaction_density: number;
  friction_gradient: number;
  systemic_coherence: number;
  tension: { question?: string; between?: string[] };
  pain_map: { question?: string; affectedSystems?: string[]; actors?: string[] };
  field_drivers: { question?: string; drivers?: string[] };
  permissions: { question?: string; enabled?: string[]; constrained?: string[] };
  trajectory: { question?: string; direction?: string; expectedSignal?: string; horizonHours?: number };
  minimum_viable_perturbation: { question?: string; action?: string; returnWindowHours?: number };
};

type WorldNode = {
  id: string;
  kind: 'observed';
  sourceFamily: string;
  publisher: string;
  title: string;
  summary: string | null;
  observedAt: string;
  lat: number | null;
  lng: number | null;
  affectedSystems: string[];
  actors: string[];
  confidence: number;
  reading: Reading | null;
};

type WorldResponse = {
  ok: boolean;
  generatedAt?: string;
  sourceState?: string;
  nodes?: WorldNode[];
  hypotheses?: Array<Record<string, unknown>>;
  outcomes?: Array<Record<string, unknown>>;
  learning?: Array<Record<string, unknown>>;
  sourceFamilies?: string[];
  limits?: string[];
  error?: string;
  details?: string;
};

function point(lat: number, lng: number) {
  return { left: `${((lng + 180) / 360) * 100}%`, top: `${((90 - lat) / 180) * 100}%` };
}

function pct(value: unknown) {
  const numeric = Number(value ?? 0);
  return `${Math.round(Math.max(0, Math.min(1, numeric)) * 100)}%`;
}

function date(value: string | null | undefined) {
  if (!value) return 'sin fecha';
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function nodeClass(family: string, selected: boolean) {
  const base = selected ? 'h-9 w-9 border-[#ffe0a0]' : 'h-5 w-5';
  if (family === 'aviation') return `${base} border-[#e7a66c] bg-[#bd643755] shadow-[0_0_28px_rgba(210,112,58,.72)]`;
  if (family === 'natural_event') return `${base} border-[#80c6d0] bg-[#4b9eaa55] shadow-[0_0_28px_rgba(89,184,198,.72)]`;
  if (family === 'gnss') return `${base} border-[#db7c67] bg-[#a83f3555] shadow-[0_0_28px_rgba(209,74,62,.75)]`;
  return `${base} border-[#c7a65b] bg-[#a9813555] shadow-[0_0_28px_rgba(198,158,69,.66)]`;
}

export function WorldFieldObservatory() {
  const [data, setData] = useState<WorldResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response = await fetch('/api/field/map/world', { cache: 'no-store', credentials: 'include' });
      const body = await response.json() as WorldResponse;
      if (!response.ok || !body.ok) throw new Error(body.details ?? body.error ?? `HTTP ${response.status}`);
      setData(body);
      setSelectedId((current) => current ?? body.nodes?.[0]?.id ?? null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'world_observatory_load_failed');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const nodes = data?.nodes ?? [];
  const located = useMemo(() => nodes.filter((node) => node.lat !== null && node.lng !== null), [nodes]);
  const selected = nodes.find((node) => node.id === selectedId) ?? null;
  const reading = selected?.reading ?? null;
  const hypotheses = data?.hypotheses ?? [];
  const outcomes = data?.outcomes ?? [];
  const openHypotheses = hypotheses.filter((item) => ['OPEN', 'AWAITING_OUTCOME'].includes(String(item.status)));

  return (
    <main className="min-h-screen bg-[#020507] text-[#d9e2df]">
      <header className="border-b border-[#26343b] bg-[#04080b] px-5 py-5 md:px-8">
        <div className="mx-auto flex max-w-[1800px] flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#c29b54]">SFI · WORLD / FIELD OBSERVATORY</div>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[#f1ead7] md:text-5xl">Navegación de tensión.</h1>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-[#87949a]">No clasifica países ni replica puntuaciones externas. Observa señales reales, pregunta qué tensión aparece, a quién le duele, qué mueve el campo, qué permanece permitido y hacia dónde se desplaza la trayectoria.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 border border-[#34505a] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.15em] text-[#9bc3cc]"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Reobservar</button>
            <Link href="/field" className="border border-[#68542f] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.15em] text-[#d0aa61]">FIELD</Link>
          </div>
        </div>
      </header>

      <section className="relative min-h-[72vh] overflow-hidden border-b border-[#26343b] bg-[#020609]">
        <div className="absolute inset-0 bg-[url('/field/sfi-field-world-skin.webp')] bg-cover bg-center opacity-90" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(195,154,77,.08),transparent_32%),linear-gradient(rgba(88,123,135,.07)_1px,transparent_1px),linear-gradient(90deg,rgba(88,123,135,.07)_1px,transparent_1px)] bg-[size:auto,5%_10%,5%_10%]" />
        <svg className="pointer-events-none absolute inset-0 z-[4] h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {located.slice(0, 120).map((node, index) => {
            if (index === 0) return null;
            const previous = located[index - 1];
            if (previous.lat === null || previous.lng === null || node.lat === null || node.lng === null) return null;
            const a = { x: ((previous.lng + 180) / 360) * 100, y: ((90 - previous.lat) / 180) * 100 };
            const b = { x: ((node.lng + 180) / 360) * 100, y: ((90 - node.lat) / 180) * 100 };
            const sameSystem = previous.affectedSystems.some((system) => node.affectedSystems.includes(system));
            if (!sameSystem) return null;
            return <path key={`${previous.id}:${node.id}`} d={`M ${a.x} ${a.y} Q ${(a.x + b.x) / 2} ${Math.min(a.y, b.y) - 4} ${b.x} ${b.y}`} fill="none" stroke="#b49450" strokeOpacity="0.18" strokeWidth="0.18" vectorEffect="non-scaling-stroke" />;
          })}
        </svg>

        {located.map((node) => (
          <button key={node.id} onClick={() => setSelectedId(node.id)} className="absolute z-10 -translate-x-1/2 -translate-y-1/2" style={point(node.lat as number, node.lng as number)} title={`${node.publisher} · ${node.title}`}>
            <span className={`block rounded-full border transition-all ${nodeClass(node.sourceFamily, node.id === selectedId)}`} />
          </button>
        ))}

        {!located.length ? <div className="absolute inset-0 z-20 grid place-items-center"><div className="max-w-lg border border-[#6a5530] bg-[#05090ce8] p-7 text-center"><Aperture className="mx-auto h-8 w-8 text-[#c9a35c]" /><strong className="mt-4 block text-xl text-[#efe4ca]">SIN OBSERVACIONES WORLD PERSISTIDAS</strong><p className="mt-3 text-sm leading-7 text-[#829097]">No se inventan nodos. La primera ejecución del ciclo de ingesta debe persistir observaciones reales.</p></div></div> : null}

        <div className="absolute left-4 top-4 z-20 border border-[#304149] bg-[#03080bdc] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-[#8da1a9]">observadas {nodes.length} · localizadas {located.length} · hipótesis abiertas {openHypotheses.length}</div>
        <div className="absolute bottom-4 left-4 z-20 border border-[#304149] bg-[#03080bdc] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-[#8da1a9]">{data?.sourceFamilies?.join(' · ') || 'NO SOURCE FAMILIES'} · {date(data?.generatedAt)}</div>
      </section>

      <section className="mx-auto grid max-w-[1800px] gap-px bg-[#26343b] xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,.75fr)]">
        <article className="bg-[#05090c] p-5 md:p-7">
          <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.17em] text-[#c49d55]"><CircleDot className="h-4 w-4" /> Observación seleccionada</div>
          {selected ? <>
            <div className="mt-4 flex flex-wrap items-center gap-2"><span className="border border-[#33464e] px-2 py-1 font-mono text-[9px] uppercase text-[#91a8b1]">{selected.publisher}</span><span className="border border-[#33464e] px-2 py-1 font-mono text-[9px] uppercase text-[#91a8b1]">{selected.sourceFamily}</span><span className="text-xs text-[#718087]">{date(selected.observedAt)}</span></div>
            <h2 className="mt-4 text-2xl text-[#f0e5cd]">{selected.title}</h2>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-[#8d9a9f]">{selected.summary || 'Observación sin resumen editorial.'}</p>
            {reading ? <div className="mt-6 grid gap-4 md:grid-cols-2">
              {[
                ['¿Qué tensión aparece?', reading.tension?.between?.join(' ↔ ')],
                ['¿A quién le duele?', reading.pain_map?.affectedSystems?.join(' · ')],
                ['¿Qué mueve el campo?', reading.field_drivers?.drivers?.join(' · ')],
                ['¿Qué se permitirá?', `permite: ${reading.permissions?.enabled?.join(', ')} · restringe: ${reading.permissions?.constrained?.join(', ')}`],
                ['¿Hacia dónde va?', `${reading.trajectory?.direction} · ${reading.trajectory?.expectedSignal}`],
                ['¿Qué puede hacerse mínimamente?', reading.minimum_viable_perturbation?.action],
              ].map(([question, answer]) => <div key={question} className="border border-[#273840] bg-[#071015] p-4"><div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#c49d55]">{question}</div><p className="mt-3 text-sm leading-6 text-[#a0aaac]">{answer || 'MISSING'}</p></div>)}
            </div> : <p className="mt-6 border border-[#604d2d] p-4 text-sm text-[#c5a66b]">La observación existe, pero aún no tiene lectura SFI persistida.</p>}
          </> : <p className="mt-4 text-sm text-[#78868c]">Selecciona un nodo observado.</p>}
        </article>

        <aside className="bg-[#04080a] p-5 md:p-7">
          <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.17em] text-[#c49d55]"><Activity className="h-4 w-4" /> Estado matemático</div>
          {reading ? <div className="mt-4 grid grid-cols-2 gap-px bg-[#25343a]">
            {[['F_s', reading.systemic_friction], ['D_i', reading.interaction_density], ['G_f', reading.friction_gradient], ['Φ', reading.systemic_coherence]].map(([label, value]) => <div key={String(label)} className="bg-[#071015] p-4"><div className="font-mono text-[9px] text-[#73878f]">{label}</div><div className="mt-2 text-2xl text-[#efe4cb]">{pct(value)}</div></div>)}
          </div> : null}

          <div className="mt-7 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.17em] text-[#c49d55]"><Route className="h-4 w-4" /> Hipótesis y retorno</div>
          <div className="mt-4 space-y-3">
            {hypotheses.slice(0, 8).map((item) => <article key={String(item.id)} className="border border-[#283940] p-4"><div className="flex justify-between gap-3 font-mono text-[9px] uppercase"><span className="text-[#9eb1b8]">{String(item.status)}</span><span className="text-[#c9a35b]">{pct(item.current_confidence)}</span></div><p className="mt-3 text-xs leading-6 text-[#89969b]">{String(item.statement)}</p><div className="mt-2 text-[10px] text-[#65757c]">retorno · {date(String(item.validation_ends_at))}</div></article>)}
            {!hypotheses.length ? <p className="text-xs leading-6 text-[#78868c]">Todavía no existe una hipótesis WORLD congelada.</p> : null}
          </div>

          <div className="mt-7 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.17em] text-[#c49d55]"><ShieldCheck className="h-4 w-4" /> Contrato</div>
          {(data?.limits ?? []).map((limit) => <p key={limit} className="mt-3 text-xs leading-6 text-[#78868c]">{limit}</p>)}
          <p className="mt-3 text-xs leading-6 text-[#78868c]">Outcomes persistidos: {outcomes.length}. Aprendizajes persistidos: {data?.learning?.length ?? 0}.</p>
          {error ? <div className="mt-5 border border-[#743e32] bg-[#170c09] p-4 text-xs text-[#d48d7c]">{error}</div> : null}
        </aside>
      </section>
    </main>
  );
}
