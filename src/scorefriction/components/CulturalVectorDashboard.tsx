'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CulturalVectorResponse } from '@/lib/scorefriction/cultural-vector-contract';
import { CULTURAL_WAVE_CASES } from '@/lib/scorefriction/cultural-wave-cases';
import './CulturalVectorDashboard.css';

type EvidenceEntry = {
  id: string;
  source_name: string;
  evidence_hash: string;
  created_at: string;
  summary: string;
};

type EvidenceResponse = {
  entries?: EvidenceEntry[];
  warning?: string;
};

type ProposalResponse = {
  ok?: boolean;
  data?: ProposalPayload;
  id?: string;
  prototype_name?: string;
  production_brief?: Record<string, unknown>;
  prompt_for_ai_music?: string;
  brief_for_daw?: string;
  verification_plan?: Record<string, unknown>;
  error?: string;
};

type ProposalPayload = {
  id?: string;
  prototype_name?: string;
  production_brief?: Record<string, unknown>;
  prompt_for_ai_music?: string;
  brief_for_daw?: string;
  verification_plan?: Record<string, unknown>;
};

const GOLD = '200,169,81';
const RED = '184,80,80';
const GREEN = '58,138,90';
const BLUE = '80,120,184';

function regimeClass(regime?: string) {
  if (regime === 'Saturado') return 'sf-reg-sat';
  if (regime === 'Cristalizando') return 'sf-reg-crystal';
  if (regime === 'Proto-crítico') return 'sf-reg-proto';
  return 'sf-reg-latente';
}

function nowTime() {
  return new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function shortHash(value?: string) {
  return value ? `${value.slice(0, 8)}…${value.slice(-4)}` : 'sin hash';
}

function fit(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.resetTransform();
    ctx.scale(dpr, dpr);
  }
  return { width: rect.width, height: rect.height, ctx };
}

function lineSeries(seed: number, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const phase = (index + 1) * (seed + 0.37);
    return Math.max(0, Math.min(1, 0.5 + Math.sin(phase * 2.17) * 0.28 + Math.cos(phase * 0.71) * 0.15));
  });
}

export default function CulturalVectorDashboard() {
  const [caseId, setCaseId] = useState('CW-001');
  const [data, setData] = useState<CulturalVectorResponse | null>(null);
  const [evidence, setEvidence] = useState<EvidenceEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [narrative, setNarrative] = useState('');
  const [observeStatus, setObserveStatus] = useState('ψ —');
  const [agentQuestion, setAgentQuestion] = useState('');
  const [agentMessages, setAgentMessages] = useState<Array<{ role: string; text: string }>>([
    { role: 'Agente', text: 'Selecciona un case study, pega letra o registra evidencia. El sistema devolverá fricción, protoatractor y dirección de producción.' },
  ]);
  const [verificationMetrics, setVerificationMetrics] = useState('{"plays":0,"likes":0,"comments":0,"reposts":0,"timestamped_comments":[]}');
  const [platform, setPlatform] = useState('soundcloud');
  const [busy, setBusy] = useState(false);
  const [lastPrototypeId, setLastPrototypeId] = useState<string | null>(null);

  const canvasRoot = useRef<HTMLDivElement | null>(null);

  const loadEvidence = useCallback(async (nextCaseId: string) => {
    const response = await fetch(`/api/scorefriction/evidence?case_id=${nextCaseId}`, { cache: 'no-store' });
    const json = await response.json() as EvidenceResponse;
    setEvidence(json.entries ?? []);
  }, []);

  const load = useCallback(async (nextCaseId = caseId) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/scorefriction/evaluate?case_id=${nextCaseId}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('No se pudo cargar vector cultural');
      const json = await res.json() as CulturalVectorResponse;
      setData(json);
      await loadEvidence(nextCaseId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [caseId, loadEvidence]);

  useEffect(() => {
    void load(caseId);
  }, [caseId, load]);

  const semanticPressure = useMemo(() => {
    const words = narrative.toLowerCase().split(/\s+/).filter(Boolean);
    const unique = new Set(words).size;
    const density = Math.min(1, words.length / 120);
    const repetition = words.length ? 1 - unique / words.length : 0;
    const agency = words.filter((word) => /hacer|constru|crear|avanz|decid|produc|activar/.test(word)).length / Math.max(1, words.length * 0.08);
    return { density, repetition, agency: Math.min(1, agency) };
  }, [narrative]);

  useEffect(() => {
    if (!data || !canvasRoot.current) return;
    const canvases = Array.from(canvasRoot.current.querySelectorAll('canvas'));
    const vector = data.cultural_vector;
    const sources = data.sources;
    const draw = () => {
      canvases.forEach((canvas) => {
        const { width, height, ctx } = fit(canvas);
        if (!ctx) return;
        ctx.clearRect(0, 0, width, height);
        const id = canvas.dataset.kind;
        if (id === 'core') drawCore(ctx, width, height, vector);
        if (id === 'field') drawField(ctx, width, height, vector);
        if (id === 'twin') drawTwin(ctx, width, height, vector, evidence.length);
        if (id === 'platform') drawPlatform(ctx, width, height, sources);
        if (id === 'wave') drawWave(ctx, width, height, vector, evidence.length);
        if (id === 'sem') drawSemantic(ctx, width, height, semanticPressure);
        if (id === 'proj') drawProjection(ctx, width, height, vector);
        if (id === 'unc') drawUncertainty(ctx, width, height, data.evidence?.observation_count ?? 0, sources);
        if (id === 'trace') drawTrace(ctx, width, height, caseId);
      });
    };
    draw();
    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [data, evidence.length, semanticPressure, caseId]);

  async function registerObservation() {
    if (!narrative.trim()) return;
    setBusy(true);
    setObserveStatus('Guardando...');
    try {
      const response = await fetch('/api/scorefriction/observe/manual', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          case_id: caseId,
          source_name: 'manual_upload',
          source_url: 'dashboard://narrative-pressure',
          territory: 'MX',
          raw_payload: {
            type: 'lyrics_or_comment',
            text: narrative,
            submitted_from: 'cultural-vector-dashboard',
          },
        }),
      });
      if (!response.ok) throw new Error('No se pudo guardar observación');
      setObserveStatus('Guardado');
      await load(caseId);
    } catch (err) {
      setObserveStatus(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function askAgent() {
    const question = agentQuestion.trim() || '¿qué debe producir Edwing?';
    setBusy(true);
    setAgentMessages((items) => [...items, { role: 'Usuario', text: question }]);
    try {
      const response = await fetch('/api/scorefriction/propose', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          case_id: caseId,
          producer: 'Edwing',
          platform_targets: ['soundcloud', 'tiktok', 'youtube'],
          mihm_cultural_vector: data?.cultural_vector ?? {},
        }),
      });
      const json = await response.json() as ProposalResponse;
      const payload = json.data ?? json;
      if (!response.ok) throw new Error(json.error ?? 'No se pudo proponer prototipo');
      setLastPrototypeId(typeof payload.id === 'string' ? payload.id : null);
      setAgentMessages((items) => [...items, {
        role: 'Agente',
        text: [
          `Fricción: ${data?.interpretation.friction ?? 'pendiente'}`,
          `Protoatractor: ${payload.prototype_name ?? 'prototipo preparado'}`,
          `Brief de producción: ${JSON.stringify(payload.production_brief ?? {})}`,
          `Métrica de verificación: ${JSON.stringify(payload.verification_plan ?? {})}`,
        ].join('\n'),
      }]);
      setAgentQuestion('');
    } catch (err) {
      setAgentMessages((items) => [...items, { role: 'Agente', text: err instanceof Error ? err.message : 'Error' }]);
    } finally {
      setBusy(false);
    }
  }

  async function registerVerification() {
    setBusy(true);
    try {
      const metrics = JSON.parse(verificationMetrics);
      const response = await fetch('/api/scorefriction/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ case_id: caseId, prototype_id: lastPrototypeId, platform, metrics }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? 'No se pudo registrar verificación');
      setAgentMessages((items) => [...items, { role: 'Verificación', text: `Ciclo registrado: ${json.verification_id ?? 'sin id'}` }]);
      await loadEvidence(caseId);
    } catch (err) {
      setAgentMessages((items) => [...items, { role: 'Verificación', text: err instanceof Error ? err.message : 'Error' }]);
    } finally {
      setBusy(false);
    }
  }

  const vector = data?.cultural_vector;

  return (
    <div className="sf-cvd" ref={canvasRoot}>
      <header className="sf-cvd-header">
        <div className="sf-cvd-brand">SFI</div>
        <div className="sf-cvd-sep" />
        <div className="sf-cvd-stat">SCOREFRICTION <span>CULTURAL WAVE</span></div>
        <div className="sf-cvd-sep" />
        <div className="sf-cvd-stat">CVΦ <span>{vector?.cvphi.toFixed(3) ?? '—'}</span></div>
        <div className="sf-cvd-sep" />
        <div className={`sf-cvd-regime ${regimeClass(vector?.regime)}`}>{vector?.regime ?? '—'}</div>
        <div className="sf-cvd-sep" />
        <div className="sf-cvd-stat">LCP <span>{vector?.LCP.toFixed(2) ?? '—'}</span></div>
        <div className="sf-cvd-stat">PAC <span>{vector?.PAC.toFixed(2) ?? '—'}</span></div>
        <div className="sf-cvd-stat">VFE <span>{vector?.VFE.toFixed(2) ?? '—'}</span></div>
        <div className="sf-cvd-stat">SCR <span>{vector?.SCR.toFixed(2) ?? '—'}</span></div>
        <div className="sf-cvd-stat" style={{ marginLeft: 'auto' }}>{loading ? 'cargando' : nowTime()}</div>
      </header>

      <div className="sf-cvd-body">
        <aside className="sf-cvd-side">
          <div className="sf-side-topo">CW</div>
          {['CVΦ', 'SRC', 'TXT', 'P→', 'AI'].map((item) => <button key={item} className="sf-side-node" type="button">{item}</button>)}
          <div className="sf-side-topo">LAB</div>
        </aside>

        <main className="sf-cvd-main">
          <div className="sf-zone sf-zone-a">
            <div className="sf-zone-label">vector · campo · fuente</div>
            <Panel className="sf-p-core" label="CVΦ · VECTOR CULTURAL" topo="CULTURAL">
              <canvas data-kind="core" />
              <div className="sf-core-center">
                <div className="sf-core-val" style={{ color: vector?.regime === 'Saturado' ? 'var(--red)' : vector?.regime === 'Cristalizando' ? 'var(--green)' : 'var(--gold)' }}>{vector?.cvphi.toFixed(3) ?? '0.000'}</div>
                <div className="sf-core-eq">PAC·LCP·CRM_C / (1+FS_C) + VFE</div>
                <div className={`sf-core-regime ${regimeClass(vector?.regime)}`}>{vector?.regime ?? '—'}</div>
              </div>
              <div className="sf-core-vars">
                {(['LCP', 'PAC', 'VFE', 'SCR'] as const).map((key) => <div key={key} className="sf-core-var"><div className="sf-core-var-name">{key}</div><div className="sf-core-var-val">{vector?.[key].toFixed(2) ?? '—'}</div></div>)}
              </div>
            </Panel>
            <Panel className="sf-p-field" label="CAMPO CULTURAL" topo="FRICCIÓN"><canvas data-kind="field" /></Panel>
            <Panel className="sf-p-twin" label="PRODUCER TWIN" topo="EDWING / OPERADOR"><canvas data-kind="twin" /></Panel>
            <Panel className="sf-p-platform" label="PLATFORM SPECTRUM" topo="FUENTES"><canvas data-kind="platform" /></Panel>
          </div>

          <div className="sf-zone sf-zone-b">
            <div className="sf-zone-label">wave · narrativa · proyección</div>
            <Panel className="sf-p-wave" label="CULTURAL WAVEFORM" topo="LONGITUDINAL">
              <canvas data-kind="wave" />
              <select className="sf-case-select" value={caseId} onChange={(event) => setCaseId(event.target.value)}>
                {CULTURAL_WAVE_CASES.map((item) => <option key={item.case_id} value={item.case_id}>{item.case_id} · {item.name}</option>)}
              </select>
            </Panel>
            <Panel className="sf-p-sem" label="LYRIC / NARRATIVE PRESSURE" topo="SEMÁNTICA">
              <div className="sf-sem-inner">
                <canvas className="sf-sem-canvas" data-kind="sem" />
                <textarea className="sf-sem-textarea" value={narrative} onChange={(event) => setNarrative(event.target.value)} placeholder="Pega letra, caption, comentario, hook o hipótesis cultural." />
                <div className="sf-sem-actions">
                  <button className="sf-mini-btn" disabled={busy || !narrative.trim()} onClick={() => void registerObservation()}>Registrar observación</button>
                  <span>{observeStatus}</span>
                </div>
              </div>
            </Panel>
            <Panel className="sf-p-proj" label="PROTO-ATTRACTOR PROJECTION" topo="TRAYECTORIAS"><canvas data-kind="proj" /></Panel>
            <Panel className="sf-p-unc" label="MODEL UNCERTAINTY" topo="COBERTURA"><canvas data-kind="unc" /></Panel>
          </div>

          <div className="sf-zone sf-zone-c">
            <div className="sf-zone-label">evidencia · agencia</div>
            <Panel className="sf-p-trace" label="LONGITUDINAL CULTURAL TRACE" topo="CASE STUDIES"><canvas data-kind="trace" /></Panel>
            <Panel className="sf-p-log" label="EVIDENCE LEDGER">
              <div className="sf-log-inner">
                <div className="sf-log-scroll">
                  {error ? <LogEntry time={nowTime()} body={error} /> : null}
                  {data?.evidence?.warning ? <LogEntry time={nowTime()} body={`warning: ${data.evidence.warning}`} /> : null}
                  {evidence.length === 0 ? <LogEntry time="—" body="sin evidencia registrada; usar observe/manual" /> : evidence.map((entry) => (
                    <LogEntry key={entry.id} time={entry.created_at.slice(11, 19)} body={`${entry.source_name} · ${shortHash(entry.evidence_hash)} · ${entry.summary}`} />
                  ))}
                </div>
              </div>
            </Panel>
            <Panel className="sf-p-agent" label="CULTURAL VECTOR AGENT">
              <div className="sf-agent-inner">
                <div className="sf-agent-msgs">
                  {agentMessages.map((message, index) => <div key={`${message.role}-${index}`} className="sf-agent-msg"><strong>{message.role}:</strong><br />{message.text}</div>)}
                </div>
                <div className="sf-agent-footer">
                  <input className="sf-agent-in" value={agentQuestion} onChange={(event) => setAgentQuestion(event.target.value)} placeholder="Pregunta: ¿qué debe producir Edwing desde este vector?" onKeyDown={(event) => { if (event.key === 'Enter') void askAgent(); }} />
                  <button className="sf-agent-send" disabled={busy} onClick={() => void askAgent()}>→</button>
                </div>
                <div className="sf-verify-footer">
                  <input className="sf-verify-in" value={platform} onChange={(event) => setPlatform(event.target.value)} />
                  <input className="sf-verify-in" value={verificationMetrics} onChange={(event) => setVerificationMetrics(event.target.value)} />
                  <button className="sf-agent-send" disabled={busy} onClick={() => void registerVerification()}>verify</button>
                </div>
              </div>
            </Panel>
          </div>
        </main>
      </div>
    </div>
  );
}

function Panel({ className, label, topo, children }: { className: string; label: string; topo?: string; children: React.ReactNode }) {
  return <section className={`sf-panel ${className}`}><div className="sf-panel-label">{label}</div>{topo ? <div className="sf-panel-topo">{topo}</div> : null}{children}</section>;
}

function LogEntry({ time, body }: { time: string; body: string }) {
  return <div className="sf-log-entry"><div className="sf-log-t">{time}</div><div className="sf-log-body">{body}</div></div>;
}

function drawCore(ctx: CanvasRenderingContext2D, width: number, height: number, vector: CulturalVectorResponse['cultural_vector']) {
  const cx = width / 2;
  const cy = height / 2;
  const rgb = vector.regime === 'Saturado' ? RED : vector.regime === 'Cristalizando' ? GREEN : GOLD;
  for (let i = 5; i > 0; i--) {
    ctx.beginPath();
    ctx.arc(cx, cy, width * 0.38 * (i / 5), 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${rgb},${0.012 + i * 0.009})`;
    ctx.stroke();
  }
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, width * 0.55);
  grad.addColorStop(0, `rgba(${rgb},${0.035 + vector.cvphi * 0.055})`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
}

function drawField(ctx: CanvasRenderingContext2D, width: number, height: number, vector: CulturalVectorResponse['cultural_vector']) {
  const rgb = vector.FS_C > 0.65 ? RED : GOLD;
  for (let i = 0; i < 170; i++) {
    const x = (Math.sin(i * 12.989 + vector.LCP * 8) * 43758.5453) % 1;
    const y = (Math.cos(i * 7.123 + vector.PAC * 5) * 23171.17) % 1;
    const px = Math.abs(x) * width;
    const py = Math.abs(y) * height;
    ctx.beginPath();
    ctx.arc(px, py, 0.9 + vector.ICE_C, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${rgb},${0.025 + vector.ICE_C * 0.09})`;
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, Math.min(width, height) * 0.22 * vector.PAC, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(${GREEN},${vector.PAC * 0.18})`;
  ctx.stroke();
}

function drawTwin(ctx: CanvasRenderingContext2D, width: number, height: number, vector: CulturalVectorResponse['cultural_vector'], evidenceCount: number) {
  const vals = [vector.PAC, vector.LCP, vector.FS_C, Math.min(1, (vector.PAC + vector.LCP) / 2 + evidenceCount * 0.03)];
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.32;
  ctx.beginPath();
  vals.forEach((value, i) => {
    const a = (i / vals.length) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(a) * radius * value;
    const y = cy + Math.sin(a) * radius * value;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = `rgba(${GOLD},0.08)`;
  ctx.fill();
  ctx.strokeStyle = `rgba(${GOLD},0.32)`;
  ctx.stroke();
}

function drawPlatform(ctx: CanvasRenderingContext2D, width: number, height: number, sources: CulturalVectorResponse['sources']) {
  const vals = [sources.youtube, sources.tiktok, sources.soundcloud, sources.spotify, sources.lyrics];
  const labels = ['YTB', 'TTK', 'SC', 'SPF', 'LYR'];
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.35;
  ctx.beginPath();
  vals.forEach((value, i) => {
    const a = (i / vals.length) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(a) * radius * value;
    const y = cy + Math.sin(a) * radius * value;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = `rgba(${GOLD},0.07)`;
  ctx.fill();
  ctx.strokeStyle = `rgba(${GOLD},0.28)`;
  ctx.stroke();
  ctx.font = '9px JetBrains Mono';
  ctx.textAlign = 'center';
  vals.forEach((value, i) => {
    const a = (i / vals.length) * Math.PI * 2 - Math.PI / 2;
    ctx.fillStyle = `rgba(${GOLD},${0.18 + value * 0.45})`;
    ctx.fillText(labels[i], cx + Math.cos(a) * (radius + 20), cy + Math.sin(a) * (radius + 20));
  });
}

function drawWave(ctx: CanvasRenderingContext2D, width: number, height: number, vector: CulturalVectorResponse['cultural_vector'], evidenceCount: number) {
  const bands = [vector.FS_C, vector.SCR, vector.VFE, 1 - vector.SCR * 0.5, vector.CRM_C, vector.LCP];
  const labels = ['SAT', 'REP', 'MEM', 'SEM', 'RIT', 'EMG'];
  const count = 34;
  const left = 44;
  const top = 18;
  const slot = (width - left - 8) / count;
  const bandH = (height - top - 25) / bands.length;
  bands.forEach((seed, band) => {
    const series = lineSeries(seed + evidenceCount * 0.03, count);
    ctx.font = '8px JetBrains Mono';
    ctx.fillStyle = `rgba(${GOLD},0.24)`;
    ctx.fillText(labels[band], 5, top + band * bandH + bandH * 0.62);
    series.forEach((value, index) => {
      const rgb = band < 2 ? RED : band === 5 ? GREEN : GOLD;
      ctx.fillStyle = `rgba(${rgb},${Math.min(0.62, value * 0.75)})`;
      ctx.fillRect(left + index * slot, top + band * bandH + 1, slot - 1, bandH - 2);
    });
  });
}

function drawSemantic(ctx: CanvasRenderingContext2D, width: number, height: number, pressure: { density: number; repetition: number; agency: number }) {
  for (let i = 0; i < Math.floor(pressure.density * 14) + 2; i++) {
    const y = (height / 16) * (i + 1);
    ctx.beginPath();
    for (let x = 0; x <= width; x += 8) {
      const dy = Math.sin((x / width) * Math.PI * 4 + i) * pressure.density * 9;
      x === 0 ? ctx.moveTo(x, y + dy) : ctx.lineTo(x, y + dy);
    }
    ctx.strokeStyle = `rgba(${GOLD},${pressure.density * 0.055})`;
    ctx.stroke();
  }
  if (pressure.repetition > 0.45) {
    ctx.fillStyle = `rgba(${RED},${pressure.repetition * 0.045})`;
    ctx.fillRect(0, 0, width, height);
  }
}

function drawProjection(ctx: CanvasRenderingContext2D, width: number, height: number, vector: CulturalVectorResponse['cultural_vector']) {
  const routes = [
    { name: 'Disipación', y: height * 0.25, p: 1 - vector.PAC, rgb: RED },
    { name: 'Nicho estable', y: height * 0.52, p: ((vector.PAC + vector.CRM_C) / 2) * 0.7, rgb: GOLD },
    { name: 'Cristalización', y: height * 0.78, p: vector.PAC * vector.LCP, rgb: GREEN },
  ];
  routes.forEach((route, idx) => {
    ctx.beginPath();
    for (let step = 0; step <= 24; step++) {
      const x = width * 0.22 + (width * 0.72) * (step / 24);
      const y = height / 2 + (route.y - height / 2) * (step / 24) + Math.sin(step * 0.3 + idx) * (1 - route.p) * 8 * (step / 24);
      step === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(${route.rgb},${0.08 + route.p * 0.35})`;
    ctx.lineWidth = 1 + route.p * 3;
    ctx.stroke();
    ctx.font = '8px JetBrains Mono';
    ctx.textAlign = 'right';
    ctx.fillStyle = `rgba(${route.rgb},${0.22 + route.p * 0.4})`;
    ctx.fillText(`${route.name} p=${route.p.toFixed(2)}`, width - 8, route.y);
  });
}

function drawUncertainty(ctx: CanvasRenderingContext2D, width: number, height: number, observationCount: number, sources: CulturalVectorResponse['sources']) {
  const coverage = Object.values(sources).reduce((sum, value) => sum + value, 0) / 5;
  const confidence = Math.min(1, coverage * 0.6 + observationCount * 0.05);
  const grid = 13;
  const cellW = (width - 10) / grid;
  const cellH = (height - 28) / grid;
  for (let y = 0; y < grid; y++) {
    for (let x = 0; x < grid; x++) {
      const d = Math.hypot(x / grid - 0.5, y / grid - 0.5);
      const value = Math.max(0, confidence * (1 - d * 0.9));
      const rgb = value > 0.35 ? GOLD : BLUE;
      ctx.fillStyle = `rgba(${rgb},${value * 0.22})`;
      ctx.fillRect(5 + x * cellW, 20 + y * cellH, cellW - 1, cellH - 1);
    }
  }
}

function drawTrace(ctx: CanvasRenderingContext2D, width: number, height: number, activeCaseId: string) {
  const rowH = (height - 16) / CULTURAL_WAVE_CASES.length;
  CULTURAL_WAVE_CASES.forEach((item, index) => {
    const active = item.case_id === activeCaseId;
    const y = 8 + index * rowH;
    ctx.fillStyle = `rgba(${active ? GREEN : GOLD},${active ? 0.18 : 0.055})`;
    ctx.fillRect(48, y, width - 96, rowH - 1);
    ctx.fillStyle = `rgba(${GOLD},${active ? 0.5 : 0.18})`;
    ctx.font = '8px JetBrains Mono';
    ctx.fillText(item.case_id, 6, y + rowH * 0.62);
    const x = 48 + item.seedVector.LCP * (width - 96);
    ctx.beginPath();
    ctx.arc(x, y + rowH / 2, active ? 4 : 2.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${active ? GREEN : GOLD},${active ? 0.75 : 0.35})`;
    ctx.fill();
  });
}
