'use client';

import { Fragment, useEffect, useRef, useState, useCallback } from 'react';

// -------------------- TIPOS --------------------
interface ScoreState {
  ihg: number | null;
  nti: number | null;
  ldi: number | null;
  phi: number | null;
  regime: string | null;
}

// CulturalVector ampliado con lo que devuelve la API real
interface CulturalVector {
  cvphi: number;
  LCP: number;
  PAC: number;
  VFE: number;
  SCR: number;
  regime: string;
  case_id?: string;
  case_name?: string;
  interpretation?: {
    phenomenon?: string;
    friction?: string;
    proposal?: string;
  };
}

interface EvidenceEntry {
  id: string;
  reliability_score?: number;
  source_coverage_contribution?: number;
  summary?: string;
  created_at?: string;
  evidence_hash?: string;
}

interface Node {
  id: string;
  name?: string;
  lon: number;
  lat: number;
  ihg: number;
  primary: boolean;
  module?: string;
  scope?: string;
}

interface Connection {
  from: string;
  to: string;
  w: number;
}

interface ProtoAttractor {
  id: string;
  name: string;
  confidence: number;
  persistence: number;
}

// -------------------- FUNCIONES AUXILIARES --------------------
const hexToRgb = (hex: string) => {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
};
const GOLD_RGB = hexToRgb('#C8A951');
const RED_RGB = hexToRgb('#b85050');
const GRN_RGB = hexToRgb('#3a8a5a');

function n(value: number | null | undefined, digits = 3): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '—';
}

function regimeClass(regime?: string | null): string {
  if (!regime) return 'reg-unknown';
  const r = regime.toLowerCase();
  if (r.includes('home')) return 'reg-homeost';
  if (r.includes('entro')) return 'reg-entrop';
  if (r.includes('crist')) return 'reg-crystal';
  if (r.includes('lat')) return 'reg-latent';
  if (r.includes('satur')) return 'reg-sat';
  return 'reg-critico';
}

function phiClass(phi?: number | null): string {
  if (typeof phi !== 'number') return 'warn';
  if (phi < 0.22) return 'crit';
  if (phi > 0.58) return 'ok';
  return 'warn';
}

function stableUnit(index: number, salt = 0): number {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function createStableOperationalCaseId(): string {
  if (typeof window === 'undefined') return 'SFI-OP-LOCAL';

  const params = new URLSearchParams(window.location.search);
  const queryCaseId = params.get('case_id')?.trim();
  if (queryCaseId) {
    window.localStorage.setItem('sfi_scorefriction_operational_case_id', queryCaseId);
    return queryCaseId;
  }

  const stored = window.localStorage.getItem('sfi_scorefriction_operational_case_id');
  if (stored) return stored;

  const generated = `SFI-OP-${Date.now().toString(36).toUpperCase()}`;
  window.localStorage.setItem('sfi_scorefriction_operational_case_id', generated);
  return generated;
}

// Helper para fetch seguro (evita error .json en objetos planos)
async function safeJson(url: string, init?: RequestInit) {
  const res = await fetch(url, { cache: 'no-store', ...init }).catch(() => null);
  if (!res) return { ok: false, error: 'network_error' };
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { ok: false, error: 'invalid_json', raw: text.slice(0, 200) };
  }
}

// -------------------- COMPONENTE PRINCIPAL --------------------
export default function ScoreFrictionOperationalPage() {
  const caseIdRef = useRef(createStableOperationalCaseId());

  // Estados de datos reales
  const [scoreState, setScoreState] = useState<ScoreState>({ ihg:null, nti:null, ldi:null, phi:null, regime:null });
  const [cultural, setCultural] = useState<CulturalVector | null>(null);
  const [evidence, setEvidence] = useState<EvidenceEntry[]>([]);
  const [operational, setOperational] = useState<any>(null);
  const [mediaAssets, setMediaAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string|null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [conns, setConns] = useState<Connection[]>([]);
  const [world, setWorld] = useState({ sat:0.68, pol:0.52, vel:0.75, comp:0.41 });
  const [protoAttractors, setProtoAttractors] = useState<ProtoAttractor[]>([]);
  const [longitudinalEvents, setLongitudinalEvents] = useState<any[]>([]);
  const [caseTrace, setCaseTrace] = useState<any[]>([]);
  const [persistStatus, setPersistStatus] = useState('');

  // AMV chat
  const [amvMessages, setAmvMessages] = useState<{role: 'user' | 'assistant'; content: string}[]>([
    { role: 'assistant', content: 'Observatorio inicializado. Pregunta o haz clic en cualquier panel.' }
  ]);
  const [amvInput, setAmvInput] = useState('');
  const [amvLoading, setAmvLoading] = useState(false);
  const [amvStatus, setAmvStatus] = useState('EN LINEA');
  const [amvStatusColor, setAmvStatusColor] = useState('var(--green)');

  // Presión semántica (narrativa)
  const [narrativeText, setNarrativeText] = useState('');
  const [narrativeStats, setNarrativeStats] = useState({ length:0, density:0, narrativePressure:0, contradiction:0, ambiguity:0 });
  const [narrativeStatus, setNarrativeStatus] = useState('');

  // Campaign Generator
  const [campaignChannel, setCampaignChannel] = useState('');
  const [campaignObjective, setCampaignObjective] = useState('');
  const [campaignPrompt, setCampaignPrompt] = useState('');
  const [requestedAssets, setRequestedAssets] = useState({ text:true, image:false, video:false, audio:false, markdown:false, json:false });
  const [campaignResult, setCampaignResult] = useState<any>(null);
  const [campaignLoading, setCampaignLoading] = useState(false);

  // Outcome / Lesson
  const [outcomeText, setOutcomeText] = useState('');
  const [lessonText, setLessonText] = useState('');
  const [atlasUpdate, setAtlasUpdate] = useState(true);
  const [closureResult, setClosureResult] = useState<any>(null);
  const [closureLoading, setClosureLoading] = useState(false);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState({ title:'', narrative:'', evidence:'', status:'', risk:'', nextAction:'' });

  // Filtro para mapa
  const [mapFilter, setMapFilter] = useState('all');

  // Refs canvas originales
  const phiCanvasRef = useRef<HTMLCanvasElement>(null);
  const fieldCanvasRef = useRef<HTMLCanvasElement>(null);
  const twinCanvasRef = useRef<HTMLCanvasElement>(null);
  const worldCanvasRef = useRef<HTMLCanvasElement>(null);
  const spectrCanvasRef = useRef<HTMLCanvasElement>(null);
  const projCanvasRef = useRef<HTMLCanvasElement>(null);
  const entropCanvasRef = useRef<HTMLCanvasElement>(null);
  const chronCanvasRef = useRef<HTMLCanvasElement>(null);
  // Mapa
  const mapCanvasRef = useRef<HTMLCanvasElement>(null);
  const [expandedMap, setExpandedMap] = useState(false);

  const fieldParticlesRef = useRef<any[]>([]);
  const tensionHistoryRef = useRef<number[]>([]);
  const animationRef = useRef<number|null>(null);
  const epochsRef = useRef<any[]>([]);
  const sRotYRef = useRef(0.5);
  const sAutoRotRef = useRef(true);
  const mapFrameRef = useRef(0);

  // -------------------- FUNCIONES DE DIBUJO DE CANVAS --------------------
  const drawPhiBg = useCallback(() => {
    const c = phiCanvasRef.current; if (!c?.width) return;
    const ctx = c.getContext('2d')!;
    const { regime } = scoreState;
    const phi = scoreState.phi ?? 0;
    const t = Date.now() * 0.008;
    ctx.clearRect(0,0,c.width,c.height);
    const rgb = regime === 'Homeostático' ? GRN_RGB : regime === 'Entrópico' ? RED_RGB : GOLD_RGB;
    for (let r=5; r>0; r--) {
      const rad = (c.width * 0.38) * (r/5);
      const osc = Math.sin(t + r*0.7) * 0.015;
      const alpha = (0.02 + osc) * (r/5);
      ctx.beginPath(); ctx.arc(c.width/2, c.height/2, rad, 0, Math.PI*2);
      ctx.strokeStyle = `rgba(${rgb},${Math.max(0.01,alpha)})`;
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
    const c = fieldCanvasRef.current; if (!c?.width) return;
    const ctx = c.getContext('2d')!;
    const phi = scoreState.phi ?? 0;
    const ldi = scoreState.ldi ?? 0;
    const t = Date.now() * 0.005;
    ctx.fillStyle = 'rgba(6,6,5,0.08)';
    ctx.fillRect(0,0,c.width,c.height);
    if (fieldParticlesRef.current.length === 0) {
      for (let i=0;i<160;i++) fieldParticlesRef.current.push({ seed:i, resets:0, x:stableUnit(i, 1)*c.width, y:stableUnit(i, 2)*c.height, vx:0, vy:0, age:stableUnit(i, 3), maxAge:0.6+stableUnit(i, 4)*0.8 });
    }
    const coh = phi, fric = 1-coh;
    fieldParticlesRef.current.forEach(p => {
      const nx = p.x/c.width-0.5, ny = p.y/c.height-0.5;
      const dist = Math.sqrt(nx*nx+ny*ny);
      const angle = Math.atan2(ny, nx);
      const perturb = fric * (Math.sin(nx*6+t*1.3)*Math.cos(ny*5-t) + Math.sin(dist*8-t*1.7)*ldi*0.6);
      const flowAngle = angle + Math.PI/2*coh + perturb;
      const speed = 0.6 + dist*1.2;
      p.vx = p.vx*0.85 + Math.cos(flowAngle)*speed*0.15;
      p.vy = p.vy*0.85 + Math.sin(flowAngle)*speed*0.15;
      p.x += p.vx; p.y += p.vy; p.age += 0.008;
      if (p.age > p.maxAge || p.x<0 || p.x>c.width || p.y<0 || p.y>c.height) {
        p.resets = (p.resets ?? 0) + 1;
        p.x = stableUnit(p.seed ?? 0, p.resets + 10)*c.width; p.y = stableUnit(p.seed ?? 0, p.resets + 20)*c.height; p.vx=0; p.vy=0; p.age=0;
      }
      const life = Math.sin((p.age/p.maxAge)*Math.PI);
      const alpha = life * (0.04 + coh*0.1);
      const rgb = phi<0.25 ? RED_RGB : phi>0.6 ? GRN_RGB : GOLD_RGB;
      ctx.beginPath(); ctx.arc(p.x, p.y, 0.8, 0, Math.PI*2); ctx.fillStyle = `rgba(${rgb},${alpha})`; ctx.fill();
    });
    if (fric > 0.5) {
      const nFrac = Math.floor(fric*5);
      for (let i=0;i<nFrac;i++) {
        const fx = (Math.sin(t*0.3+i*2.1)*0.5+0.5)*c.width;
        const fy = (Math.cos(t*0.2+i*1.7)*0.5+0.5)*c.height;
        const fl = fric*30*(Math.sin(t+i)*0.5+0.5);
        ctx.beginPath(); ctx.moveTo(fx,fy); ctx.lineTo(fx+fl*Math.cos(t+i), fy+fl*Math.sin(t*0.7+i));
        ctx.strokeStyle = `rgba(${RED_RGB},${fric*0.08})`; ctx.stroke();
      }
    }
  }, [scoreState]);

  const drawCognitiveTwin = useCallback(() => {
    const c = twinCanvasRef.current; if (!c?.width) return;
    const ctx = c.getContext('2d')!;
    const phi = scoreState.phi ?? 0.35;
    const energy = Math.max(0.1, Math.min(1, 1 - (operational?.executionReadiness?.capability_gap ?? 0.35)));
    const clarity = Math.max(0.1, Math.min(1, phi));
    const coherence = Math.max(0.1, Math.min(1, ((scoreState.ihg ?? 0.4) + (scoreState.nti ?? 0.4)) / 2));
    const t = Date.now()*0.004;
    ctx.clearRect(0,0,c.width,c.height);
    const cx=c.width/2, cy=c.height/2, R=Math.min(c.width,c.height)*0.33;
    const layers = [
      { offset:0.28*12, alpha:clarity*0.35+0.05, phase:0 },
      { offset:energy*8, alpha:energy*0.3+0.05, phase:1.57 },
      { offset:0.28*4, alpha:coherence*0.3+0.05, phase:3.14 },
      { offset:0.28*14, alpha:0.1, phase:4.71 },
    ];
    layers.forEach((layer,li)=>{
      const pts=12, misalign=layer.offset*(1-coherence);
      const offX = Math.cos(layer.phase+t*0.3)*misalign;
      const offY = Math.sin(layer.phase+t*0.3)*misalign;
      const r = R*(0.55+li*0.14)*(0.85+energy*0.15);
      ctx.beginPath();
      for(let i=0;i<=pts;i++){
        const a=(i/pts)*Math.PI*2;
        const noise = Math.sin(a*3+t+li)*0.28*0.18 + Math.cos(a*5-t*0.7+li)*(1-clarity)*0.12;
        const pr = r*(1+noise);
        const px = cx+offX+Math.cos(a)*pr;
        const py = cy+offY+Math.sin(a)*pr;
        i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);
      }
      ctx.closePath(); ctx.fillStyle = `rgba(${GOLD_RGB},${layer.alpha})`; ctx.fill();
      ctx.strokeStyle = `rgba(${GOLD_RGB},${layer.alpha*2})`; ctx.lineWidth=0.8; ctx.stroke();
    });
  }, [operational, scoreState]);

  const drawWorldSpectrum = useCallback(() => {
    const c = worldCanvasRef.current; if (!c?.width) return;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0,0,c.width,c.height);
    const vals = [world.sat, world.pol, world.vel, world.comp];
    const padding=25; const graphH=c.height-padding*2; const barGap=(c.width-padding*2)/vals.length;
    vals.forEach((v,i)=>{
      const bx = padding + i*barGap + barGap*0.15;
      const bw = barGap*0.7;
      const bh = graphH * v;
      const by = c.height - padding - bh;
      ctx.fillStyle = `rgba(${GOLD_RGB},0.02)`; ctx.fillRect(bx,padding,bw,graphH);
      ctx.fillStyle = `rgba(${GOLD_RGB},0.12)`; ctx.fillRect(bx,by,bw,bh);
    });
  }, [world]);

  const drawLongitudinalTension = useCallback(() => {
    const c = spectrCanvasRef.current; if (!c?.width) return;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0,0,c.width,c.height);
    const t = Date.now();
    if (t%100<50) {
      const baseT = (scoreState.ldi||0)*0.6 + 0.28*0.4;
      tensionHistoryRef.current.push(baseT + Math.sin(t*0.08)*0.08 + Math.sin(t*0.013)*0.02);
      if (tensionHistoryRef.current.length>80) tensionHistoryRef.current.shift();
    }
    if (tensionHistoryRef.current.length<2) return;
    const padLeft=30,padRight=20,padTop=30,padBot=20;
    const w = c.width-padLeft-padRight, h = c.height-padTop-padBot;
    ctx.strokeStyle='rgba(200,169,81,0.03)'; ctx.lineWidth=0.5;
    for(let g=1;g<=4;g++){ const gy=padTop+h*(g/4); ctx.beginPath(); ctx.moveTo(padLeft,gy); ctx.lineTo(padLeft+w,gy); ctx.stroke(); }
    ctx.beginPath();
    tensionHistoryRef.current.forEach((v,idx)=>{
      const x = padLeft + w*(idx/(tensionHistoryRef.current.length-1));
      const y = c.height-padBot - h*Math.max(0,Math.min(1,v));
      idx===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    });
    ctx.strokeStyle=`rgba(${GOLD_RGB},0.45)`; ctx.lineWidth=1.2; ctx.stroke();
  }, [scoreState]);

  const drawStochasticProjection = useCallback(() => {
    const c = projCanvasRef.current; if (!c?.width) return;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0,0,c.width,c.height);
    const cx=c.width*0.25, cy=c.height*0.55, w=c.width*0.65;
    const t = Date.now()*0.005;
    ctx.strokeStyle='rgba(200,169,81,0.04)'; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+w,cy); ctx.stroke();
    const paths=5, steps=24, phi=scoreState.phi||0;
    for(let p=0;p<paths;p++){
      ctx.beginPath(); ctx.moveTo(cx,cy);
      for(let s=1;s<=steps;s++){
        const px = cx + w*(s/steps);
        const driftFactor = (s/steps)*(1.2-phi)*45;
        const noise = Math.sin(s*0.4+t+p)*Math.cos(s*0.7-t*0.3+p);
        const py = cy + noise*driftFactor + Math.sin(t*0.5+p)*5*(s/steps);
        ctx.lineTo(px,py);
      }
      ctx.strokeStyle = p===0?`rgba(${GOLD_RGB},0.5)`: `rgba(${GOLD_RGB},0.06)`;
      ctx.lineWidth = p===0?1.2:0.6; ctx.stroke();
    }
  }, [scoreState]);

  const drawAgentEntropy = useCallback(() => {
    const c = entropCanvasRef.current; if (!c?.width) return;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0,0,c.width,c.height);
    const cx=c.width/2, cy=c.height/2, r=Math.min(c.width,c.height)*0.28, t=Date.now()*0.015;
    const ent = operational?.executionReadiness?.capability_gap ?? 0.3;
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.strokeStyle='rgba(200,169,81,0.04)'; ctx.stroke();
    const nodes=14; ctx.fillStyle=`rgba(${GOLD_RGB},0.35)`;
    for(let i=0;i<nodes;i++){
      const angle = (i/nodes)*Math.PI*2 + t*0.1;
      const radNoise = Math.sin(t+i*1.7)*ent*14;
      const nx = cx + Math.cos(angle)*(r+radNoise);
      const ny = cy + Math.sin(angle)*(r+radNoise);
      ctx.beginPath(); ctx.arc(nx,ny,1,0,Math.PI*2); ctx.fill();
      if(ent>0.3 && stableUnit(i, Math.floor(t / 20))<ent*0.08){ ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(nx,ny); ctx.strokeStyle=`rgba(${GOLD_RGB},0.03)`; ctx.stroke(); }
    }
  }, [operational]);

  const drawChronology = useCallback(() => {
    const c = chronCanvasRef.current; if (!c?.width) return;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0,0,c.width,c.height);
    if(epochsRef.current.length===0){
      const labels=['S-08','S-07','S-06','S-05','S-04','S-03','S-02','S-01','NOW'];
      epochsRef.current = labels.map((l,i)=>({label:l, phi:0.28 + stableUnit(i, 6) * 0.45, event:i===4||i===7}));
    }
    const padLeft=40, padRight=40, w=c.width-padLeft-padRight, cy=c.height*0.6;
    ctx.strokeStyle='rgba(200,169,81,0.08)'; ctx.beginPath(); ctx.moveTo(padLeft,cy); ctx.lineTo(padLeft+w,cy); ctx.stroke();
    const space = w/(epochsRef.current.length-1);
    epochsRef.current.forEach((ep,i)=>{
      const x = padLeft + i*space;
      const barH = ep.phi*35;
      ctx.fillStyle=`rgba(${GOLD_RGB},0.03)`; ctx.fillRect(x-3,cy-40,6,80);
      ctx.beginPath(); ctx.moveTo(x,cy); ctx.lineTo(x,cy-barH);
      ctx.strokeStyle = ep.event?`rgb(${RED_RGB})`:`rgba(${GOLD_RGB},0.5)`; ctx.lineWidth=ep.event?1.5:1; ctx.stroke();
      ctx.beginPath(); ctx.arc(x,cy-barH, ep.event?2.5:1.5,0,Math.PI*2);
      ctx.fillStyle = ep.event?`rgb(${RED_RGB})`:`rgb(${GOLD_RGB})`; ctx.fill();
    });
  }, []);

  const animate = useCallback(() => {
    drawPhiBg(); drawFrictionField(); drawCognitiveTwin(); drawWorldSpectrum();
    drawLongitudinalTension(); drawStochasticProjection(); drawAgentEntropy(); drawChronology();
    animationRef.current = requestAnimationFrame(animate);
  }, [drawPhiBg, drawFrictionField, drawCognitiveTwin, drawWorldSpectrum, drawLongitudinalTension, drawStochasticProjection, drawAgentEntropy, drawChronology]);

  useEffect(() => { animate(); return () => { if(animationRef.current) cancelAnimationFrame(animationRef.current); }; }, [animate]);

  // ==================== CARGA DE DATOS REALES (con safeJson) ====================
  const loadAllData = useCallback(async () => {
    setLoadError(null);
    try {
      const [scoreData, culturalData, evidenceData, opData, execData, worldData, protoData, longData] = await Promise.all([
        safeJson('/api/scorefriction/state'),
        safeJson(`/api/scorefriction/evaluate?case_id=${caseIdRef.current}`),
        safeJson(`/api/scorefriction/evidence?case_id=${caseIdRef.current}`),
        safeJson(`/api/sfi/operational-state?case_id=${caseIdRef.current}`),
        safeJson(`/api/sfi/execution-state?case_id=${caseIdRef.current}`),
        safeJson('/api/worldspect/vector'),
        safeJson(`/api/scorefriction/proto-attractors?case_id=${caseIdRef.current}`),
        safeJson(`/api/scorefriction/longitudinal?case_id=${caseIdRef.current}`),
      ]);

      if (scoreData?.ok) {
        setScoreState({
          ihg: typeof scoreData.ihg === 'number' ? scoreData.ihg : null,
          nti: typeof scoreData.nti === 'number' ? scoreData.nti : null,
          ldi: typeof scoreData.ldi === 'number' ? scoreData.ldi : null,
          phi: typeof scoreData.phi === 'number' ? scoreData.phi : null,
          regime: typeof scoreData.regime === 'string' ? scoreData.regime : null,
        });
      }
      if (culturalData?.cultural_vector) {
        setCultural(culturalData.cultural_vector);
      } else {
        setCultural(null);
      }
      if (evidenceData?.entries) {
        setEvidence(evidenceData.entries);
      } else {
        setEvidence([]);
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
        setOperational({ ...opData, counts, executionReadiness: readiness, runtimeFocus: opData.runtimeFocus ?? {} });
        if (opData.rootNeuralGraphRuntime && Array.isArray(opData.rootNeuralGraphRuntime.nodes)) {
          const graph = opData.rootNeuralGraphRuntime;
          const graphNodes: Node[] = graph.nodes.map((n:any) => ({
            id: n.id,
            name: n.label || n.id,
            lon: n.lon ?? 0,
            lat: n.lat ?? 0,
            ihg: n.metrics?.ihg ?? 2.0,
            primary: n.primary || false,
            module: n.module || n.scope || 'world',
            scope: n.scope || 'world'
          }));
          const graphConns: Connection[] = (graph.edges || []).map((e:any) => ({ from: e.from, to: e.to, w: e.weight ?? 0.5 }));
          setNodes(graphNodes);
          setConns(graphConns);
        } else {
          setNodes([]);
          setConns([]);
        }
      }
      if (execData?.ok) setMediaAssets(Array.isArray(execData.mediaAssets) ? execData.mediaAssets : []);
      if (worldData?.ok && worldData.snapshot) {
        setWorld({
          sat: worldData.snapshot.memetic ?? 0.68,
          pol: worldData.snapshot.polarization ?? 0.52,
          vel: worldData.snapshot.infoVelocity ?? 0.75,
          comp: worldData.snapshot.economic ?? 0.41,
        });
      }
      if (protoData?.data && Array.isArray(protoData.data)) {
        setProtoAttractors(protoData.data);
      } else {
        setProtoAttractors([]);
      }
      if (longData?.data && Array.isArray(longData.data)) {
        setLongitudinalEvents(longData.data);
        setCaseTrace([...longData.data.slice(0,6), ...evidence.slice(0,6)]);
      } else {
        setLongitudinalEvents([]);
        setCaseTrace([...evidence.slice(0,6)]);
      }
    } catch (err: any) {
      setLoadError(err?.message ?? 'Error al cargar datos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAllData(); const iv = setInterval(loadAllData, 15000); return () => clearInterval(iv); }, [loadAllData]);

  // ==================== DIBUJO DEL MAPA / ESFERA ====================
  const drawMapCanvas = useCallback(() => {
    const canvas = mapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle = '#060605';
    ctx.fillRect(0,0,w,h);
    const filteredNodes = mapFilter === 'all' ? nodes : nodes.filter(n => (n.module || n.scope) === mapFilter);
    if (filteredNodes.length === 0) {
      ctx.fillStyle = '#aaa';
      ctx.font = '10px monospace';
      ctx.fillText('No hay datos de mapa disponibles', 20, 40);
      return;
    }
    // Dibujar conexiones
    conns.forEach(conn => {
      const from = filteredNodes.find(n=>n.id===conn.from);
      const to = filteredNodes.find(n=>n.id===conn.to);
      if(!from || !to) return;
      const x1 = ((from.lon+180)/360)*w;
      const y1 = ((90-from.lat)/180)*h;
      const x2 = ((to.lon+180)/360)*w;
      const y2 = ((90-to.lat)/180)*h;
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2);
      ctx.strokeStyle = `rgba(200,169,81,${conn.w*0.4})`; ctx.lineWidth = 1; ctx.stroke();
    });
    filteredNodes.forEach(n => {
      const x = ((n.lon+180)/360)*w;
      const y = ((90-n.lat)/180)*h;
      const rad = n.primary ? 7 : 4;
      ctx.beginPath(); ctx.arc(x,y,rad,0,2*Math.PI);
      const hue = 40 - Math.min(30, n.ihg*10);
      ctx.fillStyle = `hsl(${hue}, 70%, 55%)`;
      ctx.fill();
      ctx.fillStyle = '#aaa';
      ctx.font = '8px monospace';
      ctx.fillText(n.id, x+6, y-2);
    });
  }, [nodes, conns, mapFilter]);

  const drawSphereCanvas = useCallback(() => {
    const canvas = mapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0,0,w,h);
    const filteredNodes = mapFilter === 'all' ? nodes : nodes.filter(n => (n.module || n.scope) === mapFilter);
    if (filteredNodes.length === 0) {
      ctx.fillStyle = '#aaa';
      ctx.font = '10px monospace';
      ctx.fillText('No hay datos de mapa disponibles', 20, 40);
      return;
    }
    const R = Math.min(w,h)*0.37;
    const cx = w/2, cy = h*0.43;
    ctx.beginPath(); ctx.arc(cx,cy,R,0,2*Math.PI);
    ctx.fillStyle = 'rgba(20,20,20,0.95)'; ctx.fill();
    filteredNodes.forEach(n => {
      const theta = (n.lon+180)*Math.PI/180;
      const phi = (90-n.lat)*Math.PI/180;
      const x = cx + R * Math.sin(phi) * Math.cos(theta + sRotYRef.current);
      const y = cy - R * Math.cos(phi);
      if (y > cy - R*0.6) {
        ctx.beginPath(); ctx.arc(x, y, n.primary?4:2.5, 0, 2*Math.PI);
        ctx.fillStyle = '#C8A951'; ctx.fill();
        ctx.fillStyle = '#aaa';
        ctx.font = '7px monospace';
        ctx.fillText(n.id, x+4, y-2);
      }
    });
    if (sAutoRotRef.current) sRotYRef.current += 0.003;
  }, [nodes, mapFilter]);

  const drawMapOrSphere = useCallback(() => {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) drawSphereCanvas();
    else drawMapCanvas();
    mapFrameRef.current = requestAnimationFrame(drawMapOrSphere);
  }, [drawMapCanvas, drawSphereCanvas]);

  useEffect(() => {
    const canvas = mapCanvasRef.current;
    if (!canvas) return;
    const resizeObserver = new ResizeObserver(() => {
      canvas.width = canvas.parentElement?.clientWidth || 400;
      canvas.height = canvas.parentElement?.clientHeight || 300;
    });
    resizeObserver.observe(canvas);
    drawMapOrSphere();
    return () => {
      cancelAnimationFrame(mapFrameRef.current);
      resizeObserver.disconnect();
    };
  }, [drawMapOrSphere]);

  // ==================== FUNCIONES ESPECÍFICAS ====================
  const updateNarrativeStats = (text: string) => {
    const words = text.trim().split(/\s+/).filter(Boolean);
    const terms = ['friccion', 'evidencia', 'atractor', 'mihm', 'worldspect', 'regimen', 'densidad', 'persistencia', 'deuda', 'verificacion'];
    const narrativeTerms = ['hook', 'coro', 'verso', 'lirica', 'letra', 'ritual', 'pertenencia', 'futuro', 'agencia', 'territorio'];
    const contradictions = ['pero', 'aunque', 'sin embargo', 'contradice', 'inconsistente'];
    const ambiguities = ['quizas', 'tal vez', 'creo', 'parece', 'posible', 'probable'];
    const sfiTerms = words.filter(w => terms.includes(w.toLowerCase())).length;
    const narrativeTermsCount = words.filter(w => narrativeTerms.includes(w.toLowerCase())).length;
    const contradictionCount = words.filter(w => contradictions.includes(w.toLowerCase())).length;
    const ambiguityCount = words.filter(w => ambiguities.includes(w.toLowerCase())).length;
    setNarrativeStats({
      length: text.length,
      density: words.length ? sfiTerms / words.length : 0,
      narrativePressure: words.length ? narrativeTermsCount / words.length : 0,
      contradiction: contradictionCount,
      ambiguity: ambiguityCount,
    });
  };

  const persistNarrative = async () => {
    if (!narrativeText.trim()) return;
    try {
      const res = await fetch('/api/scorefriction/observe/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case_id: caseIdRef.current,
          source_name: 'lyrics_narrative_pressure',
          territory: 'UNSPECIFIED',
          raw_payload: { text: narrativeText, narrativePressure: narrativeStats.narrativePressure }
        })
      });
      const data = await res.json();
      setNarrativeStatus(data.ok ? 'observacion persistida' : 'error');
      await loadAllData();
    } catch { setNarrativeStatus('error'); }
  };

  const persistProtoAttractors = async () => {
    try {
      const res = await fetch('/api/scorefriction/proto-attractors/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ case_id: caseIdRef.current })
      });
      const data = await res.json();
      setPersistStatus(data.ok ? `persistido: ${data.count || data.data?.length} protoatractores` : 'error');
      await loadAllData();
    } catch { setPersistStatus('error'); }
  };

  const mapObject = async () => {
    setPersistStatus('mapeando objeto...');
    try {
      const res = await fetch('/api/scorefriction/cultural-object', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: caseIdRef.current, label: 'objeto cultural', territory: 'MX' })
      });
      const data = await res.json();
      setPersistStatus(data.ok ? 'objeto mapeado' : 'error');
      await loadAllData();
    } catch { setPersistStatus('error'); }
  };

  const sendAmvMessage = async () => {
    if (!amvInput.trim()) return;
    const userMsg = { role: 'user' as const, content: amvInput };
    setAmvMessages(prev => [...prev, userMsg]);
    const current = amvInput;
    setAmvInput('');
    setAmvLoading(true);
    setAmvStatus('COMPUTANDO');
    setAmvStatusColor('var(--gold)');
    try {
      const res = await fetch('/api/amv/chat', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ module:'scorefriction', sessionId:caseIdRef.current, message:current, context:{ sys:scoreState, operational } })
      });
      const data = await res.json();
      const answer = data?.response || data?.answer || data?.message || 'AMV procesó tu pregunta.';
      setAmvMessages(prev => [...prev, { role: 'assistant' as const, content: answer }]);
      setAmvStatus('EN LINEA'); setAmvStatusColor('var(--green)');
    } catch {
      setAmvMessages(prev => [...prev, { role: 'assistant' as const, content: 'Error de comunicación con AMV.' }]);
      setAmvStatus('DEGRADADO'); setAmvStatusColor('var(--red)');
    } finally { setAmvLoading(false); }
  };

  const runCampaign = async () => {
    setCampaignLoading(true);
    try {
      const assetList = Object.entries(requestedAssets).filter(([,v])=>v).map(([k])=>k);
      const runRes = await fetch('/api/sfi/run', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ case_id:caseIdRef.current, minimal_action:campaignPrompt, expected_effect:`Campaña para ${campaignObjective} en ${campaignChannel}`, requested_assets:assetList, target_domain:campaignChannel||'general', perturbation_type:'campaign', runtime_focus:operational?.runtimeFocus })
      });
      const runData = await runRes.json();
      let renderData = null;
      if (assetList.length) {
        const renderRes = await fetch('/api/sfi/media/render', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ case_id:caseIdRef.current, provider:'auto', assets:assetList, prompt:campaignPrompt, runtime_focus:operational?.runtimeFocus, score_state:scoreState })
        });
        renderData = await renderRes.json();
      }
      setCampaignResult({ run:runData, render:renderData });
      await loadAllData();
    } catch(err:any) { setCampaignResult({ error:err.message }); }
    finally { setCampaignLoading(false); }
  };

  const closeExecutionCycle = async () => {
    if (!outcomeText.trim() || !lessonText.trim()) { setClosureResult({ error:'Falta Outcome o Lesson.' }); return; }
    setClosureLoading(true);
    try {
      const execRes = await fetch(`/api/sfi/execution-state?case_id=${caseIdRef.current}`);
      const execData = await execRes.json();
      const lastLedger = execData?.ledgerEntries?.[0];
      if (!lastLedger?.id) throw new Error('No hay ejecución previa.');
      const outcomeRes = await fetch('/api/sfi/outcome', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ execution_id:lastLedger.id, case_id:caseIdRef.current, outcome_status:'success', observed_effect:{ description:outcomeText }, unexpected_effects:[], prediction_accuracy:0.8 }) });
      const outcomeData = await outcomeRes.json();
      if (!outcomeData?.ok) throw new Error(outcomeData?.error);
      const lessonRes = await fetch('/api/sfi/lesson', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ outcome_id:outcomeData.outcome.id, case_id:caseIdRef.current, lesson:lessonText, updates_direction_engine:true, updates_risk_engine:true, updates_capability_engine:true, atlas_update:atlasUpdate }) });
      const lessonData = await lessonRes.json();
      if (!lessonData?.ok) throw new Error(lessonData?.error);
      setClosureResult({ outcome:outcomeData.outcome, lesson:lessonData.lesson });
      setOutcomeText(''); setLessonText('');
      await loadAllData();
    } catch(err:any) { setClosureResult({ error:err.message }); }
    finally { setClosureLoading(false); }
  };

  const openDictamen = (title: string, evidence: any, status: string, risk: string, nextAction: string) => {
    let narrative = '';
    if (title.includes('Φ')) narrative = `Phi = ${n(scoreState.phi)}. Régimen: ${scoreState.regime}`;
    else if (title.includes('Fricción')) narrative = `LDI = ${n(scoreState.ldi)}. Tensión elevada: ${(scoreState.ldi ?? 0)>0.7?'sí':'no'}.`;
    else if (title.includes('Cultural Wave')) narrative = `CVΦ = ${cultural?.cvphi.toFixed(3) ?? '—'}, Régimen Cultural: ${cultural?.regime ?? '—'}`;
    else narrative = 'Panel con información operativa.';
    setModalContent({ title, narrative, evidence: JSON.stringify(evidence, null, 2), status, risk, nextAction });
    setModalOpen(true);
  };
  const closeModal = () => setModalOpen(false);

  // ==================== RENDER ====================
  if (loading) return <div style={{background:'#060605', color:'#c8c4b8', height:'100vh', display:'flex', alignItems:'center', justifyContent:'center'}}>Cargando Observatorio Operacional...</div>;

  const phiVal = n(scoreState.phi,3);
  const currentRegime = scoreState.regime ?? operational?.systemRegime ?? 'sin régimen';
  const counts = operational?.counts ?? {};
  const readiness = operational?.executionReadiness ?? {};
  const culturalRegimeClass = cultural?.regime ? regimeClass(cultural.regime) : 'reg-unknown';
  const strongSignals = evidence.filter(e => (e.reliability_score ?? 0) >= 0.67 || (e.source_coverage_contribution ?? 0) >= 0.5);
  const weakSignals = evidence.filter(e => (e.reliability_score ?? 0) > 0.2 && (e.reliability_score ?? 0) < 0.67);
  const noiseSignals = evidence.filter(e => (e.reliability_score ?? 0) <= 0.2);

  return (
    <div style={{ width:'100vw', height:'100vh', overflow:'hidden', background:'#060605', fontFamily:"'JetBrains Mono', monospace", color:'#c8c4b8' }}>
      <style jsx global>{`
        :root {
          --void: #060605;
          --surface: #0d0d0c;
          --gold: #C8A951;
          --red: #b85050;
          --green: #3a8a5a;
          --text: #c8c4b8;
          --muted: rgba(200,196,184,0.48);
          --line: rgba(200,169,81,0.12);
          --mono: 'JetBrains Mono', monospace;
          --disp: 'Syncopate', sans-serif;
          --h-header: 30px;
          --w-side: 38px;
        }
        *{margin:0;padding:0;box-sizing:border-box;}
        body{background:var(--void);overflow:hidden;}
        #hdr{
          position:fixed;top:0;left:0;right:0;height:30px;background:rgba(6,6,5,0.98);border-bottom:1px solid var(--line);display:flex;align-items:center;z-index:300;padding:0 12px 0 calc(var(--w-side)+12px);gap:1rem;
        }
        .hdr-brand{font-family:var(--disp);font-size:10px;letter-spacing:.32em;color:var(--gold);font-weight:700;}
        .hdr-sep{width:1px;height:14px;background:var(--line);}
        .hdr-stat{font-size:9px;color:var(--muted);letter-spacing:.14em;text-transform:uppercase;white-space:nowrap;}
        .hdr-stat span{color:var(--gold);opacity:0.6;}
        .hdr-phi{font-size:10px;color:var(--muted);}
        .hdr-phi em{color:var(--gold);font-style:normal;}
        .hdr-regime{font-size:9px;letter-spacing:.16em;text-transform:uppercase;}
        .reg-homeost{color:var(--green);}
        .reg-critico{color:var(--gold);}
        .reg-entrop{color:var(--red);}
        .reg-crystal{color:var(--green);}
        .reg-latent{color:var(--gold);}
        .reg-sat{color:var(--red);}
        .hdr-right{margin-left:auto;display:flex;gap:0.8rem;align-items:center;}
        .hdr-clock{font-size:9px;color:rgba(200,169,81,0.3);}
        .local-note{position:fixed;top:30px;left:38px;right:0;z-index:260;border-bottom:1px solid var(--line);background:rgba(6,6,5,0.94);padding:5px 10px;font-size:8px;letter-spacing:.14em;text-transform:uppercase;color:rgba(200,169,81,0.58);}
        #sidebar{
          position:fixed;top:54px;left:0;bottom:0;width:38px;background:rgba(6,6,5,0.98);border-right:1px solid var(--line);display:flex;flex-direction:column;align-items:center;padding:0.7rem 0;gap:0.15rem;z-index:200;
        }
        .side-node{width:30px;height:30px;display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative;border:1px solid transparent;transition:all 0.3s;flex-shrink:0;}
        .side-node:hover{border-color:rgba(200,169,81,0.15);}
        .side-node svg{width:14px;height:14px;opacity:0.2;stroke:var(--gold);stroke-width:1.2;fill:none;}
        .side-node:hover svg{opacity:0.55;}
        .side-node-label{position:absolute;left:calc(100%+6px);top:50%;transform:translateY(-50%);font-size:8px;letter-spacing:.16em;text-transform:uppercase;color:var(--gold);background:var(--void);padding:0.15rem 0.4rem;border:1px solid var(--line);white-space:nowrap;opacity:0;pointer-events:none;transition:opacity 0.2s;z-index:400;}
        .side-node:hover .side-node-label{opacity:1;}
        .side-topo{font-size:7px;letter-spacing:.12em;color:#4a4a45;text-transform:uppercase;writing-mode:vertical-rl;margin:0.4rem 0 0.15rem;}
        #obs{
          position:fixed;top:54px;left:38px;right:0;bottom:0;display:flex;flex-direction:column;overflow:hidden;
        }
        .obs-zone{
          display:flex;overflow-x:auto;overflow-y:hidden;scrollbar-width:none;flex-shrink:0;border-bottom:1px solid var(--line);
        }
        .obs-zone::-webkit-scrollbar{display:none;}
        .zone-a{height:auto;min-height:320px;}
        .zone-b{height:auto;min-height:340px;}
        .zone-c{height:auto;min-height:360px;}
        .obs-panel{
          flex-shrink:0;height:100%;border-right:1px solid var(--line);background:var(--void);overflow:auto;position:relative;cursor:pointer;transition:border-color 0.3s;min-width:280px;max-width:600px;
        }
        .obs-panel:hover{border-color:rgba(200,169,81,0.12);}
        .panel-label{
          position:sticky;top:6px;left:12px;font-size:8px;letter-spacing:.16em;text-transform:uppercase;color:rgba(200,169,81,0.5);z-index:2;background:var(--void);display:inline-block;padding-right:6px;
        }
        .panel-topo{
          position:sticky;top:6px;right:12px;font-size:7px;letter-spacing:.1em;color:rgba(200,196,184,0.3);z-index:2;float:right;
        }
        .panel-body{
          padding:30px 8px 8px;
        }
        .phi-core{text-align:center;margin-top:8px;}
        .phi-big{font-family:var(--disp);font-size:32px;font-weight:700;letter-spacing:-0.04em;}
        .phi-eq{font-size:7px;color:var(--muted);}
        .phi-regime{font-size:7px;letter-spacing:.14em;text-transform:uppercase;}
        .phi-vars{display:flex;gap:12px;justify-content:center;margin-top:8px;}
        .metric-row{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--line);font-size:8px;}
        .metric-row span{color:var(--muted);}
        .metric-row strong{color:var(--gold);}
        .readiness{font-family:var(--disp);font-size:18px;margin-bottom:8px;}
        .media-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:6px;}
        .asset-card{border:1px solid var(--line);padding:4px;background:rgba(0,0,0,0.3);display:flex;flex-direction:column;gap:4px;font-size:7px;}
        .asset-card img,.asset-card video{max-width:100%;max-height:60px;object-fit:cover;}
        .asset-card audio{width:100%;}
        .empty{color:var(--muted);font-size:8px;text-align:center;padding:12px;}
        label{display:block;margin:6px 0 2px;font-size:7px;color:var(--muted);text-transform:uppercase;}
        input,textarea{background:rgba(0,0,0,0.4);border:1px solid var(--line);color:var(--text);padding:4px;font-size:8px;width:100%;}
        .checkbox-row{display:flex;gap:8px;margin:6px 0;flex-wrap:wrap;}
        button{background:rgba(200,169,81,0.1);border:1px solid var(--gold);color:var(--gold);padding:4px 8px;font-size:8px;cursor:pointer;}
        .json-box{font-size:7px;white-space:pre-wrap;background:rgba(0,0,0,0.3);padding:4px;margin-top:4px;}
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:100;}
        .modal-content{background:var(--surface);border:1px solid var(--gold);max-width:90vw;width:500px;max-height:80vh;overflow:auto;padding:16px;font-size:10px;}
        .modal-close{float:right;background:none;border:none;color:var(--gold);cursor:pointer;font-size:12px;}
        .chat-messages{flex:1;overflow-y:auto;font-size:8px;max-height:80px;}
        .user-msg{color:var(--gold);margin:4px 0;}
        .assistant-msg{color:var(--text);border-left:1px solid var(--gold);padding-left:6px;margin:4px 0;}
        .chat-input{display:flex;gap:4px;margin-top:4px;}
        .chat-input input{flex:1;background:#0a0a09;border:1px solid var(--line);color:var(--text);padding:4px;font-size:8px;}
        .amv-status{font-size:7px;text-align:right;}
        .grid-cols-2{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
        .grid-cols-3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}
        .grid-cols-4{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;}
        .w-full{width:100%;}
        .mt-2{margin-top:8px;}
        .mb-2{margin-bottom:8px;}
        .border{border:1px solid var(--line);}
        .bg-dark{background:rgba(0,0,0,0.3);}
        .p-2{padding:8px;}
        .text-center{text-align:center;}
        .text-gold{color:var(--gold);}
        .text-xs{font-size:7px;}
        .text-sm{font-size:8px;}
        .text-base{font-size:9px;}
        .font-mono{font-family:var(--mono);}
      `}</style>

      <header id="hdr">
        <div className="hdr-brand">SFI</div>
        <div className="hdr-sep" />
        <div className="hdr-stat">SCORE FRICTION <span>OPERACIONAL</span></div>
        <div className="hdr-sep" />
        <div className="hdr-phi">Φ_SF <em>{phiVal}</em></div>
        <div className="hdr-sep" />
        <div className={`hdr-regime ${regimeClass(currentRegime)}`}>{currentRegime}</div>
        <div className="hdr-sep" />
        <div className="hdr-stat">CVΦ <span>{cultural?.cvphi.toFixed(3) ?? '—'}</span></div>
        <div className="hdr-stat">LCP <span>{cultural?.LCP.toFixed(2) ?? '—'}</span></div>
        <div className="hdr-stat">PAC <span>{cultural?.PAC.toFixed(2) ?? '—'}</span></div>
        <div className="hdr-stat">VFE <span>{cultural?.VFE.toFixed(2) ?? '—'}</span></div>
        <div className="hdr-stat">SCR <span>{cultural?.SCR.toFixed(2) ?? '—'}</span></div>
        <div className="hdr-stat">EVD <span>{evidence.length}</span></div>
        <div className="hdr-stat">COV <span>{(evidence.reduce((acc,e)=>acc+(e.source_coverage_contribution||0),0)/Math.max(1,evidence.length)).toFixed(2)}</span></div>
        <div className="hdr-right">
          <div className="hdr-clock">{new Date().toISOString().slice(0,19).replace('T',' ')}</div>
        </div>
      </header>

      <div className="local-note">Visualizacion local / no medicion directa cuando no hay dato operacional real. case_id: {caseIdRef.current}</div>

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
        {loadError && <div className="error-strip">{loadError}</div>}

        {/* ZONA A */}
        <div className="obs-zone zone-a">
          <div className="obs-panel" style={{minWidth:'220px'}} onClick={() => openDictamen('Φ_SF · Régimen', scoreState, currentRegime, 'bajo', 'Monitorear')}>
            <div className="panel-label">Φ_SF · Régimen</div><div className="panel-topo">TOPO-II</div>
            <div className="panel-body">
              <canvas ref={phiCanvasRef} width="200" height="160" style={{width:'100%', height:'auto'}} />
              <div className="phi-core">
                <div className={`phi-big ${phiClass(scoreState.phi)}`}>{phiVal}</div>
                <div className="phi-eq">IHG·NTI/(1+LDI)</div>
                <div className={`phi-regime ${regimeClass(currentRegime)}`}>{currentRegime}</div>
              </div>
              <div className="phi-vars">
                <div className="metric-row"><span>IHG</span><strong>{n(scoreState.ihg,2)}</strong></div>
                <div className="metric-row"><span>NTI</span><strong>{n(scoreState.nti,2)}</strong></div>
                <div className="metric-row"><span>LDI</span><strong>{n(scoreState.ldi,2)}</strong></div>
              </div>
            </div>
          </div>

          <div className="obs-panel" style={{minWidth:'340px'}} onClick={() => openDictamen('Campo de Fricción', {phi:scoreState.phi, ldi:scoreState.ldi}, 'activo', 'bajo', 'Observar')}>
            <div className="panel-label">Campo de Fricción</div><div className="panel-topo">TOPO-II</div>
            <div className="panel-body"><canvas ref={fieldCanvasRef} width="320" height="160" style={{width:'100%', height:'auto'}} /></div>
          </div>

          <div className="obs-panel" style={{minWidth:'300px'}} onClick={() => openDictamen('Cognitive Twin', {drift:0.28, phi:scoreState.phi}, 'estable', 'bajo', 'Alinear')}>
            <div className="panel-label">Cognitive Twin</div><div className="panel-topo">TOPO-I</div>
            <div className="panel-body"><canvas ref={twinCanvasRef} width="280" height="160" style={{width:'100%', height:'auto'}} /></div>
          </div>

          <div className="obs-panel" style={{minWidth:'280px'}} onClick={() => openDictamen('World Spectrum', world, 'integrado', 'bajo', 'Actualizar')}>
            <div className="panel-label">World Spectrum</div><div className="panel-topo">TOPO-III</div>
            <div className="panel-body"><canvas ref={worldCanvasRef} width="260" height="160" style={{width:'100%', height:'auto'}} /></div>
          </div>
        </div>

        {/* ZONA B */}
        <div className="obs-zone zone-b">
          <div className="obs-panel" style={{minWidth:'380px'}} onClick={() => openDictamen('Tensión Longitudinal', {ldi:scoreState.ldi, drift:0.28}, 'monitoreo', 'medio', 'Alinear')}>
            <div className="panel-label">Tensión Longitudinal</div><div className="panel-topo">TOPO-II</div>
            <div className="panel-body"><canvas ref={spectrCanvasRef} width="360" height="150" style={{width:'100%', height:'auto'}} /></div>
          </div>

          {/* Lyrics / Narrative Pressure (reemplaza presión semántica) */}
          <div className="obs-panel" style={{minWidth:'380px'}}>
            <div className="panel-label">LYRICS / NARRATIVE PRESSURE</div><div className="panel-topo">TOPO-I</div>
            <div className="panel-body">
              <textarea rows={3} value={narrativeText} onChange={(e)=> { setNarrativeText(e.target.value); updateNarrativeStats(e.target.value); }} placeholder="Letra, coro, hook o presion narrativa observada..." style={{width:'100%', background:'#0a0a09', border:'1px solid rgba(200,169,81,0.2)', color:'#c8c4b8', fontSize:'8px', padding:'6px'}} />
              <div className="grid-cols-4 mt-2 gap-1 text-[7px]">
                <div>Longitud: {narrativeStats.length}</div>
                <div>Narrative P: {narrativeStats.narrativePressure.toFixed(2)}</div>
                <div>Contradiccion: {narrativeStats.contradiction}</div>
                <div>Ambiguedad: {narrativeStats.ambiguity}</div>
              </div>
              <button onClick={persistNarrative} className="mt-2 w-full">Persistir narrativa</button>
              <div className="text-[7px] mt-1">{narrativeStatus}</div>
            </div>
          </div>

          {/* Proyección Estocástica + Proto-atractores */}
          <div className="obs-panel" style={{minWidth:'360px'}} onClick={() => openDictamen('Proyección Estocástica', {phi:scoreState.phi, protoCount:protoAttractors.length}, 'proyectando', 'medio', 'Usar planificación')}>
            <div className="panel-label">Proyección Estocástica</div><div className="panel-topo">TOPO-II</div>
            <div className="panel-body">
              <canvas ref={projCanvasRef} width="340" height="150" style={{width:'100%', height:'auto'}} />
              <div className="metric-row"><span>Proto-atractores</span><strong>{protoAttractors.length || 'FALTA INGESTA DE DATOS'}</strong></div>
              {protoAttractors.slice(0,3).map(p => <div key={p.id} className="text-[7px]">{p.name} (conf:{p.confidence.toFixed(2)})</div>)}
            </div>
          </div>

          <div className="obs-panel" style={{minWidth:'240px'}} onClick={() => openDictamen('Entropía · Agente', {gap:readiness.capability_gap}, 'calculando', 'medio', 'Reducir')}>
            <div className="panel-label">Entropía · Agente</div><div className="panel-topo">TOPO-II</div>
            <div className="panel-body"><canvas ref={entropCanvasRef} width="220" height="150" style={{width:'100%', height:'auto'}} /></div>
          </div>
        </div>

        {/* ZONA C */}
        <div className="obs-zone zone-c">
          {/* Cronología */}
          <div className="obs-panel" style={{minWidth:'480px'}} onClick={() => openDictamen('Cronología Viva', {events:longitudinalEvents.slice(0,5)}, 'histórico', 'bajo', 'Actualizar')}>
            <div className="panel-label">Cronología Viva</div><div className="panel-topo">TOPO-III</div>
            <div className="panel-body"><canvas ref={chronCanvasRef} width="460" height="140" style={{width:'100%', height:'auto'}} /></div>
          </div>

          {/* Bitácora */}
          <div className="obs-panel" style={{minWidth:'320px'}} onClick={() => openDictamen('Bitácora Operacional', operational?.latestObservation, operational?.latestObservation?'activo':'vacío', 'bajo', 'Registrar')}>
            <div className="panel-label">Bitácora Operacional</div><div className="panel-topo">TOPO-III</div>
            <div className="panel-body"><pre className="json-box">{JSON.stringify(operational?.latestObservation ?? {}, null, 2)}</pre></div>
          </div>

          {/* AMV Chat */}
          <div className="obs-panel" style={{minWidth:'400px'}}>
            <div className="panel-label">AMV · Agente</div><div className="panel-topo">TOPO-I</div>
            <div className="panel-body" style={{display:'flex',flexDirection:'column',gap:'6px'}}>
              <div className="chat-messages">
                {amvMessages.map((msg,i)=><div key={i} className={msg.role==='user'?'user-msg':'assistant-msg'}>{msg.content}</div>)}
                {amvLoading && <div className="assistant-msg">AMV procesando...</div>}
              </div>
              <div className="chat-input">
                <input value={amvInput} onChange={e=>setAmvInput(e.target.value)} onKeyPress={e=>e.key==='Enter'&&sendAmvMessage()} placeholder="Pregunta al AMV..." />
                <button onClick={sendAmvMessage}>Enviar</button>
              </div>
              <div className="amv-status" style={{color:amvStatusColor}}>{amvStatus}</div>
            </div>
          </div>

          {/* Operational Counts */}
          <div className="obs-panel" style={{minWidth:'280px'}} onClick={() => openDictamen('Operational Counts', counts, 'activo', 'bajo', 'Revisar')}>
            <div className="panel-label">Operational Counts</div><div className="panel-topo">TOPO-III</div>
            <div className="panel-body">
              <div className="metric-row"><span>Perturbations</span><strong>{counts.perturbations??0}</strong></div>
              <div className="metric-row"><span>Capability Checks</span><strong>{counts.capabilityChecks??0}</strong></div>
              <div className="metric-row"><span>Execution Ledger</span><strong>{counts.ledgerEntries??0}</strong></div>
              <div className="metric-row"><span>Media Assets</span><strong>{counts.mediaAssets??0}</strong></div>
              <div className="metric-row"><span>Outcomes</span><strong>{counts.outcomes??0}</strong></div>
              <div className="metric-row"><span>Lessons</span><strong>{counts.lessons??0}</strong></div>
            </div>
          </div>

          {/* Execution Readiness */}
          <div className="obs-panel" style={{minWidth:'280px'}} onClick={() => openDictamen('Execution Readiness', readiness, readiness.executable?'listo':'no listo', 'medio', 'Ejecutar si listo')}>
            <div className="panel-label">Execution Readiness</div><div className="panel-topo">TOPO-III</div>
            <div className="panel-body">
              <div className={`readiness ${readiness.executable?'ready':'blocked'}`}>{readiness.executable?'LISTO':'NO LISTO'}</div>
              <div className="metric-row"><span>capability_gap</span><strong>{n(readiness.capability_gap,2)}</strong></div>
              <pre className="json-box">{JSON.stringify({ missing:readiness.missing_capabilities??[] },null,2)}</pre>
            </div>
          </div>

          {/* Model Uncertainty Panel (persistible) */}
          <div className="obs-panel" style={{minWidth:'420px'}}>
            <div className="panel-label">MODEL UNCERTAINTY / DIRECCION DEL MUNDO</div><div className="panel-topo">TOPO-II</div>
            <div className="panel-body">
              <div className="grid-cols-4 gap-1 text-[7px] mb-2">
                <div className="border p-1 text-center">Fenómeno: {cultural?.interpretation?.phenomenon ?? 'FALTA INGESTA DE DATOS'}</div>
                <div className="border p-1 text-center">Atractores: {protoAttractors.length}</div>
                <div className="border p-1 text-center">Señal fuerte: {strongSignals.length}</div>
                <div className="border p-1 text-center">Ruido: {noiseSignals.length}</div>
              </div>
              <button onClick={persistProtoAttractors} className="w-full mb-2">Persistir protoatractores</button>
              <div className="text-[7px]">{persistStatus}</div>
              <details className="mt-2">
                <summary className="cursor-pointer text-[8px] text-gold">Desglose de estado de dirección del mundo</summary>
                <div className="mt-2 text-[7px]">
                  <div><strong>Señales fuertes</strong> {strongSignals.slice(0,3).map(e=>e.summary).join(', ') || '—'}</div>
                  <div><strong>Señales débiles</strong> {weakSignals.slice(0,3).map(e=>e.summary).join(', ') || '—'}</div>
                  <div><strong>Ruido</strong> {noiseSignals.slice(0,3).map(e=>e.summary).join(', ') || '—'}</div>
                  <div><strong>Eyectores</strong> {longitudinalEvents.filter(e=>e.status==='rejected').length || '—'}</div>
                </div>
              </details>
            </div>
          </div>

          {/* Cultural Waveform Panel */}
          <div className="obs-panel" style={{minWidth:'460px'}}>
            <div className="panel-label">CULTURAL WAVEFORM</div><div className="panel-topo">TOPO-I</div>
            <div className="panel-body">
              <svg viewBox="0 0 400 120" className="w-full h-[100px]">
                {cultural ? (
                  <>
                    <line x1="20" y1="90" x2="380" y2="90" stroke="rgba(200,169,81,0.2)" />
                    {(['CVΦ','LCP','PAC','VFE','SCR'] as const).map((key,i)=>{
                      const valMap: Record<string, number> = {
                        'CVΦ': cultural.cvphi,
                        LCP: cultural.LCP,
                        PAC: cultural.PAC,
                        VFE: cultural.VFE,
                        SCR: cultural.SCR,
                      };
                      const val = valMap[key];
  const x = 40 + i*70;
  const y = 90 - (val||0)*70;
  return (
    <Fragment key={key}>
      <circle cx={x} cy={y} r="4" fill="#C8A951" />
      <text x={x} y={105} textAnchor="middle" fill="#aaa" fontSize="7">{key}</text>
    </Fragment>
  );
})}
                  </>
                ) : <text x="200" y="55" textAnchor="middle" fill="#aaa" fontSize="8">FALTA INGESTA DE DATOS</text>}
              </svg>
              <div className="grid-cols-3 gap-1 mt-2 text-[7px]">
                <div className="border p-1">Caso: {cultural?.case_id ?? '—'}</div>
                <div className="border p-1">Fricción: {cultural?.interpretation?.friction ?? '—'}</div>
                <div className="border p-1">Propuesta: {cultural?.interpretation?.proposal ?? '—'}</div>
              </div>
            </div>
          </div>

          {/* Trace / Case Study Panel */}
          <div className="obs-panel" style={{minWidth:'420px'}}>
            <div className="panel-label">TRACE / CASE STUDY</div><div className="panel-topo">TOPO-III</div>
            <div className="panel-body">
              <div className="grid-cols-2 gap-2">
                <div className="border p-1 text-[8px]">
                  <div className="text-gold">Caso</div>
                  <div>{cultural?.case_name ?? 'FALTA INGESTA DE DATOS'}</div>
                  <div className="mt-1">{cultural?.interpretation?.phenomenon ?? ''}</div>
                </div>
                <div className="border p-1 text-[8px]">
                  <div className="text-gold">Traza operacional</div>
                  {caseTrace.slice(0,4).map((ev,i) => <div key={i} className="border-b border-line py-1">{ev.summary || ev.title || ev.id}</div>)}
                  {caseTrace.length===0 && '—'}
                </div>
              </div>
            </div>
          </div>

          {/* World Map + Neural Graph */}
          <div className="obs-panel" style={{minWidth:'500px'}}>
            <div className="panel-label">MUNDO · NODOS REALES</div><div className="panel-topo">TOPO-III</div>
            <div className="panel-body" style={{padding:'30px 8px 8px'}}>
              <div className="flex gap-2 mb-2">
                <button onClick={()=>setMapFilter('all')} className={mapFilter==='all'?'border-gold':'border-line'}>Todos</button>
                <button onClick={()=>setMapFilter('scorefriction')} className={mapFilter==='scorefriction'?'border-gold':'border-line'}>ScoreFriction</button>
                <button onClick={()=>setMapFilter('world')} className={mapFilter==='world'?'border-gold':'border-line'}>WorldSpect</button>
              </div>
              <canvas ref={mapCanvasRef} width="480" height="260" style={{width:'100%', height:'auto', background:'#000', cursor:'pointer'}} onClick={() => setExpandedMap(true)} />
              <div className="mt-2 text-[7px]">Nodos: {nodes.length} | Conexiones: {conns.length}</div>
              <details className="mt-2">
                <summary className="cursor-pointer text-gold text-[8px]">Desglose neural graph</summary>
                <div className="max-h-32 overflow-auto text-[7px] mt-1">
                  {nodes.slice(0,20).map(n=> <div key={n.id}>{n.id} ({n.module || n.scope}) ihg={n.ihg}</div>)}
                </div>
              </details>
            </div>
          </div>

          {/* Media Asset Gallery */}
          <div className="obs-panel" style={{minWidth:'360px'}} onClick={() => openDictamen('Media Asset Gallery', mediaAssets, 'activo', 'bajo', 'Revisar')}>
            <div className="panel-label">Media Asset Gallery</div><div className="panel-topo">TOPO-III</div>
            <div className="panel-body">
              <div className="media-grid">
                {mediaAssets.length===0 && <div className="empty">FALTA INGESTA DE DATOS</div>}
                {mediaAssets.map(asset=>(
                  <div key={asset.id} className="asset-card">
                    {asset.asset_type==='image' && asset.file_url && <img src={asset.file_url} alt=""/>}
                    {asset.asset_type==='video' && asset.file_url && <video src={asset.file_url} controls/>}
                    {asset.asset_type==='audio' && asset.file_url && <audio src={asset.file_url} controls/>}
                    <small>{asset.asset_type}</small>
                    <strong>{asset.provider_used??'?'}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Campaign Generator */}
          <div className="obs-panel" style={{minWidth:'380px'}}>
            <div className="panel-label">Campaign Generator</div><div className="panel-topo">TOPO-III</div>
            <div className="panel-body">
              <label>Canal</label><input value={campaignChannel} onChange={e=>setCampaignChannel(e.target.value)} placeholder="medium / linkedin / tiktok" />
              <label>Objetivo</label><input value={campaignObjective} onChange={e=>setCampaignObjective(e.target.value)} placeholder="persistencia / autoridad" />
              <label>Prompt</label><textarea rows={3} value={campaignPrompt} onChange={e=>setCampaignPrompt(e.target.value)} placeholder="Describe la campaña" />
              <div className="checkbox-row">
                {Object.entries(requestedAssets).map(([k,v])=><label key={k}><input type="checkbox" checked={v} onChange={e=>setRequestedAssets(prev=>({...prev,[k]:e.target.checked}))}/> {k}</label>)}
              </div>
              <button onClick={runCampaign} disabled={campaignLoading||!campaignPrompt.trim()}>{campaignLoading?'Ejecutando...':'Run Campaign'}</button>
              {campaignResult && <pre className="json-box">{JSON.stringify(campaignResult,null,2)}</pre>}
            </div>
          </div>

          {/* Outcome + Lesson */}
          <div className="obs-panel" style={{minWidth:'380px'}}>
            <div className="panel-label">Outcome + Lesson</div><div className="panel-topo">TOPO-III</div>
            <div className="panel-body">
              <label>Outcome</label><textarea rows={2} value={outcomeText} onChange={e=>setOutcomeText(e.target.value)} placeholder="Qué ocurrió después de la ejecución" />
              <label>Lesson</label><textarea rows={2} value={lessonText} onChange={e=>setLessonText(e.target.value)} placeholder="Qué aprendió el sistema" />
              <label className="inline"><input type="checkbox" checked={atlasUpdate} onChange={e=>setAtlasUpdate(e.target.checked)}/> atlas_update</label>
              <button onClick={closeExecutionCycle} disabled={closureLoading}>{closureLoading?'Cerrando...':'Close Institutional Cycle'}</button>
              {closureResult && <pre className="json-box">{JSON.stringify(closureResult,null,2)}</pre>}
            </div>
          </div>

          {/* Object Load Panel (desde wave) */}
          <div className="obs-panel" style={{minWidth:'380px'}}>
            <div className="panel-label">CARGA DE OBJETO</div><div className="panel-topo">TOPO-III</div>
            <div className="panel-body">
              <input placeholder="objeto cultural..." className="w-full" />
              <button onClick={mapObject} className="mt-2 w-full">Mapear objeto</button>
              <div className="text-[7px] mt-1">{persistStatus}</div>
            </div>
          </div>
        </div>
      </main>

      {expandedMap && (
        <div className="modal-overlay" onClick={() => setExpandedMap(false)} style={{zIndex:1000}}>
          <div className="modal-content" onClick={e=>e.stopPropagation()} style={{width:'90vw', maxWidth:'90vw', height:'90vh', background:'#000'}}>
            <button className="modal-close" onClick={()=>setExpandedMap(false)}>✕</button>
            <canvas ref={mapCanvasRef} style={{width:'100%', height:'100%'}} />
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e=>e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>✕</button>
            <h3>{modalContent.title}</h3>
            <p><strong>Dictamen:</strong> {modalContent.narrative}</p>
            <p><strong>Estado:</strong> {modalContent.status}</p>
            <p><strong>Riesgo:</strong> {modalContent.risk}</p>
            <p><strong>Siguiente acción:</strong> {modalContent.nextAction}</p>
            <pre>{modalContent.evidence}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
