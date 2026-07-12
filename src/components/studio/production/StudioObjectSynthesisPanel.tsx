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
};

type ProjectionRoute = {
  id: string;
  title: string;
  suitability: number;
  goal: string;
  rationale: string;
  microAdjustments: string[];
  expectedShift: string;
  verification: string[];
  guardrails: string[];
  confidence: number;
};

type Projection = {
  status: string;
  generatedAt: string;
  world: {
    regime: string;
    summary: string;
    dominantDomain: string | null;
    dominantSignal: string | null;
    confidence: number;
    crossVectorTensions: Array<{ between: [string, string]; magnitude: number; description: string }>;
    inferredAttractors: Array<{ id: string; label: string; description: string; confidence: number }>;
  };
  object: {
    summary: string;
    interpretability: string;
    mihmStatus: string;
    mihmCoverage: number;
    mihmCoreCoverage: number;
    dominantProperties: string[];
  };
  fit: {
    metric: string;
    score: number | null;
    percentage: number | null;
    band: string;
    confidence: number;
    coverage: number;
    explanation: string;
    missingDimensions: string[];
    sharedDimensions: Array<{
      id: string;
      label: string;
      objectValue: number;
      fieldValue: number;
      compatibility: number;
      dataClass: string;
      explanation: string;
    }>;
    acceptanceProbability: null;
    acceptanceReason: string;
  };
  opportunityWindow: {
    status: string;
    starts: string;
    minimumDays: number | null;
    maximumDays: number | null;
    basis: string;
    exitConditions: string[];
  };
  strategy: {
    selectedAttractor: string | null;
    attractorSource: string;
    selectedRouteId: string | null;
    selectionReason: string;
    automaticGuardrails: string[];
    userGuardrails: string[];
    routes: ProjectionRoute[];
    userInputRequired: false;
    userInputPurpose: string;
  };
  calibration: {
    status: string;
    currentOutput: string;
    minimumComparableCases: number;
    recommendedComparableCases: number;
    requiredOutcomeFields: string[];
    upgradeCondition: string;
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

function percentage(value: number | null) {
  return value === null ? 'NO ESTIMABLE' : `${Math.round(value)}%`;
}

function windowLabel(projection: Projection) {
  const window = projection.opportunityWindow;
  if (window.minimumDays === null || window.maximumDays === null) return `${window.status} · ${window.starts}`;
  return `${window.status} · ${window.starts} · ${window.minimumDays}–${window.maximumDays} días`;
}

export function StudioObjectSynthesisPanel({ objectId }: { objectId: string | null }) {
  const [context, setContext] = useState<Context>(initialContext);
  const [synthesis, setSynthesis] = useState<Synthesis | null>(null);
  const [projection, setProjection] = useState<Projection | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'saving' | 'running' | 'failed'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!objectId) {
      setContext(initialContext());
      setSynthesis(null);
      setProjection(null);
      return;
    }
    let cancelled = false;
    async function load() {
      setState('loading');
      setMessage(null);
      const [contextResponse, synthesisResponse, projectionResponse] = await Promise.all([
        fetch(`/api/studio/objects/${encodeURIComponent(objectId as string)}/context`, { cache: 'no-store' }),
        fetch(`/api/studio/objects/${encodeURIComponent(objectId as string)}/synthesize`, { cache: 'no-store' }),
        fetch(`/api/studio/objects/${encodeURIComponent(objectId as string)}/project`, { cache: 'no-store' }),
      ]);
      const contextBody = await contextResponse.json().catch(() => null);
      const synthesisBody = await synthesisResponse.json().catch(() => null);
      const projectionBody = await projectionResponse.json().catch(() => null);
      if (cancelled) return;
      if (contextResponse.ok && contextBody?.ok) setContext(asContext(contextBody.context));
      if (synthesisResponse.ok && synthesisBody?.ok) setSynthesis(synthesisBody.synthesis as Synthesis);
      if (projectionResponse.ok && projectionBody?.ok) {
        setProjection(projectionBody.projection as Projection);
      } else {
        const generatedResponse = await fetch(`/api/studio/objects/${encodeURIComponent(objectId as string)}/project`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ persist: false }),
        });
        const generatedBody = await generatedResponse.json().catch(() => null);
        if (!cancelled && generatedResponse.ok && generatedBody?.ok) setProjection(generatedBody.projection as Projection);
      }
      if (!cancelled) setState('idle');
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

  async function generateProjection() {
    setState('running');
    setMessage('Recalculando mundo, tensiones vectoriales, MIHM parcial, compatibilidad, ventana y escenarios.');
    const response = await fetch(`/api/studio/objects/${encodeURIComponent(objectId as string)}/project`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ persist: true }),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || body?.ok !== true) {
      setState('failed');
      setMessage(body?.details || body?.error || `PROJECTION_HTTP_${response.status}`);
      return;
    }
    setProjection(body.projection as Projection);
    setState('idle');
    setMessage('Proyección persistida. Los porcentajes representan compatibilidad de campo, no aceptación garantizada.');
  }

  async function savePreferencesAndProject() {
    setState('saving');
    setMessage('Guardando preferencias opcionales; no son requisitos para el análisis.');
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
    await generateProjection();
  }

  const selectedRoute = projection?.strategy.routes.find((route) => route.id === projection.strategy.selectedRouteId) ?? projection?.strategy.routes[0] ?? null;

  return (
    <section className="sfi-production__panel">
      <header>
        <span>WORLD → CULTURAL VECTOR → OBJECT → MIHM → WINDOW → ROUTES</span>
        <strong>{projection?.status ?? 'NOT_GENERATED'}</strong>
      </header>

      <button type="button" onClick={() => void generateProjection()} disabled={state === 'saving' || state === 'running' || state === 'loading'}>
        {projection ? 'ACTUALIZAR PROYECCIÓN' : 'GENERAR PROYECCIÓN'}
      </button>
      {message ? <p className={`sfi-production__action-result is-${state}`}>{message}</p> : null}

      {projection ? (
        <div className="sfi-production__module">
          <div className="sfi-production__overview-grid">
            <section>
              <h3>1 · ESTADO DEL MUNDO</h3>
              <p>{projection.world.summary}</p>
              <dl className="sfi-production__object-grid">
                <dt>Régimen</dt><dd>{projection.world.regime}</dd>
                <dt>Vector dominante</dt><dd>{projection.world.dominantDomain ?? 'INDETERMINATE'}</dd>
                <dt>Señal dominante</dt><dd>{projection.world.dominantSignal ?? 'NO_DOMINANT_SIGNAL'}</dd>
                <dt>Confianza</dt><dd>{numberOrUnknown(projection.world.confidence)}</dd>
              </dl>
              <h4>TENSIONES CRUZADAS</h4>
              {projection.world.crossVectorTensions.length ? projection.world.crossVectorTensions.map((tension) => (
                <p key={tension.between.join(':')}><strong>{tension.between.join(' ↔ ')}</strong> · {tension.description}</p>
              )) : <p>No se detectó divergencia fuerte entre CULTURAL, MEMETIC y AFFECTIVE con la cobertura actual.</p>}
            </section>

            <section>
              <h3>2 · ATRACTORES INFERIDOS</h3>
              {projection.world.inferredAttractors.length ? projection.world.inferredAttractors.map((attractor) => (
                <article key={attractor.id} className="sfi-production__metric-card">
                  <strong>{attractor.label}</strong>
                  <p>{attractor.description}</p>
                  <small>CONFIDENCE {numberOrUnknown(attractor.confidence)}</small>
                </article>
              )) : <p>No hay evidencia suficiente para proponer un atractor del campo.</p>}
              <p><strong>Usado por Studio:</strong> {projection.strategy.selectedAttractor ?? 'NONE'} · {projection.strategy.attractorSource}</p>
            </section>

            <section>
              <h3>3 · POSICIÓN DEL OBJETO</h3>
              <p>{projection.object.summary}</p>
              <p><strong>MIHM:</strong> {projection.object.mihmStatus} · coverage {numberOrUnknown(projection.object.mihmCoverage)} · core {numberOrUnknown(projection.object.mihmCoreCoverage)}</p>
              {projection.object.dominantProperties.map((property) => <p key={property}>{property}</p>)}
            </section>

            <section>
              <h3>4 · COMPATIBILIDAD DE CAMPO</h3>
              <strong style={{ fontSize: '2rem' }}>{percentage(projection.fit.percentage)}</strong>
              <p>{projection.fit.band} · confidence {numberOrUnknown(projection.fit.confidence)} · coverage {numberOrUnknown(projection.fit.coverage)}</p>
              <p>{projection.fit.explanation}</p>
              <p><strong>ACEPTACIÓN:</strong> NO CALIBRADA. {projection.fit.acceptanceReason}</p>
              {projection.fit.sharedDimensions.map((dimension) => (
                <p key={dimension.id}><strong>{dimension.label}</strong>: objeto {numberOrUnknown(dimension.objectValue)} / campo {numberOrUnknown(dimension.fieldValue)} / compatibilidad {Math.round(dimension.compatibility * 100)}% · {dimension.dataClass}</p>
              ))}
              {projection.fit.missingDimensions.length ? <p>Dimensiones faltantes: {projection.fit.missingDimensions.join(' / ')}</p> : null}
            </section>

            <section>
              <h3>5 · VENTANA PROYECTADA</h3>
              <strong>{windowLabel(projection)}</strong>
              <p>{projection.opportunityWindow.basis}</p>
              <h4>TERMINA O SE REVISA CUANDO</h4>
              {projection.opportunityWindow.exitConditions.map((condition) => <p key={condition}>{condition}</p>)}
            </section>

            <section>
              <h3>6 · RUTA PRINCIPAL</h3>
              <strong>{selectedRoute?.title ?? 'NO_ROUTE'}</strong>
              <p>{projection.strategy.selectionReason}</p>
              <p>{selectedRoute?.goal}</p>
              <h4>MICROAJUSTES</h4>
              {selectedRoute?.microAdjustments.map((adjustment) => <p key={adjustment}>{adjustment}</p>)}
              <h4>VERIFICACIÓN</h4>
              {selectedRoute?.verification.map((item) => <p key={item}>{item}</p>)}
            </section>
          </div>

          <details open>
            <summary>COMPARAR LAS TRES RUTAS</summary>
            <div className="sfi-production__metric-grid">
              {projection.strategy.routes.map((route) => (
                <article key={route.id} className="sfi-production__metric-card">
                  <div><span>{route.id}</span><strong>{Math.round(route.suitability * 100)}%</strong></div>
                  <h4>{route.title}</h4>
                  <p>{route.rationale}</p>
                  {route.microAdjustments.map((item) => <p key={item}>{item}</p>)}
                  <small>CONFIDENCE {numberOrUnknown(route.confidence)}</small>
                </article>
              ))}
            </div>
          </details>

          <details>
            <summary>GUARDRAILS AUTOMÁTICOS · LO QUE STUDIO INTENTA NO ROMPER</summary>
            {projection.strategy.automaticGuardrails.map((guardrail) => <p key={guardrail}>{guardrail}</p>)}
            {!projection.strategy.automaticGuardrails.length ? <p>No hay invariantes medibles suficientes para construir guardrails automáticos.</p> : null}
          </details>

          <details>
            <summary>PREFERENCIAS OPCIONALES · SOLO PARA ELEGIR UNA RUTA</summary>
            <p>{projection.strategy.userInputPurpose}</p>
            <label>
              LO QUE QUIERES CONSEGUIR, EN LENGUAJE NORMAL
              <textarea value={context.desiredShift} onChange={(event) => setContext((current) => ({ ...current, desiredShift: event.target.value }))} disabled={state === 'saving' || state === 'running'} placeholder="Ej. quiero que se integre mejor; quiero conservar su rareza; solo quiero corregirla técnicamente." />
            </label>
            <label>
              QUÉ NO QUIERES PERDER, SOLO SI YA LO SABES
              <textarea value={context.declaredAttractor} onChange={(event) => setContext((current) => ({ ...current, declaredAttractor: event.target.value }))} disabled={state === 'saving' || state === 'running'} placeholder="Ej. la tensión central, el golpe del clímax o la sensación de extrañeza." />
            </label>
            <label>
              DÓNDE LA PIENSAS USAR
              <input value={context.targetAudience} onChange={(event) => setContext((current) => ({ ...current, targetAudience: event.target.value }))} disabled={state === 'saving' || state === 'running'} placeholder="Audiencia, canal o contexto. Opcional." />
            </label>
            <label>
              LÍMITES PERSONALES, SI EXISTEN
              <textarea value={context.prohibitedEffects} onChange={(event) => setContext((current) => ({ ...current, prohibitedEffects: event.target.value }))} disabled={state === 'saving' || state === 'running'} placeholder="Ej. no acortar la pieza; no volverla convencional. Uno por línea." />
            </label>
            <button type="button" onClick={() => void savePreferencesAndProject()} disabled={state === 'saving' || state === 'running' || state === 'loading'}>
              GUARDAR PREFERENCIAS Y RECALCULAR
            </button>
          </details>

          <details>
            <summary>QUÉ FALTA PARA HABLAR DE ACEPTACIÓN REAL</summary>
            <p>{projection.calibration.currentOutput}</p>
            <p>Casos comparables mínimos: {projection.calibration.minimumComparableCases}; recomendados: {projection.calibration.recommendedComparableCases}.</p>
            {projection.calibration.requiredOutcomeFields.map((field) => <p key={field}>{field}</p>)}
            <p>{projection.calibration.upgradeCondition}</p>
          </details>

          {synthesis ? (
            <details>
              <summary>MIHM PARCIAL Y TRAZABILIDAD TÉCNICA</summary>
              <p>{synthesis.mihm.summary}</p>
              <p>IHG final: {synthesis.mihm.ihg === null ? 'NO EMITIDO; NO IMPIDE USAR EL VECTOR PARCIAL' : numberOrUnknown(synthesis.mihm.ihg)}</p>
              {synthesis.mihm.variables.map((variable) => (
                <p key={variable.key}><strong>{variable.key} · {variable.label}</strong>: {variable.value === null ? 'MISSING' : numberOrUnknown(variable.value)} — {variable.explanation}</p>
              ))}
            </details>
          ) : null}
        </div>
      ) : (
        <p>Studio puede generar la lectura sin que declares atractor, desplazamiento o efectos prohibidos. Esas preferencias solo refinan la selección de ruta.</p>
      )}
    </section>
  );
}
