'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Send, Target } from 'lucide-react';
import ExecutionStatePanel from './ExecutionStatePanel';

type Row = Record<string, any>;

const emptyAttractor = { title: '', desired_future_state: '', horizon: '', success_markers: '' };
const emptyPerturbation = {
  title: '', intention: '', target_vector: '', target_node: '', desired_future_state: '',
  time_window: '', evidence_expected: '', risk_tolerance: '', object_reference: '',
};

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}

function scalar(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(3);
  if (typeof value === 'boolean') return value ? 'sí' : 'no';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="border border-white/10 bg-white/[0.025] p-4"><h2 className="mb-4 border-b border-white/10 pb-3 text-[10px] uppercase tracking-[0.24em] text-[#d6b46a]">{title}</h2>{children}</section>;
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="min-h-10 w-full border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#d6b46a]/70" />;
}

function Area(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className="min-h-24 w-full resize-y border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#d6b46a]/70" />;
}

function SourceState({ label, source }: { label: string; source: Row | undefined }) {
  const degraded = Boolean(source?.degraded || source?.ok === false);
  return (
    <div className="border border-white/10 p-3">
      <div className="flex items-center justify-between gap-3"><span className="text-[10px] uppercase tracking-[0.18em] text-white/45">{label}</span><span className={`font-mono text-[10px] uppercase ${degraded ? 'text-amber-300' : 'text-emerald-300'}`}>{degraded ? 'degraded' : 'live'}</span></div>
      <div className="mt-2 break-words text-xs text-white/60">{degraded ? scalar(source?.error) : scalar(source?.source)}</div>
    </div>
  );
}

export default function SfiConsoleClient() {
  const [state, setState] = useState<Row | null>(null);
  const [responseState, setResponseState] = useState<Row | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [caseId, setCaseId] = useState('');
  const [attractor, setAttractor] = useState(emptyAttractor);
  const [perturbation, setPerturbation] = useState(emptyPerturbation);

  async function load() {
    setLoading(true); setMessage(null);
    try {
      const [stateResponse, responseResponse] = await Promise.all([
        fetch('/api/sfi/operational-state', { cache: 'no-store' }),
        fetch('/api/sfi/respond', { cache: 'no-store' }),
      ]);
      const [stateJson, responseJson] = await Promise.all([stateResponse.json().catch(() => ({})), responseResponse.json().catch(() => ({}))]);
      if (!stateResponse.ok) throw new Error(stateJson.error || `operational_state_${stateResponse.status}`);
      setState(stateJson); setResponseState(responseJson);
    } catch (error) {
      setState(null); setResponseState(null); setMessage(error instanceof Error ? error.message : 'sfi_operational_state_failed');
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function postJson(url: string, body: Row) {
    setMessage(null);
    const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || json.ok === false) throw new Error(json.error || `request_failed_${response.status}`);
    setMessage('Registro persistido.'); await load(); return json;
  }

  async function saveAttractor() {
    if (!attractor.title.trim() || !attractor.desired_future_state.trim()) { setMessage('Título y estado futuro son obligatorios.'); return; }
    const successMarkers = attractor.success_markers.split('\n').map((item) => item.trim()).filter(Boolean);
    try { await postJson('/api/sfi/attractors', { ...attractor, success_markers: successMarkers, active: true }); setAttractor(emptyAttractor); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'attractor_write_failed'); }
  }

  async function declarePerturbation() {
    if (!caseId.trim()) { setMessage('case_id real requerido.'); return; }
    try {
      await postJson('/api/sfi/perturbations', { ...perturbation, case_id: caseId.trim(), object_present: Boolean(perturbation.object_reference.trim()) });
      setPerturbation(emptyPerturbation);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'perturbation_write_failed'); }
  }

  const activeAttractor = state?.attractor?.data ?? null;
  const evidenceMap = rows(state?.evidenceMap?.data);
  const recoveryQueue = rows(state?.recoveryQueue?.data);
  const alignmentQueue = rows(state?.alignmentQueue?.data);
  const cycle = state?.operationalCycle?.data ?? {};
  const stability = state?.stability?.data ?? {};
  const world = state?.worldSpect?.data ?? {};
  const score = state?.scoreFriction?.data ?? {};
  const degraded = useMemo(() => !state ? [] : Object.entries(state).filter(([, value]) => value && typeof value === 'object' && (value as Row).degraded).map(([key, value]) => `${key}: ${scalar((value as Row).error)}`), [state]);

  return (
    <main className="min-h-screen bg-black px-4 py-5 text-white md:px-6">
      <header className="mx-auto mb-5 max-w-[1500px] border border-[#d6b46a]/30 bg-white/[0.02] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="text-[10px] uppercase tracking-[0.3em] text-[#d6b46a]">SYSTEM FRICTION INSTITUTE</p><h1 className="mt-2 text-2xl font-semibold">Operational Observation / Attractor / Return</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-white/50">Sólo estado persistido y conexiones reales. Ausencia de datos permanece ausencia; la interfaz no genera nodos, scores, evidencia ni casos de relleno.</p></div>
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 border border-[#d6b46a]/50 px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-[#e7c875] disabled:opacity-40"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualizar</button>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-4 xl:grid-cols-[1.05fr_1.4fr_1fr]">
        <div className="space-y-4">
          <Panel title="Fuentes reales"><div className="grid gap-2"><SourceState label="Operational cycle" source={state?.operationalCycle} /><SourceState label="WorldSpect" source={state?.worldSpect} /><SourceState label="ScoreFriction" source={state?.scoreFriction} /><SourceState label="Evidence map" source={state?.evidenceMap} /><SourceState label="Closed loop" source={state?.closedLoop} /></div>{degraded.length > 0 && <div className="mt-3 border border-amber-500/30 p-3 text-xs text-amber-100">{degraded.map((item) => <div key={item}>{item}</div>)}</div>}</Panel>
          <Panel title="Mundo / régimen observado"><dl className="space-y-2 text-sm"><div><dt className="text-white/35">Operational regime</dt><dd>{scalar(cycle.operational_regime ?? cycle.regime)}</dd></div><div><dt className="text-white/35">World regime</dt><dd>{scalar(world.regime ?? world.source_state)}</dd></div><div><dt className="text-white/35">Friction state</dt><dd>{scalar(score.analysis_status ?? score.regime)}</dd></div><div><dt className="text-white/35">Stability</dt><dd>{scalar(stability.stability_regime ?? stability.regime ?? stability.stability_index)}</dd></div></dl></Panel>
          <Panel title="Case scope"><Input value={caseId} onChange={(event) => setCaseId(event.target.value)} placeholder="case_id existente" aria-label="case id" /><p className="mt-2 text-xs leading-5 text-white/40">No existe case_id por defecto. Cualquier intervención debe enlazarse a un caso real.</p></Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Atractor activo">{activeAttractor ? <dl className="space-y-3"><div><dt className="text-[10px] uppercase tracking-[0.16em] text-white/35">Nombre</dt><dd className="mt-1 text-lg">{scalar(activeAttractor.title)}</dd></div><div><dt className="text-[10px] uppercase tracking-[0.16em] text-white/35">Estado futuro</dt><dd className="mt-1 text-sm leading-6 text-white/70">{scalar(activeAttractor.desired_future_state)}</dd></div><div><dt className="text-[10px] uppercase tracking-[0.16em] text-white/35">Horizonte</dt><dd className="mt-1 text-sm">{scalar(activeAttractor.horizon)}</dd></div><div><dt className="text-[10px] uppercase tracking-[0.16em] text-white/35">Marcadores de éxito</dt><dd className="mt-1 text-sm text-white/65">{scalar(activeAttractor.success_markers)}</dd></div></dl> : <p className="text-sm text-white/45">No existe atractor activo persistido.</p>}</Panel>
          <Panel title="Declarar atractor"><div className="space-y-2"><Input value={attractor.title} onChange={(e) => setAttractor({ ...attractor, title: e.target.value })} placeholder="Título" /><Area value={attractor.desired_future_state} onChange={(e) => setAttractor({ ...attractor, desired_future_state: e.target.value })} placeholder="Estado futuro deseado" /><Input value={attractor.horizon} onChange={(e) => setAttractor({ ...attractor, horizon: e.target.value })} placeholder="Horizonte temporal" /><Area value={attractor.success_markers} onChange={(e) => setAttractor({ ...attractor, success_markers: e.target.value })} placeholder={'Marcadores observables de éxito\nuno por línea'} /><button type="button" onClick={() => void saveAttractor()} className="inline-flex items-center gap-2 border border-[#d6b46a]/50 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-[#e7c875]"><Target size={14} /> Declarar</button></div></Panel>
          <Panel title="Respuesta operativa">{responseState ? <dl className="space-y-2 text-sm"><div><dt className="text-white/35">Decision</dt><dd>{scalar(responseState.decision)}</dd></div><div><dt className="text-white/35">Reason</dt><dd>{scalar(responseState.reason)}</dd></div><div><dt className="text-white/35">Blocking condition</dt><dd>{scalar(responseState.blocking_condition)}</dd></div><div><dt className="text-white/35">Next action</dt><dd>{scalar(responseState.next_action)}</dd></div><div><dt className="text-white/35">Confidence</dt><dd>{responseState.confidence === null ? 'no calibrada' : scalar(responseState.confidence)}</dd></div></dl> : <p className="text-sm text-white/45">Sin respuesta operativa.</p>}</Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Evidencia">{evidenceMap.length ? <ul className="max-h-80 space-y-2 overflow-auto">{evidenceMap.map((item, index) => <li key={String(item.id ?? index)} className="border border-white/10 p-3 text-xs"><div className="text-white/80">{scalar(item.source_label ?? item.summary ?? item.id)}</div><div className="mt-1 text-white/40">{scalar(item.source_table ?? item.domain)}</div></li>)}</ul> : <p className="text-sm text-white/45">No hay evidencia disponible en el mapa de evidencia.</p>}</Panel>
          <Panel title="Colas"><div className="grid gap-3 sm:grid-cols-2"><div><div className="text-[10px] uppercase tracking-[0.16em] text-white/35">Alignment</div><div className="mt-1 text-2xl">{alignmentQueue.length}</div></div><div><div className="text-[10px] uppercase tracking-[0.16em] text-white/35">Recovery / execution</div><div className="mt-1 text-2xl">{recoveryQueue.length}</div></div></div></Panel>
          <Panel title="Declarar intervención candidata"><div className="space-y-2"><Input value={perturbation.title} onChange={(e) => setPerturbation({ ...perturbation, title: e.target.value })} placeholder="Acción mínima" /><Area value={perturbation.intention} onChange={(e) => setPerturbation({ ...perturbation, intention: e.target.value })} placeholder="Intención" /><Input value={perturbation.target_vector} onChange={(e) => setPerturbation({ ...perturbation, target_vector: e.target.value })} placeholder="Vector / dominio objetivo" /><Input value={perturbation.target_node} onChange={(e) => setPerturbation({ ...perturbation, target_node: e.target.value })} placeholder="Nodo objetivo, si aplica" /><Area value={perturbation.desired_future_state} onChange={(e) => setPerturbation({ ...perturbation, desired_future_state: e.target.value })} placeholder="Cambio esperado" /><Input value={perturbation.time_window} onChange={(e) => setPerturbation({ ...perturbation, time_window: e.target.value })} placeholder="Ventana de verificación" /><Area value={perturbation.evidence_expected} onChange={(e) => setPerturbation({ ...perturbation, evidence_expected: e.target.value })} placeholder="Evidencia que confirmaría o desafiaría el cambio" /><Input value={perturbation.risk_tolerance} onChange={(e) => setPerturbation({ ...perturbation, risk_tolerance: e.target.value })} placeholder="Tolerancia de riesgo declarada" /><Input value={perturbation.object_reference} onChange={(e) => setPerturbation({ ...perturbation, object_reference: e.target.value })} placeholder="Referencia del objeto, si existe" /><button type="button" onClick={() => void declarePerturbation()} className="inline-flex items-center gap-2 border border-[#d6b46a]/50 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-[#e7c875]"><Send size={14} /> Registrar propuesta</button></div></Panel>
        </div>
      </div>

      <div className="mx-auto max-w-[1500px]">{message && <div className="mt-4 border border-[#d6b46a]/30 bg-[#d6b46a]/10 p-3 text-sm text-[#efd184]">{message}</div>}{caseId.trim() ? <ExecutionStatePanel caseId={caseId} /> : null}</div>
    </main>
  );
}
