'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Aperture, BrainCircuit, CircleDot, Clock3, RefreshCw, Route, ShieldCheck } from 'lucide-react';

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

type WorldHypothesis = {
  id: string;
  statement: string;
  status: string;
  cutoff_at: string;
  validation_ends_at: string;
  current_confidence: number;
  evidence_ids?: string[];
  graph_snapshot?: Record<string, unknown>;
};

type WorldOutcome = {
  id: string;
  hypothesis_id: string;
  classification: string;
  observed_outcome: string;
  evaluated_at: string;
};

type WorldLearning = {
  id: string;
  hypothesis_id: string;
  outcome_id: string;
  confidence_before: number;
  confidence_after: number;
  created_at: string;
};

type WorldResponse = {
  ok: boolean;
  generatedAt?: string;
  sourceState?: string;
  horizonDays?: number;
  temporalBounds?: { firstAt: string | null; lastAt: string | null };
  nodes?: WorldNode[];
  hypotheses?: WorldHypothesis[];
  outcomes?: WorldOutcome[];
  learning?: WorldLearning[];
  sourceFamilies?: string[];
  limits?: string[];
  error?: string;
  details?: string;
};

type CognitiveFrame = {
  ok: boolean;
  synthesis?: string;
  epistemicClass?: string;
  agents?: string[];
  llm?: { provider?: string | null; model?: string | null; latencyMs?: number | null; warnings?: string[] };
  twin?: { runId?: string; role?: string; corpusWarnings?: string[] };
  limitations?: string[];
  error?: string;
  details?: string;
};

type TimelineEvent = {
  id: string;
  at: string;
  kind: 'OBSERVATION' | 'HYPOTHESIS' | 'OUTCOME' | 'LEARNING';
  label: string;
  hypothesisId: string | null;
  observationId: string | null;
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
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function hypothesisObservationId(hypothesis: WorldHypothesis) {
  const snapshot = asRecord(hypothesis.graph_snapshot);
  return typeof snapshot.observationId === 'string' ? snapshot.observationId : null;
}

function millis(value: string | null | undefined) {
  const parsed = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function nodeClass(family: string, selected: boolean, outcome: string | null, hasHypothesis: boolean) {
  const base = selected ? 'h-10 w-10 ring-2 ring-[#ffe0a0]/70' : hasHypothesis ? 'h-7 w-7' : 'h-5 w-5';
  if (outcome === 'VALIDATED') return `${base} border-[#7fd4b2] bg-[#4d9d7a88] shadow-[0_0_30px_rgba(96,211,163,.72)]`;
  if (outcome === 'CONTRADICTED') return `${base} border-[#e37c69] bg-[#a8423588] shadow-[0_0_30px_rgba(220,92,72,.72)]`;
  if (family === 'aviation') return `${base} border-[#e7a66c] bg-[#bd643777] shadow-[0_0_24px_rgba(210,112,58,.6)]`;
  if (family === 'natural_event') return `${base} border-[#80c6d0] bg-[#4b9eaa77] shadow-[0_0_24px_rgba(89,184,198,.6)]`;
  if (family === 'gnss') return `${base} border-[#db7c67] bg-[#a83f3577] shadow-[0_0_24px_rgba(209,74,62,.62)]`;
  return `${base} border-[#c7a65b] bg-[#a9813577] shadow-[0_0_24px_rgba(198,158,69,.55)]`;
}

function eventTone(kind: TimelineEvent['kind']) {
  if (kind === 'HYPOTHESIS') return 'text-[#d3a85c] border-[#6b542c]';
  if (kind === 'OUTCOME') return 'text-[#8ac7d0] border-[#365a62]';
  if (kind === 'LEARNING') return 'text-[#c28ac3] border-[#5f385f]';
  return 'text-[#9aa9ad] border-[#34444a]';
}

export function WorldFieldObservatory() {
  const [data, setData] = useState<WorldResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [windowHours, setWindowHours] = useState(72);
  const [cursorIndex, setCursorIndex] = useState(0);
  const [cognitive, setCognitive] = useState<CognitiveFrame | null>(null);
  const [cognitiveLoading, setCognitiveLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response = await fetch('/api/field/map/world', { cache: 'no-store', credentials: 'include' });
      const body = await response.json() as WorldResponse;
      if (!response.ok || !body.ok) throw new Error(body.details ?? body.error ?? `HTTP ${response.status}`);
      setData(body);
      setSelectedId((current) => current ?? body.nodes?.[0]?.id ?? null);
      setCognitive(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'world_observatory_load_failed');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const nodes = data?.nodes ?? [];
  const hypotheses = data?.hypotheses ?? [];
  const outcomes = data?.outcomes ?? [];
  const learning = data?.learning ?? [];
  const outcomeByHypothesis = useMemo(() => new Map(outcomes.map((item) => [item.hypothesis_id, item])), [outcomes]);
  const hypothesisByObservation = useMemo(() => {
    const map = new Map<string, WorldHypothesis[]>();
    hypotheses.forEach((item) => {
      const observationId = hypothesisObservationId(item);
      if (!observationId) return;
      map.set(observationId, [...(map.get(observationId) ?? []), item]);
    });
    return map;
  }, [hypotheses]);

  const timeline = useMemo<TimelineEvent[]>(() => {
    const events: TimelineEvent[] = [
      ...nodes.map((node) => ({ id: `o:${node.id}`, at: node.observedAt, kind: 'OBSERVATION' as const, label: node.title, hypothesisId: null, observationId: node.id })),
      ...hypotheses.map((item) => ({ id: `h:${item.id}`, at: item.cutoff_at, kind: 'HYPOTHESIS' as const, label: item.statement, hypothesisId: item.id, observationId: hypothesisObservationId(item) })),
      ...outcomes.map((item) => ({ id: `r:${item.id}`, at: item.evaluated_at, kind: 'OUTCOME' as const, label: `${item.classification} · ${item.observed_outcome}`, hypothesisId: item.hypothesis_id, observationId: null })),
      ...learning.map((item) => ({ id: `l:${item.id}`, at: item.created_at, kind: 'LEARNING' as const, label: `confianza ${pct(item.confidence_before)} → ${pct(item.confidence_after)}`, hypothesisId: item.hypothesis_id, observationId: null })),
    ].filter((item) => millis(item.at) > 0);
    return events.sort((a, b) => millis(a.at) - millis(b.at));
  }, [nodes, hypotheses, outcomes, learning]);

  useEffect(() => {
    if (timeline.length) setCursorIndex(timeline.length - 1);
  }, [timeline.length]);

  const cursorAt = timeline[cursorIndex]?.at ?? data?.temporalBounds?.lastAt ?? data?.generatedAt ?? new Date().toISOString();
  const cursorMs = millis(cursorAt);
  const startMs = cursorMs - windowHours * 60 * 60 * 1000;
  const visibleNodes = useMemo(() => nodes.filter((node) => {
    const at = millis(node.observedAt);
    return at > 0 && at <= cursorMs && at >= startMs;
  }), [nodes, cursorMs, startMs]);
  const located = useMemo(() => visibleNodes.filter((node) => node.lat !== null && node.lng !== null), [visibleNodes]);
  const visibleHypotheses = useMemo(() => hypotheses.filter((item) => millis(item.cutoff_at) <= cursorMs), [hypotheses, cursorMs]);
  const visibleOutcomes = useMemo(() => outcomes.filter((item) => millis(item.evaluated_at) <= cursorMs), [outcomes, cursorMs]);
  const visibleLearning = useMemo(() => learning.filter((item) => millis(item.created_at) <= cursorMs), [learning, cursorMs]);
  const selected = visibleNodes.find((node) => node.id === selectedId) ?? visibleNodes.at(-1) ?? null;
  const reading = selected?.reading ?? null;

  useEffect(() => {
    if (selected && selected.id !== selectedId) setSelectedId(selected.id);
  }, [selected, selectedId]);

  async function analyzeFrame() {
    setCognitiveLoading(true); setCognitive(null); setError(null);
    try {
      const response = await fetch('/api/field/map/world/cognitive', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ cutoffAt: cursorAt, windowHours }),
      });
      const body = await response.json() as CognitiveFrame;
      if (!response.ok || !body.ok) throw new Error(body.details ?? body.error ?? `HTTP ${response.status}`);
      setCognitive(body);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'world_frame_cognitive_failed');
    } finally { setCognitiveLoading(false); }
  }

  return (
    <main className="min-h-screen bg-[#020507] text-[#d9e2df]">
      <header className="sticky top-0 z-50 border-b border-[#26343b] bg-[#04080bf2] px-4 py-3 backdrop-blur-xl md:px-6">
        <div className="mx-auto flex max-w-[1900px] flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-[#c29b54]">SFI · WORLD / FIELD OBSERVATORY</div>
            <div className="mt-1 text-lg text-[#f1ead7]">Campo temporal · evidencia localizada</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 border border-[#34505a] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[#9bc3cc]"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Reobservar</button>
            <Link href="/field" className="border border-[#68542f] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[#d0aa61]">FIELD</Link>
            <Link href="/observatory" className="border border-[#68542f] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[#d0aa61]">OBSERVATORY</Link>
          </div>
        </div>
      </header>

      {error ? <div className="mx-auto max-w-[1900px] border-x border-b border-[#673d32] bg-[#2b100d] px-4 py-3 text-xs text-[#e6a38e]">{error}</div> : null}

      <section className="mx-auto grid max-w-[1900px] items-start gap-px bg-[#26343b] xl:grid-cols-[minmax(0,1.35fr)_minmax(430px,.65fr)]">
        <div className="sticky top-[69px] h-[calc(100vh-69px)] min-h-[620px] overflow-hidden bg-[#020609]">
          <div className="absolute inset-0 bg-[url('/field/sfi_map.png')] bg-cover bg-center opacity-90" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(195,154,77,.08),transparent_32%),linear-gradient(rgba(88,123,135,.07)_1px,transparent_1px),linear-gradient(90deg,rgba(88,123,135,.07)_1px,transparent_1px)] bg-[size:auto,5%_10%,5%_10%]" />

          {located.map((node) => {
            const linked = hypothesisByObservation.get(node.id) ?? [];
            const latestHypothesis = linked.filter((item) => millis(item.cutoff_at) <= cursorMs).at(-1) ?? null;
            const outcome = latestHypothesis ? outcomeByHypothesis.get(latestHypothesis.id) ?? null : null;
            return (
              <button key={node.id} onClick={() => setSelectedId(node.id)} className="absolute z-10 -translate-x-1/2 -translate-y-1/2" style={point(node.lat as number, node.lng as number)} title={`${node.publisher} · ${node.title}`}>
                <span className={`block rounded-full border transition-all duration-300 ${nodeClass(node.sourceFamily, node.id === selected?.id, outcome?.classification ?? null, Boolean(latestHypothesis))}`} />
              </button>
            );
          })}

          {!located.length ? <div className="absolute inset-0 z-20 grid place-items-center"><div className="max-w-lg border border-[#6a5530] bg-[#05090ce8] p-7 text-center"><Aperture className="mx-auto h-8 w-8 text-[#c9a35c]" /><strong className="mt-4 block text-xl text-[#efe4ca]">SIN NODOS EN ESTE FRAME</strong><p className="mt-3 text-sm leading-7 text-[#829097]">Mueve la línea temporal o amplía la ventana. No se inventan nodos para mantener el mapa poblado.</p></div></div> : null}

          <div className="absolute left-4 top-4 z-20 border border-[#304149] bg-[#03080be8] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[#8da1a9]">frame {date(cursorAt)} · ventana {windowHours}h · nodos {visibleNodes.length}/{nodes.length}</div>
          <div className="absolute bottom-28 left-4 z-20 max-w-[70%] border border-[#304149] bg-[#03080be8] px-3 py-2 font-mono text-[8px] uppercase tracking-[0.12em] text-[#718087]">geometría = ubicación persistida · aparición/desaparición = frame temporal · no se infieren aristas causales</div>

          <div className="absolute inset-x-4 bottom-4 z-30 border border-[#4b4535] bg-[#030608ef] p-3 backdrop-blur">
            <div className="flex items-center justify-between gap-3 font-mono text-[9px] uppercase tracking-[0.13em]">
              <span className="inline-flex items-center gap-2 text-[#d0aa61]"><Clock3 className="h-4 w-4" /> TIME MOVEMENT</span>
              <span className="text-[#87949a]">{cursorIndex + 1}/{Math.max(1, timeline.length)}</span>
            </div>
            <input aria-label="Mover tiempo del Campo Mundial" type="range" min={0} max={Math.max(0, timeline.length - 1)} value={Math.min(cursorIndex, Math.max(0, timeline.length - 1))} onChange={(event) => { setCursorIndex(Number(event.target.value)); setCognitive(null); }} className="mt-3 w-full accent-[#c59b52]" disabled={!timeline.length} />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#718087]">
              <span>{date(timeline[0]?.at)}</span>
              <div className="flex gap-1">
                {[24, 72, 168].map((hours) => <button key={hours} type="button" onClick={() => { setWindowHours(hours); setCognitive(null); }} className={`border px-2 py-1 font-mono text-[8px] ${windowHours === hours ? 'border-[#c59b52] text-[#e1bd76]' : 'border-[#34444a] text-[#75858b]'}`}>{hours === 168 ? '7D' : `${hours}H`}</button>)}
              </div>
              <span>{date(timeline.at(-1)?.at)}</span>
            </div>
          </div>
        </div>

        <aside className="min-h-screen bg-[#04080a]">
          <section className="border-b border-[#26343b] p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#c49d55]"><CircleDot className="h-4 w-4" /> Estado del frame</div>
              <span className="font-mono text-[8px] text-[#75858b]">{visibleHypotheses.length} H · {visibleOutcomes.length} O · {visibleLearning.length} L</span>
            </div>
            {selected ? <>
              <div className="mt-4 flex flex-wrap items-center gap-2"><span className="border border-[#33464e] px-2 py-1 font-mono text-[8px] uppercase text-[#91a8b1]">{selected.publisher}</span><span className="border border-[#33464e] px-2 py-1 font-mono text-[8px] uppercase text-[#91a8b1]">{selected.sourceFamily}</span></div>
              <h2 className="mt-3 text-xl text-[#f0e5cd]">{selected.title}</h2>
              <p className="mt-2 text-xs leading-6 text-[#8d9a9f]">{selected.summary || 'Observación sin resumen editorial.'}</p>
              {reading ? <div className="mt-4 grid grid-cols-2 gap-px bg-[#25343a]">{[['F_s', reading.systemic_friction], ['D_i', reading.interaction_density], ['G_f', reading.friction_gradient], ['Φ', reading.systemic_coherence]].map(([label, value]) => <div key={String(label)} className="bg-[#071015] p-3"><div className="font-mono text-[8px] text-[#73878f]">{label}</div><div className="mt-1 text-xl text-[#efe4cb]">{pct(value)}</div></div>)}</div> : <p className="mt-4 border border-[#604d2d] p-3 text-xs text-[#c5a66b]">Lectura SFI todavía MISSING para esta observación.</p>}
            </> : <p className="mt-4 text-xs text-[#78868c]">No existe observación dentro del frame seleccionado.</p>}
          </section>

          {reading ? <section className="border-b border-[#26343b] p-5">
            <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#c49d55]">Lectura SFI persistida</div>
            <div className="mt-4 space-y-3">{[
              ['TENSIÓN', reading.tension?.between?.join(' ↔ ')],
              ['DOLOR', reading.pain_map?.affectedSystems?.join(' · ')],
              ['DRIVERS', reading.field_drivers?.drivers?.join(' · ')],
              ['TRAYECTORIA', `${reading.trajectory?.direction ?? 'MISSING'} · ${reading.trajectory?.expectedSignal ?? 'MISSING'}`],
              ['PERTURBACIÓN MÍNIMA', reading.minimum_viable_perturbation?.action],
            ].map(([label, value]) => <div key={label} className="border-l border-[#604d2d] pl-3"><span className="font-mono text-[8px] text-[#846b3e]">{label}</span><p className="mt-1 text-xs leading-5 text-[#929da1]">{value || 'MISSING'}</p></div>)}</div>
          </section> : null}

          <section className="border-b border-[#26343b] p-5">
            <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#c49d55]"><BrainCircuit className="h-4 w-4" /> LLM + AGENTES + COGNITIVE TWIN</div>
            <p className="mt-3 text-xs leading-6 text-[#7f8d92]">Ejecuta una lectura explícita del frame persistido. Los agentes derivan contexto; el LLM sintetiza una propuesta usando sólo canon/métodos institucionales del Twin. No modifica observaciones ni convierte inferencias en evidencia.</p>
            <button type="button" onClick={() => void analyzeFrame()} disabled={cognitiveLoading || !visibleNodes.length} className="mt-4 w-full border border-[#6b552e] bg-[#171107] px-3 py-3 font-mono text-[9px] uppercase tracking-[0.13em] text-[#d8b56f] disabled:opacity-40">{cognitiveLoading ? 'EJECUTANDO FRAME…' : 'ANALIZAR FRAME CON SFI'}</button>
            {cognitive ? <div className="mt-4 border border-[#35474e] bg-[#071015] p-4"><div className="flex flex-wrap justify-between gap-2 font-mono text-[8px] uppercase"><span className="text-[#c9a35b]">{cognitive.epistemicClass ?? 'PROPOSED'}</span><span className="text-[#7c9198]">{cognitive.llm?.provider ?? 'fallback'} · {cognitive.llm?.model ?? 'n/d'}</span></div><p className="mt-3 whitespace-pre-wrap text-xs leading-6 text-[#a0aaac]">{cognitive.synthesis}</p><div className="mt-3 border-t border-[#26343b] pt-3 text-[9px] leading-5 text-[#69797f]">AGENTES · {(cognitive.agents ?? []).join(' · ') || 'ninguno'}<br />TWIN RUN · {cognitive.twin?.runId ?? 'MISSING'}</div></div> : null}
          </section>

          <section className="border-b border-[#26343b] p-5">
            <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#c49d55]"><Route className="h-4 w-4" /> Hipótesis longitudinales</div>
            <p className="mt-2 text-[10px] leading-5 text-[#718087]">Se muestran todas las hipótesis persistidas del horizonte hasta el cursor, no las primeras ocho.</p>
            <div className="mt-4 max-h-[520px] space-y-2 overflow-y-auto pr-1">
              {[...visibleHypotheses].reverse().map((item) => {
                const outcome = outcomeByHypothesis.get(item.id) ?? null;
                return <article key={item.id} className="border border-[#283940] p-3"><div className="flex justify-between gap-3 font-mono text-[8px] uppercase"><span className="text-[#9eb1b8]">{outcome?.classification ?? item.status}</span><span className="text-[#c9a35b]">{pct(item.current_confidence)}</span></div><p className="mt-2 text-xs leading-5 text-[#89969b]">{item.statement}</p><div className="mt-2 flex justify-between gap-2 text-[9px] text-[#65757c]"><span>T0 {date(item.cutoff_at)}</span><span>retorno {date(item.validation_ends_at)}</span></div>{outcome ? <p className="mt-2 border-l border-[#35606a] pl-2 text-[10px] leading-5 text-[#7baab2]">{outcome.observed_outcome}</p> : null}</article>;
              })}
              {!visibleHypotheses.length ? <p className="text-xs leading-6 text-[#78868c]">Todavía no existe una hipótesis WORLD antes de este cursor.</p> : null}
            </div>
          </section>

          <section className="p-5">
            <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#c49d55]"><Clock3 className="h-4 w-4" /> Timeline completa</div>
            <div className="mt-4 max-h-[640px] space-y-2 overflow-y-auto pr-1">
              {[...timeline].reverse().map((event, reverseIndex) => {
                const originalIndex = timeline.length - 1 - reverseIndex;
                const active = originalIndex === cursorIndex;
                return <button key={event.id} type="button" onClick={() => { setCursorIndex(originalIndex); setCognitive(null); }} className={`block w-full border p-3 text-left transition ${eventTone(event.kind)} ${active ? 'bg-[#19150d] ring-1 ring-[#c59b52]/60' : 'bg-[#05090c]'}`}><div className="flex items-center justify-between gap-2 font-mono text-[8px]"><span>{event.kind}</span><time>{date(event.at)}</time></div><p className="mt-2 line-clamp-3 text-[10px] leading-5 text-[#87949a]">{event.label}</p></button>;
              })}
              {!timeline.length ? <p className="text-xs text-[#78868c]">Sin eventos temporales persistidos.</p> : null}
            </div>
          </section>

          <section className="border-t border-[#26343b] p-5">
            <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#c49d55]"><ShieldCheck className="h-4 w-4" /> Contrato</div>
            {(data?.limits ?? []).map((limit) => <p key={limit} className="mt-2 text-[10px] leading-5 text-[#78868c]">{limit}</p>)}
          </section>
        </aside>
      </section>
    </main>
  );
}