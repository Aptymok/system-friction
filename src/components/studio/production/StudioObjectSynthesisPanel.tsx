'use client';

import { useEffect, useState } from 'react';

type Context = {
  declaredAttractor: string;
  desiredShift: string;
  targetAudience: string;
  prohibitedEffects: string;
};

type Synthesis = {
  status: string;
  generatedAt: string;
  objectReading: {
    summary: string;
    evidenceCoverage: number;
    interpretability: string;
    limitations: string[];
    salientSignals: Array<{ label: string; value: number | string | null; meaning: string }>;
  };
  worldContext: {
    relation: string;
    explanation: string;
    observedAt: string | null;
    confidence: number | null;
    dominantSignal: string | null;
    trends: Array<{ domain: string; direction: string; slope: number; sampleCount: number }>;
    warnings: string[];
  };
  mihm: {
    status: string;
    coverage: number;
    coreCoverage: number;
    ihg: number | null;
    summary: string;
    variables: Array<{ key: string; label: string; value: number | null; status: string; explanation: string; warnings: string[] }>;
    limitations: string[];
  };
  leverage: {
    status: string;
    scope: string | null;
    targetVariable: string | null;
    minimumPerturbation: string | null;
    preserves: string[];
    expectedSignal: string | null;
    verificationWindow: string | null;
    falsificationCriterion: string | null;
    rationale: string;
  };
};

function initialContext(): Context {
  return { declaredAttractor: '', desiredShift: '', targetAudience: '', prohibitedEffects: '' };
}

function asContext(value: unknown): Context {
  const row = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return {
    declaredAttractor: typeof row.declaredAttractor === 'string' ? row.declaredAttractor : '',
    desiredShift: typeof row.desiredShift === 'string' ? row.desiredShift : '',
    targetAudience: typeof row.targetAudience === 'string' ? row.targetAudience : '',
    prohibitedEffects: Array.isArray(row.prohibitedEffects) ? row.prohibitedEffects.map(String).join('\n') : '',
  };
}

function numberOrUnknown(value: number | null) {
  return value === null ? 'UNKNOWN' : Number(value.toFixed(4));
}

export function StudioObjectSynthesisPanel({ objectId }: { objectId: string | null }) {
  const [context, setContext] = useState<Context>(initialContext);
  const [synthesis, setSynthesis] = useState<Synthesis | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'saving' | 'running' | 'failed'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!objectId) {
      setContext(initialContext());
      setSynthesis(null);
      return;
    }
    let cancelled = false;
    async function load() {
      setState('loading');
      setMessage(null);
      const [contextResponse, synthesisResponse] = await Promise.all([
        fetch(`/api/studio/objects/${encodeURIComponent(objectId as string)}/context`, { cache: 'no-store' }),
        fetch(`/api/studio/objects/${encodeURIComponent(objectId as string)}/synthesize`, { cache: 'no-store' }),
      ]);
      const contextBody = await contextResponse.json().catch(() => null);
      const synthesisBody = await synthesisResponse.json().catch(() => null);
      if (cancelled) return;
      if (contextResponse.ok && contextBody?.ok) setContext(asContext(contextBody.context));
      if (synthesisResponse.ok && synthesisBody?.ok) setSynthesis(synthesisBody.synthesis as Synthesis);
      setState('idle');
    }
    void load().catch((error) => {
      if (!cancelled) {
        setState('failed');
        setMessage(error instanceof Error ? error.message : String(error));
      }
    });
    return () => { cancelled = true; };
  }, [objectId]);

  if (!objectId) return null;

  async function saveAndSynthesize() {
    setState('saving');
    setMessage('Persistiendo atractor y límites de intervención.');
    const contextResponse = await fetch(`/api/studio/objects/${encodeURIComponent(objectId as string)}/context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        declaredAttractor: context.declaredAttractor,
        desiredShift: context.desiredShift,
        targetAudience: context.targetAudience,
        prohibitedEffects: context.prohibitedEffects,
      }),
    });
    const contextBody = await contextResponse.json().catch(() => null);
    if (!contextResponse.ok || contextBody?.ok !== true) {
      setState('failed');
      setMessage(contextBody?.details || contextBody?.error || `CONTEXT_HTTP_${contextResponse.status}`);
      return;
    }

    setState('running');
    setMessage('Calculando lectura objeto–mundo, MIHM y punto de palanca.');
    const synthesisResponse = await fetch(`/api/studio/objects/${encodeURIComponent(objectId as string)}/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ persist: true }),
    });
    const synthesisBody = await synthesisResponse.json().catch(() => null);
    if (!synthesisResponse.ok || synthesisBody?.ok !== true) {
      setState('failed');
      setMessage(synthesisBody?.details || synthesisBody?.error || `SYNTHESIS_HTTP_${synthesisResponse.status}`);
      return;
    }
    setSynthesis(synthesisBody.synthesis as Synthesis);
    setState('idle');
    setMessage('Lectura persistida. Ninguna intervención se considera ejecutada.');
  }

  return (
    <section className="sfi-production__panel">
      <header>
        <span>OBJECT → WORLD → MIHM → LEVERAGE</span>
        <strong>{synthesis?.status ?? 'NOT_GENERATED'}</strong>
      </header>

      <div className="sfi-production__overview-grid">
        <div>
          <label>
            ATRACTOR DECLARADO
            <textarea value={context.declaredAttractor} onChange={(event) => setContext((current) => ({ ...current, declaredAttractor: event.target.value }))} disabled={state === 'saving' || state === 'running'} placeholder="Qué debe preservarse o alcanzarse." />
          </label>
          <label>
            DESPLAZAMIENTO DESEADO
            <textarea value={context.desiredShift} onChange={(event) => setContext((current) => ({ ...current, desiredShift: event.target.value }))} disabled={state === 'saving' || state === 'running'} placeholder="Qué señal debe cambiar." />
          </label>
          <label>
            AUDIENCIA / CAMPO
            <input value={context.targetAudience} onChange={(event) => setContext((current) => ({ ...current, targetAudience: event.target.value }))} disabled={state === 'saving' || state === 'running'} placeholder="Contexto de recepción." />
          </label>
          <label>
            EFECTOS PROHIBIDOS
            <textarea value={context.prohibitedEffects} onChange={(event) => setContext((current) => ({ ...current, prohibitedEffects: event.target.value }))} disabled={state === 'saving' || state === 'running'} placeholder="Uno por línea." />
          </label>
          <button type="button" onClick={() => void saveAndSynthesize()} disabled={state === 'saving' || state === 'running' || state === 'loading'}>
            {synthesis ? 'RECALCULAR LECTURA' : 'GENERAR LECTURA'}
          </button>
          {message ? <p className={`sfi-production__action-result is-${state}`}>{message}</p> : null}
        </div>

        {synthesis ? (
          <div>
            <dl className="sfi-production__object-grid">
              <dt>Objeto</dt><dd>{synthesis.objectReading.summary}</dd>
              <dt>Interpretabilidad</dt><dd>{synthesis.objectReading.interpretability}</dd>
              <dt>Cobertura de evidencia</dt><dd>{Number(synthesis.objectReading.evidenceCoverage.toFixed(3))}</dd>
              <dt>Relación longitudinal</dt><dd>{synthesis.worldContext.relation}</dd>
              <dt>Lectura del campo</dt><dd>{synthesis.worldContext.explanation}</dd>
              <dt>Confianza WorldSpect</dt><dd>{numberOrUnknown(synthesis.worldContext.confidence)}</dd>
              <dt>MIHM</dt><dd>{synthesis.mihm.status} · coverage {Number(synthesis.mihm.coverage.toFixed(3))} · core {Number(synthesis.mihm.coreCoverage.toFixed(3))}</dd>
              <dt>IHG</dt><dd>{synthesis.mihm.ihg === null ? 'BLOCKED_UNTIL_CORE_VARIABLES_EXIST' : numberOrUnknown(synthesis.mihm.ihg)}</dd>
              <dt>Qué significa</dt><dd>{synthesis.mihm.summary}</dd>
              <dt>Punto de palanca</dt><dd>{synthesis.leverage.status} · {synthesis.leverage.rationale}</dd>
              <dt>Perturbación mínima</dt><dd>{synthesis.leverage.minimumPerturbation ?? 'NO_PERTURBATION_EMITTED'}</dd>
              <dt>Preserva</dt><dd>{synthesis.leverage.preserves.join(' / ') || 'ATTRACTOR_REQUIRED'}</dd>
              <dt>Señal esperada</dt><dd>{synthesis.leverage.expectedSignal ?? 'MISSING'}</dd>
              <dt>Ventana</dt><dd>{synthesis.leverage.verificationWindow ?? 'MISSING'}</dd>
              <dt>Falsificación</dt><dd>{synthesis.leverage.falsificationCriterion ?? 'MISSING'}</dd>
              <dt>Límites</dt><dd>{[...synthesis.objectReading.limitations, ...synthesis.mihm.limitations, ...synthesis.worldContext.warnings].join(' / ') || 'NONE'}</dd>
            </dl>

            <details>
              <summary>VARIABLES MIHM</summary>
              {synthesis.mihm.variables.map((variable) => (
                <p key={variable.key}>
                  <strong>{variable.key} · {variable.label}</strong>: {variable.value === null ? 'MISSING' : numberOrUnknown(variable.value)} — {variable.explanation} {variable.warnings.length ? `(${variable.warnings.join(' / ')})` : ''}
                </p>
              ))}
            </details>

            <details>
              <summary>SEÑALES DEL OBJETO</summary>
              {synthesis.objectReading.salientSignals.map((signal) => (
                <p key={signal.label}><strong>{signal.label}</strong>: {String(signal.value)} — {signal.meaning}</p>
              ))}
            </details>
          </div>
        ) : (
          <p>No existe una síntesis persistida. Declara al menos el atractor para que Studio pueda evaluar una perturbación; sin él, la salida será diagnóstica y quedará bloqueada para intervención.</p>
        )}
      </div>
    </section>
  );
}
