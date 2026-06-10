'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AmvChat } from '@/components/amv/AmvChat';
import type { AmvScopeState } from '@/lib/amv/core/amvScopeStateTypes';

type Row = Record<string, unknown>;

type ApiResult = {
  ok?: boolean;
  error?: string;
  details?: string;
  data?: Row;
  canEvaluate?: boolean;
  canRecord?: boolean;
  canPropose?: boolean;
  evidenceLevel?: string;
  missing?: string[];
  warnings?: string[];
  route?: string;
  normalizedPreview?: Row;
};

type RuntimeLayer = {
  proto: Row[];
  longitudinal: Row[];
  hypotheses: Row[];
  proposals: Row[];
  verifications: Row[];
  worldspect: Row | null;
  worldspectStatus: string;
  messages: Record<string, string>;
};

const EMPTY_RUNTIME: RuntimeLayer = {
  proto: [],
  longitudinal: [],
  hypotheses: [],
  proposals: [],
  verifications: [],
  worldspect: null,
  worldspectStatus: 'worldspect_unavailable',
  messages: {},
};

const START_PAYLOAD = {
  case_id: 'CW-011',
  source_name: 'youtube_public_v1',
  source_url: 'https://www.youtube.com/watch?v=x0BBl-odCE8',
  territory: 'MX',
  analysis_mode: 'url_observation',
  focus_variables: ['cultural', 'densidad_emocional', 'plataforma'],
  observation_goal: 'observar friccion cultural, recepcion publica, protoatractor y persistencia posible',
  raw_payload: { source_url: 'https://www.youtube.com/watch?v=x0BBl-odCE8' },
};

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function n(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function s(value: unknown, fallback = '—') {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function contextOf(state: AmvScopeState) {
  return record(state.selectedContext);
}

function latestMihm(state: AmvScopeState, result: ApiResult | null) {
  const resultVectors = record(record(result?.data).vectors);
  const fromResult = record(resultVectors.mihm_cultural_vector);
  if (Object.keys(fromResult).length) return fromResult;
  return record(record(contextOf(state).latest_vectors).mihm_cultural_vector);
}

function phiState(state: AmvScopeState, result: ApiResult | null) {
  const mihm = latestMihm(state, result);
  const ihg = n(mihm.IHG_C, state.state === 'live' ? 0.45 : 0.25);
  const nti = n(mihm.NTI_C, 0.18);
  const pac = n(mihm.PAC, 0);
  const lcp = n(mihm.LCP, 0);
  const fs = n(mihm.FS_C, state.evidenceSummary.sourceCoverage || 0.25);
  const scr = n(mihm.SCR, 0.35);
  const ldi = Math.max(0.1, 1 - lcp + Math.max(0, 0.45 - pac));
  const xi = Math.min(0.2, Math.max(0.02, fs * 0.12 + scr * 0.04));
  const phi = Math.min(1, (ihg * Math.max(nti, 0.05)) / (1 + ldi) + xi);
  const regime = phi > 0.58 && ldi < 0.7 ? 'HOMEOSTATICO' : ldi > 1.15 ? 'ENTROPICO' : 'CRITICO';
  return { ihg, nti, pac, lcp, fs, scr, ldi, xi, phi, regime };
}

function FieldDelta({ before, after }: { before: number; after: number }) {
  const delta = after - before;
  const sign = delta >= 0 ? '+' : '';
  return <span className={delta >= 0 ? 'text-[#3a8a5a]' : 'text-[#b85050]'}>{sign}{delta.toFixed(3)}</span>;
}

function Panel({ title, topo, width, children }: { title: string; topo: string; width: string; children: ReactNode }) {
  if (title.startsWith('AGENTE')) return null;
  return (
    <section className={`relative h-full shrink-0 overflow-hidden border-r border-[#c8a95112] bg-[#060605] p-4 ${width}`}>
      <div className="pointer-events-none absolute left-4 top-3 z-10 font-mono text-[9px] uppercase tracking-[0.28em] text-[#c8a95155]">{title}</div>
      <div className="pointer-events-none absolute right-4 top-3 z-10 font-mono text-[8px] uppercase tracking-[0.2em] text-[#4a4a45]">{topo}</div>
      {children}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#c8a95118] bg-[#0a0a09] px-3 py-2">
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#4a4a45]">{label}</div>
      <div className="mt-1 font-mono text-sm text-[#d8c27a]">{value}</div>
    </div>
  );
}

function CompactRow({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="mb-2 border border-[#c8a95112] bg-[#080706] p-3 font-mono">
      <div className="text-[10px] text-[#ead8aa]">{title}</div>
      <div className="mt-1 text-[9px] uppercase tracking-[0.12em] text-[#6f6658]">{meta}</div>
    </div>
  );
}

function Trace({ result }: { result: ApiResult | null }) {
  const data = record(result?.data);
  const normalized = record(data.normalized ?? result?.normalizedPreview);
  const vectors = record(data.vectors);
  const mihm = record(vectors.mihm_cultural_vector);
  const steps = [
    ['INPUT', result ? 'recibido' : 'pendiente'],
    ['NORMALIZE', Object.keys(normalized).length ? 'activo' : 'pendiente'],
    ['SOURCE', s(normalized.sourceName, 'sin fuente')],
    ['COVERAGE', result?.evidenceLevel ?? 'sin preflight'],
    ['MIHM', Object.keys(mihm).length ? 'vectorizado' : 'pendiente'],
    ['ROUTE', result?.route ?? 'sin ruta'],
  ];
  return (
    <div className="mt-10 space-y-2 font-mono text-[10px]">
      {steps.map(([label, value], index) => (
        <div key={label} className="grid grid-cols-[80px_18px_1fr] items-center gap-2 border-b border-[#c8a95108] py-1">
          <span className="text-[#c8a95199]">{label}</span>
          <span className="text-[#4a4a45]">{index < steps.length - 1 ? '↓' : '·'}</span>
          <span className="text-[#b8ad98]">{value}</span>
        </div>
      ))}
    </div>
  );
}

export function ScoreFrictionUnifiedObservatoryV2({ initialState }: { initialState: AmvScopeState }) {
  const [state, setState] = useState(initialState);
  const [payload, setPayload] = useState(JSON.stringify(START_PAYLOAD, null, 2));
  const [result, setResult] = useState<ApiResult | null>(null);
  const [previousPhi, setPreviousPhi] = useState(() => phiState(initialState, null).phi);
  const [log, setLog] = useState<string[]>(['INIT · ScoreFriction unificado']);
  const [chat, setChat] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [runtime, setRuntime] = useState<RuntimeLayer>(EMPTY_RUNTIME);

  const phi = useMemo(() => phiState(state, result), [state, result]);
  const context = contextOf(state);
  const tables = record(context.tables);
  const latest = state.latestReading;
  const data = record(result?.data);
  const normalized = record(data.normalized ?? result?.normalizedPreview);
  const vectors = record(data.vectors);
  const mihm = record(vectors.mihm_cultural_vector);
  const currentCaseId = s(normalized.caseId ?? normalized.case_id ?? context.case_id ?? START_PAYLOAD.case_id, 'CW-011');

  function push(entry: string) {
    const stamp = new Date().toISOString().split('T')[1]?.slice(0, 8) ?? '00:00:00';
    setLog((items) => [...items.slice(-14), `${stamp} · ${entry}`]);
  }

  function parsePayload() {
    try { return JSON.parse(payload) as Row; }
    catch { throw new Error('JSON invalido'); }
  }

  async function refresh() {
    const response = await fetch('/api/amv/state?scope=scorefriction', { cache: 'no-store' });
    const json = await response.json() as AmvScopeState;
    if (json.ok) setState(json);
    return json;
  }

  async function readLayer(path: string) {
    const response = await fetch(`${path}${path.includes('?') ? '&' : '?'}case_id=${encodeURIComponent(currentCaseId)}`, { cache: 'no-store' });
    return response.json() as Promise<{ ok?: boolean; data?: unknown; status?: string; message?: string; error?: string }>;
  }

  async function refreshRuntime() {
    try {
      const [proto, longitudinal, hypotheses, proposals, verifications, worldspect] = await Promise.all([
        readLayer('/api/scorefriction/proto-attractors'),
        readLayer('/api/scorefriction/longitudinal'),
        readLayer('/api/scorefriction/cultural-twin'),
        readLayer('/api/scorefriction/proposals'),
        readLayer('/api/scorefriction/verifications'),
        readLayer('/api/scorefriction/worldspect'),
      ]);
      setRuntime({
        proto: Array.isArray(proto.data) ? proto.data as Row[] : [],
        longitudinal: Array.isArray(longitudinal.data) ? longitudinal.data as Row[] : [],
        hypotheses: Array.isArray(hypotheses.data) ? hypotheses.data as Row[] : [],
        proposals: Array.isArray(proposals.data) ? proposals.data as Row[] : [],
        verifications: Array.isArray(verifications.data) ? verifications.data as Row[] : [],
        worldspect: worldspect.data ? record(worldspect.data) : null,
        worldspectStatus: worldspect.status ?? 'worldspect_unavailable',
        messages: {
          proto: proto.message ?? proto.error ?? 'sin protoatractores detectados',
          longitudinal: longitudinal.message ?? longitudinal.error ?? 'sin trayectoria longitudinal',
          hypotheses: hypotheses.message ?? hypotheses.error ?? 'sin hipotesis culturales',
          proposals: proposals.message ?? proposals.error ?? 'sin propuestas scorefriction',
          verifications: verifications.message ?? verifications.error ?? 'sin verificaciones scorefriction',
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'runtime scorefriction no disponible';
      setRuntime({ ...EMPTY_RUNTIME, messages: { proto: message, longitudinal: message, hypotheses: message, proposals: message, verifications: message } });
    }
  }

  async function triggerLayer(kind: 'proto' | 'hypotheses' | 'proposals') {
    setBusy(kind);
    const endpoint = kind === 'proto'
      ? '/api/scorefriction/proto-attractors/detect'
      : kind === 'hypotheses'
        ? '/api/scorefriction/cultural-twin/hypotheses/generate'
        : '/api/scorefriction/proposals/generate';
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ case_id: currentCaseId }) });
      const json = await response.json() as { ok?: boolean; error?: string; message?: string };
      push(`${kind.toUpperCase()} Â· ${json.ok === false ? json.error ?? 'fallo' : json.message ?? 'ok'}`);
      await refreshRuntime();
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => {
    void refreshRuntime();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCaseId]);

  async function run(mode: 'preflight' | 'evaluate' | 'record') {
    setBusy(mode);
    setPreviousPhi(phi.phi);
    try {
      const endpoint = mode === 'record' ? '/api/scorefriction/observe' : mode === 'evaluate' ? '/api/scorefriction/evaluate' : '/api/scorefriction/preflight';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(parsePayload()),
      });
      const json = await response.json() as ApiResult;
      setResult(json);
      push(`${mode.toUpperCase()} · ${json.ok === false ? json.error ?? 'fallo' : json.route ?? 'ejecutado'}`);
      if (mode === 'record' && json.ok !== false) {
        await refresh();
        await refreshRuntime();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'operacion fallida';
      setResult({ ok: false, error: message });
      push(`ERROR · ${message}`);
    } finally {
      setBusy(null);
    }
  }

  async function sendChat() {
    const text = chat.trim();
    if (!text) return;
    setChat('');
    push(`CHAT_IN · ${text}`);
    const lower = text.toLowerCase();
    if (lower.includes('preflight') || lower.includes('valid')) return run('preflight');
    if (lower.includes('evalua') || lower.includes('evaluar')) return run('evaluate');
    if (lower.includes('guarda') || lower.includes('registr')) return run('record');
    push(`AMV_OUT · estado=${state.state}; cobertura=${state.evidenceSummary.sourceCoverage.toFixed(2)}; ruta=${result?.route ?? 'sin ruta'}`);
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#060605] text-[#c8c4b8]">
      <header className="fixed left-0 right-0 top-0 z-30 flex h-[30px] items-center gap-4 border-b border-[#c8a95112] bg-[#060605]/95 pl-12 pr-3 font-mono">
        <div className="text-[10px] font-bold uppercase tracking-[0.35em] text-[#c8a951]">SFI</div>
        <div className="h-4 w-px bg-[#c8a95122]" />
        <div className="text-[9px] uppercase tracking-[0.18em] text-[#4a4a45]">ScoreFriction <span className="text-[#c8a95199]">Observatorio Operacional</span></div>
        <div className="h-4 w-px bg-[#c8a95122]" />
        <div className="text-[10px] text-[#c8a95199]">Φ_SF <span className="text-[#ead8aa]">{phi.phi.toFixed(3)}</span></div>
        <div className={phi.regime === 'ENTROPICO' ? 'text-[9px] text-[#b85050]' : phi.regime === 'HOMEOSTATICO' ? 'text-[9px] text-[#3a8a5a]' : 'text-[9px] text-[#c8a951]'}>{phi.regime}</div>
        <div className="ml-auto text-[9px] text-[#4a4a45]">{state.state} · {latest?.label ?? 'sin lectura'} · {new Date().toISOString().slice(11, 19)}</div>
      </header>

      <aside className="fixed bottom-0 left-0 top-[30px] z-20 flex w-10 flex-col items-center gap-3 border-r border-[#c8a95112] bg-[#060605]/95 py-3">
        {['I', 'II', 'III'].map((item) => <div key={item} className="[writing-mode:vertical-rl] font-mono text-[8px] tracking-[0.22em] text-[#4a4a45]">TOPO {item}</div>)}
      </aside>

      <main className="fixed bottom-0 left-10 right-0 top-[30px] flex flex-col overflow-hidden">
        <div className="flex h-[38%] overflow-x-auto border-b border-[#c8a95112] [scrollbar-width:none]">
          <Panel title="Φ_SF · REGIMEN" topo="TOPO-II" width="w-[260px]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(200,169,81,0.12),transparent_55%)]" />
            <div className="relative flex h-full flex-col items-center justify-center text-center">
              <div className="font-mono text-5xl font-bold tracking-tighter text-[#c8a951]">{phi.phi.toFixed(3)}</div>
              <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.25em] text-[#4a4a45]">IHG·NTI / (1+LDI) + ξ</div>
              <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.25em] text-[#ead8aa]">{phi.regime}</div>
              <div className="mt-5 grid grid-cols-2 gap-2"><Metric label="IHG" value={phi.ihg.toFixed(2)} /><Metric label="NTI" value={phi.nti.toFixed(2)} /><Metric label="LDI" value={phi.ldi.toFixed(2)} /><Metric label="ξ" value={phi.xi.toFixed(2)} /></div>
            </div>
          </Panel>

          <Panel title="CAMPO DE FRICCION" topo="TOPO-II" width="w-[380px]">
            <div className="absolute inset-0 opacity-60" style={{ backgroundImage: 'linear-gradient(rgba(200,169,81,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(200,169,81,.05) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
            <div className="relative mt-12 grid grid-cols-2 gap-3"><Metric label="FS_C" value={phi.fs.toFixed(3)} /><Metric label="SCR" value={phi.scr.toFixed(3)} /><Metric label="PAC" value={phi.pac.toFixed(3)} /><Metric label="LCP" value={phi.lcp.toFixed(3)} /></div>
            <div className="absolute bottom-4 left-4 right-4 h-1 bg-[#15110b]"><div className="h-full bg-[#c8a95199]" style={{ width: `${Math.round(phi.fs * 100)}%` }} /></div>
          </Panel>

          <Panel title="FIELD RESPONSE" topo="TOPO-II" width="w-[330px]">
            <div className="mt-12 grid gap-3 font-mono text-[10px] text-[#b8ad98]"><Metric label="Φ antes" value={previousPhi.toFixed(3)} /><Metric label="Φ ahora" value={phi.phi.toFixed(3)} /><div className="border border-[#c8a95118] bg-[#0a0a09] px-3 py-2"><span className="text-[#4a4a45]">Δ Φ </span><FieldDelta before={previousPhi} after={phi.phi} /></div></div>
          </Panel>

          <Panel title="WORLD SPECTRUM" topo="TOPO-III" width="w-[320px]">
            <div className="mt-12 font-mono text-[10px] leading-5 text-[#9c9282]">
              {runtime.worldspect ? (
                <div className="border border-[#c8a95112] bg-[#080706] p-3">
                  <div className="text-[#ead8aa]">{runtime.worldspectStatus}</div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Metric label="WSI" value={n(runtime.worldspect.wsi).toFixed(2)} />
                    <Metric label="NTI" value={n(runtime.worldspect.nti).toFixed(2)} />
                  </div>
                  <div className="mt-2 text-[9px] text-[#4a4a45]">{s(runtime.worldspect.observed_at, 'sin timestamp')}</div>
                </div>
              ) : (
                <div className="border border-[#c8a95112] bg-[#080706] p-3 text-[#6f6658]">worldspect_unavailable</div>
              )}
            </div>
          </Panel>
        </div>

        <div className="flex h-[33%] overflow-x-auto border-b border-[#c8a95112] [scrollbar-width:none]">
          <Panel title="CARGA OBSERVACIONAL" topo="TOPO-I" width="w-[520px]">
            <textarea value={payload} onChange={(event) => setPayload(event.target.value)} className="mt-8 h-[calc(100%-76px)] w-full resize-none border border-[#c8a95118] bg-[#080706] p-3 font-mono text-[10px] leading-5 text-[#d8d0bd] outline-none" />
            <div className="absolute bottom-3 left-4 right-4 flex gap-2"><button onClick={() => void run('preflight')} disabled={Boolean(busy)} className="border border-[#c8a95133] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[#c8a951]">Preflight</button><button onClick={() => void run('evaluate')} disabled={Boolean(busy)} className="border border-[#c8a95133] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[#c8a951]">Evaluar</button><button onClick={() => void run('record')} disabled={Boolean(busy)} className="border border-[#c8a95166] bg-[#17130d] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[#ead8aa]">Registrar</button></div>
          </Panel>

          <Panel title="AMV TRACE" topo="TOPO-II" width="w-[380px]"><Trace result={result} /></Panel>

          <Panel title="RESPUESTA CRUDA" topo="TOPO-II" width="w-[460px]">
            <pre className="mt-8 h-[calc(100%-36px)] overflow-auto whitespace-pre-wrap border border-[#c8a95112] bg-[#080706] p-3 font-mono text-[9px] leading-4 text-[#a79d8c]">{JSON.stringify({ ok: result?.ok, error: result?.error, evidenceLevel: result?.evidenceLevel, route: result?.route, missing: result?.missing, warnings: result?.warnings, normalized, mihm }, null, 2)}</pre>
          </Panel>
        </div>

        <div className="flex h-[29%] overflow-x-auto [scrollbar-width:none]">
          <Panel title="CRONOLOGIA VIVA" topo="TOPO-III" width="w-[420px]">
            <div className="mt-14 flex items-end gap-3">{runtime.longitudinal.length ? runtime.longitudinal.slice(-9).map((item) => <div key={s(item.id)} className="flex h-24 w-8 items-end border-b border-[#c8a95122]"><div className="w-full bg-[#c8a95133]" style={{ height: `${Math.max(8, Math.round(n(item.density) * 100))}%` }} /></div>) : <div className="font-mono text-[10px] text-[#6f6658]">{runtime.messages.longitudinal ?? 'sin trayectoria longitudinal'}</div>}</div>
            <div className="mt-3 font-mono text-[9px] uppercase tracking-[0.2em] text-[#4a4a45]">Obs {Number(tables.observations ?? 0)} · Vec {Number(tables.vectors ?? 0)} · Ver {Number(tables.verifications ?? 0)} · Events {Number(tables.events ?? 0)}</div>
          </Panel>

          <Panel title="PROTOATRACTORES" topo="TOPO-III" width="w-[420px]">
            <div className="mt-9 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.18em] text-[#4a4a45]">
              <span>Caso <span className="text-[#c8a95199]">{currentCaseId}</span></span>
              <button onClick={() => void triggerLayer('proto')} disabled={Boolean(busy)} className="border border-[#c8a95133] px-3 py-2 text-[#c8a951]">Detectar</button>
            </div>
            <div className="mt-3 max-h-[150px] overflow-auto">
              {runtime.proto.length ? runtime.proto.map((item) => (
                <CompactRow key={s(item.id, s(item.name))} title={s(item.name, 'protoatractor')} meta={`${s(item.status, 'latent')} / C ${n(item.confidence).toFixed(2)} / D ${n(item.density).toFixed(2)} / P ${n(item.persistence).toFixed(2)} / Ev ${n(item.evidence_count)}`} />
              )) : <CompactRow title={runtime.messages.proto ?? 'sin protoatractores detectados'} meta="endpoint real / sin filas persistidas" />}
            </div>
          </Panel>

          <Panel title="COGNITIVE TWIN CULTURAL" topo="TOPO-III" width="w-[430px]">
            <div className="mt-9 flex justify-end"><button onClick={() => void triggerLayer('hypotheses')} disabled={Boolean(busy)} className="border border-[#c8a95133] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[#c8a951]">Generar</button></div>
            <div className="mt-3 max-h-[150px] overflow-auto">
              {runtime.hypotheses.length ? runtime.hypotheses.map((item) => (
                <CompactRow key={s(item.id, s(item.title))} title={s(item.title, 'hipotesis cultural')} meta={`${s(item.status, 'open')} / C ${n(item.confidence).toFixed(2)} / ventana ${n(item.verification_window_days, 21)}d / ${s(item.result, 'sin resultado')}`} />
              )) : <CompactRow title={runtime.messages.hypotheses ?? 'sin hipotesis culturales'} meta="requiere protoatractor con evidencia suficiente" />}
            </div>
          </Panel>

          <Panel title="PROPUESTAS" topo="TOPO-III" width="w-[420px]">
            <div className="mt-9 flex justify-end"><button onClick={() => void triggerLayer('proposals')} disabled={Boolean(busy)} className="border border-[#c8a95133] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[#c8a951]">Generar</button></div>
            <div className="mt-3 max-h-[150px] overflow-auto">
              {runtime.proposals.length ? runtime.proposals.map((item) => {
                const delta = record(item.expected_field_delta);
                return <CompactRow key={s(item.id, s(item.title))} title={s(item.title, 'propuesta')} meta={`${s(item.status, 'draft')} / riesgo ${s(item.risk_level, 'low')} / ${s(delta.impacto_esperado, s(item.objective, 'sin impacto esperado'))}`} />;
              }) : <CompactRow title={runtime.messages.proposals ?? 'sin propuestas scorefriction'} meta="requiere hipotesis cultural activa" />}
            </div>
          </Panel>

          <Panel title="VERIFICACION" topo="TOPO-III" width="w-[400px]">
            <div className="mt-9 max-h-[170px] overflow-auto">
              {runtime.verifications.length ? runtime.verifications.map((item) => (
                <CompactRow key={s(item.id)} title={s(item.actual_result, 'verificacion registrada')} meta={`${item.verified ? 'verified' : 'refuted'} / delta ${n(item.delta).toFixed(2)} / C ${n(item.confidence).toFixed(2)}`} />
              )) : <CompactRow title={runtime.messages.verifications ?? 'sin verificaciones scorefriction'} meta="POST /api/scorefriction/verifications/record" />}
            </div>
          </Panel>

          <Panel title="BITACORA OPERACIONAL" topo="TOPO-III" width="w-[380px]"><div className="mt-9 max-h-[160px] overflow-auto font-mono text-[10px] leading-5 text-[#9c9282]">{log.map((item, idx) => <div key={`${item}-${idx}`} className="border-b border-[#c8a95108] py-1">{item}</div>)}</div></Panel>

          <Panel title="AMV SCORE" topo="TOPO-I" width="w-[460px]">
            <div className="mt-8">
              <AmvChat
                module="scorefriction"
                sessionId={`scorefriction-${currentCaseId}`}
                title="AMV ScoreFriction"
                context={{
                  caseId: currentCaseId,
                  state: state.state,
                  evidenceSummary: state.evidenceSummary,
                  latestReading: latest,
                  result,
                  runtimeStatus: runtime.messages,
                }}
                compact
              />
            </div>
          </Panel>

          <Panel title="AGENTE · CARGA" topo="TOPO-I" width="w-[420px]">
            <div className="mt-9 font-mono text-[10px] leading-5 text-[#8a8172]">Pregunta “preflight”, “evalua” o “registra” para ejecutar sobre la carga actual.</div>
            <div className="absolute bottom-0 left-0 right-0 flex border-t border-[#c8a95112]"><input value={chat} onChange={(event) => setChat(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void sendChat(); }} placeholder="Observacion estructural..." className="flex-1 bg-transparent px-3 py-3 font-mono text-[11px] text-[#d8d0bd] outline-none" /><button onClick={() => void sendChat()} className="border-l border-[#c8a95112] px-4 font-mono text-[10px] uppercase tracking-[0.2em] text-[#c8a951]">→</button></div>
          </Panel>
        </div>
      </main>
    </div>
  );
}
