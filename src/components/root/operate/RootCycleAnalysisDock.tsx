'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Cycle = Record<string, any>;
type Props = { cycle: Cycle; onChanged: () => void | Promise<void> };

type SuggestionResponse = {
  ok?: boolean;
  error?: string;
  details?: string;
  provider?: string;
  model?: string;
  suggestion?: {
    primaryHypothesis?: string;
    rivalHypotheses?: string[];
    unknowns?: string[];
    discriminatingObservations?: string[];
    stoppingCondition?: string;
    confidence?: number | null;
  };
};

const RELATIONS = [
  ['ORIGIN', 'Origen'],
  ['OBSERVED_STATE', 'Estado observado'],
  ['COPY', 'Copia'],
  ['REMIX', 'Remix'],
  ['MUTATION', 'Mutación'],
  ['PUBLICATION', 'Publicación'],
  ['RECOVERY', 'Recuperación'],
  ['RETURN', 'Retorno'],
] as const;

function lines(value: string) { return value.split('\n').map((item) => item.trim()).filter(Boolean); }
function refs(value: any) { return Array.isArray(value) ? value.filter(Boolean) : []; }
function joined(value: unknown) { return Array.isArray(value) ? value.map(String).filter(Boolean).join('\n') : ''; }

export function RootCycleAnalysisDock({ cycle, onChanged }: Props) {
  const [mode, setMode] = useState<'inference' | 'trajectory'>('inference');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [suggesting, setSuggesting] = useState(false);
  const [suggestionError, setSuggestionError] = useState('');
  const [suggestionSource, setSuggestionSource] = useState('');
  const suggestedCycle = useRef('');

  const [primary, setPrimary] = useState('');
  const [rivals, setRivals] = useState('');
  const [unknowns, setUnknowns] = useState('');
  const [discriminators, setDiscriminators] = useState('');
  const [stopping, setStopping] = useState('');

  const [objectRef, setObjectRef] = useState(String(cycle.title ?? cycle.cycle_code ?? ''));
  const [platform, setPlatform] = useState('');
  const [sourceUri, setSourceUri] = useState('');
  const [relation, setRelation] = useState('OBSERVED_STATE');
  const [observedAt, setObservedAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [markerRef, setMarkerRef] = useState('');
  const [contentHash, setContentHash] = useState('');

  const evidenceCount = refs(cycle.evidence_refs).length;
  const inferenceCount = refs(cycle.inference_refs).length;
  const trajectoryCount = refs(cycle.trajectory_refs).length;
  const canInfer = primary.trim().length >= 5;
  const canTrajectory = objectRef.trim().length >= 2 && evidenceCount > 0;
  const observedIso = useMemo(() => {
    const date = new Date(observedAt);
    return Number.isFinite(date.getTime()) ? date.toISOString() : new Date().toISOString();
  }, [observedAt]);

  useEffect(() => {
    setObjectRef(String(cycle.title ?? cycle.cycle_code ?? ''));
    setPrimary('');
    setRivals('');
    setUnknowns('');
    setDiscriminators('');
    setStopping('');
    setSuggestionError('');
    setSuggestionSource('');
    suggestedCycle.current = '';
  }, [cycle.id, cycle.title, cycle.cycle_code]);

  async function suggestInference(force = false) {
    const cycleId = String(cycle.id ?? '');
    if (!cycleId || evidenceCount === 0 || suggesting) return;
    if (!force && suggestedCycle.current === cycleId) return;
    suggestedCycle.current = cycleId;
    setSuggesting(true);
    setSuggestionError('');
    try {
      const response = await fetch('/api/root/operate/inference/suggest', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operatingCycleId: cycleId }),
      });
      const body = await response.json().catch(() => null) as SuggestionResponse | null;
      if (!response.ok || !body?.ok || !body.suggestion) throw new Error(body?.details ?? body?.error ?? `HTTP ${response.status}`);
      const suggestion = body.suggestion;
      setPrimary(String(suggestion.primaryHypothesis ?? ''));
      setRivals(joined(suggestion.rivalHypotheses));
      setUnknowns(joined(suggestion.unknowns));
      setDiscriminators(joined(suggestion.discriminatingObservations));
      setStopping(String(suggestion.stoppingCondition ?? ''));
      setSuggestionSource(`${body.provider ?? 'provider'} · ${body.model ?? 'model'} · INFERRED · NO PERSISTIDO`);
    } catch (error) {
      setSuggestionError(error instanceof Error ? error.message : 'No fue posible generar la propuesta de inferencia.');
    } finally {
      setSuggesting(false);
    }
  }

  useEffect(() => {
    if (mode === 'inference' && evidenceCount > 0 && inferenceCount === 0 && !primary.trim()) void suggestInference(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, cycle.id, evidenceCount, inferenceCount]);

  async function saveInference() {
    if (!canInfer) return;
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/root/operate/inference', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operatingCycleId: cycle.id,
          primaryHypothesis: primary.trim(),
          rivalHypotheses: lines(rivals),
          unknowns: lines(unknowns),
          discriminatingObservations: lines(discriminators),
          stoppingCondition: stopping.trim() || null,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok) throw new Error(body?.details ?? body?.error ?? `HTTP ${response.status}`);
      setPrimary(''); setRivals(''); setUnknowns(''); setDiscriminators(''); setStopping('');
      setSuggestionSource(''); suggestedCycle.current = '';
      setMessage(body.trace?.status === 'CONTRAST_READY'
        ? 'Inferencia registrada y lista para contraste.'
        : 'Inferencia registrada como INFERRED; todavía no es evidencia ni conclusión.');
      await onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally { setBusy(false); }
  }

  async function saveTrajectory() {
    if (!canTrajectory) return;
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/root/operate/trajectory', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operatingCycleId: cycle.id,
          objectRef: objectRef.trim(),
          platform: platform.trim() || null,
          sourceUri: sourceUri.trim() || null,
          relation,
          observedAt: observedIso,
          markerRef: markerRef.trim() || null,
          contentHash: contentHash.trim() || null,
          evidenceRefs: refs(cycle.evidence_refs),
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok) throw new Error(body?.details ?? body?.error ?? `HTTP ${response.status}`);
      setPlatform(''); setSourceUri(''); setMarkerRef(''); setContentHash(''); setRelation('OBSERVED_STATE'); setObservedAt(new Date().toISOString().slice(0, 16));
      setMessage('Punto de trayectoria guardado y ligado a evidencia real del ciclo.');
      await onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally { setBusy(false); }
  }

  return <section className="analysis-dock">
    <header className="analysis-dock__header">
      <div><span>ANÁLISIS DEL CICLO</span><h3>SFI propone · el operador gobierna · la evidencia decide</h3></div>
      <div className="analysis-dock__counts"><b>{inferenceCount}<small>inferencias</small></b><b>{trajectoryCount}<small>trayectoria</small></b><b>{evidenceCount}<small>evidencias</small></b></div>
    </header>
    <nav className="analysis-dock__tabs">
      <button type="button" data-active={mode === 'inference'} onClick={() => setMode('inference')}>HIPÓTESIS / RIVALES</button>
      <button type="button" data-active={mode === 'trajectory'} onClick={() => setMode('trajectory')}>TRAYECTORIA DEL OBJETO</button>
    </nav>

    {mode === 'inference' ? <div className="analysis-dock__body">
      <div className="analysis-dock__intro">
        <b>Explicaciones propuestas desde la evidencia del ciclo.</b>
        <p>SFI genera la hipótesis principal, rivales, desconocidos y observaciones discriminantes. Puedes corregir o agregar contexto antes de registrar. Nada aquí se vuelve hecho por haber sido generado.</p>
        {evidenceCount ? <button type="button" onClick={() => void suggestInference(true)} disabled={suggesting}>{suggesting ? 'GENERANDO…' : (primary ? 'REGENERAR PROPUESTA SFI' : 'GENERAR PROPUESTA SFI')}</button> : null}
        {suggestionSource ? <small>{suggestionSource}</small> : null}
        {suggestionError ? <p className="analysis-dock__warning">{suggestionError}</p> : null}
      </div>
      {evidenceCount ? <div className="analysis-dock__form">
        <label>HIPÓTESIS PRINCIPAL · PROPUESTA SFI<textarea value={primary} onChange={(e) => setPrimary(e.target.value)} placeholder="SFI propondrá una explicación cuando exista evidencia." /></label>
        <label>RIVALES · PROPUESTOS POR SFI<textarea value={rivals} onChange={(e) => setRivals(e.target.value)} placeholder={'Explicación rival 1\nExplicación rival 2'} /></label>
        <label>LO QUE NO SABEMOS<textarea value={unknowns} onChange={(e) => setUnknowns(e.target.value)} placeholder={'Dato ausente\nCondición no observada'} /></label>
        <label>QUÉ OBSERVACIÓN LAS SEPARARÍA<textarea value={discriminators} onChange={(e) => setDiscriminators(e.target.value)} placeholder={'Observación que favorece una explicación\nObservación que la contradice'} /></label>
        <label className="analysis-dock__wide">CUÁNDO DEJAR DE INSISTIR<input value={stopping} onChange={(e) => setStopping(e.target.value)} placeholder="Condición explícita de rechazo o detención." /></label>
        <button type="button" onClick={() => void saveInference()} disabled={busy || !canInfer}>{busy ? 'GUARDANDO…' : 'REGISTRAR INFERENCIA'}</button>
      </div> : <p className="analysis-dock__warning">Primero agrega evidencia al ciclo. SFI no generará hipótesis sin observaciones persistidas.</p>}
    </div> : <div className="analysis-dock__body">
      <div className="analysis-dock__intro"><b>¿Dónde está este objeto ahora?</b><p>Cada punto conserva momento, relación y evidencia. Registrar una publicación, copia o mutación no demuestra por sí sola propagación, causalidad ni cambio semántico.</p></div>
      <div className="analysis-dock__form trajectory-form">
        <label>OBJETO<input value={objectRef} onChange={(e) => setObjectRef(e.target.value)} placeholder="Identidad estable del objeto" /></label>
        <label>RELACIÓN<select value={relation} onChange={(e) => setRelation(e.target.value)}>{RELATIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>PLATAFORMA / LUGAR<input value={platform} onChange={(e) => setPlatform(e.target.value)} placeholder="YouTube, sitio, archivo, Field…" /></label>
        <label>MOMENTO<input type="datetime-local" value={observedAt} onChange={(e) => setObservedAt(e.target.value)} /></label>
        <label className="analysis-dock__wide">FUENTE / URL<input value={sourceUri} onChange={(e) => setSourceUri(e.target.value)} placeholder="Fuente observable, si existe" /></label>
        <label>HASH REAL DEL ARTEFACTO · OPCIONAL<input value={contentHash} onChange={(e) => setContentHash(e.target.value)} placeholder="Sólo si fue calculado sobre el archivo/contenido real" /></label>
        <label>MARCADOR / PROVENANCE · OPCIONAL<input value={markerRef} onChange={(e) => setMarkerRef(e.target.value)} placeholder="Identificador autorizado" /></label>
        <button type="button" onClick={() => void saveTrajectory()} disabled={busy || !canTrajectory}>{busy ? 'GUARDANDO…' : 'REGISTRAR PUNTO'}</button>
      </div>
      {!evidenceCount ? <p className="analysis-dock__warning">Primero agrega evidencia al ciclo. Una trayectoria sin evidencia no se registra.</p> : null}
    </div>}
    {message ? <p className="analysis-dock__message">{message}</p> : null}
  </section>;
}
