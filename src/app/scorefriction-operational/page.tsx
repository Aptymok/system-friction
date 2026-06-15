'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';

// -------------------- CONSTANTES Y FUNCIONES AUXILIARES --------------------
const hexToRgb = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
};

const GOLD_RGB = hexToRgb('#C8A951');
const RED_RGB = hexToRgb('#b85050');
const GRN_RGB = hexToRgb('#3a8a5a');

function n(value: number | null | undefined, digits = 3): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '—';
}

function riskFromGap(gap?: number): string {
  if (typeof gap !== 'number') return 'sin dato';
  if (gap >= 0.66) return 'alto';
  if (gap >= 0.33) return 'medio';
  return 'bajo';
}

function regimeClass(regime?: string | null): string {
  if (!regime) return 'reg-unknown';
  const r = regime.toLowerCase();
  if (r.includes('home')) return 'reg-homeost';
  if (r.includes('entro')) return 'reg-entrop';
  return 'reg-critico';
}

function phiClass(phi?: number | null): string {
  if (typeof phi !== 'number') return 'warn';
  if (phi < 0.22) return 'crit';
  if (phi > 0.58) return 'ok';
  return 'warn';
}

// -------------------- FUNCIÓN DE DICTAMEN (local, no LLM) --------------------
function buildDictamen(input: {
  title: string;
  score: any;
  operational: any;
  evidence?: unknown;
}): string {
  const { title, score, operational } = input;
  const gap = operational?.executionReadiness?.capability_gap;
  const executable = operational?.executionReadiness?.executable;
  const focus = operational?.runtimeFocus ?? {};
  const phi = score.phi;
  const ldi = score.ldi;

  if (title.includes('Φ')) {
    if (typeof phi !== 'number') return 'No hay Φ disponible. El sistema todavía no puede leer el régimen.';
    if (phi < 0.22) return 'El sistema está en fricción crítica. La señal existe, pero la ejecución debe reducir ruido antes de expandirse.';
    if (phi > 0.58) return 'El sistema muestra coherencia operativa. La señal puede convertirse en acción con bajo costo de interpretación.';
    return 'El sistema está en zona intermedia. Hay dirección, pero todavía requiere selección clara de vector.';
  }
  if (title.includes('Fricción')) {
    if (typeof ldi !== 'number') return 'No hay LDI disponible. No se puede estimar tensión longitudinal.';
    if (ldi > 0.7) return 'La tensión longitudinal está elevada. Conviene ejecutar una acción mínima, medible y reversible.';
    return 'La fricción es observable pero no dominante. El sistema puede avanzar con control de evidencia.';
  }
  if (title.includes('World')) {
    const vector = focus?.world_spect_vector || focus?.vector || focus?.direction || focus?.selected_domain;
    return vector
      ? `El sistema está orientado al vector ${String(vector)}. La propuesta debe conservar coherencia con esa dirección.`
      : 'No hay vector externo fijado. La propuesta debe clasificarse antes de producir material.';
  }
  if (title.includes('Readiness')) {
    if (executable) return 'El sistema declara capacidad de ejecución. La acción puede correr y después cerrar ciclo con outcome y lesson.';
    return `El sistema no está listo. La brecha de capacidad es ${n(gap, 2)} y debe cerrarse antes de escalar.`;
  }
  if (title.includes('Counts')) {
    const c = operational?.counts ?? {};
    return `El sistema registra ${c?.perturbations ?? 0} perturbaciones, ${c?.capabilityChecks ?? 0} chequeos, ${c?.ledgerEntries ?? 0} entradas de ejecución y ${c?.mediaAssets ?? 0} assets. Esto mide actividad real, no intención.`;
  }
  if (title.includes('Media')) {
    return 'La galería muestra los artefactos generados por ejecución. Si no hay assets, no hay salida material registrada.';
  }
  if (title.includes('Bitácora')) {
    return operational?.latestObservation
      ? 'Existe una observación reciente. Debe tratarse como evidencia operativa y no como interpretación final.'
      : 'No hay observación reciente. El sistema necesita registrar un evento antes de inferir patrón.';
  }
  return 'El panel contiene señal operativa. Su significado depende de evidencia, régimen, vector y capacidad de ejecución.';
}

// -------------------- COMPONENTE PRINCIPAL --------------------
export default function ScoreFrictionOperationalPage() {
  const caseIdRef = useRef(`SFI-OP-${Math.random().toString(36).slice(2, 10).toUpperCase()}`);

  // Estados de datos
  const [scoreState, setScoreState] = useState<any>({ ihg: null, nti: null, ldi: null, phi: null, regime: null });
  const [operational, setOperational] = useState<any>(null);
  const [mediaAssets, setMediaAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Estados para AMV (chat real)
  const [amvMessages, setAmvMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: 'Observatorio inicializado. Haz clic en cualquier panel para obtener interpretación, o escribe tu pregunta.' },
  ]);
  const [amvInput, setAmvInput] = useState('');
  const [amvLoading, setAmvLoading] = useState(false);
  const [amvStatus, setAmvStatus] = useState('◉ EN LÍNEA');
  const [amvStatusColor, setAmvStatusColor] = useState('var(--green)');

  // Estados de presión semántica (afecta drift en dibujos)
  const [semanticPressure, setSemanticPressure] = useState(0);
  const [drift, setDrift] = useState(0.28);

  // Estados para Campaign Generator
  const [campaignChannel, setCampaignChannel] = useState('');
  const [campaignObjective, setCampaignObjective] = useState('');
  const [campaignPrompt, setCampaignPrompt] = useState('');
  const [requestedAssets, setRequestedAssets] = useState({
    text: true, image: false, video: false, audio: false, markdown: false, json: false,
  });
  const [campaignResult, setCampaignResult] = useState<any>(null);
  const [campaignLoading, setCampaignLoading] = useState(false);

  // Estados para Outcome / Lesson
  const [outcomeText, setOutcomeText] = useState('');
  const [lessonText, setLessonText] = useState('');
  const [atlasUpdate, setAtlasUpdate] = useState(true);
  const [closureResult, setClosureResult] = useState<any>(null);
  const [closureLoading, setClosureLoading] = useState(false);

  // Estado para modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', narrative: '', evidence: '', status: '', risk: '', nextAction: '' });

  // Refs para canvas
  const phiCanvasRef = useRef<HTMLCanvasElement>(null);
  const fieldCanvasRef = useRef<HTMLCanvasElement>(null);
  const twinCanvasRef = useRef<HTMLCanvasElement>(null);
  const worldCanvasRef = useRef<HTMLCanvasElement>(null);
  const spectrCanvasRef = useRef<HTMLCanvasElement>(null);
  const projCanvasRef = useRef<HTMLCanvasElement>(null);
  const entropCanvasRef = useRef<HTMLCanvasElement>(null);
  const chronCanvasRef = useRef<HTMLCanvasElement>(null);

  // Refs para animaciones y partículas
  const fieldParticlesRef = useRef<any[]>([]);
  const tensionHistoryRef = useRef<number[]>([]);
  const animationRef = useRef<number | null>(null);
  const epochsRef = useRef<any[]>([]);

  // -------------------- FUNCIONES DE DIBUJO DE CANVAS (reales) --------------------
  const drawPhiBg = useCallback(() => {
    const c = phiCanvasRef.current;
    if (!c || !c.width) return;
    const ctx = c.getContext('2d')!;
    const { phi, regime } = scoreState;
    const t = Date.now() * 0.008;
    ctx.clearRect(0, 0, c.width, c.height);
    const rgb = regime === 'Homeostático' ? GRN_RGB : regime === 'Entrópico' ? RED_RGB : GOLD_RGB;
    const rings = 5;
    for (let r = rings; r > 0; r--) {
      const rad = (c.width * 0.38) * (r / rings);
      const osc = Math.sin(t + r * 0.7) * 0.015;
      const alpha = (0.02 + osc) * (r / rings);
      ctx.beginPath();
      ctx.arc(c.width / 2, c.height / 2, rad, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${rgb},${Math.max(0.01, alpha)})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    const pulseA = regime === 'Entrópico' ? Math.abs(Math.sin(t * 2)) * 0.06 : 0.02;
    const grad = ctx.createRadialGradient(c.width / 2, c.height / 2, 0, c.width / 2, c.height / 2, c.width / 2);
    grad.addColorStop(0, `rgba(${rgb},${pulseA})`);
    grad.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, c.width, c.height);
  }, [scoreState]);

  const drawFrictionField = useCallback(() => {
    const c = fieldCanvasRef.current;
    if (!c || !c.width) return;
    const ctx = c.getContext('2d')!;
    const { phi, ldi } = scoreState;
    const t = Date.now() * 0.005;
    ctx.fillStyle = 'rgba(6,6,5,0.08)';
    ctx.fillRect(0, 0, c.width, c.height);
    const coh = phi;
    const fric = 1 - coh;

    if (fieldParticlesRef.current.length === 0) {
      for (let i = 0; i < 160; i++) {
        fieldParticlesRef.current.push({
          x: Math.random() * c.width,
          y: Math.random() * c.height,
          vx: 0, vy: 0,
          age: Math.random(),
          maxAge: 0.6 + Math.random() * 0.8,
        });
      }
    }
    fieldParticlesRef.current.forEach(p => {
      const nx = p.x / c.width - 0.5;
      const ny = p.y / c.height - 0.5;
      const dist = Math.sqrt(nx * nx + ny * ny);
      const angle = Math.atan2(ny, nx);
      const perturb = fric * (Math.sin(nx * 6 + t * 1.3) * Math.cos(ny * 5 - t) + Math.sin(dist * 8 - t * 1.7) * ldi * 0.6);
      const flowAngle = angle + Math.PI / 2 * coh + perturb;
      const speed = 0.6 + dist * 1.2;
      p.vx = p.vx * 0.85 + Math.cos(flowAngle) * speed * 0.15;
      p.vy = p.vy * 0.85 + Math.sin(flowAngle) * speed * 0.15;
      p.x += p.vx;
      p.y += p.vy;
      p.age += 0.008;
      if (p.age > p.maxAge || p.x < 0 || p.x > c.width || p.y < 0 || p.y > c.height) {
        p.x = Math.random() * c.width;
        p.y = Math.random() * c.height;
        p.vx = 0; p.vy = 0; p.age = 0;
      }
      const life = Math.sin((p.age / p.maxAge) * Math.PI);
      const alpha = life * (0.04 + coh * 0.1);
      const rgb = phi < 0.25 ? RED_RGB : phi > 0.6 ? GRN_RGB : GOLD_RGB;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 0.8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb},${alpha})`;
      ctx.fill();
    });
    if (fric > 0.5) {
      const nFrac = Math.floor(fric * 5);
      for (let i = 0; i < nFrac; i++) {
        const fx = (Math.sin(t * 0.3 + i * 2.1) * 0.5 + 0.5) * c.width;
        const fy = (Math.cos(t * 0.2 + i * 1.7) * 0.5 + 0.5) * c.height;
        const fl = fric * 30 * (Math.sin(t + i) * 0.5 + 0.5);
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.lineTo(fx + fl * Math.cos(t + i), fy + fl * Math.sin(t * 0.7 + i));
        ctx.strokeStyle = `rgba(${RED_RGB},${fric * 0.08})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  }, [scoreState]);

  const drawCognitiveTwin = useCallback(() => {
    const c = twinCanvasRef.current;
    if (!c || !c.width) return;
    const ctx = c.getContext('2d')!;
    const energy = 0.65, clarity = 0.55, coherence = 0.72;
    const t = Date.now() * 0.004;
    ctx.clearRect(0, 0, c.width, c.height);
    const cx = c.width / 2, cy = c.height / 2;
    const R = Math.min(c.width, c.height) * 0.33;
    const layers = [
      { offset: drift * 12, alpha: clarity * 0.35 + 0.05, phase: 0 },
      { offset: energy * 8, alpha: energy * 0.3 + 0.05, phase: 1.57 },
      { offset: drift * 4, alpha: coherence * 0.3 + 0.05, phase: 3.14 },
      { offset: drift * 14, alpha: 0.1, phase: 4.71 },
    ];
    layers.forEach((layer, li) => {
      const pts = 12;
      const misalign = layer.offset * (1 - coherence);
      const offX = Math.cos(layer.phase + t * 0.3) * misalign;
      const offY = Math.sin(layer.phase + t * 0.3) * misalign;
      const r = R * (0.55 + li * 0.14) * (0.85 + energy * 0.15);
      ctx.beginPath();
      for (let i = 0; i <= pts; i++) {
        const a = (i / pts) * Math.PI * 2;
        const noise = Math.sin(a * 3 + t + li) * drift * 0.18 + Math.cos(a * 5 - t * 0.7 + li) * (1 - clarity) * 0.12;
        const pr = r * (1 + noise);
        const px = cx + offX + Math.cos(a) * pr;
        const py = cy + offY + Math.sin(a) * pr;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = `rgba(${GOLD_RGB},${layer.alpha})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(${GOLD_RGB},${layer.alpha * 2})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    });
  }, [drift]);

  const drawWorldSpectrum = useCallback(() => {
    const c = worldCanvasRef.current;
    if (!c || !c.width) return;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, c.width, c.height);
    const worldVals = [0.72, 0.65, 0.58, 0.81, 0.90];
    const padding = 25;
    const graphH = c.height - padding * 2;
    const barGap = (c.width - padding * 2) / worldVals.length;
    worldVals.forEach((v, i) => {
      const bx = padding + i * barGap + barGap * 0.15;
      const bw = barGap * 0.7;
      const bh = graphH * v;
      const by = c.height - padding - bh;
      ctx.fillStyle = `rgba(${GOLD_RGB},0.02)`;
      ctx.fillRect(bx, padding, bw, graphH);
      ctx.fillStyle = `rgba(${GOLD_RGB},0.12)`;
      ctx.fillRect(bx, by, bw, bh);
    });
  }, []);

  const drawLongitudinalTension = useCallback(() => {
    const c = spectrCanvasRef.current;
    if (!c || !c.width) return;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, c.width, c.height);
    const t = Date.now();
    if (t % 100 < 50) {
      const baseT = (scoreState.ldi || 0) * 0.6 + drift * 0.4;
      tensionHistoryRef.current.push(baseT + Math.sin(t * 0.08) * 0.08 + Math.random() * 0.04);
      if (tensionHistoryRef.current.length > 80) tensionHistoryRef.current.shift();
    }
    if (tensionHistoryRef.current.length < 2) return;
    const padLeft = 30, padRight = 20, padTop = 30, padBot = 20;
    const w = c.width - padLeft - padRight;
    const h = c.height - padTop - padBot;
    ctx.strokeStyle = 'rgba(200,169,81,0.03)';
    ctx.lineWidth = 0.5;
    for (let g = 1; g <= 4; g++) {
      const gy = padTop + h * (g / 4);
      ctx.beginPath(); ctx.moveTo(padLeft, gy); ctx.lineTo(padLeft + w, gy); ctx.stroke();
    }
    ctx.beginPath();
    tensionHistoryRef.current.forEach((v, idx) => {
      const x = padLeft + w * (idx / (tensionHistoryRef.current.length - 1));
      const y = c.height - padBot - h * Math.max(0, Math.min(1, v));
      idx === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = `rgba(${GOLD_RGB},0.45)`;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }, [scoreState, drift]);

  const drawStochasticProjection = useCallback(() => {
    const c = projCanvasRef.current;
    if (!c || !c.width) return;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, c.width, c.height);
    const cx = c.width * 0.25, cy = c.height * 0.55;
    const w = c.width * 0.65;
    const t = Date.now() * 0.005;
    ctx.strokeStyle = 'rgba(200,169,81,0.04)';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + w, cy); ctx.stroke();
    const paths = 5;
    const steps = 24;
    const phi = scoreState.phi || 0;
    for (let p = 0; p < paths; p++) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      for (let s = 1; s <= steps; s++) {
        const px = cx + w * (s / steps);
        const driftFactor = (s / steps) * (1.2 - phi) * 45;
        const noise = Math.sin(s * 0.4 + t + p) * Math.cos(s * 0.7 - t * 0.3 + p);
        const py = cy + noise * driftFactor + Math.sin(t * 0.5 + p) * 5 * (s / steps);
        ctx.lineTo(px, py);
      }
      ctx.strokeStyle = p === 0 ? `rgba(${GOLD_RGB},0.5)` : `rgba(${GOLD_RGB},0.06)`;
      ctx.lineWidth = p === 0 ? 1.2 : 0.6;
      ctx.stroke();
    }
  }, [scoreState]);

  const drawAgentEntropy = useCallback(() => {
    const c = entropCanvasRef.current;
    if (!c || !c.width) return;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, c.width, c.height);
    const cx = c.width / 2, cy = c.height / 2;
    const r = Math.min(c.width, c.height) * 0.28;
    const t = Date.now() * 0.015;
    const ent = operational?.executionReadiness?.capability_gap ?? 0.3;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(200,169,81,0.04)';
    ctx.stroke();
    const nodes = 14;
    ctx.fillStyle = `rgba(${GOLD_RGB},0.35)`;
    for (let i = 0; i < nodes; i++) {
      const angle = (i / nodes) * Math.PI * 2 + t * 0.1;
      const radNoise = Math.sin(t + i * 1.7) * ent * 14;
      const nx = cx + Math.cos(angle) * (r + radNoise);
      const ny = cy + Math.sin(angle) * (r + radNoise);
      ctx.beginPath();
      ctx.arc(nx, ny, 1, 0, Math.PI * 2);
      ctx.fill();
      if (ent > 0.3 && Math.random() < ent * 0.08) {
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(nx, ny);
        ctx.strokeStyle = `rgba(${GOLD_RGB},0.03)`;
        ctx.stroke();
      }
    }
  }, [operational]);

  const drawChronology = useCallback(() => {
    const c = chronCanvasRef.current;
    if (!c || !c.width) return;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, c.width, c.height);
    if (epochsRef.current.length === 0) {
      const labels = ['S-08', 'S-07', 'S-06', 'S-05', 'S-04', 'S-03', 'S-02', 'S-01', 'NOW'];
      epochsRef.current = labels.map((l, i) => ({ label: l, phi: 0.3 + Math.random() * 0.5, event: i === 4 || i === 7 }));
    }
    const padLeft = 40, padRight = 40;
    const w = c.width - padLeft - padRight;
    const cy = c.height * 0.6;
    ctx.strokeStyle = 'rgba(200,169,81,0.08)';
    ctx.beginPath(); ctx.moveTo(padLeft, cy); ctx.lineTo(padLeft + w, cy); ctx.stroke();
    const space = w / (epochsRef.current.length - 1);
    epochsRef.current.forEach((ep, i) => {
      const x = padLeft + i * space;
      const barH = ep.phi * 35;
      ctx.fillStyle = `rgba(${GOLD_RGB},0.03)`;
      ctx.fillRect(x - 3, cy - 40, 6, 80);
      ctx.beginPath();
      ctx.moveTo(x, cy);
      ctx.lineTo(x, cy - barH);
      ctx.strokeStyle = ep.event ? `rgb(${RED_RGB})` : `rgba(${GOLD_RGB},0.5)`;
      ctx.lineWidth = ep.event ? 1.5 : 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, cy - barH, ep.event ? 2.5 : 1.5, 0, Math.PI * 2);
      ctx.fillStyle = ep.event ? `rgb(${RED_RGB})` : `rgb(${GOLD_RGB})`;
      ctx.fill();
    });
  }, []);

  const animate = useCallback(() => {
    drawPhiBg();
    drawFrictionField();
    drawCognitiveTwin();
    drawWorldSpectrum();
    drawLongitudinalTension();
    drawStochasticProjection();
    drawAgentEntropy();
    drawChronology();
    animationRef.current = requestAnimationFrame(animate);
  }, [drawPhiBg, drawFrictionField, drawCognitiveTwin, drawWorldSpectrum, drawLongitudinalTension, drawStochasticProjection, drawAgentEntropy, drawChronology]);

  useEffect(() => {
    animate();
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [animate]);

  // -------------------- CARGA DE DATOS REALES --------------------
  const loadAllData = useCallback(async () => {
    setLoadError(null);
    try {
      const [scoreRes, opRes, execRes] = await Promise.all([
        fetch('/api/scorefriction/state', { cache: 'no-store' }),
        fetch(`/api/sfi/operational-state?case_id=${caseIdRef.current}`, { cache: 'no-store' }),
        fetch(`/api/sfi/execution-state?case_id=${caseIdRef.current}`, { cache: 'no-store' }),
      ]);
      const scoreData = await scoreRes.json().catch(() => null);
      const opData = await opRes.json().catch(() => null);
      const execData = await execRes.json().catch(() => null);

      if (scoreData?.ok) {
        setScoreState({
          ihg: typeof scoreData.ihg === 'number' ? scoreData.ihg : null,
          nti: typeof scoreData.nti === 'number' ? scoreData.nti : null,
          ldi: typeof scoreData.ldi === 'number' ? scoreData.ldi : null,
          phi: typeof scoreData.phi === 'number' ? scoreData.phi : null,
          regime: typeof scoreData.regime === 'string' ? scoreData.regime : null,
        });
      }
      if (opData?.ok) {
        const lastCap = execData?.capabilityChecks?.[0];
        const counts = {
          perturbations: execData?.perturbations?.length ?? 0,
          capabilityChecks: execData?.capabilityChecks?.length ?? 0,
          ledgerEntries: execData?.ledgerEntries?.length ?? 0,
          mediaAssets: execData?.mediaAssets?.length ?? 0,
          outcomes: execData?.outcomes?.length ?? 0,
          lessons: execData?.lessons?.length ?? 0,
        };
        const readiness = lastCap ? {
          capability_gap: typeof lastCap.capability_gap === 'number' ? lastCap.capability_gap : undefined,
          executable: Boolean(lastCap.executable),
          missing_capabilities: Array.isArray(lastCap.capabilities_missing) ? lastCap.capabilities_missing : [],
        } : {};
        setOperational({
          ...opData,
          counts,
          executionReadiness: readiness,
          runtimeFocus: opData.runtimeFocus ?? opData.runtime_focus ?? {},
        });
      }
      if (execData?.ok) {
        setMediaAssets(Array.isArray(execData.mediaAssets) ? execData.mediaAssets : []);
      }
    } catch (err: any) {
      setLoadError(err?.message ?? 'Error al cargar datos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 10000);
    return () => clearInterval(interval);
  }, [loadAllData]);

  // -------------------- AMV CHAT REAL --------------------
  const sendAmvMessage = async () => {
    if (!amvInput.trim()) return;
    const userMsg = { role: 'user' as const, content: amvInput };
    setAmvMessages(prev => [...prev, userMsg]);
    const currentInput = amvInput;
    setAmvInput('');
    setAmvLoading(true);
    setAmvStatus('○ COMPUTANDO');
    setAmvStatusColor('var(--gold)');
    try {
      const res = await fetch('/api/amv/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'scorefriction',
          sessionId: caseIdRef.current,
          message: currentInput,
          context: {
            sys: scoreState,
            operational,
            mediaAssetsCount: mediaAssets.length,
            source: 'scorefriction-operational-chat'
          },
        }),
      });
      const data = await res.json();
      const answer = data?.response || data?.answer || data?.message || 'AMV procesó tu pregunta.';
      setAmvMessages(prev => [...prev, { role: 'assistant', content: answer }]);
      setAmvStatus('◉ EN LÍNEA');
      setAmvStatusColor('var(--green)');
    } catch (err) {
      setAmvMessages(prev => [...prev, { role: 'assistant', content: 'Error de comunicación con AMV.' }]);
      setAmvStatus('△ DEGRADADO');
      setAmvStatusColor('var(--red)');
    } finally {
      setAmvLoading(false);
    }
  };

  // Función para enviar preguntas automáticas al hacer clic en paneles
  const sendAmvQueryForPanel = async (panelTitle: string, metricData: any) => {
    const prompt = `Interpreta el panel "${panelTitle}" con estos datos: ${JSON.stringify(metricData)}. Explica qué significa para el sistema en lenguaje simple.`;
    const userMsg = { role: 'user' as const, content: prompt };
    setAmvMessages(prev => [...prev, userMsg]);
    setAmvLoading(true);
    setAmvStatus('○ COMPUTANDO');
    setAmvStatusColor('var(--gold)');
    try {
      const res = await fetch('/api/amv/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'scorefriction',
          sessionId: caseIdRef.current,
          message: prompt,
          context: {
            sys: scoreState,
            operational,
            mediaAssetsCount: mediaAssets.length,
            source: 'scorefriction-operational-click'
          },
        }),
      });
      const data = await res.json();
      const answer = data?.response || data?.answer || data?.message || 'AMV procesó la métrica.';
      setAmvMessages(prev => [...prev, { role: 'assistant', content: answer }]);
      setAmvStatus('◉ EN LÍNEA');
      setAmvStatusColor('var(--green)');
    } catch (err) {
      setAmvMessages(prev => [...prev, { role: 'assistant', content: 'Error al interpretar la métrica.' }]);
      setAmvStatus('△ DEGRADADO');
      setAmvStatusColor('var(--red)');
    } finally {
      setAmvLoading(false);
    }
  };

  // -------------------- MANEJO DE MODALES Y DICTÁMENES --------------------
  const openDictamen = useCallback((title: string, evidence: unknown, status: string, risk: string, nextAction: string) => {
    const narrative = buildDictamen({ title, score: scoreState, operational, evidence });
    setModalContent({ title, narrative, evidence: JSON.stringify(evidence ?? {}, null, 2), status, risk, nextAction });
    setModalOpen(true);
    // También enviamos al AMV automáticamente (opcional, pero lo dejamos activo)
    sendAmvQueryForPanel(title, evidence);
  }, [scoreState, operational]);

  // -------------------- CAMPAIGN GENERATOR --------------------
  const runCampaign = async () => {
    setCampaignLoading(true);
    setCampaignResult(null);
    try {
      const assetList = Object.entries(requestedAssets).filter(([, v]) => v).map(([k]) => k);
      const runRes = await fetch('/api/sfi/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case_id: caseIdRef.current,
          minimal_action: campaignPrompt,
          expected_effect: `Campaña para ${campaignObjective} en ${campaignChannel}`,
          requested_assets: assetList,
          target_domain: campaignChannel || 'general',
          perturbation_type: 'campaign',
          runtime_focus: operational?.runtimeFocus,
        }),
      });
      const runData = await runRes.json();
      let renderData = null;
      if (assetList.length) {
        const renderRes = await fetch('/api/sfi/media/render', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            case_id: caseIdRef.current,
            provider: 'auto',
            assets: assetList,
            prompt: campaignPrompt,
            runtime_focus: operational?.runtimeFocus,
            score_state: scoreState,
          }),
        });
        renderData = await renderRes.json();
      }
      setCampaignResult({ run: runData, render: renderData });
      await loadAllData();
    } catch (err: any) {
      setCampaignResult({ ok: false, error: err?.message ?? 'Error ejecutando campaña.' });
    } finally {
      setCampaignLoading(false);
    }
  };

  // -------------------- CIERRE DE CICLO (OUTCOME + LESSON) --------------------
  const closeExecutionCycle = async () => {
    if (!outcomeText.trim() || !lessonText.trim()) {
      setClosureResult({ ok: false, error: 'Falta Outcome o Lesson.' });
      return;
    }
    setClosureLoading(true);
    setClosureResult(null);
    try {
      const execRes = await fetch(`/api/sfi/execution-state?case_id=${caseIdRef.current}`, { cache: 'no-store' });
      const execData = await execRes.json();
      const lastLedger = execData?.ledgerEntries?.[0];
      if (!lastLedger?.id) throw new Error('No hay ejecución previa.');
      const outcomeRes = await fetch('/api/sfi/outcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          execution_id: lastLedger.id,
          case_id: caseIdRef.current,
          outcome_status: 'success',
          observed_effect: { description: outcomeText },
          unexpected_effects: [],
          prediction_accuracy: 0.8,
        }),
      });
      const outcomeData = await outcomeRes.json();
      if (!outcomeData?.ok) throw new Error(outcomeData?.error ?? 'No se registró outcome.');
      const lessonRes = await fetch('/api/sfi/lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outcome_id: outcomeData.outcome.id,
          case_id: caseIdRef.current,
          lesson: lessonText,
          updates_direction_engine: true,
          updates_risk_engine: true,
          updates_capability_engine: true,
          atlas_update: atlasUpdate,
        }),
      });
      const lessonData = await lessonRes.json();
      if (!lessonData?.ok) throw new Error(lessonData?.error ?? 'No se registró lesson.');
      setClosureResult({ ok: true, outcome: outcomeData.outcome, lesson: lessonData.lesson });
      setOutcomeText('');
      setLessonText('');
      await loadAllData();
    } catch (err: any) {
      setClosureResult({ ok: false, error: err?.message ?? 'Error cerrando ciclo.' });
    } finally {
      setClosureLoading(false);
    }
  };

  // -------------------- PRESIÓN SEMÁNTICA --------------------
  const handleSemanticInput = (val: string) => {
    const newPressure = Math.min(1, val.length / 240);
    setSemanticPressure(newPressure);
    const newDrift = Math.min(1, 0.2 + (val.length / 600));
    setDrift(newDrift);
  };

  // -------------------- RENDERIZADO --------------------
  if (loading) {
    return (
      <main style={{ background: '#060605', color: '#c8c4b8', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'JetBrains Mono', monospace" }}>
        <style jsx global>{globalCss}</style>
        Cargando Observatorio Operacional...
      </main>
    );
  }

  const phiVal = n(scoreState.phi, 3);
  const currentRegime = scoreState.regime ?? operational?.systemRegime ?? 'sin régimen';
  const counts = operational?.counts ?? {};
  const readiness = operational?.executionReadiness ?? {};
  const runtimeFocus = operational?.runtimeFocus ?? {};

  return (
    <main style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#060605', fontFamily: "'JetBrains Mono', monospace", color: '#c8c4b8' }}>
      <style jsx global>{globalCss}</style>

      <header id="hdr">
        <div className="hdr-brand">SFI</div>
        <div className="hdr-sep" />
        <div className="hdr-stat">SCORE FRICTION <span>OPERACIONAL</span></div>
        <div className="hdr-sep" />
        <div className="hdr-phi">Φ_SF <em>{phiVal}</em></div>
        <div className="hdr-sep" />
        <div className={`hdr-regime ${regimeClass(currentRegime)}`}>{currentRegime}</div>
        <div className="hdr-right">
          <div className="hdr-clock">{new Date().toISOString().slice(0, 19).replace('T', ' ')}</div>
        </div>
      </header>

      <section id="obs">
        {loadError && <div className="error-strip">{loadError}</div>}

        {/* ZONA A */}
        <div className="zone zone-a">
          <div className="panel" onClick={() => openDictamen('Φ_SF · Régimen', scoreState, currentRegime, riskFromGap(readiness.capability_gap), 'Leer régimen y ejecutar solo acción mínima verificable.')}>
            <div className="panel-label">Φ_SF · Régimen</div>
            <div className="panel-topo">TOPO-II</div>
            <div className="panel-body">
              <canvas ref={phiCanvasRef} width="240" height="200" style={{ width: '100%', height: 'auto', minHeight: '140px' }} />
              <div className="phi-core">
                <div className={`phi-big ${phiClass(scoreState.phi)}`}>{phiVal}</div>
                <div className="phi-eq">IHG · NTI / (1 + LDI)</div>
                <div className={`phi-regime ${regimeClass(currentRegime)}`}>{currentRegime}</div>
              </div>
              <div className="phi-vars">
                <Metric label="IHG" value={n(scoreState.ihg, 2)} />
                <Metric label="NTI" value={n(scoreState.nti, 2)} />
                <Metric label="LDI" value={n(scoreState.ldi, 2)} />
              </div>
            </div>
          </div>

          <div className="panel" onClick={() => openDictamen('Campo de Fricción', { phi: scoreState.phi, ldi: scoreState.ldi }, 'activo', riskFromGap(readiness.capability_gap), 'Reducir ambigüedad antes de ampliar producción.')}>
            <div className="panel-label">Campo de Fricción</div>
            <div className="panel-topo">TOPO-II</div>
            <div className="panel-body">
              <canvas ref={fieldCanvasRef} width="360" height="200" style={{ width: '100%', height: 'auto', minHeight: '140px' }} />
            </div>
          </div>

          <div className="panel" onClick={() => openDictamen('Cognitive Twin', { drift, phi: scoreState.phi }, 'estable', 'bajo', 'Alinear con observaciones externas.')}>
            <div className="panel-label">Cognitive Twin</div>
            <div className="panel-topo">TOPO-I</div>
            <div className="panel-body">
              <canvas ref={twinCanvasRef} width="320" height="200" style={{ width: '100%', height: 'auto', minHeight: '140px' }} />
            </div>
          </div>

          <div className="panel" onClick={() => openDictamen('World Spectrum', runtimeFocus, 'integrado', runtimeFocus.vector ? 'bajo' : 'medio', 'Fijar vector antes de producir material.')}>
            <div className="panel-label">World Spectrum</div>
            <div className="panel-topo">TOPO-III</div>
            <div className="panel-body">
              <canvas ref={worldCanvasRef} width="300" height="200" style={{ width: '100%', height: 'auto', minHeight: '140px' }} />
            </div>
          </div>
        </div>

        {/* ZONA B */}
        <div className="zone zone-b">
          <div className="panel" onClick={() => openDictamen('Tensión Longitudinal', { ldi: scoreState.ldi, drift }, 'monitoreo', 'crítico si >0.75', 'Alinear acciones')}>
            <div className="panel-label">Tensión Longitudinal</div>
            <div className="panel-topo">TOPO-II</div>
            <div className="panel-body">
              <canvas ref={spectrCanvasRef} width="400" height="180" style={{ width: '100%', height: 'auto', minHeight: '120px' }} />
            </div>
          </div>

          <div className="panel" onClick={() => openDictamen('Presión Semántica', { pressure: semanticPressure, drift }, 'variable', 'bajo', 'Escribir observaciones')}>
            <div className="panel-label">Presión Semántica</div>
            <div className="panel-topo">TOPO-I</div>
            <div className="panel-body">
              <textarea style={{ width: '100%', background: '#0a0a09', border: '1px solid rgba(200,169,81,0.2)', color: '#c8c4b8', fontFamily: 'monospace', fontSize: '12px', padding: '8px' }} rows={3} placeholder="Observación estructural..." onInput={(e) => handleSemanticInput((e.target as HTMLTextAreaElement).value)} />
              <div style={{ marginTop: '8px', fontSize: '11px', color: '#C8A951' }}>ψ {semanticPressure.toFixed(3)}</div>
            </div>
          </div>

          <div className="panel" onClick={() => openDictamen('Proyección Estocástica', { phi: scoreState.phi }, 'proyectando', 'medio', 'Usar planificación')}>
            <div className="panel-label">Proyección Estocástica</div>
            <div className="panel-topo">TOPO-II</div>
            <div className="panel-body">
              <canvas ref={projCanvasRef} width="340" height="180" style={{ width: '100%', height: 'auto', minHeight: '120px' }} />
            </div>
          </div>

          <div className="panel" onClick={() => openDictamen('Entropía · Agente', { gap: readiness.capability_gap }, 'calculando', 'medio', 'Reducir con evidencia')}>
            <div className="panel-label">Entropía · Agente</div>
            <div className="panel-topo">TOPO-II</div>
            <div className="panel-body">
              <canvas ref={entropCanvasRef} width="260" height="180" style={{ width: '100%', height: 'auto', minHeight: '120px' }} />
            </div>
          </div>
        </div>

        {/* ZONA C */}
        <div className="zone zone-c">
          <div className="panel" onClick={() => openDictamen('Cronología Viva', { events: operational?.events?.slice(0,5) }, 'histórico', 'bajo', 'Actualizar con nueva data')}>
            <div className="panel-label">Cronología Viva</div>
            <div className="panel-topo">TOPO-III</div>
            <div className="panel-body">
              <canvas ref={chronCanvasRef} width="520" height="160" style={{ width: '100%', height: 'auto', minHeight: '100px' }} />
            </div>
          </div>

          <div className="panel" onClick={() => openDictamen('Bitácora Operacional', operational?.latestObservation, operational?.latestObservation ? 'activo' : 'vacío', 'bajo', 'Registrar evento')}>
            <div className="panel-label">Bitácora Operacional</div>
            <div className="panel-topo">TOPO-III</div>
            <div className="panel-body">
              <pre className="json-box">{JSON.stringify(operational?.latestObservation ?? {}, null, 2)}</pre>
            </div>
          </div>

          <div className="panel">
            <div className="panel-label">AMV · Agente</div>
            <div className="panel-topo">TOPO-I</div>
            <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ flex: 1, overflowY: 'auto', maxHeight: '120px', fontSize: '11px' }}>
                {amvMessages.map((msg, idx) => (
                  <div key={idx} className={msg.role === 'user' ? 'a-msg-obs' : 'a-msg-agt'}>{msg.content}</div>
                ))}
                {amvLoading && <div className="a-msg-agt">AMV procesando...</div>}
              </div>
              <div className="agent-footer" style={{ display: 'flex', gap: '4px' }}>
                <input type="text" className="agent-in" value={amvInput} onChange={(e) => setAmvInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendAmvMessage()} placeholder="Pregunta al AMV..." style={{ flex: 1, background: '#0a0a09', border: '1px solid rgba(200,169,81,0.3)', padding: '6px', color: '#c8c4b8' }} />
                <button onClick={sendAmvMessage} style={{ background: 'rgba(200,169,81,0.1)', border: '1px solid #C8A951', color: '#C8A951', padding: '4px 8px', cursor: 'pointer' }}>Enviar</button>
              </div>
              <div style={{ fontSize: '10px', color: amvStatusColor }}>{amvStatus}</div>
            </div>
          </div>

          <div className="panel wide" onClick={() => openDictamen('Operational Counts', counts, 'activo', 'bajo', 'Revisar actividad')}>
            <div className="panel-label">Operational Counts</div>
            <div className="panel-topo">TOPO-III</div>
            <div className="panel-body">
              <Metric label="Perturbations" value={counts.perturbations ?? 0} />
              <Metric label="Capability Checks" value={counts.capabilityChecks ?? 0} />
              <Metric label="Execution Ledger" value={counts.ledgerEntries ?? 0} />
              <Metric label="Media Assets" value={counts.mediaAssets ?? 0} />
              <Metric label="Outcomes" value={counts.outcomes ?? 0} />
              <Metric label="Lessons" value={counts.lessons ?? 0} />
            </div>
          </div>

          <div className="panel wide" onClick={() => openDictamen('Execution Readiness', readiness, readiness.executable ? 'listo' : 'no listo', riskFromGap(readiness.capability_gap), 'Ejecutar si listo')}>
            <div className="panel-label">Execution Readiness</div>
            <div className="panel-topo">TOPO-III</div>
            <div className="panel-body">
              <div className={`readiness ${readiness.executable ? 'ready' : 'blocked'}`}>{readiness.executable ? 'LISTO' : 'NO LISTO'}</div>
              <Metric label="capability_gap" value={n(readiness.capability_gap, 2)} />
              <pre className="json-box">{JSON.stringify({ missing: readiness.missing_capabilities ?? [] }, null, 2)}</pre>
            </div>
          </div>

          <div className="panel wide">
            <div className="panel-label">Media Asset Gallery</div>
            <div className="panel-topo">TOPO-III</div>
            <div className="panel-body">
              <div className="media-grid">
                {mediaAssets.length === 0 && <div className="empty">Sin assets registrados.</div>}
                {mediaAssets.map((asset) => (
                  <div key={asset.id} className="asset-card">
                    {asset.asset_type === 'image' && asset.file_url && <img src={asset.file_url} alt="asset" />}
                    {asset.asset_type === 'video' && asset.file_url && <video src={asset.file_url} controls />}
                    {asset.asset_type === 'audio' && asset.file_url && <audio src={asset.file_url} controls />}
                    {!['image', 'video', 'audio'].includes(asset.asset_type) && <pre>{JSON.stringify(asset, null, 2)}</pre>}
                    <small>{asset.asset_type}</small>
                    <strong>{asset.provider_used ?? 'provider no registrado'}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="panel wide">
            <div className="panel-label">Campaign Generator</div>
            <div className="panel-topo">TOPO-III</div>
            <div className="panel-body">
              <label>Canal</label>
              <input value={campaignChannel} onChange={(e) => setCampaignChannel(e.target.value)} placeholder="medium / linkedin / tiktok" />
              <label>Objetivo</label>
              <input value={campaignObjective} onChange={(e) => setCampaignObjective(e.target.value)} placeholder="persistencia / autoridad" />
              <label>Prompt</label>
              <textarea rows={3} value={campaignPrompt} onChange={(e) => setCampaignPrompt(e.target.value)} placeholder="Describe la campaña" />
              <div className="checkbox-row">
                {Object.entries(requestedAssets).map(([key, val]) => (
                  <label key={key}><input type="checkbox" checked={val} onChange={(e) => setRequestedAssets(prev => ({ ...prev, [key]: e.target.checked }))} /> {key}</label>
                ))}
              </div>
              <button onClick={runCampaign} disabled={campaignLoading || !campaignPrompt.trim()}>{campaignLoading ? 'Ejecutando...' : 'Run Campaign'}</button>
              {campaignResult && <pre className="result-box">{JSON.stringify(campaignResult, null, 2)}</pre>}
            </div>
          </div>

          <div className="panel wide">
            <div className="panel-label">Outcome + Lesson</div>
            <div className="panel-topo">TOPO-III</div>
            <div className="panel-body">
              <label>Outcome</label>
              <textarea rows={2} value={outcomeText} onChange={(e) => setOutcomeText(e.target.value)} placeholder="Qué ocurrió después de la ejecución" />
              <label>Lesson</label>
              <textarea rows={2} value={lessonText} onChange={(e) => setLessonText(e.target.value)} placeholder="Qué aprendió el sistema" />
              <label className="inline"><input type="checkbox" checked={atlasUpdate} onChange={(e) => setAtlasUpdate(e.target.checked)} /> atlas_update</label>
              <button onClick={closeExecutionCycle} disabled={closureLoading}>{closureLoading ? 'Cerrando...' : 'Close Institutional Cycle'}</button>
              {closureResult && <pre className="result-box">{JSON.stringify(closureResult, null, 2)}</pre>}
            </div>
          </div>
        </div>
      </section>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setModalOpen(false)}>✕</button>
            <h3>{modalContent.title}</h3>
            <p><strong>Dictamen:</strong> {modalContent.narrative}</p>
            <p><strong>Estado:</strong> {modalContent.status}</p>
            <p><strong>Riesgo:</strong> {modalContent.risk}</p>
            <p><strong>Siguiente acción:</strong> {modalContent.nextAction}</p>
            <pre>{modalContent.evidence}</pre>
          </div>
        </div>
      )}
    </main>
  );
}

// -------------------- COMPONENTES AUXILIARES --------------------
function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="metric-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

// -------------------- CSS GLOBAL COMPLETO --------------------
const globalCss = `
:root {
  --void: #060605;
  --surface: #0d0d0c;
  --gold: #C8A951;
  --red: #b85050;
  --green: #3a8a5a;
  --text: #c8c4b8;
  --muted: rgba(200,196,184,0.48);
  --line: rgba(200,169,81,0.12);
  --mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  --disp: 'Syncopate', ui-sans-serif, system-ui;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--void); overflow: hidden; }
.screen { width: 100vw; height: 100vh; background: var(--void); color: var(--text); font-family: var(--mono); }
.center { display: flex; align-items: center; justify-content: center; }
#hdr {
  position: fixed; top: 0; left: 0; right: 0; height: 30px; display: flex; align-items: center; gap: 16px;
  padding: 0 12px; border-bottom: 1px solid var(--line); background: rgba(6,6,5,0.98); z-index: 10;
}
.hdr-brand { font-family: var(--disp); font-size: 10px; letter-spacing: .32em; color: var(--gold); font-weight: 700; }
.hdr-sep { width: 1px; height: 14px; background: var(--line); }
.hdr-stat, .hdr-clock { font-size: 10px; color: var(--muted); letter-spacing: .16em; text-transform: uppercase; }
.hdr-stat span, .hdr-phi em { color: var(--gold); font-style: normal; }
.hdr-phi { font-size: 11px; color: var(--muted); }
.hdr-regime { font-size: 10px; letter-spacing: .18em; text-transform: uppercase; }
.hdr-right { margin-left: auto; }
.reg-homeost, .ok, .ready { color: var(--green); }
.reg-entrop, .crit, .blocked { color: var(--red); }
.reg-critico, .warn, .reg-unknown { color: var(--gold); }
#obs {
  position: fixed; top: 30px; left: 0; right: 0; bottom: 0; overflow: auto;
  display: flex; flex-direction: column; gap: 4px;
}
.error-strip {
  position: sticky; top: 0; padding: 6px 10px; color: var(--red);
  border-bottom: 1px solid rgba(184,80,80,0.3); background: rgba(184,80,80,0.08); font-size: 11px; z-index: 9;
}
.zone {
  display: flex; gap: 2px; padding: 4px;
  overflow-x: auto; min-height: 0;
}
.zone-a { height: 34%; }
.zone-b { height: 34%; }
.zone-c { height: 32%; }
.panel {
  position: relative; min-width: 330px; height: 100%; border: 1px solid rgba(200,169,81,0.08);
  background: radial-gradient(circle at 50% 0%, rgba(200,169,81,0.04), transparent 55%), var(--void);
  cursor: pointer; overflow: hidden; border-radius: 4px;
}
.panel.wide { min-width: 460px; }
.panel:hover { background: radial-gradient(circle at 50% 0%, rgba(200,169,81,0.08), transparent 55%), var(--void); }
.panel-label {
  position: absolute; top: 8px; left: 12px; font-size: 9px; letter-spacing: .18em;
  text-transform: uppercase; color: rgba(200,169,81,0.52); z-index: 2;
}
.panel-topo {
  position: absolute; top: 8px; right: 12px; font-size: 8px; letter-spacing: .16em;
  color: rgba(200,196,184,0.25); z-index: 2;
}
.panel-body {
  height: 100%; padding: 32px 12px 12px; overflow: auto;
}
.phi-core { display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 4px; margin: 10px 0; }
.phi-big { font-family: var(--disp); font-size: 40px; font-weight: 700; letter-spacing: -0.06em; }
.phi-eq { font-size: 9px; color: var(--muted); }
.phi-regime { font-size: 9px; letter-spacing: .2em; text-transform: uppercase; }
.phi-vars { display: flex; gap: 12px; justify-content: center; margin-top: 8px; }
.metric-row { display: flex; justify-content: space-between; gap: 12px; padding: 4px 0; border-bottom: 1px solid rgba(200,169,81,0.08); font-size: 11px; }
.metric-row span { color: var(--muted); }
.metric-row strong { color: var(--gold); }
.json-box, .result-box, .asset-card pre, .modal-content pre {
  width: 100%; max-height: 120px; overflow: auto; white-space: pre-wrap;
  font-size: 9px; line-height: 1.5; color: rgba(200,196,184,0.76);
  background: rgba(0,0,0,0.28); border: 1px solid rgba(200,169,81,0.08); padding: 6px;
}
.readiness { font-family: var(--disp); font-size: 22px; margin-bottom: 12px; }
.field-view { height: 100%; display: flex; flex-direction: column; justify-content: center; }
.field-line { height: 2px; background: var(--gold); box-shadow: 0 0 24px rgba(200,169,81,0.5); margin: 8px 0; }
.field-line.secondary { background: var(--red); box-shadow: 0 0 24px rgba(184,80,80,0.35); }
.a-msg-obs { font-size: 10px; color: rgba(200,169,81,0.5); margin: 4px 0; }
.a-msg-agt { font-size: 10px; color: #c8c4b8; border-left: 1px solid rgba(200,169,81,0.2); padding-left: 6px; margin: 4px 0; }
.media-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; }
.asset-card { border: 1px solid rgba(200,169,81,0.12); padding: 6px; background: rgba(0,0,0,0.22); display: flex; flex-direction: column; gap: 4px; }
.asset-card img, .asset-card video { width: 100%; max-height: 100px; object-fit: cover; }
.asset-card audio { width: 100%; }
.asset-card small { color: var(--muted); font-size: 8px; }
.asset-card strong { color: var(--gold); font-size: 9px; }
.empty { color: var(--muted); font-size: 10px; }
label { display: block; margin: 8px 0 4px; color: var(--muted); font-size: 9px; letter-spacing: .08em; text-transform: uppercase; }
label.inline { display: flex; align-items: center; gap: 6px; }
input, textarea, select {
  width: 100%; background: rgba(0,0,0,0.36); border: 1px solid rgba(200,169,81,0.18);
  color: var(--text); padding: 6px; font-family: var(--mono); font-size: 10px; outline: none;
}
.checkbox-row { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0; }
.checkbox-row label { display: flex; align-items: center; gap: 4px; margin: 0; text-transform: none; }
button { background: rgba(200,169,81,0.08); border: 1px solid rgba(200,169,81,0.4); color: var(--gold); padding: 6px 10px; font-family: var(--mono); cursor: pointer; font-size: 10px; }
button:disabled { opacity: .35; cursor: not-allowed; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.82); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal-content { width: min(600px, 90vw); max-height: 80vh; overflow: auto; background: var(--surface); border: 1px solid rgba(200,169,81,0.38); padding: 20px; font-size: 12px; line-height: 1.5; }
.modal-content h3 { margin-top: 0; color: var(--gold); letter-spacing: .12em; text-transform: uppercase; }
.modal-close { float: right; padding: 2px 6px; }
`;