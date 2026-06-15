'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

// ==================== TIPOS ====================
interface ScoreState {
  ihg: number;
  nti: number;
  ldi: number;
  phi: number;
  regime: string;
}

interface OperationalState {
  ok: boolean;
  systemRegime: string;
  organs: any[];
  events: any[];
  patterns: any[];
  attractors: any[];
  institutionalMemory: any[];
  counts?: {
    perturbations: number;
    capabilityChecks: number;
    ledgerEntries: number;
    mediaAssets: number;
    outcomes: number;
    lessons: number;
  };
  executionReadiness?: {
    capability_gap: number;
    executable: boolean;
    missing_capabilities: string[];
  };
  latestObservation?: any;
}

interface MediaAsset {
  id: string;
  asset_type: string;
  provider_used: string;
  file_url: string;
  file_path?: string;
  prompt?: string;
  created_at: string;
}

// ==================== COMPONENTE PRINCIPAL ====================
export default function ScoreFrictionOperationalPage() {
  // --- Estados de datos reales ---
  const [scoreState, setScoreState] = useState<ScoreState>({ ihg: 0.52, nti: 0.48, ldi: 0.61, phi: 0.23, regime: 'Crítico' });
  const [operational, setOperational] = useState<OperationalState | null>(null);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);

  // --- AMV chat ---
  const [amvMessages, setAmvMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: 'Observatorio inicializado. Haz clic en cualquier panel para obtener una interpretación de sus métricas.' },
  ]);
  const [amvInput, setAmvInput] = useState('');
  const [amvLoading, setAmvLoading] = useState(false);
  const [amvStatus, setAmvStatus] = useState('◉ EN LÍNEA');
  const [amvStatusColor, setAmvStatusColor] = useState('var(--green)');

  // --- Presión semántica ---
  const [semanticPressure, setSemanticPressure] = useState(0);
  const [drift, setDrift] = useState(0.28);

  // --- Campaign Generator ---
  const [campaignChannel, setCampaignChannel] = useState('');
  const [campaignObjective, setCampaignObjective] = useState('');
  const [campaignPrompt, setCampaignPrompt] = useState('');
  const [requestedAssets, setRequestedAssets] = useState({
    text: true, image: false, video: false, audio: false, markdown: false, json: false,
  });
  const [campaignResult, setCampaignResult] = useState<any>(null);
  const [campaignLoading, setCampaignLoading] = useState(false);

  // --- Outcome / Lesson ---
  const [outcomeText, setOutcomeText] = useState('');
  const [lessonText, setLessonText] = useState('');
  const [atlasUpdate, setAtlasUpdate] = useState(true);
  const [closureResult, setClosureResult] = useState<any>(null);
  const [closureLoading, setClosureLoading] = useState(false);

  // --- Modal ---
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', narrative: '', evidence: '', status: '', risk: '', nextAction: '' });

  const caseIdRef = useRef('SFI-OP-' + Math.random().toString(36).substring(2, 10).toUpperCase());

  // --- Refs canvas ---
  const phiCanvasRef = useRef<HTMLCanvasElement>(null);
  const fieldCanvasRef = useRef<HTMLCanvasElement>(null);
  const twinCanvasRef = useRef<HTMLCanvasElement>(null);
  const worldCanvasRef = useRef<HTMLCanvasElement>(null);
  const spectrCanvasRef = useRef<HTMLCanvasElement>(null);
  const projCanvasRef = useRef<HTMLCanvasElement>(null);
  const entropCanvasRef = useRef<HTMLCanvasElement>(null);
  const chronCanvasRef = useRef<HTMLCanvasElement>(null);

  // --- Partículas y animaciones ---
  const fieldParticlesRef = useRef<any[]>([]);
  const tensionHistoryRef = useRef<number[]>([]);
  const animationRef = useRef<number | null>(null);
  const epochsRef = useRef<any[]>([]);

  // ==================== FUNCIONES DE DIBUJO ====================
  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `${r},${g},${b}`;
  };
  const GOLD_RGB = hexToRgb('#C8A951');
  const RED_RGB = hexToRgb('#b85050');
  const GRN_RGB = hexToRgb('#3a8a5a');

  const drawPhiBg = useCallback(() => {
    const c = phiCanvasRef.current;
    if (!c || !c.width) return;
    const ctx = c.getContext('2d')!;
    const { phi, regime } = scoreState;
    const t = Date.now() * 0.008;
    ctx.clearRect(0,0,c.width,c.height);
    const rgb = regime === 'Homeostático' ? GRN_RGB : regime === 'Entrópico' ? RED_RGB : GOLD_RGB;
    const rings = 5;
    for (let r=rings; r>0; r--) {
      const rad = (c.width * 0.38) * (r/rings);
      const osc = Math.sin(t + r*0.7) * 0.015;
      const alpha = (0.02 + osc) * (r/rings);
      ctx.beginPath();
      ctx.arc(c.width/2, c.height/2, rad, 0, Math.PI*2);
      ctx.strokeStyle = `rgba(${rgb},${Math.max(0.01, alpha)})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    const pulseA = regime === 'Entrópico' ? Math.abs(Math.sin(t*2))*0.06 : 0.02;
    const grad = ctx.createRadialGradient(c.width/2,c.height/2,0,c.width/2,c.height/2,c.width/2);
    grad.addColorStop(0, `rgba(${rgb},${pulseA})`);
    grad.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,c.width,c.height);
  }, [scoreState]);

  const drawFrictionField = useCallback(() => {
    const c = fieldCanvasRef.current;
    if (!c || !c.width) return;
    const ctx = c.getContext('2d')!;
    const { phi, ldi } = scoreState;
    const t = Date.now() * 0.005;
    ctx.fillStyle = 'rgba(6,6,5,0.08)';
    ctx.fillRect(0,0,c.width,c.height);
    const coh = phi;
    const fric = 1 - coh;

    if (fieldParticlesRef.current.length === 0) {
      for (let i=0; i<160; i++) {
        fieldParticlesRef.current.push({
          x: Math.random()*c.width,
          y: Math.random()*c.height,
          vx:0, vy:0,
          age: Math.random(),
          maxAge: 0.6 + Math.random()*0.8,
        });
      }
    }
    fieldParticlesRef.current.forEach(p => {
      const nx = p.x/c.width - 0.5;
      const ny = p.y/c.height - 0.5;
      const dist = Math.sqrt(nx*nx + ny*ny);
      const angle = Math.atan2(ny, nx);
      const perturb = fric * (Math.sin(nx*6 + t*1.3) * Math.cos(ny*5 - t) + Math.sin(dist*8 - t*1.7) * ldi * 0.6);
      const flowAngle = angle + Math.PI/2 * coh + perturb;
      const speed = 0.6 + dist * 1.2;
      p.vx = p.vx * 0.85 + Math.cos(flowAngle) * speed * 0.15;
      p.vy = p.vy * 0.85 + Math.sin(flowAngle) * speed * 0.15;
      p.x += p.vx;
      p.y += p.vy;
      p.age += 0.008;
      if (p.age > p.maxAge || p.x<0 || p.x>c.width || p.y<0 || p.y>c.height) {
        p.x = Math.random()*c.width;
        p.y = Math.random()*c.height;
        p.vx=0; p.vy=0; p.age=0;
      }
      const life = Math.sin((p.age/p.maxAge)*Math.PI);
      const alpha = life * (0.04 + coh * 0.1);
      const rgb = phi < 0.25 ? RED_RGB : phi > 0.6 ? GRN_RGB : GOLD_RGB;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 0.8, 0, Math.PI*2);
      ctx.fillStyle = `rgba(${rgb},${alpha})`;
      ctx.fill();
    });
    if (fric > 0.5) {
      const nFrac = Math.floor(fric * 5);
      for (let i=0;i<nFrac;i++) {
        const fx = (Math.sin(t*0.3+i*2.1)*0.5+0.5)*c.width;
        const fy = (Math.cos(t*0.2+i*1.7)*0.5+0.5)*c.height;
        const fl = fric * 30 * (Math.sin(t+i)*0.5+0.5);
        ctx.beginPath();
        ctx.moveTo(fx,fy);
        ctx.lineTo(fx+fl*Math.cos(t+i), fy+fl*Math.sin(t*0.7+i));
        ctx.strokeStyle = `rgba(${RED_RGB},${fric*0.08})`;
        ctx.lineWidth=0.5;
        ctx.stroke();
      }
    }
  }, [scoreState]);

  const drawCognitiveTwin = useCallback(() => {
    const c = twinCanvasRef.current;
    if (!c || !c.width) return;
    const ctx = c.getContext('2d')!;
    const { phi, regime } = scoreState;
    const energy = 0.65, clarity = 0.55, coherence = 0.72;
    const t = Date.now() * 0.004;
    ctx.clearRect(0,0,c.width,c.height);
    const cx = c.width/2, cy = c.height/2;
    const R = Math.min(c.width,c.height) * 0.33;
    const layers = [
      { offset: drift*12, alpha: clarity*0.35+0.05, phase: 0 },
      { offset: energy*8, alpha: energy*0.3+0.05, phase: 1.57 },
      { offset: drift*4, alpha: coherence*0.3+0.05, phase: 3.14 },
      { offset: drift*14, alpha: 0.1, phase: 4.71 },
    ];
    layers.forEach((layer, li) => {
      const pts = 12;
      const misalign = layer.offset * (1-coherence);
      const offX = Math.cos(layer.phase + t*0.3) * misalign;
      const offY = Math.sin(layer.phase + t*0.3) * misalign;
      const r = R * (0.55 + li*0.14) * (0.85 + energy*0.15);
      ctx.beginPath();
      for (let i=0; i<=pts; i++) {
        const a = (i/pts) * Math.PI*2;
        const noise = Math.sin(a*3 + t + li) * drift * 0.18 + Math.cos(a*5 - t*0.7 + li) * (1-clarity) * 0.12;
        const pr = r * (1 + noise);
        const px = cx + offX + Math.cos(a)*pr;
        const py = cy + offY + Math.sin(a)*pr;
        i===0 ? ctx.moveTo(px,py) : ctx.lineTo(px,py);
      }
      ctx.closePath();
      ctx.fillStyle = `rgba(${GOLD_RGB},${layer.alpha})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(${GOLD_RGB},${layer.alpha*2})`;
      ctx.lineWidth=0.8;
      ctx.stroke();
    });
  }, [scoreState, drift]);

  const drawWorldSpectrum = useCallback(() => {
    const c = worldCanvasRef.current;
    if (!c || !c.width) return;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0,0,c.width,c.height);
    const worldVals = [0.72, 0.65, 0.58, 0.81, 0.90];
    const padding = 25;
    const graphH = c.height - padding*2;
    const barGap = (c.width - padding*2) / worldVals.length;
    worldVals.forEach((v,i) => {
      const bx = padding + i*barGap + barGap*0.15;
      const bw = barGap*0.7;
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
    ctx.clearRect(0,0,c.width,c.height);
    const t = Date.now();
    if (t % 100 < 50) {
      const baseT = (scoreState.ldi * 0.6) + (drift * 0.4);
      tensionHistoryRef.current.push(baseT + Math.sin(t*0.08)*0.08 + Math.random()*0.04);
      if (tensionHistoryRef.current.length > 80) tensionHistoryRef.current.shift();
    }
    if (tensionHistoryRef.current.length < 2) return;
    const padLeft=30, padRight=20, padTop=30, padBot=20;
    const w = c.width - padLeft - padRight;
    const h = c.height - padTop - padBot;
    ctx.strokeStyle = 'rgba(200,169,81,0.03)';
    ctx.lineWidth = 0.5;
    for (let g=1;g<=4;g++) {
      const gy = padTop + (h*(g/4));
      ctx.beginPath(); ctx.moveTo(padLeft,gy); ctx.lineTo(padLeft+w,gy); ctx.stroke();
    }
    ctx.beginPath();
    tensionHistoryRef.current.forEach((v,idx) => {
      const x = padLeft + (w * (idx/(tensionHistoryRef.current.length-1)));
      const y = c.height - padBot - (h * Math.max(0, Math.min(1, v)));
      idx===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
    });
    ctx.strokeStyle = `rgba(${GOLD_RGB},0.45)`;
    ctx.lineWidth=1.2;
    ctx.stroke();
  }, [scoreState, drift]);

  const drawStochasticProjection = useCallback(() => {
    const c = projCanvasRef.current;
    if (!c || !c.width) return;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0,0,c.width,c.height);
    const cx = c.width*0.25, cy = c.height*0.55;
    const w = c.width*0.65, h = c.height*0.5;
    const t = Date.now() * 0.005;
    ctx.strokeStyle = 'rgba(200,169,81,0.04)';
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+w,cy); ctx.stroke();
    const paths = 5;
    const steps = 24;
    const phi = scoreState.phi;
    for (let p=0;p<paths;p++) {
      ctx.beginPath();
      ctx.moveTo(cx,cy);
      for (let s=1;s<=steps;s++) {
        const px = cx + (w * (s/steps));
        const driftFactor = (s/steps) * (1.2 - phi) * 45;
        const noise = Math.sin(s*0.4 + t + p) * Math.cos(s*0.7 - t*0.3 + p);
        const py = cy + noise * driftFactor + (Math.sin(t*0.5 + p)*5*(s/steps));
        ctx.lineTo(px, py);
      }
      ctx.strokeStyle = p===0 ? `rgba(${GOLD_RGB},0.5)` : `rgba(${GOLD_RGB},0.06)`;
      ctx.lineWidth = p===0 ? 1.2 : 0.6;
      ctx.stroke();
    }
  }, [scoreState]);

  const drawAgentEntropy = useCallback(() => {
    const c = entropCanvasRef.current;
    if (!c || !c.width) return;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0,0,c.width,c.height);
    const cx = c.width/2, cy = c.height/2;
    const r = Math.min(c.width,c.height)*0.28;
    const t = Date.now() * 0.015;
    const ent = operational?.executionReadiness?.capability_gap ?? 0.3;
    ctx.beginPath();
    ctx.arc(cx,cy,r,0,Math.PI*2);
    ctx.strokeStyle = 'rgba(200,169,81,0.04)';
    ctx.stroke();
    const nodes = 14;
    ctx.fillStyle = `rgba(${GOLD_RGB},0.35)`;
    for (let i=0;i<nodes;i++) {
      const angle = (i/nodes)*Math.PI*2 + (t*0.1);
      const radNoise = Math.sin(t + i*1.7) * ent * 14;
      const nx = cx + Math.cos(angle)*(r+radNoise);
      const ny = cy + Math.sin(angle)*(r+radNoise);
      ctx.beginPath();
      ctx.arc(nx, ny, 1, 0, Math.PI*2);
      ctx.fill();
      if (ent > 0.3 && Math.random()<ent*0.08) {
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(nx,ny);
        ctx.strokeStyle = `rgba(${GOLD_RGB},0.03)`;
        ctx.stroke();
      }
    }
  }, [operational]);

  const drawChronology = useCallback(() => {
    const c = chronCanvasRef.current;
    if (!c || !c.width) return;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0,0,c.width,c.height);
    if (epochsRef.current.length === 0) {
      const labels = ['S-08','S-07','S-06','S-05','S-04','S-03','S-02','S-01','NOW'];
      epochsRef.current = labels.map((l,i) => ({ label:l, phi: 0.3+Math.random()*0.5, event: i===4 || i===7 }));
    }
    const padLeft=40, padRight=40;
    const w = c.width - padLeft - padRight;
    const cy = c.height*0.6;
    ctx.strokeStyle = 'rgba(200,169,81,0.08)';
    ctx.beginPath(); ctx.moveTo(padLeft,cy); ctx.lineTo(padLeft+w,cy); ctx.stroke();
    const space = w/(epochsRef.current.length-1);
    epochsRef.current.forEach((ep,i) => {
      const x = padLeft + i*space;
      const barH = ep.phi * 35;
      ctx.fillStyle = `rgba(${GOLD_RGB},0.03)`;
      ctx.fillRect(x-3, cy-40, 6, 80);
      ctx.beginPath();
      ctx.moveTo(x,cy);
      ctx.lineTo(x, cy-barH);
      ctx.strokeStyle = ep.event ? `rgb(${RED_RGB})` : `rgba(${GOLD_RGB},0.5)`;
      ctx.lineWidth = ep.event ? 1.5 : 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, cy-barH, ep.event ? 2.5 : 1.5, 0, Math.PI*2);
      ctx.fillStyle = ep.event ? `rgb(${RED_RGB})` : `rgb(${GOLD_RGB})`;
      ctx.fill();
    });
  }, []);

  // Loop de animación
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

  // ==================== CARGA DE DATOS REALES ====================
  const loadAllData = useCallback(async () => {
    try {
      const [scoreRes, opRes, execRes] = await Promise.all([
        fetch('/api/scorefriction/state'),
        fetch(`/api/sfi/operational-state?case_id=${caseIdRef.current}`),
        fetch(`/api/sfi/execution-state?case_id=${caseIdRef.current}`),
      ]);
      const scoreData = await scoreRes.json();
      const opData = await opRes.json();
      const execData = await execRes.json();
      if (scoreData.ok) {
        setScoreState({
          ihg: scoreData.ihg ?? 0.52,
          nti: scoreData.nti ?? 0.48,
          ldi: scoreData.ldi ?? 0.61,
          phi: scoreData.phi ?? 0.23,
          regime: scoreData.regime ?? 'Crítico',
        });
      }
      if (opData.ok) {
        const counts = {
          perturbations: execData.perturbations?.length || 0,
          capabilityChecks: execData.capabilityChecks?.length || 0,
          ledgerEntries: execData.ledgerEntries?.length || 0,
          mediaAssets: execData.mediaAssets?.length || 0,
          outcomes: execData.outcomes?.length || 0,
          lessons: execData.lessons?.length || 0,
        };
        const lastCap = execData.capabilityChecks?.[0];
        const readiness = lastCap ? {
          capability_gap: lastCap.capability_gap,
          executable: lastCap.executable,
          missing_capabilities: lastCap.capabilities_missing || [],
        } : null;
        setOperational({ ...opData, counts, executionReadiness: readiness });
      }
      if (execData.ok) setMediaAssets(execData.mediaAssets || []);
    } catch (err) {
      console.error('Error loading data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 10000);
    return () => clearInterval(interval);
  }, [loadAllData]);

  // ==================== AMV REAL (envío manual y automático) ====================
  const sendAmvMessageWithCustomPrompt = async (customPrompt: string) => {
    if (!customPrompt.trim()) return;
    const userMsg = { role: 'user' as const, content: customPrompt };
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
          message: customPrompt,
          context: {
            sys: scoreState,
            operational: operational,
            mediaAssetsCount: mediaAssets.length,
            lastOutcome: outcomeText,
            lastLesson: lessonText,
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
      console.error('AMV error:', err);
      setAmvMessages(prev => [...prev, { role: 'assistant', content: 'Error al interpretar la métrica. Revisa la conexión.' }]);
      setAmvStatus('△ DEGRADADO');
      setAmvStatusColor('var(--red)');
    } finally {
      setAmvLoading(false);
    }
  };

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
            operational: operational,
            mediaAssetsCount: mediaAssets.length,
            lastOutcome: outcomeText,
            lastLesson: lessonText,
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
      console.error('AMV error:', err);
      setAmvMessages(prev => [...prev, { role: 'assistant', content: 'Error de comunicación con AMV.' }]);
      setAmvStatus('△ DEGRADADO');
      setAmvStatusColor('var(--red)');
    } finally {
      setAmvLoading(false);
    }
  };

  // ==================== MODAL + ENVÍO AL AMV ====================
  const openModalAndSendQuery = (title: string, narrative: string, evidence: any, status: string, risk: string, nextAction: string, amvQuestion: string) => {
    setModalContent({ title, narrative, evidence: JSON.stringify(evidence, null, 2), status, risk, nextAction });
    setModalOpen(true);
    sendAmvMessageWithCustomPrompt(amvQuestion);
  };
  const closeModal = () => setModalOpen(false);

  // ==================== CAMPAIGN GENERATOR ====================
  const runCampaign = async () => {
    setCampaignLoading(true);
    setCampaignResult(null);
    try {
      const assetList = Object.entries(requestedAssets).filter(([,v]) => v).map(([k]) => k);
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
          }),
        });
        renderData = await renderRes.json();
      }
      setCampaignResult({ run: runData, render: renderData });
      await loadAllData();
    } catch (err: any) {
      setCampaignResult({ error: err.message });
    } finally {
      setCampaignLoading(false);
    }
  };

  // ==================== CIERRE DE CICLO ====================
  const closeExecutionCycle = async () => {
    if (!outcomeText.trim() || !lessonText.trim()) {
      alert('Debes proporcionar Outcome y Lesson');
      return;
    }
    setClosureLoading(true);
    setClosureResult(null);
    try {
      const execRes = await fetch(`/api/sfi/execution-state?case_id=${caseIdRef.current}`);
      const execData = await execRes.json();
      const lastLedger = execData.ledgerEntries?.[0];
      if (!lastLedger) throw new Error('No hay ejecuciones previas');
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
      if (!outcomeData.ok) throw new Error(outcomeData.error);
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
      if (!lessonData.ok) throw new Error(lessonData.error);
      setClosureResult({ outcome: outcomeData.outcome, lesson: lessonData.lesson });
      await loadAllData();
      setOutcomeText('');
      setLessonText('');
    } catch (err: any) {
      setClosureResult({ error: err.message });
    } finally {
      setClosureLoading(false);
    }
  };

  // ==================== PRESIÓN SEMÁNTICA ====================
  const handleSemanticInput = (val: string) => {
    const newPressure = Math.min(1, val.length / 240);
    setSemanticPressure(newPressure);
    const newDrift = Math.min(1, 0.2 + (val.length / 600));
    setDrift(newDrift);
  };

  // ==================== RENDER ====================
  if (loading) {
    return (
      <div style={{ background:'#060605', color:'#c8c4b8', height:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
        Cargando Observatorio Operacional...
      </div>
    );
  }

  const phiVal = scoreState.phi.toFixed(3);
  const regimeClass = scoreState.regime === 'Homeostático' ? 'reg-homeost' : (scoreState.regime === 'Entrópico' ? 'reg-entrop' : 'reg-critico');
  const phiClass = scoreState.phi < 0.22 ? 'crit' : (scoreState.phi > 0.58 ? 'ok' : 'warn');

  return (
    <div style={{ width:'100vw', height:'100vh', overflow:'hidden', background:'#060605', fontFamily:"'JetBrains Mono', monospace", color:'#c8c4b8' }}>
      <style jsx global>{`
        :root {
          --void: #060605;
          --dark: #0a0a09;
          --surface: #0d0d0c;
          --gold: #C8A951;
          --gold-2: rgba(200,169,81,0.25);
          --gold-3: rgba(200,169,81,0.08);
          --gold-4: rgba(200,169,81,0.04);
          --red: #b85050;
          --red-2: rgba(184,80,80,0.15);
          --green: #3a8a5a;
          --mono: 'JetBrains Mono', monospace;
          --serif: 'Cormorant Garamond', serif;
          --disp: 'Syncopate', sans-serif;
          --h-header: 26px;
          --w-side: 38px;
        }
        * { margin:0; padding:0; box-sizing:border-box; }
        body { background:var(--void); font-family:var(--mono); color:#c8c4b8; overflow:hidden; }
        #hdr {
          position:fixed; top:0; left:0; right:0;
          height:var(--h-header);
          background:rgba(6,6,5,0.98);
          border-bottom:1px solid rgba(200,169,81,0.06);
          display:flex; align-items:center;
          z-index:300;
          padding:0 0.5rem 0 calc(var(--w-side) + 0.5rem);
          gap:1.5rem;
        }
        .hdr-brand{font-family:var(--disp);font-size:0.5rem;letter-spacing:0.3em;color:var(--gold);white-space:nowrap;font-weight:700;}
        .hdr-sep{width:1px;height:14px;background:rgba(200,169,81,0.1);}
        .hdr-stat{font-size:0.4rem;letter-spacing:0.15em;color:#1e1e1c;white-space:nowrap;}
        .hdr-stat span{color:var(--gold);opacity:0.6;}
        .hdr-phi{font-size:0.48rem;color:rgba(200,169,81,0.5);letter-spacing:0.1em;}
        .hdr-phi em{color:var(--gold);font-style:normal;font-size:0.56rem;}
        .hdr-regime{font-size:0.38rem;letter-spacing:0.2em;text-transform:uppercase;}
        .reg-homeost{color:var(--green);}
        .reg-critico{color:var(--gold);}
        .reg-entrop{color:var(--red);}
        .hdr-right{margin-left:auto;display:flex;gap:1rem;align-items:center;}
        .hdr-clock{font-size:0.4rem;color:rgba(200,169,81,0.3);}
        #sidebar {
          position:fixed; top:var(--h-header); left:0; bottom:0;
          width:var(--w-side);
          background:rgba(6,6,5,0.98);
          border-right:1px solid rgba(200,169,81,0.05);
          display:flex; flex-direction:column; align-items:center;
          padding:0.7rem 0;
          gap:0.15rem;
          z-index:200;
        }
        .side-node{width:30px;height:30px;display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative;border:1px solid transparent;transition:all 0.3s;flex-shrink:0;}
        .side-node:hover{border-color:rgba(200,169,81,0.15);}
        .side-node svg{width:14px;height:14px;opacity:0.2;stroke:var(--gold);stroke-width:1.2;fill:none;}
        .side-node:hover svg{opacity:0.55;}
        .side-node-label{position:absolute;left:calc(100% + 6px);top:50%;transform:translateY(-50%);font-size:0.36rem;letter-spacing:0.18em;text-transform:uppercase;color:var(--gold);background:var(--void);padding:0.15rem 0.4rem;border:1px solid rgba(200,169,81,0.15);white-space:nowrap;opacity:0;pointer-events:none;transition:opacity 0.2s;z-index:400;}
        .side-node:hover .side-node-label{opacity:1;}
        .side-topo{font-size:0.32rem;letter-spacing:0.15em;color:#4a4a45;text-transform:uppercase;writing-mode:vertical-rl;margin:0.4rem 0 0.15rem;}
        #obs {
          position:fixed;
          top:var(--h-header);
          left:var(--w-side);
          right:0; bottom:0;
          display:flex;
          flex-direction:column;
          overflow:hidden;
        }
        .obs-zone {
          display:flex;
          overflow-x:auto;
          overflow-y:hidden;
          scrollbar-width:none;
          flex-shrink:0;
          border-bottom:1px solid rgba(200,169,81,0.04);
        }
        .obs-zone::-webkit-scrollbar{display:none;}
        .zone-a{height:38%;}
        .zone-b{height:33%;}
        .zone-c{height:29%;}
        .obs-panel{
          flex-shrink:0;
          height:100%;
          border-right:1px solid rgba(200,169,81,0.05);
          background:var(--void);
          overflow:hidden;
          position:relative;
          cursor:pointer;
          transition:border-color 0.3s;
        }
        .obs-panel:hover{border-color:rgba(200,169,81,0.12);}
        .panel-label{
          position:absolute; top:0.4rem; left:0.55rem;
          font-size:0.36rem; letter-spacing:0.22em;
          text-transform:uppercase;
          color:rgba(200,169,81,0.2);
          pointer-events:none;
          z-index:5;
        }
        .panel-topo{
          position:absolute; top:0.4rem; right:0.55rem;
          font-size:0.3rem; letter-spacing:0.15em;
          text-transform:uppercase;
          color:#4a4a45;
          pointer-events:none;
          z-index:5;
        }
        .pw-phi    { width:240px; }
        .pw-field  { width:360px; }
        .pw-twin   { width:320px; }
        .pw-world  { width:300px; }
        .pw-spectr { width:400px; }
        .pw-sem    { width:320px; }
        .pw-proj   { width:340px; }
        .pw-entrop { width:260px; }
        .pw-chron  { width:520px; }
        .pw-log    { width:300px; }
        .pw-agent  { width:360px; }
        .pw-exec   { width:360px; }
        .phi-core { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); text-align:center; pointer-events:none; }
        .phi-big { font-family:var(--disp); font-size:2.6rem; font-weight:700; letter-spacing:-0.04em; line-height:1; transition:color 0.8s; }
        .phi-big.crit{color:var(--red);}
        .phi-big.warn{color:var(--gold);}
        .phi-big.ok{color:var(--green);}
        .phi-eq{font-size:0.38rem;color:#4a4a45;margin-top:0.4rem;letter-spacing:0.08em;}
        .phi-regime{font-size:0.38rem;letter-spacing:0.22em;text-transform:uppercase;margin-top:0.3rem;}
        .phi-vars{position:absolute;bottom:0.5rem;left:0;right:0;display:flex;justify-content:space-around;padding:0 0.5rem;pointer-events:none;}
        .phi-var{text-align:center;}
        .phi-var-name{font-size:0.32rem;color:#4a4a45;letter-spacing:0.1em;}
        .phi-var-val{font-size:0.7rem;color:rgba(200,169,81,0.5);}
        .metric-row{display:flex;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.08);padding:8px 0;}
        .media-grid{display:grid;grid-template-columns:repeat(auto-fill, minmax(180px,1fr));gap:12px;}
        .media-asset{border:1px solid rgba(255,255,255,0.12);padding:10px;}
        .media-asset img,.media-asset video{width:100%;max-height:180px;object-fit:cover;}
        .readiness-status.ready{color:#d4af37;}
        .readiness-status.blocked{color:#ff6b6b;}
        .checkbox-row{display:flex;flex-wrap:wrap;gap:12px;margin:12px 0;}
        button{background:rgba(200,169,81,0.1);border:1px solid var(--gold);color:var(--gold);padding:0.2rem 0.5rem;cursor:pointer;font-family:var(--mono);font-size:0.4rem;transition:background 0.2s;}
        button:hover{background:rgba(200,169,81,0.2);}
        textarea,input,select{background:rgba(0,0,0,0.5);border:1px solid rgba(200,169,81,0.3);color:#c8c4b8;padding:0.2rem;width:100%;margin-bottom:0.5rem;font-family:var(--mono);font-size:0.4rem;}
        .result-box{margin-top:0.5rem;font-size:0.35rem;border-top:1px solid rgba(200,169,81,0.1);padding-top:0.3rem;max-height:120px;overflow-y:auto;}
        .modal-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:1000;}
        .modal-content{background:var(--surface);border:1px solid var(--gold);max-width:500px;width:90%;padding:1rem;font-size:0.45rem;font-family:var(--mono);color:#c8c4b8;}
        .modal-content h3{color:var(--gold);margin-bottom:0.5rem;}
        .modal-close{float:right;background:none;border:none;color:var(--gold);cursor:pointer;font-size:0.5rem;}
        canvas{display:block;width:100%;height:100%;}
        .agent-msgs{flex:1;overflow-y:auto;padding:0.4rem 0.6rem;max-height:calc(100% - 80px);}
        .a-msg-obs{font-size:0.44rem;color:rgba(200,169,81,0.5);margin-bottom:0.25rem;}
        .a-msg-agt{font-size:0.44rem;color:#c8c4b8;padding-left:0.6rem;border-left:1px solid rgba(200,169,81,0.12);margin-bottom:0.6rem;line-height:1.55;}
        .agent-footer{display:flex;align-items:stretch;flex-shrink:0;margin-top:0.5rem;}
        .agent-in{flex:1;background:transparent;border:none;outline:none;font-family:var(--mono);font-size:0.5rem;color:#c8c4b8;padding:0.45rem 0.6rem;border:1px solid rgba(200,169,81,0.2);}
        .agent-send{background:none;border:1px solid rgba(200,169,81,0.2);border-left:none;color:rgba(200,169,81,0.3);font-family:var(--mono);font-size:0.38rem;padding:0 0.7rem;cursor:pointer;}
        .agent-send:hover{color:var(--gold);}
      `}</style>

      <header id="hdr">
        <div className="hdr-brand">SFI</div>
        <div className="hdr-sep"></div>
        <div className="hdr-stat">OBSERVATORIO <span>OPERACIONAL</span></div>
        <div className="hdr-sep"></div>
        <div className="hdr-phi">Φ_SF <em>{phiVal}</em></div>
        <div className="hdr-sep"></div>
        <div className={`hdr-regime ${regimeClass}`}>{scoreState.regime}</div>
        <div className="hdr-sep"></div>
        <div className="hdr-stat">IHG <span>{scoreState.ihg.toFixed(2)}</span></div>
        <div className="hdr-stat">NTI <span>{scoreState.nti.toFixed(2)}</span></div>
        <div className="hdr-stat">LDI <span>{scoreState.ldi.toFixed(2)}</span></div>
        <div className="hdr-right">
          <div className="hdr-clock">{new Date().toISOString().slice(0,19).replace('T',' ')}</div>
        </div>
      </header>

      <aside id="sidebar">
        <div className="side-topo">I</div>
        <div className="side-node"><svg viewBox="0 0 16 16"><ellipse cx="8" cy="6" rx="4" ry="3.5"/><path d="M4 9.5 Q2 12 3 14 Q8 11 13 14 Q14 12 12 9.5"/></svg><span className="side-node-label">Cognitive Twin</span></div>
        <div className="side-node"><svg viewBox="0 0 16 16"><path d="M2 4h12M2 8h8M2 12h10"/></svg><span className="side-node-label">Presión Semántica</span></div>
        <div className="side-node"><svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="5"/><circle cx="8" cy="8" r="2"/><path d="M8 3v2M8 11v2M3 8h2M11 8h2"/></svg><span className="side-node-label">Entropía</span></div>
        <div className="side-topo">II</div>
        <div className="side-node"><svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6"/><line x1="8" y1="2" x2="8" y2="14"/></svg><span className="side-node-label">Φ_SF</span></div>
        <div className="side-node"><svg viewBox="0 0 16 16"><path d="M2 8 Q5 2 8 8 Q11 14 14 8"/><path d="M2 5 Q5 1 8 5 Q11 9 14 5" opacity="0.5"/></svg><span className="side-node-label">Campo Fricción</span></div>
        <div className="side-node"><svg viewBox="0 0 16 16"><rect x="1" y="3" width="2" height="10" opacity="0.3"/><rect x="4" y="5" width="2" height="8" opacity="0.5"/></svg><span className="side-node-label">Tensión Long.</span></div>
        <div className="side-topo">III</div>
        <div className="side-node"><svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6"/><path d="M2 8 Q5 5 8 8 Q11 11 14 8"/></svg><span className="side-node-label">World Spectrum</span></div>
        <div className="side-node"><svg viewBox="0 0 16 16"><rect x="2" y="2" width="12" height="12" rx="1"/><line x1="5" y1="6" x2="11" y2="6"/></svg><span className="side-node-label">Bitácora</span></div>
      </aside>

      <main id="obs">
        {/* ZONA A */}
        <div className="obs-zone zone-a">
          <div className="obs-panel pw-phi" onClick={() => openModalAndSendQuery(
            'Φ_SF · Régimen',
            'Valor actual del flujo de información basado en IHG, NTI, LDI y ξ.',
            scoreState,
            scoreState.regime,
            scoreState.ldi > 1 ? 'alto' : 'medio',
            'Monitorear la evolución del régimen.',
            `Explica qué significa Φ_SF = ${phiVal} en régimen ${scoreState.regime}. Datos: IHG=${scoreState.ihg.toFixed(2)}, NTI=${scoreState.nti.toFixed(2)}, LDI=${scoreState.ldi.toFixed(2)}. ¿Riesgo y acción?`
          )}>
            <canvas ref={phiCanvasRef} width="240" height="348"></canvas>
            <div className="panel-label">Φ_SF · RÉGIMEN</div>
            <div className="panel-topo">TOPO-II</div>
            <div className="phi-core">
              <div className={`phi-big ${phiClass}`}>{phiVal}</div>
              <div className="phi-eq">IHG·NTI / (1+LDI) + ξ</div>
              <div className={`phi-regime ${regimeClass}`}>{scoreState.regime}</div>
            </div>
            <div className="phi-vars">
              <div className="phi-var"><div className="phi-var-name">IHG</div><div className="phi-var-val">{scoreState.ihg.toFixed(2)}</div></div>
              <div className="phi-var"><div className="phi-var-name">NTI</div><div className="phi-var-val">{scoreState.nti.toFixed(2)}</div></div>
              <div className="phi-var"><div className="phi-var-name">LDI</div><div className="phi-var-val">{scoreState.ldi.toFixed(2)}</div></div>
              <div className="phi-var"><div className="phi-var-name">ξ</div><div className="phi-var-val">0.07</div></div>
            </div>
          </div>

          <div className="obs-panel pw-field" onClick={() => openModalAndSendQuery(
            'Campo de Fricción',
            'Visualización de partículas que representan la fricción cognitiva y estructural.',
            { phi: scoreState.phi, ldi: scoreState.ldi },
            'activo',
            'bajo',
            'Observar áreas de acumulación',
            `El campo de fricción muestra partículas influenciadas por Φ=${scoreState.phi.toFixed(2)} y LDI=${scoreState.ldi.toFixed(2)}. ¿Qué implica esta fricción? ¿Áreas críticas?`
          )}>
            <canvas ref={fieldCanvasRef} width="360" height="348"></canvas>
            <div className="panel-label">CAMPO DE FRICCIÓN</div>
            <div className="panel-topo">TOPO-II</div>
          </div>

          <div className="obs-panel pw-twin" onClick={() => openModalAndSendQuery(
            'Cognitive Twin',
            'Capas D, E, I, A que reflejan deriva, energía, integración y atención.',
            { drift, phi: scoreState.phi, regime: scoreState.regime },
            'estable',
            'bajo',
            'Alinear con observaciones externas',
            `Deriva = ${drift.toFixed(2)}, régimen ${scoreState.regime}. ¿Cómo afecta esto a la coherencia interna y qué ajustes hacer?`
          )}>
            <canvas ref={twinCanvasRef} width="320" height="348"></canvas>
            <div className="panel-label">COGNITIVE TWIN</div>
            <div className="panel-topo">TOPO-I</div>
          </div>

          <div className="obs-panel pw-world" onClick={() => openModalAndSendQuery(
            'World Spectrum',
            'Espectro de estados del mundo.',
            operational?.runtimeFocus || {},
            'integrado',
            'medio',
            'Actualizar con vectores externos',
            `Con régimen ${scoreState.regime}, ¿cómo debe ajustarse la percepción del entorno?`
          )}>
            <canvas ref={worldCanvasRef} width="300" height="348"></canvas>
            <div className="panel-label">WORLD SPECTRUM</div>
            <div className="panel-topo">TOPO-III</div>
          </div>
        </div>

        {/* ZONA B */}
        <div className="obs-zone zone-b">
          <div className="obs-panel pw-spectr" onClick={() => openModalAndSendQuery(
            'Tensión Longitudinal',
            'Evolución de la tensión a lo largo del tiempo.',
            { ldi: scoreState.ldi, drift },
            'monitoreo',
            'crítico si >0.75',
            'Alinear acciones',
            `LDI=${scoreState.ldi.toFixed(2)}, drift=${drift.toFixed(2)}. ¿Significado de la tensión y acciones recomendadas?`
          )}>
            <canvas ref={spectrCanvasRef} width="400" height="302"></canvas>
            <div className="panel-label">TENSIÓN LONGITUDINAL</div>
            <div className="panel-topo">TOPO-II</div>
          </div>

          <div className="obs-panel pw-sem" onClick={() => openModalAndSendQuery(
            'Presión Semántica',
            'Densidad y ambigüedad del lenguaje ingresado.',
            { pressure: semanticPressure, drift },
            'variable',
            'bajo',
            'Escribir observaciones',
            `Presión semántica = ${semanticPressure.toFixed(2)}. ¿Qué impacto tiene en el sistema?`
          )}>
            <div style={{padding:'1.8rem 0.6rem', height:'100%', display:'flex', flexDirection:'column'}}>
              <div className="panel-label">PRESIÓN SEMÁNTICA</div>
              <textarea style={{flex:1, background:'transparent', border:'1px solid rgba(200,169,81,0.2)', color:'#c8c4b8', fontFamily:'mono', fontSize:'0.45rem', marginTop:'1rem'}} placeholder="Observación estructural..." onInput={(e) => handleSemanticInput((e.target as HTMLTextAreaElement).value)}></textarea>
              <div className="sem-pressure" style={{marginTop:'0.5rem', fontSize:'0.35rem', color:'var(--gold)'}}>ψ {semanticPressure.toFixed(3)}</div>
            </div>
          </div>

          <div className="obs-panel pw-proj" onClick={() => openModalAndSendQuery(
            'Proyección Estocástica',
            'Simulación de caminos posibles.',
            { phi: scoreState.phi },
            'proyectando',
            'medio',
            'Usar planificación',
            `Φ = ${phiVal}. ¿Qué caminos son más probables y cómo prepararse?`
          )}>
            <canvas ref={projCanvasRef} width="340" height="302"></canvas>
            <div className="panel-label">PROYECCIÓN ESTOCÁSTICA</div>
            <div className="panel-topo">TOPO-II</div>
          </div>

          <div className="obs-panel pw-entrop" onClick={() => openModalAndSendQuery(
            'Entropía · Agente',
            'Incertidumbre del agente.',
            { gap: operational?.executionReadiness?.capability_gap },
            'calculando',
            'medio',
            'Reducir con evidencia',
            `Gap = ${operational?.executionReadiness?.capability_gap}. ¿Cómo afecta la entropía a la toma de decisiones?`
          )}>
            <canvas ref={entropCanvasRef} width="260" height="302"></canvas>
            <div className="panel-label">ENTROPÍA · AGENTE</div>
            <div className="panel-topo">TOPO-I</div>
          </div>
        </div>

        {/* ZONA C */}
        <div className="obs-zone zone-c" style={{ display:'flex', flexWrap:'nowrap', overflowX:'auto' }}>
          <div className="obs-panel pw-chron" onClick={() => openModalAndSendQuery(
            'Cronología Viva',
            'Línea de tiempo de eventos recientes.',
            operational?.events?.slice(0,5),
            'histórico',
            'bajo',
            'Actualizar con nueva data',
            `Últimos eventos: ${operational?.events?.length} registrados. ¿Qué patrones observas?`
          )}>
            <canvas ref={chronCanvasRef} width="520" height="267"></canvas>
            <div className="panel-label">CRONOLOGÍA VIVA</div>
            <div className="panel-topo">TOPO-III</div>
          </div>

          <div className="obs-panel pw-log" onClick={() => openModalAndSendQuery(
            'Bitácora Operacional',
            'Registro de eventos, errores y advertencias.',
            operational?.latestObservation,
            'activo',
            'bajo',
            'Revisar mensajes recientes',
            `Última observación: ${operational?.latestObservation?.title || 'ninguna'}. ¿Qué información clave hay?`
          )}>
            <div style={{padding:'1.8rem 0.6rem'}}><div className="panel-label">BITÁCORA OPERACIONAL</div><div style={{fontSize:'0.4rem'}}>Último evento: {operational?.latestObservation?.title || 'Ninguno'}</div></div>
          </div>

          <div className="obs-panel pw-agent">
            <div className="panel-label">AMV · RESPUESTA / EVIDENCIA</div>
            <div className="agent-inner" style={{display:'flex', flexDirection:'column', height:'100%', padding:'1.8rem 0.6rem 0.6rem'}}>
              <div className="agent-msgs" style={{flex:1, overflowY:'auto', marginBottom:'0.5rem'}}>
                {amvMessages.map((msg, idx) => (
                  <div key={idx} className={msg.role === 'user' ? 'a-msg-obs' : 'a-msg-agt'}>{msg.content}</div>
                ))}
                {amvLoading && <div className="a-msg-agt">AMV procesando...</div>}
              </div>
              <div className="agent-footer">
                <input type="text" className="agent-in" value={amvInput} onChange={e => setAmvInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendAmvMessage()} placeholder="Pregunta al AMV..." />
                <button className="agent-send" onClick={sendAmvMessage}>ENVIAR →</button>
              </div>
              <div style={{fontSize:'0.3rem', marginTop:'0.3rem', color: amvStatusColor }}>{amvStatus}</div>
            </div>
          </div>

          {/* Operational Counts */}
          <div className="obs-panel pw-exec" onClick={() => openModalAndSendQuery(
            'Operational Counts',
            'Conteo de entidades en el sistema.',
            operational?.counts,
            'activo',
            'bajo',
            'Monitorear tendencias',
            `Perturbaciones: ${operational?.counts?.perturbations}, Media Assets: ${operational?.counts?.mediaAssets}. ¿Qué indica este estado?`
          )}>
            <div className="panel-label">OPERATIONAL COUNTS</div>
            <div className="panel-topo">TOPO-III</div>
            <div style={{padding:'1.8rem 0.6rem'}}>
              <div className="metric-row"><span>Perturbations</span><strong>{operational?.counts?.perturbations ?? 0}</strong></div>
              <div className="metric-row"><span>Capability Checks</span><strong>{operational?.counts?.capabilityChecks ?? 0}</strong></div>
              <div className="metric-row"><span>Execution Ledger</span><strong>{operational?.counts?.ledgerEntries ?? 0}</strong></div>
              <div className="metric-row"><span>Media Assets</span><strong>{operational?.counts?.mediaAssets ?? 0}</strong></div>
              <div className="metric-row"><span>Outcomes</span><strong>{operational?.counts?.outcomes ?? 0}</strong></div>
              <div className="metric-row"><span>Lessons</span><strong>{operational?.counts?.lessons ?? 0}</strong></div>
            </div>
          </div>

          {/* Execution Readiness */}
          <div className="obs-panel pw-exec" onClick={() => openModalAndSendQuery(
            'Execution Readiness',
            'Verifica si el sistema está listo para ejecutar campañas.',
            operational?.executionReadiness,
            operational?.executionReadiness?.executable ? 'listo' : 'no listo',
            operational?.executionReadiness?.capability_gap > 0.5 ? 'alto' : 'bajo',
            'Ejecutar si executable true',
            `Capability gap = ${operational?.executionReadiness?.capability_gap}. ¿Estamos listos para ejecutar?`
          )}>
            <div className="panel-label">EXECUTION READINESS</div>
            <div className="panel-topo">TOPO-III</div>
            <div style={{padding:'1.8rem 0.6rem'}}>
              <div className={`readiness-status ${operational?.executionReadiness?.executable ? 'ready' : 'blocked'}`}>
                {operational?.executionReadiness?.executable ? '✅ listo' : '❌ no listo'}
              </div>
              <pre style={{fontSize:'0.35rem', marginTop:'0.5rem'}}>
                {JSON.stringify({
                  capability_gap: operational?.executionReadiness?.capability_gap,
                  missing: operational?.executionReadiness?.missing_capabilities,
                }, null, 2)}
              </pre>
            </div>
          </div>

          {/* Media Asset Gallery */}
          <div className="obs-panel pw-exec" style={{ minWidth:'400px' }}>
            <div className="panel-label">MEDIA ASSET GALLERY</div>
            <div className="panel-topo">TOPO-III</div>
            <div style={{ padding:'1.8rem 0.6rem', overflowY:'auto' }}>
              <div className="media-grid">
                {mediaAssets.length === 0 && <div>— Ningún asset generado aún —</div>}
                {mediaAssets.map(asset => (
                  <div key={asset.id} className="media-asset">
                    {asset.asset_type === 'image' && <img src={asset.file_url} alt="media" />}
                    {asset.asset_type === 'video' && <video src={asset.file_url} controls style={{width:'100%'}} />}
                    {asset.asset_type === 'audio' && <audio src={asset.file_url} controls style={{width:'100%'}} />}
                    {!['image','video','audio'].includes(asset.asset_type) && <pre style={{fontSize:'0.3rem'}}>{JSON.stringify(asset).slice(0,100)}</pre>}
                    <small>{asset.asset_type}</small>
                    <strong>{asset.provider_used}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Campaign Generator Panel */}
          <div className="obs-panel pw-exec" style={{ minWidth:'380px' }}>
            <div className="panel-label">CAMPAIGN GENERATOR</div>
            <div className="panel-topo">TOPO-III</div>
            <div style={{padding:'1.8rem 0.6rem'}}>
              <label>Canal</label>
              <input type="text" value={campaignChannel} onChange={e => setCampaignChannel(e.target.value)} placeholder="medium / linkedin / tiktok" />
              <label>Objetivo</label>
              <input type="text" value={campaignObjective} onChange={e => setCampaignObjective(e.target.value)} placeholder="persistencia / autoridad" />
              <label>Prompt</label>
              <textarea rows={2} value={campaignPrompt} onChange={e => setCampaignPrompt(e.target.value)} placeholder="Describe la campaña"></textarea>
              <div className="checkbox-row">
                {Object.entries(requestedAssets).map(([key, val]) => (
                  <label key={key}><input type="checkbox" checked={val} onChange={e => setRequestedAssets(prev => ({ ...prev, [key]: e.target.checked }))} /> {key}</label>
                ))}
              </div>
              <button onClick={runCampaign} disabled={campaignLoading}>Run Campaign</button>
              <div className="result-box">{campaignResult && <pre style={{fontSize:'0.3rem'}}>{JSON.stringify(campaignResult, null, 2)}</pre>}</div>
            </div>
          </div>

          {/* Outcome + Lesson */}
          <div className="obs-panel pw-exec" style={{ minWidth:'400px' }}>
            <div className="panel-label">OUTCOME + LESSON</div>
            <div className="panel-topo">TOPO-III</div>
            <div style={{padding:'1.8rem 0.6rem'}}>
              <p style={{marginBottom:'0.5rem', fontStyle:'italic'}}>Ya tenemos ejecución registrada. Falta registrar resultado y aprendizaje.</p>
              <label>Outcome</label>
              <textarea rows={2} value={outcomeText} onChange={e => setOutcomeText(e.target.value)} placeholder="Qué ocurrió después de la ejecución"></textarea>
              <label>Lesson</label>
              <textarea rows={2} value={lessonText} onChange={e => setLessonText(e.target.value)} placeholder="Qué aprendió el sistema"></textarea>
              <label><input type="checkbox" checked={atlasUpdate} onChange={e => setAtlasUpdate(e.target.checked)} /> atlas_update</label>
              <button onClick={closeExecutionCycle} disabled={closureLoading}>Close Institutional Cycle</button>
              <div className="result-box">{closureResult && <pre style={{fontSize:'0.3rem'}}>{JSON.stringify(closureResult, null, 2)}</pre>}</div>
            </div>
          </div>
        </div>
      </main>

      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>✕</button>
            <h3>{modalContent.title}</h3>
            <div><strong>Narrativa:</strong> {modalContent.narrative}</div>
            <div><strong>Evidencia:</strong></div>
            <pre style={{fontSize:'0.4rem', marginTop:'0.25rem', whiteSpace: 'pre-wrap'}}>{modalContent.evidence}</pre>
            <div><strong>Estado:</strong> {modalContent.status}</div>
            <div><strong>Riesgo:</strong> {modalContent.risk}</div>
            <div><strong>Siguiente acción:</strong> {modalContent.nextAction}</div>
          </div>
        </div>
      )}
    </div>
  );
}