'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const OPERATIONAL_CASE_ID = 'scorefriction-operational-live';
const hexToRgb = (hex: string) => `${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)}`;
const GOLD_RGB = hexToRgb('#C8A951');
const RED_RGB = hexToRgb('#b85050');
const GRN_RGB = hexToRgb('#3a8a5a');

type AssetKey = 'text' | 'image' | 'video' | 'audio' | 'markdown' | 'json';

function n(value: number | null | undefined, digits = 3): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '—';
}

function safeNum(value: unknown, fallback = 0.5): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'general';
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

function buildDictamen(input: { title: string; score: any; operational: any; evidence?: unknown }): string {
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
    return vector ? `El sistema está orientado al vector ${String(vector)}. La propuesta debe conservar coherencia con esa dirección.` : 'No hay vector externo fijado. La propuesta debe clasificarse antes de producir material.';
  }
  if (title.includes('Readiness')) {
    if (executable) return 'El sistema declara capacidad de ejecución. La acción puede correr y después cerrar ciclo con outcome y lesson.';
    return `El sistema no está listo. La brecha de capacidad es ${n(gap, 2)} y debe cerrarse antes de escalar.`;
  }
  if (title.includes('Counts')) {
    const c = operational?.counts ?? {};
    return `El sistema registra ${c?.perturbations ?? 0} perturbaciones, ${c?.capabilityChecks ?? 0} chequeos, ${c?.ledgerEntries ?? 0} entradas de ejecución y ${c?.mediaAssets ?? 0} assets. Esto mide actividad real, no intención.`;
  }
  if (title.includes('Media')) return 'La galería muestra los artefactos generados por ejecución. Si no hay assets, no hay salida material registrada.';
  if (title.includes('Bitácora')) return operational?.latestObservation ? 'Existe una observación reciente. Debe tratarse como evidencia operativa y no como interpretación final.' : 'No hay observación reciente. El sistema necesita registrar un evento antes de inferir patrón.';
  return 'El panel contiene señal operativa. Su significado depende de evidencia, régimen, vector y capacidad de ejecución.';
}

export default function ScoreFrictionOperationalPage() {
  const caseIdRef = useRef(OPERATIONAL_CASE_ID);
  const [scoreState, setScoreState] = useState<any>({ ihg: null, nti: null, ldi: null, phi: null, regime: null });
  const [operational, setOperational] = useState<any>(null);
  const [mediaAssets, setMediaAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [amvMessages, setAmvMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([{ role: 'assistant', content: 'Observatorio inicializado. Expediente fijo SCORE-FRICTION-OPERATIONAL-LIVE activo.' }]);
  const [amvInput, setAmvInput] = useState('');
  const [amvLoading, setAmvLoading] = useState(false);
  const [amvStatus, setAmvStatus] = useState('◉ EN LÍNEA');
  const [amvStatusColor, setAmvStatusColor] = useState('var(--green)');
  const [semanticPressure, setSemanticPressure] = useState(0);
  const [drift, setDrift] = useState(0.28);
  const [campaignChannel, setCampaignChannel] = useState('medium');
  const [campaignObjective, setCampaignObjective] = useState('persistencia cultural verificable');
  const [campaignPrompt, setCampaignPrompt] = useState('');
  const [requestedAssets, setRequestedAssets] = useState<Record<AssetKey, boolean>>({ text: true, image: false, video: false, audio: false, markdown: true, json: true });
  const [campaignResult, setCampaignResult] = useState<any>(null);
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [outcomeText, setOutcomeText] = useState('');
  const [lessonText, setLessonText] = useState('');
  const [atlasUpdate, setAtlasUpdate] = useState(true);
  const [closureResult, setClosureResult] = useState<any>(null);
  const [closureLoading, setClosureLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', narrative: '', evidence: '', status: '', risk: '', nextAction: '' });
  const phiCanvasRef = useRef<HTMLCanvasElement>(null);
  const fieldCanvasRef = useRef<HTMLCanvasElement>(null);
  const twinCanvasRef = useRef<HTMLCanvasElement>(null);
  const worldCanvasRef = useRef<HTMLCanvasElement>(null);
  const spectrCanvasRef = useRef<HTMLCanvasElement>(null);
  const projCanvasRef = useRef<HTMLCanvasElement>(null);
  const entropCanvasRef = useRef<HTMLCanvasElement>(null);
  const chronCanvasRef = useRef<HTMLCanvasElement>(null);
  const fieldParticlesRef = useRef<any[]>([]);
  const tensionHistoryRef = useRef<number[]>([]);
  const animationRef = useRef<number | null>(null);

  const liveFrame = useMemo(() => ({ caseId: caseIdRef.current, node: 'SCORE-FRICTION-OPERATIONAL', version: 'live-canonical', source: 'scorefriction-operational-page' }), []);

  const drawPhiBg = useCallback(() => {
    const c = phiCanvasRef.current; if (!c) return; const ctx = c.getContext('2d'); if (!ctx) return;
    const phi = safeNum(scoreState.phi, 0.5); const regime = scoreState.regime; const t = Date.now() * 0.008;
    ctx.clearRect(0, 0, c.width, c.height); const rgb = regime === 'Homeostático' ? GRN_RGB : regime === 'Entrópico' ? RED_RGB : GOLD_RGB;
    for (let r = 5; r > 0; r--) { const rad = (c.width * 0.38) * (r / 5); ctx.beginPath(); ctx.arc(c.width / 2, c.height / 2, rad + Math.sin(t + r) * 2, 0, Math.PI * 2); ctx.strokeStyle = `rgba(${rgb},${0.018 * r})`; ctx.stroke(); }
    const grad = ctx.createRadialGradient(c.width / 2, c.height / 2, 0, c.width / 2, c.height / 2, c.width / 2); grad.addColorStop(0, `rgba(${rgb},${0.03 + phi * 0.08})`); grad.addColorStop(1, `rgba(${rgb},0)`); ctx.fillStyle = grad; ctx.fillRect(0, 0, c.width, c.height);
  }, [scoreState]);

  const drawFrictionField = useCallback(() => {
    const c = fieldCanvasRef.current; if (!c) return; const ctx = c.getContext('2d'); if (!ctx) return; const phi = safeNum(scoreState.phi, 0.5); const ldi = safeNum(scoreState.ldi, 0.45); const t = Date.now() * 0.005; const fric = 1 - phi;
    ctx.fillStyle = 'rgba(6,6,5,0.1)'; ctx.fillRect(0, 0, c.width, c.height);
    if (!fieldParticlesRef.current.length) for (let i = 0; i < 180; i++) fieldParticlesRef.current.push({ x: Math.random() * c.width, y: Math.random() * c.height, age: Math.random(), maxAge: 0.7 + Math.random() });
    fieldParticlesRef.current.forEach(p => { const nx = p.x / c.width - 0.5; const ny = p.y / c.height - 0.5; const angle = Math.atan2(ny, nx) + Math.PI / 2 * phi + Math.sin(nx * 8 + t) * fric; p.x += Math.cos(angle) * (0.5 + ldi); p.y += Math.sin(angle) * (0.5 + ldi); p.age += 0.01; if (p.age > p.maxAge || p.x < 0 || p.x > c.width || p.y < 0 || p.y > c.height) { p.x = Math.random() * c.width; p.y = Math.random() * c.height; p.age = 0; } ctx.beginPath(); ctx.arc(p.x, p.y, 0.8, 0, Math.PI * 2); ctx.fillStyle = `rgba(${phi < 0.25 ? RED_RGB : phi > 0.6 ? GRN_RGB : GOLD_RGB},${0.04 + phi * 0.08})`; ctx.fill(); });
  }, [scoreState]);

  const drawRadial = useCallback((ref: React.RefObject<HTMLCanvasElement>, seed: number, strength = 0.5) => {
    const c = ref.current; if (!c) return; const ctx = c.getContext('2d'); if (!ctx) return; const t = Date.now() * 0.004 + seed; ctx.clearRect(0, 0, c.width, c.height); const cx = c.width / 2; const cy = c.height / 2; const R = Math.min(c.width, c.height) * 0.36;
    for (let layer = 0; layer < 4; layer++) { ctx.beginPath(); for (let i = 0; i <= 48; i++) { const a = (i / 48) * Math.PI * 2; const wob = Math.sin(a * (3 + layer) + t + seed) * R * 0.08 * strength; const r = R * (0.45 + layer * 0.16) + wob; const x = cx + Math.cos(a) * r; const y = cy + Math.sin(a) * r; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.strokeStyle = `rgba(${GOLD_RGB},${0.05 + layer * 0.025})`; ctx.stroke(); }
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 + t * 0.1; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * R * (0.35 + strength), cy + Math.sin(a) * R * (0.35 + strength), 1.3, 0, Math.PI * 2); ctx.fillStyle = `rgba(${GOLD_RGB},0.18)`; ctx.fill(); }
  }, []);

  const drawChronology = useCallback(() => {
    const c = chronCanvasRef.current; if (!c) return; const ctx = c.getContext('2d'); if (!ctx) return; const counts = operational?.counts ?? {}; const vals = [counts.perturbations ?? 0, counts.capabilityChecks ?? 0, counts.ledgerEntries ?? 0, counts.mediaAssets ?? 0, counts.outcomes ?? 0, counts.lessons ?? 0]; ctx.clearRect(0, 0, c.width, c.height); ctx.strokeStyle = `rgba(${GOLD_RGB},0.18)`; ctx.beginPath(); ctx.moveTo(20, c.height - 24); ctx.lineTo(c.width - 20, c.height - 24); ctx.stroke(); vals.forEach((v, i) => { const x = 30 + i * ((c.width - 60) / 5); const h = Math.min(c.height - 42, 12 + v * 10); ctx.fillStyle = `rgba(${GOLD_RGB},${0.18 + i * 0.04})`; ctx.fillRect(x - 8, c.height - 24 - h, 16, h); });
  }, [operational]);

  const animate = useCallback(() => { drawPhiBg(); drawFrictionField(); drawRadial(twinCanvasRef, 1, drift); drawRadial(worldCanvasRef, 2, semanticPressure + 0.35); drawRadial(spectrCanvasRef, 3, safeNum(scoreState.ldi, 0.5)); drawRadial(projCanvasRef, 4, safeNum(scoreState.phi, 0.5)); drawRadial(entropCanvasRef, 5, safeNum(operational?.executionReadiness?.capability_gap, 0.4)); drawChronology(); animationRef.current = requestAnimationFrame(animate); }, [drawPhiBg, drawFrictionField, drawRadial, drift, semanticPressure, scoreState, operational, drawChronology]);

  useEffect(() => { animate(); return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); }; }, [animate]);

  const loadAllData = useCallback(async () => {
    setLoadError(null);
    try {
      const [scoreRes, opRes, execRes] = await Promise.all([
        fetch('/api/scorefriction/state', { cache: 'no-store' }),
        fetch(`/api/sfi/operational-state?case_id=${encodeURIComponent(caseIdRef.current)}`, { cache: 'no-store' }),
        fetch(`/api/sfi/execution-state?case_id=${encodeURIComponent(caseIdRef.current)}`, { cache: 'no-store' }),
      ]);
      const scoreData = await scoreRes.json().catch(() => null); const opData = await opRes.json().catch(() => null); const execData = await execRes.json().catch(() => null);
      if (scoreData?.ok) setScoreState({ ihg: typeof scoreData.ihg === 'number' ? scoreData.ihg : null, nti: typeof scoreData.nti === 'number' ? scoreData.nti : null, ldi: typeof scoreData.ldi === 'number' ? scoreData.ldi : null, phi: typeof scoreData.phi === 'number' ? scoreData.phi : null, regime: typeof scoreData.regime === 'string' ? scoreData.regime : null });
      const counts = { perturbations: execData?.perturbations?.length ?? 0, capabilityChecks: execData?.capabilityChecks?.length ?? 0, ledgerEntries: execData?.ledgerEntries?.length ?? 0, mediaAssets: execData?.mediaAssets?.length ?? 0, outcomes: execData?.outcomes?.length ?? 0, lessons: execData?.lessons?.length ?? 0 };
      const lastCap = execData?.capabilityChecks?.[0];
      setOperational({ ...(opData?.ok ? opData : {}), ok: Boolean(opData?.ok), counts, executionReadiness: lastCap ? { capability_gap: typeof lastCap.capability_gap === 'number' ? lastCap.capability_gap : undefined, executable: Boolean(lastCap.executable), missing_capabilities: Array.isArray(lastCap.capabilities_missing) ? lastCap.capabilities_missing : [] } : {}, runtimeFocus: opData?.runtimeFocus ?? opData?.runtime_focus ?? { vector: 'cultural-signal', scope: 'scorefriction' }, latestObservation: opData?.latestObservation ?? execData?.perturbations?.[0] ?? null });
      setMediaAssets(Array.isArray(execData?.mediaAssets) ? execData.mediaAssets : []);
    } catch (err: any) { setLoadError(err?.message ?? 'Error al cargar datos.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAllData(); const interval = setInterval(loadAllData, 10000); return () => clearInterval(interval); }, [loadAllData]);

  const sendAmvMessage = async (override?: string) => {
    const content = override ?? amvInput; if (!content.trim()) return; setAmvMessages(prev => [...prev, { role: 'user', content }]); setAmvInput(''); setAmvLoading(true); setAmvStatus('○ COMPUTANDO'); setAmvStatusColor('var(--gold)');
    try { const res = await fetch('/api/amv/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ module: 'scorefriction', sessionId: caseIdRef.current, message: content, context: { sys: scoreState, operational, mediaAssetsCount: mediaAssets.length, ...liveFrame } }) }); const data = await res.json().catch(() => null); setAmvMessages(prev => [...prev, { role: 'assistant', content: data?.response || data?.answer || data?.message || 'AMV procesó la señal.' }]); setAmvStatus('◉ EN LÍNEA'); setAmvStatusColor('var(--green)'); }
    catch { setAmvMessages(prev => [...prev, { role: 'assistant', content: 'AMV degradado. Se conserva dictamen local.' }]); setAmvStatus('△ DEGRADADO'); setAmvStatusColor('var(--red)'); }
    finally { setAmvLoading(false); }
  };

  const openDictamen = useCallback((title: string, evidence: unknown, status: string, risk: string, nextAction: string) => { const narrative = buildDictamen({ title, score: scoreState, operational, evidence }); setModalContent({ title, narrative, evidence: JSON.stringify(evidence ?? {}, null, 2), status, risk, nextAction }); setModalOpen(true); void sendAmvMessage(`Interpreta el panel ${title} con esta evidencia: ${JSON.stringify(evidence ?? {})}`); }, [scoreState, operational]);

  const runCampaign = async () => {
    const cleanChannel = slugify(campaignChannel);
    const cleanObjective = campaignObjective.trim() || 'persistencia cultural verificable';
    const cleanPrompt = campaignPrompt.trim();
    if (!cleanPrompt) { setCampaignResult({ ok: false, error: 'Falta prompt de campaña.' }); return; }
    setCampaignLoading(true); setCampaignResult(null);
    try {
      const assetList = Object.entries(requestedAssets).filter(([, v]) => v).map(([k]) => k as AssetKey);
      const runPayload = { case_id: caseIdRef.current, minimal_action: cleanPrompt, expected_effect: `Campaña ${cleanObjective} en ${cleanChannel}`, requested_assets: assetList, target_domain: cleanChannel, perturbation_type: 'campaign', runtime_focus: { ...(operational?.runtimeFocus ?? {}), channel: cleanChannel, objective: cleanObjective, source_url: 'https://www.systemfriction.org/scorefriction-operational' }, metadata: { campaign_slug: `${cleanChannel}-${slugify(cleanObjective)}`, ...liveFrame } };
      const runRes = await fetch('/api/sfi/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(runPayload) }); const runData = await runRes.json().catch(() => ({ ok: false, error: 'Respuesta inválida de /api/sfi/run' }));
      let renderData = null;
      if (assetList.length) { const renderRes = await fetch('/api/sfi/media/render', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ case_id: caseIdRef.current, provider: 'auto', assets: assetList, prompt: cleanPrompt, runtime_focus: runPayload.runtime_focus, score_state: scoreState, metadata: runPayload.metadata }) }); renderData = await renderRes.json().catch(() => ({ ok: false, error: 'Respuesta inválida de /api/sfi/media/render' })); }
      setCampaignResult({ ok: Boolean(runData?.ok || renderData?.ok), run: runData, render: renderData, payload: runPayload }); await loadAllData();
    } catch (err: any) { setCampaignResult({ ok: false, error: err?.message ?? 'Error ejecutando campaña.' }); }
    finally { setCampaignLoading(false); }
  };

  const closeExecutionCycle = async () => {
    if (!outcomeText.trim() || !lessonText.trim()) { setClosureResult({ ok: false, error: 'Falta Outcome o Lesson.' }); return; }
    setClosureLoading(true); setClosureResult(null);
    try { const execRes = await fetch(`/api/sfi/execution-state?case_id=${encodeURIComponent(caseIdRef.current)}`, { cache: 'no-store' }); const execData = await execRes.json(); const lastLedger = execData?.ledgerEntries?.[0]; if (!lastLedger?.id) throw new Error('No hay ejecución previa. Ejecuta primero una campaña.'); const outcomeRes = await fetch('/api/sfi/outcome', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ execution_id: lastLedger.id, case_id: caseIdRef.current, outcome_status: 'success', observed_effect: { description: outcomeText }, unexpected_effects: [], prediction_accuracy: 0.8 }) }); const outcomeData = await outcomeRes.json(); if (!outcomeData?.ok) throw new Error(outcomeData?.error ?? 'No se registró outcome.'); const lessonRes = await fetch('/api/sfi/lesson', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ outcome_id: outcomeData.outcome.id, case_id: caseIdRef.current, lesson: lessonText, updates_direction_engine: true, updates_risk_engine: true, updates_capability_engine: true, atlas_update: atlasUpdate }) }); const lessonData = await lessonRes.json(); if (!lessonData?.ok) throw new Error(lessonData?.error ?? 'No se registró lesson.'); setClosureResult({ ok: true, outcome: outcomeData.outcome, lesson: lessonData.lesson }); setOutcomeText(''); setLessonText(''); await loadAllData(); }
    catch (err: any) { setClosureResult({ ok: false, error: err?.message ?? 'Error cerrando ciclo.' }); }
    finally { setClosureLoading(false); }
  };

  const handleSemanticInput = (val: string) => { setSemanticPressure(Math.min(1, val.length / 240)); setDrift(Math.min(1, 0.2 + val.length / 600)); };

  if (loading) return <main className="screen center"><style jsx global>{globalCss}</style>Cargando Observatorio Operacional...</main>;
  const phiVal = n(scoreState.phi, 3); const currentRegime = scoreState.regime ?? operational?.systemRegime ?? 'sin régimen'; const counts = operational?.counts ?? {}; const readiness = operational?.executionReadiness ?? {}; const runtimeFocus = operational?.runtimeFocus ?? {};

  return <main className="screen">
    <style jsx global>{globalCss}</style>
    <header id="hdr"><div className="hdr-brand">SFI</div><div className="hdr-sep" /><div className="hdr-stat">SCORE FRICTION <span>OPERACIONAL</span></div><div className="hdr-sep" /><div className="hdr-phi">Φ_SF <em>{phiVal}</em></div><div className="hdr-sep" /><div className={`hdr-regime ${regimeClass(currentRegime)}`}>{currentRegime}</div><div className="hdr-right"><div className="hdr-clock">{new Date().toISOString().slice(0, 19).replace('T', ' ')}</div></div></header>
    <section id="obs">{loadError && <div className="error-strip">{loadError}</div>}
      <div className="zone zone-a">
        <Panel title="Φ_SF · Régimen" topo="TOPO-II" onClick={() => openDictamen('Φ_SF · Régimen', scoreState, currentRegime, riskFromGap(readiness.capability_gap), 'Leer régimen y ejecutar solo acción mínima verificable.')}><canvas ref={phiCanvasRef} width="240" height="200" /><div className={`phi-big ${phiClass(scoreState.phi)}`}>{phiVal}</div><div className="phi-eq">IHG · NTI / (1 + LDI)</div><div className={`phi-regime ${regimeClass(currentRegime)}`}>{currentRegime}</div><Metric label="IHG" value={n(scoreState.ihg, 2)} /><Metric label="NTI" value={n(scoreState.nti, 2)} /><Metric label="LDI" value={n(scoreState.ldi, 2)} /></Panel>
        <Panel title="Campo de Fricción" topo="TOPO-II" onClick={() => openDictamen('Campo de Fricción', { phi: scoreState.phi, ldi: scoreState.ldi }, 'activo', riskFromGap(readiness.capability_gap), 'Reducir ambigüedad antes de ampliar producción.')}><canvas ref={fieldCanvasRef} width="360" height="200" /></Panel>
        <Panel title="Cognitive Twin" topo="TOPO-I" onClick={() => openDictamen('Cognitive Twin', { drift, phi: scoreState.phi }, 'estable', 'bajo', 'Alinear con observaciones externas.')}><canvas ref={twinCanvasRef} width="320" height="200" /></Panel>
        <Panel title="World Spectrum" topo="TOPO-III" onClick={() => openDictamen('World Spectrum', runtimeFocus, 'integrado', runtimeFocus.vector ? 'bajo' : 'medio', 'Fijar vector antes de producir material.')}><canvas ref={worldCanvasRef} width="300" height="200" /><pre className="mini-json">{JSON.stringify(runtimeFocus, null, 2)}</pre></Panel>
      </div>
      <div className="zone zone-b">
        <Panel title="Tensión Longitudinal" topo="TOPO-II" onClick={() => openDictamen('Tensión Longitudinal', { ldi: scoreState.ldi, drift }, 'monitoreo', 'crítico si >0.75', 'Alinear acciones')}><canvas ref={spectrCanvasRef} width="400" height="180" /></Panel>
        <Panel title="Presión Semántica" topo="TOPO-I" onClick={() => openDictamen('Presión Semántica', { pressure: semanticPressure, drift }, 'variable', 'bajo', 'Escribir observaciones')}><textarea rows={3} placeholder="Observación estructural..." onInput={(e) => handleSemanticInput((e.target as HTMLTextAreaElement).value)} /><div className="goldline">ψ {semanticPressure.toFixed(3)}</div></Panel>
        <Panel title="Proyección Estocástica" topo="TOPO-II" onClick={() => openDictamen('Proyección Estocástica', { phi: scoreState.phi }, 'proyectando', 'medio', 'Usar planificación')}><canvas ref={projCanvasRef} width="340" height="180" /></Panel>
        <Panel title="Entropía · Agente" topo="TOPO-II" onClick={() => openDictamen('Entropía · Agente', { gap: readiness.capability_gap }, 'calculando', 'medio', 'Reducir con evidencia')}><canvas ref={entropCanvasRef} width="260" height="180" /></Panel>
      </div>
      <div className="zone zone-c">
        <Panel title="Cronología Viva" topo="TOPO-III" onClick={() => openDictamen('Cronología Viva', { events: operational?.events?.slice?.(0, 5), counts }, 'histórico', 'bajo', 'Actualizar con nueva data')}><canvas ref={chronCanvasRef} width="520" height="160" /></Panel>
        <Panel title="Bitácora Operacional" topo="TOPO-III" onClick={() => openDictamen('Bitácora Operacional', operational?.latestObservation, operational?.latestObservation ? 'activo' : 'vacío', 'bajo', 'Registrar evento')}><pre className="json-box">{JSON.stringify(operational?.latestObservation ?? { case_id: caseIdRef.current, status: 'sin observación reciente' }, null, 2)}</pre></Panel>
        <Panel title="AMV · Agente" topo="TOPO-I"><div className="agent-log">{amvMessages.map((msg, idx) => <div key={idx} className={msg.role === 'user' ? 'a-msg-obs' : 'a-msg-agt'}>{msg.content}</div>)}{amvLoading && <div className="a-msg-agt">AMV procesando...</div>}</div><div className="agent-footer"><input value={amvInput} onChange={(e) => setAmvInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendAmvMessage()} placeholder="Pregunta al AMV..." /><button onClick={() => sendAmvMessage()}>Enviar</button></div><div className="agent-status" style={{ color: amvStatusColor }}>{amvStatus}</div></Panel>
        <Panel title="Operational Counts" topo="TOPO-III" wide onClick={() => openDictamen('Operational Counts', counts, 'activo', 'bajo', 'Revisar actividad')}><Metric label="Perturbations" value={counts.perturbations ?? 0} /><Metric label="Capability Checks" value={counts.capabilityChecks ?? 0} /><Metric label="Execution Ledger" value={counts.ledgerEntries ?? 0} /><Metric label="Media Assets" value={counts.mediaAssets ?? 0} /><Metric label="Outcomes" value={counts.outcomes ?? 0} /><Metric label="Lessons" value={counts.lessons ?? 0} /></Panel>
        <Panel title="Execution Readiness" topo="TOPO-III" wide onClick={() => openDictamen('Execution Readiness', readiness, readiness.executable ? 'listo' : 'no listo', riskFromGap(readiness.capability_gap), 'Ejecutar si listo')}><div className={`readiness ${readiness.executable ? 'ready' : 'blocked'}`}>{readiness.executable ? 'LISTO' : 'NO LISTO'}</div><Metric label="capability_gap" value={n(readiness.capability_gap, 2)} /><pre className="json-box">{JSON.stringify({ missing: readiness.missing_capabilities ?? [] }, null, 2)}</pre></Panel>
        <Panel title="Media Asset Gallery" topo="TOPO-III" wide><div className="media-grid">{mediaAssets.length === 0 && <div className="empty">Sin assets registrados. Ejecuta Campaign Generator para generar salida material.</div>}{mediaAssets.map((asset) => <div key={asset.id ?? asset.file_url} className="asset-card">{asset.asset_type === 'image' && asset.file_url && <img src={asset.file_url} alt="asset" />}{asset.asset_type === 'video' && asset.file_url && <video src={asset.file_url} controls />}{asset.asset_type === 'audio' && asset.file_url && <audio src={asset.file_url} controls />}{!['image', 'video', 'audio'].includes(asset.asset_type) && <pre>{JSON.stringify(asset, null, 2)}</pre>}<small>{asset.asset_type}</small><strong>{asset.provider_used ?? 'provider no registrado'}</strong></div>)}</div></Panel>
        <Panel title="Campaign Generator" topo="TOPO-III" wide><label>Canal</label><input value={campaignChannel} onChange={(e) => setCampaignChannel(e.target.value)} placeholder="medium / linkedin / tiktok" /><label>Objetivo</label><input value={campaignObjective} onChange={(e) => setCampaignObjective(e.target.value)} placeholder="persistencia / autoridad" /><label>Prompt</label><textarea rows={3} value={campaignPrompt} onChange={(e) => setCampaignPrompt(e.target.value)} placeholder="Describe campaña, audiencia, restricción y salida." /><div className="checkbox-row">{Object.entries(requestedAssets).map(([key, val]) => <label key={key}><input type="checkbox" checked={val} onChange={(e) => setRequestedAssets(prev => ({ ...prev, [key]: e.target.checked }))} /> {key}</label>)}</div><button onClick={runCampaign} disabled={campaignLoading || !campaignPrompt.trim()}>{campaignLoading ? 'Ejecutando...' : 'Run Campaign'}</button>{campaignResult && <pre className="result-box">{JSON.stringify(campaignResult, null, 2)}</pre>}</Panel>
        <Panel title="Outcome + Lesson" topo="TOPO-III" wide><label>Outcome</label><textarea rows={2} value={outcomeText} onChange={(e) => setOutcomeText(e.target.value)} placeholder="Qué ocurrió después de la ejecución" /><label>Lesson</label><textarea rows={2} value={lessonText} onChange={(e) => setLessonText(e.target.value)} placeholder="Qué aprendió el sistema" /><label className="inline"><input type="checkbox" checked={atlasUpdate} onChange={(e) => setAtlasUpdate(e.target.checked)} /> atlas_update</label><button onClick={closeExecutionCycle} disabled={closureLoading}>{closureLoading ? 'Cerrando...' : 'Close Institutional Cycle'}</button>{closureResult && <pre className="result-box">{JSON.stringify(closureResult, null, 2)}</pre>}</Panel>
      </div>
    </section>
    {modalOpen && <div className="modal-overlay" onClick={() => setModalOpen(false)}><div className="modal-content" onClick={(e) => e.stopPropagation()}><button className="modal-close" onClick={() => setModalOpen(false)}>×</button><h3>{modalContent.title}</h3><p><strong>Dictamen:</strong> {modalContent.narrative}</p><p><strong>Estado:</strong> {modalContent.status}</p><p><strong>Riesgo:</strong> {modalContent.risk}</p><p><strong>Siguiente acción:</strong> {modalContent.nextAction}</p><pre>{modalContent.evidence}</pre></div></div>}
  </main>;
}

function Panel({ title, topo, children, wide, onClick }: { title: string; topo: string; children: React.ReactNode; wide?: boolean; onClick?: () => void }) { return <div className={`panel ${wide ? 'wide' : ''}`} onClick={onClick}><div className="panel-label">{title}</div><div className="panel-topo">{topo}</div><div className="panel-body">{children}</div></div>; }
function Metric({ label, value }: { label: string; value: string | number }) { return <div className="metric-row"><span>{label}</span><strong>{value}</strong></div>; }

const globalCss = `
:root{--void:#060605;--surface:#0d0d0c;--gold:#C8A951;--red:#b85050;--green:#3a8a5a;--text:#c8c4b8;--muted:rgba(200,196,184,.48);--line:rgba(200,169,81,.14);--mono:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}*{box-sizing:border-box}body{margin:0;background:var(--void);overflow:hidden}.screen{width:100vw;height:100vh;background:radial-gradient(circle at 50% 10%,rgba(200,169,81,.06),transparent 36%),var(--void);color:var(--text);font-family:var(--mono)}.center{display:flex;align-items:center;justify-content:center}#hdr{position:fixed;top:0;left:0;right:0;height:44px;display:flex;align-items:center;gap:12px;padding:0 14px;border-bottom:1px solid var(--line);background:rgba(6,6,5,.92);backdrop-filter:blur(10px);z-index:5}.hdr-brand{font-weight:800;color:var(--gold);letter-spacing:.2em}.hdr-sep{width:1px;height:18px;background:var(--line)}.hdr-stat{font-size:12px;letter-spacing:.18em}.hdr-stat span,.hdr-phi em{color:var(--gold);font-style:normal}.hdr-regime{font-size:11px;text-transform:uppercase}.reg-homeost{color:var(--green)}.reg-entrop,.crit{color:var(--red)}.reg-critico,.reg-unknown,.warn{color:var(--gold)}.ok{color:var(--green)}.hdr-right{margin-left:auto}.hdr-clock{font-size:10px;color:var(--muted)}#obs{position:fixed;top:44px;left:0;right:0;bottom:0;display:grid;grid-template-columns:1.05fr 1fr 1.25fr;gap:10px;padding:10px;overflow:hidden}.zone{display:grid;gap:10px;min-height:0}.zone-a{grid-template-rows:1.12fr 1fr 1fr 1fr}.zone-b{grid-template-rows:1fr .78fr 1fr 1fr}.zone-c{grid-template-columns:1fr 1fr;grid-auto-rows:minmax(150px,1fr);overflow:auto;padding-right:4px}.panel{position:relative;min-height:0;background:linear-gradient(180deg,rgba(255,255,255,.025),rgba(255,255,255,.006));border:1px solid var(--line);box-shadow:inset 0 0 0 1px rgba(255,255,255,.015),0 0 28px rgba(0,0,0,.35);padding:24px 10px 10px;cursor:default;overflow:hidden}.panel:hover{border-color:rgba(200,169,81,.32)}.panel.wide{grid-column:span 2}.panel-label{position:absolute;top:7px;left:10px;font-size:10px;color:var(--gold);letter-spacing:.12em;text-transform:uppercase}.panel-topo{position:absolute;top:7px;right:10px;font-size:9px;color:var(--muted)}.panel-body{height:100%;overflow:auto}.panel canvas{width:100%;height:auto;min-height:100px;display:block}.phi-big{font-size:36px;font-weight:800;letter-spacing:-.05em}.phi-eq,.phi-regime,.goldline{font-size:11px;color:var(--gold);margin:4px 0}.metric-row{display:flex;justify-content:space-between;gap:12px;padding:5px 0;border-bottom:1px solid rgba(200,169,81,.08);font-size:11px}.metric-row span{color:var(--muted)}.metric-row strong{color:var(--text)}textarea,input{width:100%;background:#0a0a09;border:1px solid rgba(200,169,81,.24);color:var(--text);font-family:var(--mono);font-size:12px;padding:8px;outline:none}label{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.1em;margin-top:8px;display:block}button{background:rgba(200,169,81,.1);border:1px solid var(--gold);color:var(--gold);padding:7px 10px;font-family:var(--mono);font-size:11px;cursor:pointer;margin-top:8px}button:disabled{opacity:.45;cursor:not-allowed}.json-box,.result-box,.mini-json{font-size:10px;line-height:1.35;background:rgba(0,0,0,.22);border:1px solid rgba(200,169,81,.1);padding:8px;white-space:pre-wrap;max-height:180px;overflow:auto}.agent-log{height:110px;overflow:auto;font-size:11px}.a-msg-obs{color:#e6ddc7;margin:4px 0}.a-msg-agt{color:var(--gold);margin:4px 0}.agent-footer{display:flex;gap:6px}.agent-footer input{flex:1}.agent-status{font-size:10px;margin-top:4px}.readiness{font-size:20px;font-weight:800;letter-spacing:.12em}.readiness.ready{color:var(--green)}.readiness.blocked{color:var(--red)}.media-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px}.asset-card{border:1px solid rgba(200,169,81,.12);padding:8px;background:rgba(0,0,0,.18);font-size:10px}.asset-card img,.asset-card video{max-width:100%;display:block}.asset-card small{display:block;color:var(--muted);margin-top:4px}.asset-card strong{display:block;color:var(--gold);font-size:10px}.empty{color:var(--muted);font-size:12px;padding:12px}.checkbox-row{display:flex;flex-wrap:wrap;gap:10px;margin:8px 0}.checkbox-row label,.inline{display:flex;align-items:center;gap:5px;margin:0;text-transform:none;letter-spacing:0}.checkbox-row input,.inline input{width:auto}.error-strip{position:absolute;top:8px;left:50%;transform:translateX(-50%);z-index:10;background:rgba(184,80,80,.18);border:1px solid rgba(184,80,80,.45);color:#f0c0c0;padding:6px 10px;font-size:11px}.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:20;display:flex;align-items:center;justify-content:center}.modal-content{width:min(720px,92vw);max-height:84vh;overflow:auto;background:#0b0b0a;border:1px solid rgba(200,169,81,.34);padding:22px;box-shadow:0 0 60px rgba(0,0,0,.7)}.modal-content h3{color:var(--gold);text-transform:uppercase;letter-spacing:.12em}.modal-content pre{white-space:pre-wrap;background:#050505;padding:10px;border:1px solid var(--line)}.modal-close{float:right;margin:0}@media(max-width:980px){body{overflow:auto}.screen{height:auto;min-height:100vh}#obs{position:relative;top:44px;display:block;overflow:visible}.zone{display:block}.panel,.panel.wide{margin-bottom:10px;min-height:180px}.zone-c{display:block;overflow:visible}#hdr{overflow:auto}.hdr-clock{display:none}}
`;
