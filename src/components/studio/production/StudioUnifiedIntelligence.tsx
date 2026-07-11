'use client';

import { useEffect, useMemo, useState } from 'react';

export type StudioIntelligenceView = 'systemic' | 'projection' | 'decision' | 'return';

type Row = Record<string, unknown>;

type Context = {
  declaredAttractor: string;
  desiredShift: string;
  targetAudience: string;
  prohibitedEffects: string;
};

type Synthesis = {
  status: string;
  objectReading: {
    summary: string;
    interpretability: string;
    evidenceCoverage: number;
    limitations: string[];
  };
  worldContext: {
    relation: string;
    explanation: string;
    confidence: number | null;
    warnings: string[];
  };
  mihm: {
    status: string;
    coverage: number;
    coreCoverage: number;
    ihg: number | null;
    summary: string;
    limitations: string[];
    variables: Array<{
      key: string;
      label: string;
      value: number | null;
      status: string;
      explanation: string;
      warnings: string[];
    }>;
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

type PredictiveSummary = {
  id: string | null;
  prediction: number | null;
  lowerBound: number | null;
  upperBound: number | null;
  confidence: number | null;
  calibrationStatus: string;
  status: string;
  dueAt: string | null;
  interpretation: Row;
  amv: Row;
  verificationRule: Row;
  missingEvidence: unknown[];
  model: Row;
};

type RunDetail = {
  run: Row;
  evidenceRequests: Row[];
  outcomes: Row[];
  learningEvents: Row[];
};

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function numberValue(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : null;
  return parsed !== null && Number.isFinite(parsed) ? parsed : null;
}

function textValue(value: unknown, fallback = 'NO DISPONIBLE') {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function pct(value: number | null, digits = 0) {
  return value === null ? 'NO ESTIMABLE' : `${(value * 100).toFixed(digits)}%`;
}

function scorePct(value: number | null) {
  return value === null ? 'NO ESTIMABLE' : `${Math.round(value)}%`;
}

function confidenceBand(value: number | null) {
  if (value === null) return 'UNKNOWN';
  if (value < 0.25) return 'VERY_LOW';
  if (value < 0.45) return 'LOW';
  if (value < 0.7) return 'MODERATE';
  return 'HIGH';
}

function initialContext(): Context {
  return { declaredAttractor: '', desiredShift: '', targetAudience: '', prohibitedEffects: '' };
}

function asContext(value: unknown): Context {
  const row = record(value);
  return {
    declaredAttractor: typeof row.declaredAttractor === 'string' ? row.declaredAttractor : '',
    desiredShift: typeof row.desiredShift === 'string' ? row.desiredShift : '',
    targetAudience: typeof row.targetAudience === 'string' ? row.targetAudience : '',
    prohibitedEffects: Array.isArray(row.prohibitedEffects) ? row.prohibitedEffects.map(String).join('\n') : '',
  };
}

function normalizePredictive(value: unknown): PredictiveSummary | null {
  const outer = record(value);
  const run = Object.keys(record(outer.run)).length ? record(outer.run) : outer;
  const id = typeof run.id === 'string' ? run.id : null;
  if (!id && numberValue(run.prediction) === null) return null;
  return {
    id,
    prediction: numberValue(run.prediction),
    lowerBound: numberValue(run.lowerBound ?? run.lower_bound),
    upperBound: numberValue(run.upperBound ?? run.upper_bound),
    confidence: numberValue(run.confidence),
    calibrationStatus: textValue(run.calibrationStatus ?? run.calibration_status, 'UNKNOWN'),
    status: textValue(run.status, 'UNKNOWN'),
    dueAt: typeof (run.dueAt ?? run.due_at) === 'string' ? String(run.dueAt ?? run.due_at) : null,
    interpretation: record(run.interpretation),
    amv: record(run.amv ?? run.amv_assessment),
    verificationRule: record(run.verificationRule ?? run.verification_rule),
    missingEvidence: Array.isArray(run.missingEvidence) ? run.missingEvidence : Array.isArray(run.missing_evidence) ? run.missing_evidence : [],
    model: record(run.model),
  };
}

function Metric({ label, value, meta, tone = 'neutral' }: { label: string; value: React.ReactNode; meta?: React.ReactNode; tone?: 'neutral' | 'good' | 'warn' | 'risk' }) {
  return (
    <article className={`sfi-intel__metric is-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {meta ? <small>{meta}</small> : null}
    </article>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="sfi-intel__empty">{children}</div>;
}

function List({ items }: { items: string[] }) {
  if (!items.length) return <p className="sfi-intel__muted">Sin elementos observables.</p>;
  return <ul className="sfi-intel__list">{items.map((item) => <li key={item}>{item}</li>)}</ul>;
}

export function StudioUnifiedIntelligence({ objectId, view }: { objectId: string | null; view: StudioIntelligenceView }) {
  const [context, setContext] = useState<Context>(initialContext);
  const [synthesis, setSynthesis] = useState<Synthesis | null>(null);
  const [projection, setProjection] = useState<Projection | null>(null);
  const [predictive, setPredictive] = useState<PredictiveSummary | null>(null);
  const [runDetail, setRunDetail] = useState<RunDetail | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'saving' | 'running' | 'failed'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [outcomeValue, setOutcomeValue] = useState('');
  const [outcomeQuality, setOutcomeQuality] = useState('OBSERVED');
  const [outcomeSource, setOutcomeSource] = useState('operator_observation');
  const [outcomeFidelity, setOutcomeFidelity] = useState('1');
  const [outcomeRef, setOutcomeRef] = useState('');
  const [outcomeNote, setOutcomeNote] = useState('');
  const [outcomeResult, setOutcomeResult] = useState<Row | null>(null);

  const selectedRoute = useMemo(() => projection?.strategy.routes.find((route) => route.id === projection.strategy.selectedRouteId) ?? projection?.strategy.routes[0] ?? null, [projection]);

  async function readRunDetail(runId: string) {
    const response = await fetch(`/api/predictive-engine/runs/${encodeURIComponent(runId)}`, { cache: 'no-store' });
    const body = await response.json().catch(() => null);
    if (response.ok && body?.ok) {
      setRunDetail({
        run: record(body.run),
        evidenceRequests: rows(body.evidenceRequests),
        outcomes: rows(body.outcomes),
        learningEvents: rows(body.learningEvents),
      });
    }
  }

  useEffect(() => {
    if (!objectId) {
      setContext(initialContext());
      setSynthesis(null);
      setProjection(null);
      setPredictive(null);
      setRunDetail(null);
      return;
    }
    let cancelled = false;
    async function load() {
      setState('loading');
      setMessage(null);
      const [contextResponse, synthesisResponse, projectionResponse] = await Promise.all([
        fetch(`/api/studio/objects/${encodeURIComponent(objectId)}/context`, { cache: 'no-store' }),
        fetch(`/api/studio/objects/${encodeURIComponent(objectId)}/synthesize`, { cache: 'no-store' }),
        fetch(`/api/studio/objects/${encodeURIComponent(objectId)}/project`, { cache: 'no-store' }),
      ]);
      const contextBody = await contextResponse.json().catch(() => null);
      const synthesisBody = await synthesisResponse.json().catch(() => null);
      let projectionBody = await projectionResponse.json().catch(() => null);
      if (!projectionResponse.ok || projectionBody?.ok !== true) {
        const generated = await fetch(`/api/studio/objects/${encodeURIComponent(objectId)}/project`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ persist: false }),
        });
        projectionBody = await generated.json().catch(() => null);
      }
      if (cancelled) return;
      if (contextResponse.ok && contextBody?.ok) setContext(asContext(contextBody.context));
      if (synthesisResponse.ok && synthesisBody?.ok) setSynthesis(synthesisBody.synthesis as Synthesis);
      if (projectionBody?.ok) {
        setProjection(projectionBody.projection as Projection);
        const normalized = normalizePredictive(projectionBody.predictiveRun);
        setPredictive(normalized);
        if (normalized?.id) void readRunDetail(normalized.id);
      }
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

  if (!objectId) return <Empty>Carga un objeto para iniciar lectura sistémica, proyección, decisión y retorno.</Empty>;

  async function generateProjection() {
    setState('running');
    setMessage('Recalculando objeto, mundo, MIHM, compatibilidad, predicción y rutas.');
    const response = await fetch(`/api/studio/objects/${encodeURIComponent(objectId)}/project`, {
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
    const normalized = normalizePredictive(body.predictiveRun);
    setPredictive(normalized);
    if (normalized?.id) await readRunDetail(normalized.id);
    setState('idle');
    setMessage('Nueva proyección persistida. La ejecución anterior permanece intacta como evidencia histórica.');
  }

  async function savePreferences() {
    setState('saving');
    setMessage('Guardando preferencias opcionales y recalculando la ruta.');
    const response = await fetch(`/api/studio/objects/${encodeURIComponent(objectId)}/context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(context),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || body?.ok !== true) {
      setState('failed');
      setMessage(body?.details || body?.error || `CONTEXT_HTTP_${response.status}`);
      return;
    }
    await generateProjection();
  }

  async function submitOutcome() {
    if (!predictive?.id) {
      setState('failed');
      setMessage('No existe un predictive run persistido para registrar retorno.');
      return;
    }
    const actual = Number(outcomeValue);
    const fidelity = Number(outcomeFidelity);
    if (!Number.isFinite(actual) || actual < 0 || actual > 1) {
      setState('failed');
      setMessage('El outcome debe ser un valor normalizado entre 0 y 1.');
      return;
    }
    if (!Number.isFinite(fidelity) || fidelity < 0 || fidelity > 1) {
      setState('failed');
      setMessage('La fidelidad debe estar entre 0 y 1.');
      return;
    }
    setState('saving');
    setMessage('Registrando outcome, error y evento de aprendizaje.');
    const response = await fetch(`/api/predictive-engine/runs/${encodeURIComponent(predictive.id)}/outcome`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actualValue: actual,
        sourceType: outcomeSource,
        sourceQuality: outcomeQuality,
        interventionFidelity: fidelity,
        sourceRef: outcomeRef || null,
        outcomePayload: { note: outcomeNote || null },
        returnWindow: textValue(predictive.verificationRule.returnWindow, '30d'),
      }),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || body?.ok !== true) {
      setState('failed');
      setMessage(body?.details || body?.error || `OUTCOME_HTTP_${response.status}`);
      return;
    }
    setOutcomeResult(record(body.result));
    await readRunDetail(predictive.id);
    setState('idle');
    setMessage('Outcome registrado. El aprendizaje fue aplicado, rechazado o enviado a revisión según calidad y fidelidad.');
  }

  if (state === 'loading' && !projection) return <Empty>Recuperando proyección, síntesis MIHM y estado predictivo.</Empty>;

  const actions = (
    <div className="sfi-intel__actions">
      <button type="button" onClick={() => void generateProjection()} disabled={state === 'running' || state === 'saving'}>
        {state === 'running' ? 'RECALCULANDO…' : 'ACTUALIZAR PROYECCIÓN'}
      </button>
      <span>{projection?.generatedAt ? new Date(projection.generatedAt).toLocaleString('es-MX') : 'SIN PROYECCIÓN PERSISTIDA'}</span>
    </div>
  );

  if (!projection) {
    return <section className="sfi-intel">{actions}{message ? <p className={`sfi-intel__message is-${state}`}>{message}</p> : null}<Empty>No fue posible recuperar una proyección para este objeto.</Empty></section>;
  }

  return (
    <section className="sfi-intel">
      {actions}
      {message ? <p className={`sfi-intel__message is-${state}`}>{message}</p> : null}

      {view === 'systemic' ? (
        <div className="sfi-intel__stack">
          <div className="sfi-intel__hero-grid">
            <article className="sfi-intel__hero">
              <span>ESTADO LONGITUDINAL DEL MUNDO</span>
              <h2>{projection.world.regime}</h2>
              <p>{projection.world.summary}</p>
              <div className="sfi-intel__metric-row">
                <Metric label="Vector dominante" value={projection.world.dominantDomain ?? 'INDETERMINATE'} meta={projection.world.dominantSignal ?? 'Sin señal dominante'} />
                <Metric label="Confianza WorldSpect" value={pct(projection.world.confidence, 1)} meta={confidenceBand(projection.world.confidence)} tone={projection.world.confidence < 0.45 ? 'warn' : 'good'} />
              </div>
            </article>
            <article className="sfi-intel__hero">
              <span>POSICIÓN DEL OBJETO</span>
              <h2>{projection.object.interpretability}</h2>
              <p>{projection.object.summary}</p>
              <div className="sfi-intel__metric-row">
                <Metric label="MIHM" value={projection.object.mihmStatus} meta={`coverage ${pct(projection.object.mihmCoverage, 1)}`} />
                <Metric label="Core MIHM" value={pct(projection.object.mihmCoreCoverage, 1)} meta="vector parcial utilizable" />
              </div>
            </article>
          </div>

          <div className="sfi-intel__grid-2">
            <article className="sfi-intel__card">
              <header><span>TENSIONES ENTRE VECTORES</span><strong>{projection.world.crossVectorTensions.length}</strong></header>
              {projection.world.crossVectorTensions.length ? projection.world.crossVectorTensions.map((tension) => (
                <div key={tension.between.join(':')} className="sfi-intel__statement">
                  <strong>{tension.between.join(' ↔ ')}</strong>
                  <p>{tension.description}</p>
                  <small>MAGNITUD {tension.magnitude.toFixed(4)}</small>
                </div>
              )) : <p className="sfi-intel__muted">No se detectó una divergencia cruzada fuerte con la cobertura actual.</p>}
            </article>
            <article className="sfi-intel__card">
              <header><span>ATRACTORES INFERIDOS</span><strong>{projection.world.inferredAttractors.length}</strong></header>
              {projection.world.inferredAttractors.map((attractor) => (
                <div key={attractor.id} className="sfi-intel__statement">
                  <strong>{attractor.label}</strong>
                  <p>{attractor.description}</p>
                  <small>CONFIDENCE {pct(attractor.confidence, 1)}</small>
                </div>
              ))}
            </article>
          </div>

          <article className="sfi-intel__card">
            <header><span>VECTOR MIHM PARCIAL</span><strong>{synthesis?.mihm.status ?? projection.object.mihmStatus}</strong></header>
            <p>{synthesis?.mihm.summary ?? 'El vector parcial se utiliza sin afirmar un IHG final.'}</p>
            <div className="sfi-intel__property-grid">
              {(synthesis?.mihm.variables ?? []).map((variable) => (
                <div key={variable.key} className={`sfi-intel__property is-${variable.status.toLowerCase()}`}>
                  <span>{variable.key}</span>
                  <strong>{variable.value === null ? 'MISSING' : variable.value.toFixed(4)}</strong>
                  <p>{variable.label}</p>
                  <small>{variable.explanation}</small>
                </div>
              ))}
            </div>
            <details className="sfi-intel__trace">
              <summary>Limitaciones y trazabilidad MIHM</summary>
              <List items={[...(synthesis?.mihm.limitations ?? []), ...(synthesis?.objectReading.limitations ?? []), ...(synthesis?.worldContext.warnings ?? [])]} />
            </details>
          </article>
        </div>
      ) : null}

      {view === 'projection' ? (
        <div className="sfi-intel__stack">
          <div className="sfi-intel__projection-grid">
            <article className="sfi-intel__score-card">
              <span>COMPATIBILIDAD DE CAMPO</span>
              <strong>{scorePct(projection.fit.percentage)}</strong>
              <h3>{projection.fit.band}</h3>
              <p>{projection.fit.explanation}</p>
              <div className="sfi-intel__metric-row">
                <Metric label="Confidence" value={pct(projection.fit.confidence, 1)} meta={confidenceBand(projection.fit.confidence)} tone={projection.fit.confidence < 0.45 ? 'warn' : 'good'} />
                <Metric label="Coverage" value={pct(projection.fit.coverage, 1)} meta={projection.fit.metric} />
              </div>
              <div className="sfi-intel__notice">No es aceptación. {projection.fit.acceptanceReason}</div>
            </article>

            <article className="sfi-intel__score-card">
              <span>PREDICCIÓN DE RESPUESTA</span>
              <strong>{pct(predictive?.prediction ?? null, 1)}</strong>
              <h3>{predictive?.calibrationStatus ?? 'NO_RUN'}</h3>
              <p>{textValue(predictive?.interpretation.reading, 'No existe interpretación predictiva persistida.')}</p>
              <div className="sfi-intel__metric-row">
                <Metric label="Intervalo" value={`${pct(predictive?.lowerBound ?? null, 1)} – ${pct(predictive?.upperBound ?? null, 1)}`} meta="incertidumbre explícita" />
                <Metric label="Confidence" value={pct(predictive?.confidence ?? null, 1)} meta={confidenceBand(predictive?.confidence ?? null)} tone={(predictive?.confidence ?? 0) < 0.45 ? 'warn' : 'good'} />
              </div>
              <div className="sfi-intel__notice">Hipótesis cuantificada; no probabilidad calibrada de aceptación.</div>
            </article>
          </div>

          <div className="sfi-intel__grid-2">
            <article className="sfi-intel__card">
              <header><span>AMV / META-OBSERVADOR</span><strong>{textValue(predictive?.amv.state, 'NO_STATE')}</strong></header>
              <p>{textValue(predictive?.amv.reason, 'Sin assessment AMV disponible.')}</p>
              <div className="sfi-intel__metric-row">
                <Metric label="Uncertainty" value={pct(numberValue(predictive?.amv.uncertainty), 1)} />
                <Metric label="Epistemic risk" value={pct(numberValue(predictive?.amv.epistemicRisk), 1)} tone="warn" />
                <Metric label="Drift risk" value={pct(numberValue(predictive?.amv.driftRisk), 1)} />
              </div>
              <h4>Qué pide antes de aprender</h4>
              <List items={rows(predictive?.amv.evidenceRequests).map((item) => textValue(item.description, textValue(item.evidenceKey)))} />
              <List items={strings(predictive?.amv.learningBlockers).map((item) => `Bloqueador: ${item}`)} />
            </article>

            <article className="sfi-intel__card">
              <header><span>VENTANA DE OPORTUNIDAD</span><strong>{projection.opportunityWindow.status}</strong></header>
              <h2>{projection.opportunityWindow.minimumDays === null ? projection.opportunityWindow.starts : `${projection.opportunityWindow.minimumDays}–${projection.opportunityWindow.maximumDays} DÍAS`}</h2>
              <p>{projection.opportunityWindow.basis}</p>
              <h4>Revisar o cerrar cuando</h4>
              <List items={projection.opportunityWindow.exitConditions} />
            </article>
          </div>

          <article className="sfi-intel__card">
            <header><span>DIMENSIONES COMPARADAS</span><strong>{projection.fit.sharedDimensions.length}</strong></header>
            <div className="sfi-intel__dimension-grid">
              {projection.fit.sharedDimensions.map((dimension) => (
                <div key={dimension.id}>
                  <span>{dimension.label}</span>
                  <strong>{pct(dimension.compatibility, 1)}</strong>
                  <p>Objeto {dimension.objectValue.toFixed(4)} / campo {dimension.fieldValue.toFixed(4)}</p>
                  <small>{dimension.dataClass} · {dimension.explanation}</small>
                </div>
              ))}
            </div>
            {projection.fit.missingDimensions.length ? <div className="sfi-intel__notice">Dimensiones faltantes: {projection.fit.missingDimensions.join(' / ')}</div> : null}
          </article>
        </div>
      ) : null}

      {view === 'decision' ? (
        <div className="sfi-intel__stack">
          <article className="sfi-intel__decision-hero">
            <span>RUTA PRINCIPAL</span>
            <h2>{selectedRoute?.title ?? 'NO_ROUTE'}</h2>
            <p>{projection.strategy.selectionReason}</p>
            <strong>{selectedRoute ? `${Math.round(selectedRoute.suitability * 100)}% pertinencia derivada` : 'Sin pertinencia estimable'}</strong>
          </article>

          {selectedRoute ? (
            <div className="sfi-intel__grid-2">
              <article className="sfi-intel__card">
                <header><span>MICROAJUSTES</span><strong>{selectedRoute.microAdjustments.length}</strong></header>
                <p>{selectedRoute.goal}</p>
                <List items={selectedRoute.microAdjustments} />
                <h4>Desplazamiento esperado</h4>
                <p>{selectedRoute.expectedShift}</p>
              </article>
              <article className="sfi-intel__card">
                <header><span>VERIFICACIÓN</span><strong>{selectedRoute.verification.length}</strong></header>
                <List items={selectedRoute.verification} />
                <h4>Guardrails de esta ruta</h4>
                <List items={selectedRoute.guardrails} />
              </article>
            </div>
          ) : null}

          <article className="sfi-intel__card">
            <header><span>COMPARAR ESCENARIOS</span><strong>{projection.strategy.routes.length}</strong></header>
            <div className="sfi-intel__route-grid">
              {projection.strategy.routes.map((route) => (
                <div key={route.id} className={route.id === projection.strategy.selectedRouteId ? 'is-selected' : ''}>
                  <span>{route.id}</span>
                  <h3>{route.title}</h3>
                  <strong>{Math.round(route.suitability * 100)}%</strong>
                  <p>{route.rationale}</p>
                  <small>CONFIDENCE {pct(route.confidence, 1)}</small>
                </div>
              ))}
            </div>
          </article>

          <article className="sfi-intel__card">
            <header><span>INVARIANTES AUTOMÁTICOS</span><strong>{projection.strategy.automaticGuardrails.length}</strong></header>
            <List items={projection.strategy.automaticGuardrails} />
          </article>

          <details className="sfi-intel__preferences" open={Boolean(context.desiredShift || context.declaredAttractor || context.targetAudience || context.prohibitedEffects)}>
            <summary>Refinar la decisión en lenguaje normal</summary>
            <p>{projection.strategy.userInputPurpose}</p>
            <div className="sfi-intel__form-grid">
              <label>Qué quieres conseguir<textarea value={context.desiredShift} onChange={(event) => setContext((current) => ({ ...current, desiredShift: event.target.value }))} placeholder="Integrarse mejor, preservar rareza o corregir únicamente problemas técnicos." /></label>
              <label>Qué no quieres perder<textarea value={context.declaredAttractor} onChange={(event) => setContext((current) => ({ ...current, declaredAttractor: event.target.value }))} placeholder="Tensión central, clímax, identidad o extrañeza." /></label>
              <label>Dónde se utilizará<input value={context.targetAudience} onChange={(event) => setContext((current) => ({ ...current, targetAudience: event.target.value }))} placeholder="Canal, audiencia o contexto." /></label>
              <label>Límites personales<textarea value={context.prohibitedEffects} onChange={(event) => setContext((current) => ({ ...current, prohibitedEffects: event.target.value }))} placeholder="Uno por línea." /></label>
            </div>
            <button type="button" onClick={() => void savePreferences()} disabled={state === 'saving' || state === 'running'}>GUARDAR Y RECALCULAR</button>
          </details>
        </div>
      ) : null}

      {view === 'return' ? (
        <div className="sfi-intel__stack">
          <div className="sfi-intel__grid-2">
            <article className="sfi-intel__card">
              <header><span>PREDICCIÓN ABIERTA</span><strong>{predictive?.status ?? 'NO_RUN'}</strong></header>
              <div className="sfi-intel__metric-row">
                <Metric label="Run" value={predictive?.id ? predictive.id.slice(0, 8) : 'NO_ID'} meta={predictive?.dueAt ? `vence ${new Date(predictive.dueAt).toLocaleString('es-MX')}` : 'sin retorno programado'} />
                <Metric label="Predicción" value={pct(predictive?.prediction ?? null, 1)} meta={predictive?.calibrationStatus ?? 'UNKNOWN'} />
                <Metric label="Confidence" value={pct(predictive?.confidence ?? null, 1)} meta={confidenceBand(predictive?.confidence ?? null)} tone="warn" />
              </div>
              <h4>Regla de verificación</h4>
              <p>{textValue(predictive?.verificationRule.trueCondition)}</p>
              <p>{textValue(predictive?.verificationRule.falseCondition)}</p>
              <small>{textValue(predictive?.verificationRule.unverifiableCondition)}</small>
            </article>

            <article className="sfi-intel__card">
              <header><span>CALIBRACIÓN DEL MODELO</span><strong>{projection.calibration.status}</strong></header>
              <p>{projection.calibration.currentOutput}</p>
              <div className="sfi-intel__metric-row">
                <Metric label="Mínimo" value={projection.calibration.minimumComparableCases} meta="casos comparables" />
                <Metric label="Recomendado" value={projection.calibration.recommendedComparableCases} meta="casos comparables" />
              </div>
              <List items={projection.calibration.requiredOutcomeFields} />
              <p>{projection.calibration.upgradeCondition}</p>
            </article>
          </div>

          <article className="sfi-intel__card">
            <header><span>REGISTRAR RETORNO</span><strong>{runDetail?.outcomes.length ?? 0} OUTCOMES</strong></header>
            <p>Registra un valor normalizado entre 0 y 1. La calidad de la fuente y la fidelidad determinan si el modelo aprende.</p>
            <div className="sfi-intel__outcome-grid">
              <label>Outcome normalizado<input type="number" min="0" max="1" step="0.01" value={outcomeValue} onChange={(event) => setOutcomeValue(event.target.value)} placeholder="0.00–1.00" /></label>
              <label>Calidad<select value={outcomeQuality} onChange={(event) => setOutcomeQuality(event.target.value)}><option>VERIFIED</option><option>OBSERVED</option><option>DECLARED</option><option>INFERRED</option><option>UNVERIFIABLE</option></select></label>
              <label>Fidelidad<input type="number" min="0" max="1" step="0.05" value={outcomeFidelity} onChange={(event) => setOutcomeFidelity(event.target.value)} /></label>
              <label>Tipo de fuente<input value={outcomeSource} onChange={(event) => setOutcomeSource(event.target.value)} /></label>
              <label>Referencia<input value={outcomeRef} onChange={(event) => setOutcomeRef(event.target.value)} placeholder="URL, export o identificador." /></label>
              <label>Nota<textarea value={outcomeNote} onChange={(event) => setOutcomeNote(event.target.value)} placeholder="Contexto de exposición, audiencia o ejecución." /></label>
            </div>
            <button type="button" onClick={() => void submitOutcome()} disabled={!predictive?.id || state === 'saving' || state === 'running'}>REGISTRAR OUTCOME Y EVALUAR ERROR</button>
            {outcomeResult ? <div className="sfi-intel__notice">Estado de aprendizaje: {textValue(outcomeResult.learningState)} · error {textValue(record(outcomeResult.error).class)}</div> : null}
          </article>

          <div className="sfi-intel__grid-2">
            <article className="sfi-intel__card">
              <header><span>EVIDENCIA SOLICITADA</span><strong>{runDetail?.evidenceRequests.length ?? 0}</strong></header>
              {(runDetail?.evidenceRequests ?? []).map((request, index) => (
                <div key={textValue(request.id, String(index))} className="sfi-intel__statement">
                  <strong>{textValue(request.evidence_key ?? request.evidenceKey)}</strong>
                  <p>{textValue(request.description)}</p>
                  <small>{textValue(request.status)} · {textValue(request.priority)}</small>
                </div>
              ))}
              {!runDetail?.evidenceRequests.length ? <p className="sfi-intel__muted">Las features de entrada están completas; el retorno observable sigue pendiente.</p> : null}
            </article>

            <article className="sfi-intel__card">
              <header><span>HISTORIAL DE APRENDIZAJE</span><strong>{runDetail?.learningEvents.length ?? 0}</strong></header>
              {(runDetail?.learningEvents ?? []).map((event, index) => (
                <div key={textValue(event.id, String(index))} className="sfi-intel__statement">
                  <strong>{textValue(event.learning_state ?? event.learningState)}</strong>
                  <p>{textValue(record(event.error_analysis).class, 'Evento registrado')}</p>
                  <small>{textValue(event.created_at)}</small>
                </div>
              ))}
              {!runDetail?.learningEvents.length ? <p className="sfi-intel__muted">Aún no existen eventos de aprendizaje para este run.</p> : null}
            </article>
          </div>
        </div>
      ) : null}
    </section>
  );
}
