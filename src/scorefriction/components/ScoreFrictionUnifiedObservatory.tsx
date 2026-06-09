'use client';

import { useMemo, useState } from 'react';
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

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stringValue(value: unknown, fallback = '—') {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function selectedContext(state: AmvScopeState) {
  return record(state.selectedContext);
}

function latestMihm(state: AmvScopeState) {
  const context = selectedContext(state);
  const latestVectors = record(context.latest_vectors);
  return record(latestVectors.mihm_cultural_vector);
}

function phiFromState(state: AmvScopeState, lastResult: ApiResult | null) {
  const mihm = record(record(lastResult?.data).vectors ? record(record(record(lastResult?.data).vectors).mihm_cultural_vector) : latestMihm(state));
  const ihg = numberValue(mihm.IHG_C, state.state === 'live' ? 0.45 : 0.25);
  const nti = numberValue(mihm.NTI_C, 0.18);
  const lcp = numberValue(mihm.LCP, 0);
  const pac = numberValue(mihm.PAC, 0);
  const fs = numberValue(mihm.FS_C, state.evidenceSummary.sourceCoverage || 0.25);
  const scr = numberValue(mihm.SCR, 0.35);
  const ldi = Math.max(0.1, 1 - lcp + Math.max(0, 0.45 - pac));
  const xi = Math.min(0.2, Math.max(0.02, fs * 0.12 + scr * 0.04));
  const phi = Math.min(1, (ihg * Math.max(nti, 0.05)) / (1 + ldi) + xi);
  const regime = phi > 0.58 && ldi < 0.7 ? 'HOMEOSTATICO' : ldi > 1.15 ? 'ENTROPICO' : 'CRITICO';
  return { ihg, nti, ldi, xi, phi, regime, pac, lcp, fs, scr };
}

const samplePayload = {
  case_id: 'CW-011',
  source_name: 'youtube_public_v1',
  source_url: 'https://www.youtube.com/watch?v=x0BBl-odCE8',
  territory: 'MX',
  analysis_mode: 'url_observation',
  focus_variables: ['cultural', 'densidad_emocional', 'plataforma'],
  observation_goal: 'observar friccion cultural, recepcion publica, protoatractor y persistencia posible',
  raw_payload: {
    source_url: 'https://www.youtube.com/watch?v=x0BBl-odCE8',
  },
};

function Panel({ title, topo, className = '', children }: { title: string; topo: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={`relative min-h-[210px] shrink-0 overflow-hidden border-r border-[#c8a95112] bg-[#060605] p-4 ${className}`}>
      <div className="pointer-events-none absolute left-4 top-3 z-10 font-mono text-[9px] uppercase tracking-[0.28em] text-[#c8a95155]">{title}</div>
      <div className="pointer-events-none absolute right-4 top-3 z-10 font-mono text-[8px] uppercase tracking-[0.2em] text-[#4a4a45]">{topo}</div>
      {children}
    </section>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#c8a95118] bg-[#0a0a09] px-3 py-2">
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#4a4a45]">{label}</div>
      <div className="mt-1 font-mono text-sm text-[#d8c27a]">{value}</div>
    </div>
  );
}

export function ScoreFrictionUnifiedObservatory({ initialState }: { initialState: AmvScopeState }) {
  const [state, setState] = useState(initialState);
  const [payload, setPayload] = useState(JSON.stringify(samplePayload, null, 2));
  const [result, setResult] = useState<ApiResult | null>(null);
  const [log, setLog] = useState<string[]>(['INIT · observatorio scorefriction unificado']);
  const [busy, setBusy] = useState<string | null>(null);
  const [chat, setChat] = useState('');

  const phi = useMemo(() => phiFromState(state, result), [state, result]);
  const context = selectedContext(state);
  const tables = record(context.tables);
  const latest = state.latestReading;

  function push(entry: string) {
    const stamp = new Date().toISOString().split('T')[1]?.slice(0, 8) ?? '00:00:00';
    setLog((items) => [...items.slice(-14), `${stamp} · ${entry}`]);
  }

  async function refresh() {
    const response = await fetch('/api/amv/state?scope=scorefriction', { cache: 'no-store' });
    const json = await response.json() as AmvScopeState;
    if (json.ok) setState(json);
    return json;
  }

  function parsePayload() {
    try {
      return JSON.parse(payload) as Row;
    } catch {
      throw new Error('JSON invalido. Corrige la carga antes de ejecutar.');
    }
  }

  async function run(mode: 'preflight' | 'evaluate' | 'record') {
    setBusy(mode);
    setResult(null);
    try {
      const body = parsePayload();
      const endpoint = mode === 'record' ? '/api/scorefriction/observe' : mode === 'evaluate' ? '/api/scorefriction/evaluate' : '/api/scorefriction/preflight';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await response.json() as ApiResult;
      setResult(json);
      push(`${mode.toUpperCase()} · ${json.ok === false ? json.error ?? 'fallo' : json.route ?? 'ejecutado'}`);
      if (mode === 'record' && json.ok !== false) await refresh();
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
    if (lower.includes('evalua') || lower.includes('evaluar')) {
      await run('evaluate');
      return;
    }
    if (lower.includes('guarda') || lower.includes('registr')) {
      await run('record');
      return;
    }
    if (lower.includes('preflight') || lower.includes('valid')) {
      await run('preflight');
      return;
    }
    const warnings = result?.warnings?.length ? result.warnings.join(', ') : 'sin advertencias nuevas';
    push(`AMV_OUT · estado=${state.state}; cobertura=${state.evidenceSummary.sourceCoverage.toFixed(2)}; ${warnings}`);
  }

  const resultData = record(result?.data);
  const normalized = record(resultData.normalized ?? result?.normalizedPreview);
  const vectors = record(resultData.vectors);
  const mihm = record(vectors.mihm_cultural_vector);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#060605] text-[#c8c4b8]">
      <header className="fixed left-0 right-0 top-0 z-30 flex h-[30px] items-center gap-4 border-b border-[#c8a95112] bg-[#060605]/95 pl-12 pr-3 font-mono">
        <div className="font-sans text-[10px] font-bold uppercase tracking-[0.35em] text-[#c8a951]">SFI</div>
        <div className="h-4 w-px bg-[#c8a95122]" />
        <div className="text-[9px] uppercase tracking-[0.18em] text-[#4a4a45]">ScoreFriction <span className="text-[#c8a95199]">Observatorio Operacional</span></div>
        <div className="h-4 w-px bg-[#c8a95122]" />
        <div className="text-[10px] text-[#c8a95199]">Φ_SF <span className="text-[#ead8aa]">{phi.phi.toFixed(3)}</span></div>
        <div className={phi.regime === 'ENTROPICO' ? 'text-[9px] text-[#b85050]' : phi.regime === 'HOMEOSTATICO' ? 'text-[9px] text-[#3a8a5a]' : 'text-[9px] text-[#c8a951]'}>{phi.regime}</div>
        <div className="ml-auto text-[9px] text-[#4a4a45]">{state.state} · {latest?.label ?? 'sin lectura'} · {new Date().toISOString().slice(11, 19)}</div>
      </header>

      <aside className="fixed bottom-0 left-0 top-[30px] z-20 flex w-10 flex-col items-center gap-2 border-r border-[#c8a95112] bg-[#060605]/95 py-3">
        {['I', 'II', 'III'].map((x) => <div key={x} className="my-1 [writing-mode:vertical-rl] font-mono text-[8px] tracking-[0.22em] text-[#4a4a45]">TOPO {x}</div>)}
      </aside>

      <main className="fixed bottom-0 left-10 right-0 top-[30px] flex flex-col overflow-hidden">
        <div className="flex h-[38%] overflow-x-auto border-b border-[#c8a95112] [scrollbar-width:none]">
          <Panel title="Φ_SF · REGIMEN" topo="TOPO-II" className="w-[260px]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(200,169,81,0.12),transparent_55%)]" />
            <div className="relative flex h-full flex-col items-center justify-center text-center">
              <div className="font-mono text-5xl font-bold tracking-tighter text-[#c8a951]">{phi.phi.toFixed(3)}</div>
              <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.25em] text-[#4a4a45]">IHG·NTI / (1+LDI) + ξ</div>
              <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.25em] text-[#ead8aa]">{phi.regime}</div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <MiniMetric label="IHG" value={phi.ihg.toFixed(2)} />
                <MiniMetric label="NTI" value={phi.nti.toFixed(2)} />
                <MiniMetric label="LDI" value={phi.ldi.toFixed(2)} />
                <MiniMetric label="ξ" value={phi.xi.toFixed(2)} />
              </div>
            </div>
          </Panel>

          <Panel title="CAMPO DE FRICCION" topo="TOPO-II" className="w-[380px]">
            <div className="absolute inset-0 opacity-60" style={{ backgroundImage: 'linear-gradient(rgba(200,169,81,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(200,169,81,.05) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
            <div className="relative mt-12 grid grid-cols-2 gap-3">
              <MiniMetric label="FS_C" value={phi.fs.toFixed(3)} />
              <MiniMetric label="SCR" value={phi.scr.toFixed(3)} />
              <MiniMetric label="PAC" value={phi.pac.toFixed(3)} />
              <MiniMetric label="LCP" value={phi.lcp.toFixed(3)} />
            </div>
            <div className="absolute bottom-4 left-4 right-4 h-1 bg-[#15110b]"><div className="h-full bg-[#c8a95199]" style={{ width: `${Math.round(phi.fs * 100)}%` }} /></div>
          </Panel>

          <Panel title="COGNITIVE TWIN" topo="TOPO-I" className="w-[340px]">
            <div className="mt-12 rounded-full border border-[#c8a95122] p-8 text-center">
              <div className="mx-auto h-24 w-24 rounded-full border border-[#c8a95144] bg-[#c8a95108] shadow-[0_0_40px_rgba(200,169,81,.12)]" />
              <p className="mt-4 font-mono text-[10px] leading-5 text-[#8a8172]">El twin cambia cuando ejecutas preflight, evaluacion, registro o chat. La respuesta AMV queda visible en bitacora.</p>
            </div>
          </Panel>

          <Panel title="WORLD SPECTRUM" topo="TOPO-III" className="w-[320px]">
            <div className="mt-12 grid gap-2">
              {['memeticSat', 'colAnxiety', 'econPress', 'infoVel'].map((label, idx) => <div key={label} className="h-5 border border-[#c8a95112] bg-[#0a0a09]"><div className="h-full bg-[#c8a95122]" style={{ width: `${55 + idx * 10}%` }} /></div>)}
            </div>
          </Panel>
        </div>

        <div className="flex h-[33%] overflow-x-auto border-b border-[#c8a95112] [scrollbar-width:none]">
          <Panel title="CARGA OBSERVACIONAL" topo="TOPO-I" className="w-[520px] cursor-text">
            <textarea value={payload} onChange={(event) => setPayload(event.target.value)} className="mt-8 h-[calc(100%-76px)] w-full resize-none border border-[#c8a95118] bg-[#080706] p-3 font-mono text-[10px] leading-5 text-[#d8d0bd] outline-none" />
            <div className="absolute bottom-3 left-4 right-4 flex gap-2">
              <button onClick={() => void run('preflight')} disabled={Boolean(busy)} className="border border-[#c8a95133] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[#c8a951]">Preflight</button>
              <button onClick={() => void run('evaluate')} disabled={Boolean(busy)} className="border border-[#c8a95133] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[#c8a951]">Evaluar</button>
              <button onClick={() => void run('record')} disabled={Boolean(busy)} className="border border-[#c8a95166] bg-[#17130d] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[#ead8aa]">Registrar</button>
            </div>
          </Panel>

          <Panel title="RESPUESTA AMV" topo="TOPO-II" className="w-[420px]">
            <div className="mt-10 grid grid-cols-3 gap-2">
              <MiniMetric label="Eval" value={String(result?.canEvaluate ?? '—')} />
              <MiniMetric label="Record" value={String(result?.canRecord ?? '—')} />
              <MiniMetric label="Propose" value={String(result?.canPropose ?? '—')} />
            </div>
            <pre className="mt-3 max-h-[150px] overflow-auto whitespace-pre-wrap border border-[#c8a95112] bg-[#080706] p-3 font-mono text-[9px] leading-4 text-[#a79d8c]">{result ? JSON.stringify({ ok: result.ok, evidenceLevel: result.evidenceLevel, route: result.route, missing: result.missing, warnings: result.warnings, normalized, mihm }, null, 2) : 'Sin ejecucion. El AMV espera carga.'}</pre>
          </Panel>

          <Panel title="PROYECCION ESTOCASTICA" topo="TOPO-II" className="w-[360px]">
            <div className="mt-16 h-20 border-b border-[#c8a95122]">
              <div className="h-full w-full bg-[linear-gradient(110deg,transparent,rgba(200,169,81,.22),transparent)] opacity-60" />
            </div>
            <p className="mt-4 font-mono text-[10px] leading-5 text-[#8a8172]">Ruta sugerida: {result?.route ?? 'sin ruta'}. Cobertura: {state.evidenceSummary.sourceCoverage.toFixed(2)}.</p>
          </Panel>
        </div>

        <div className="flex h-[29%] overflow-x-auto [scrollbar-width:none]">
          <Panel title="CRONOLOGIA VIVA" topo="TOPO-III" className="w-[500px]">
            <div className="mt-14 flex items-end gap-3">
              {Array.from({ length: 9 }).map((_, idx) => <div key={idx} className="flex h-28 w-8 items-end border-b border-[#c8a95122]"><div className="w-full bg-[#c8a95133]" style={{ height: `${25 + ((idx * 17) % 70)}%` }} /></div>)}
            </div>
            <div className="mt-3 font-mono text-[9px] uppercase tracking-[0.2em] text-[#4a4a45]">Observaciones: {Number(tables.observations ?? 0)} · Vectores: {Number(tables.vectors ?? 0)} · Verificaciones: {Number(tables.verifications ?? 0)}</div>
          </Panel>

          <Panel title="BITACORA OPERACIONAL" topo="TOPO-III" className="w-[360px]">
            <div className="mt-9 max-h-[160px] overflow-auto font-mono text-[10px] leading-5 text-[#9c9282]">
              {log.map((item, idx) => <div key={`${item}-${idx}`} className="border-b border-[#c8a95108] py-1">{item}</div>)}
            </div>
          </Panel>

          <Panel title="AGENTE · CARGA" topo="TOPO-I" className="w-[400px]">
            <div className="mt-9 font-mono text-[10px] leading-5 text-[#8a8172]">AMV-SFI en linea. Pregunta “evalua”, “registra” o “preflight” para ejecutar sobre la carga actual.</div>
            <div className="absolute bottom-0 left-0 right-0 flex border-t border-[#c8a95112]">
              <input value={chat} onChange={(event) => setChat(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void sendChat(); }} placeholder="Observacion estructural..." className="flex-1 bg-transparent px-3 py-3 font-mono text-[11px] text-[#d8d0bd] outline-none" />
              <button onClick={() => void sendChat()} className="border-l border-[#c8a95112] px-4 font-mono text-[10px] uppercase tracking-[0.2em] text-[#c8a951]">→</button>
            </div>
          </Panel>
        </div>
      </main>
    </div>
  );
}
