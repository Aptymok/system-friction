'use client';

import { useMemo, useState } from 'react';
import './SfiFriccionautaPanel.css';

type Row = Record<string, any>;
type Message = { role: 'user' | 'assistant'; content: string };

async function post(body: Row) {
  const response = await fetch('/api/root/friccionauta', {
    method: 'POST',
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.ok) throw new Error(json?.details || json?.error || `HTTP ${response.status}`);
  return json as Row;
}

export function SfiFriccionautaPanel() {
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState<Message[]>([]);
  const [result, setResult] = useState<Row | null>(null);
  const [busy, setBusy] = useState<'ask' | 'save' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const answer = typeof result?.answer === 'string' ? result.answer : '';
  const evidenceRefs = Array.isArray(result?.evidenceRefs) ? result.evidenceRefs.filter((item): item is string => typeof item === 'string') : [];
  const warnings = Array.isArray(result?.warnings) ? result.warnings.map(String) : [];
  const retrievalWarnings = Array.isArray(result?.retrievalWarnings) ? result.retrievalWarnings.map(String) : [];
  const runId = typeof result?.run?.id === 'string' ? result.run.id : null;
  const execution = String(result?.cognitiveExecution ?? 'NOT_EXECUTED');
  const continuityPlane = typeof result?.observationPlanes?.continuity === 'string' ? result.observationPlanes.continuity : typeof result?.continuity?.readPlane === 'string' ? result.continuity.readPlane : 'MISSING';
  const twinMemoryPlane = typeof result?.observationPlanes?.cognitiveTwin?.memory === 'string' ? result.observationPlanes.cognitiveTwin.memory : 'MISSING';
  const twinRuntimePlane = typeof result?.observationPlanes?.cognitiveTwin?.runtime === 'string' ? result.observationPlanes.cognitiveTwin.runtime : 'MISSING';
  const amvPlane = typeof result?.observationPlanes?.amv === 'string' ? result.observationPlanes.amv : 'MISSING';
  const continuityDivergence = result?.continuity?.planeComparison?.resolved?.divergenceObserved === true;
  const statusClass = execution === 'EXECUTED' ? 'ok' : 'degraded';
  const conversation = useMemo(() => history.slice(-8), [history]);

  const ask = async () => {
    const prompt = question.trim();
    if (!prompt || busy) return;
    setBusy('ask');
    setError(null);
    setSaved(null);
    try {
      const data = await post({ action: 'ask', question: prompt, history: conversation });
      const responseText = typeof data.answer === 'string' ? data.answer : 'MISSING · Friccionauta no devolvió cuerpo legible.';
      setResult(data);
      setHistory((current) => {
        const next: Message[] = [
          ...current,
          { role: 'user', content: prompt },
          { role: 'assistant', content: responseText },
        ];
        return next.slice(-8);
      });
      setQuestion('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(null);
    }
  };

  const saveFinding = async () => {
    if (!answer || busy) return;
    setBusy('save');
    setError(null);
    try {
      const data = await post({
        action: 'save_finding',
        finding: answer,
        question: history.filter((item) => item.role === 'user').at(-1)?.content ?? null,
        sourceRunId: runId,
        evidenceRefs,
      });
      setSaved(typeof data?.event?.event_id === 'string' ? data.event.event_id : 'hallazgo registrado');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(null);
    }
  };

  return <section className="friccionautaPanel" aria-label="Friccionauta native intelligence">
    <header className="friccionautaHeader">
      <div>
        <span>FRICCIONAUTA · SFI NATIVE INTELLIGENCE</span>
        <h2>Pregunta al estado institucional, no a una memoria aislada.</h2>
        <p>ROOT + Cognitive Twin + World Vector + Neural Graph + AMV + continuidad dual-plane. Interpretación y propuesta; sin autoridad implícita.</p>
      </div>
      <div className="friccionautaBoundary">
        <b>READ / INTERPRET / PROPOSE</b>
        <small>NO CANON · NO PUBLICATION · NO SILENT EXECUTION</small>
      </div>
    </header>

    <div className="friccionautaComposer">
      <textarea
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        placeholder="Ej. ¿Qué está realmente bloqueando a SFI hoy y qué evidencia sostiene esa lectura?"
        onKeyDown={(event) => {
          if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') void ask();
        }}
      />
      <button disabled={Boolean(busy) || !question.trim()} onClick={() => void ask()}>
        {busy === 'ask' ? 'OBSERVANDO…' : 'PREGUNTAR A SFI'}
      </button>
    </div>

    {error ? <div className="friccionautaError">{error}</div> : null}

    {answer ? <article className="friccionautaAnswer">
      <div className="friccionautaMeta">
        <span className={statusClass}>{execution}</span>
        <span>{String(result?.provider ?? 'provider missing')}</span>
        <span>{String(result?.model ?? 'model missing')}</span>
        <span>EVIDENCE {evidenceRefs.length}</span>
        <span>WARNINGS {warnings.length}</span>
        <span>TWIN M {twinMemoryPlane}</span>
        <span>TWIN R {twinRuntimePlane}</span>
        <span>AMV {amvPlane}</span>
        <span>CONTINUITY {continuityPlane}{continuityDivergence ? ' · DIVERGENCE OBSERVED' : ''}</span>
        {runId ? <span>RUN {runId.slice(0, 8)}</span> : null}
      </div>
      <div className="friccionautaText">{answer}</div>
      <div className="friccionautaActions">
        <button disabled={Boolean(busy)} onClick={() => void saveFinding()}>
          {busy === 'save' ? 'REGISTRANDO…' : 'CONSERVAR COMO HALLAZGO INFERIDO'}
        </button>
        {saved ? <small>INFERRED · {saved}</small> : <small>Guardar relevancia no convierte la respuesta en evidencia verificada ni canon.</small>}
      </div>
      {(retrievalWarnings.length || evidenceRefs.length) ? <details className="friccionautaTrace">
        <summary>EVIDENCIA / DEGRADACIONES</summary>
        {retrievalWarnings.length ? <div><strong>Fuentes degradadas</strong>{retrievalWarnings.map((item) => <code key={item}>{item}</code>)}</div> : null}
        {evidenceRefs.length ? <div><strong>Referencias recuperadas</strong>{evidenceRefs.slice(0, 40).map((item) => <code key={item}>{item}</code>)}</div> : null}
      </details> : null}
    </article> : <div className="friccionautaEmpty">
      <span>OBSERVACIÓN DISPONIBLE</span>
      <p>La conversación aún no ha ejecutado una lectura. Cada pregunta genera un run trazable y conserva separación entre evidencia, inferencia y autoridad.</p>
    </div>}
  </section>;
}
