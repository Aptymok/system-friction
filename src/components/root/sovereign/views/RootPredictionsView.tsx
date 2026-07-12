'use client';

import { useState } from 'react';
import type { RootSovereignState, RootRow } from '@/lib/root/sovereign/rootSovereignState';
import type { RootActionRequest, RootSelection } from '../sovereignTypes';
import { CalibrationMatrix } from '../visual/CalibrationMatrix';
import { PredictionIntervalPlot } from '../visual/PredictionIntervalPlot';
import { PredictionOutcomeScatter } from '../visual/PredictionOutcomeScatter';
import { PredictionTimeline } from '../visual/PredictionTimeline';

function evidenceIds(entry: RootRow) {
  const direct = Array.isArray(entry.evidence_ids) ? entry.evidence_ids.filter((item): item is string => typeof item === 'string') : [];
  const refs = Array.isArray(entry.evidence_refs) ? entry.evidence_refs : [];
  const fromRefs = refs.flatMap((item) => {
    if (typeof item === 'string') return [item];
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const row = item as Record<string, unknown>;
    const ids = Array.isArray(row.evidenceIds) ? row.evidenceIds.filter((value): value is string => typeof value === 'string') : [];
    return [typeof row.id === 'string' ? row.id : null, ...ids].filter((value): value is string => Boolean(value));
  });
  return [...new Set([...direct, ...fromRefs])];
}

function subject(entry: RootRow) {
  return [entry.subject_type, entry.subject_id].filter((value) => typeof value === 'string' && value.length > 0).join(' · ') || String(entry.id ?? 'Prediction');
}

function numberOrNull(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function RootPredictionsView({ state, onSelect, onAction }: {
  state: RootSovereignState;
  onSelect: (selection: RootSelection) => void;
  onAction: (action: RootActionRequest) => void;
}) {
  const [outcomeRunId, setOutcomeRunId] = useState('');
  const [outcomeValue, setOutcomeValue] = useState('');
  const [outcomeWindow, setOutcomeWindow] = useState('30d');
  const [outcomeSourceType, setOutcomeSourceType] = useState('manual_audited_outcome');
  const [outcomeSourceRef, setOutcomeSourceRef] = useState('');
  const [outcomeQuality, setOutcomeQuality] = useState('DECLARED');
  const [outcomeFidelity, setOutcomeFidelity] = useState('');
  const [outcomeObservedAt, setOutcomeObservedAt] = useState('');
  const [outcomeNote, setOutcomeNote] = useState('');

  const select = (kind: string, entry: RootRow, source: string) => onSelect({
    kind,
    id: String(entry.id ?? entry.hypothesis_id ?? 'SIN ID'),
    title: String(entry.subject_id ?? entry.prediccion_explicita ?? entry.model_key ?? 'Prediction'),
    source,
    observedAt: typeof entry.updated_at === 'string' ? entry.updated_at : typeof entry.created_at === 'string' ? entry.created_at : null,
    confidence: typeof entry.confidence === 'number' ? entry.confidence : typeof entry.probabilidad_estimativa === 'number' ? entry.probabilidad_estimativa : null,
    evidenceIds: evidenceIds(entry),
    warning: null,
    data: entry,
  });

  const candidates = state.predictions.data.learningEvents.filter((event) => event.learning_state === 'CALIBRATION_CANDIDATE');
  const accumulating = state.predictions.data.learningEvents.filter((event) => event.learning_state === 'ACCUMULATING_CALIBRATION_CORPUS');

  return (
    <section className="rs-view">
      <div className="rs-view-title">
        <span>PREDICTIONS</span>
        <h1>GOVERNED PREDICTIVE ENGINE</h1>
        <p>Runs provisionales, outcomes observados, error acumulado y promoción versionada. El modelo activo no se ajusta automáticamente.</p>
      </div>
      {state.predictions.error ? <div className="rs-source-warning">SOURCE DEGRADED · {state.predictions.error}</div> : null}

      <div className="rs-stat-strip">
        <span><b>{state.predictions.data.runs.length}</b>RUNS</span>
        <span><b>{state.predictions.data.outcomes.length}</b>OUTCOMES</span>
        <span><b>{accumulating.length}</b>ACCUMULATING</span>
        <span><b>{candidates.length}</b>CALIBRATION CANDIDATES</span>
      </div>

      <div className="rs-prediction-grid">
        <article><header>INTERVAL PLOT</header><PredictionIntervalPlot runs={state.predictions.data.runs} /></article>
        <article><header>DUE TIMELINE</header><PredictionTimeline runs={state.predictions.data.runs} /></article>
        <article><header>CALIBRATION MATRIX</header><CalibrationMatrix models={state.predictions.data.models} runs={state.predictions.data.runs} /></article>
        <article><header>PREDICTED VS ACTUAL</header><PredictionOutcomeScatter runs={state.predictions.data.runs} outcomes={state.predictions.data.outcomes} /></article>
        <article>
          <header>RUNS / OUTCOMES</header>
          <div className="rs-card-list">
            {state.predictions.data.runs.map((run) => (
              <button type="button" key={String(run.id)} onClick={() => {
                setOutcomeRunId(String(run.id));
                select('predictive run', run, 'sfi_predictive_runs');
              }}>
                <span>{String(run.status ?? 'SIN DATO')} · {String(run.calibration_status ?? 'UNCALIBRATED')}</span>
                <strong>{subject(run)}</strong>
                <em>{String(run.due_at ?? 'SIN VENTANA').slice(0, 16)}</em>
              </button>
            ))}
          </div>
        </article>
      </div>

      <article>
        <header>REGISTER OBSERVED OUTCOME</header>
        <p className="rs-view-note">Cierra la ventana con una fuente real. Registra error y corpus; no modifica los pesos activos.</p>
        <form className="rs-form" onSubmit={(event) => {
          event.preventDefault();
          const actualValue = numberOrNull(outcomeValue);
          const interventionFidelity = numberOrNull(outcomeFidelity);
          if (!outcomeRunId.trim() || !outcomeSourceType.trim()) return;
          if (outcomeValue.trim() && actualValue === null) return;
          if (outcomeFidelity.trim() && interventionFidelity === null) return;
          onAction({
            id: `predictive-outcome-${Date.now()}`,
            label: 'REGISTER PREDICTIVE OUTCOME',
            effect: `Registra el outcome del run ${outcomeRunId}, calcula error y actualiza el corpus sin mutar el modelo activo.`,
            target: outcomeRunId,
            endpoint: `/api/predictive-engine/runs/${encodeURIComponent(outcomeRunId)}/outcome`,
            method: 'POST',
            body: {
              returnWindow: outcomeWindow,
              actualValue,
              sourceType: outcomeSourceType,
              sourceRef: outcomeSourceRef || null,
              sourceQuality: outcomeQuality,
              interventionFidelity,
              observedAt: outcomeObservedAt || new Date().toISOString(),
              outcomePayload: { operatorNote: outcomeNote || null },
            },
          });
        }}>
          <label>RUN ID<input value={outcomeRunId} onChange={(event) => setOutcomeRunId(event.target.value)} required /></label>
          <label>RETURN WINDOW<select value={outcomeWindow} onChange={(event) => setOutcomeWindow(event.target.value)}><option value="72h">72h</option><option value="7d">7d</option><option value="30d">30d</option><option value="90d">90d</option></select></label>
          <label>ACTUAL VALUE [0–1]<input value={outcomeValue} onChange={(event) => setOutcomeValue(event.target.value)} inputMode="decimal" placeholder="blank = unverifiable" /></label>
          <label>SOURCE TYPE<input value={outcomeSourceType} onChange={(event) => setOutcomeSourceType(event.target.value)} required /></label>
          <label>SOURCE REF<input value={outcomeSourceRef} onChange={(event) => setOutcomeSourceRef(event.target.value)} /></label>
          <label>SOURCE QUALITY<select value={outcomeQuality} onChange={(event) => setOutcomeQuality(event.target.value)}><option value="VERIFIED">VERIFIED</option><option value="OBSERVED">OBSERVED</option><option value="DECLARED">DECLARED</option><option value="INFERRED">INFERRED</option><option value="UNVERIFIABLE">UNVERIFIABLE</option></select></label>
          <label>INTERVENTION FIDELITY [0–1]<input value={outcomeFidelity} onChange={(event) => setOutcomeFidelity(event.target.value)} inputMode="decimal" placeholder="optional" /></label>
          <label>OBSERVED AT<input value={outcomeObservedAt} onChange={(event) => setOutcomeObservedAt(event.target.value)} placeholder="ISO timestamp; blank = now" /></label>
          <label>OPERATOR NOTE<textarea value={outcomeNote} onChange={(event) => setOutcomeNote(event.target.value)} /></label>
          <button type="submit" disabled={!outcomeRunId.trim() || !outcomeSourceType.trim()}>REVIEW OUTCOME</button>
        </form>
      </article>

      <article>
        <header>CALIBRATION CANDIDATES</header>
        {candidates.length ? (
          <div className="rs-card-list horizontal">
            {candidates.map((candidate) => {
              const modelId = String(candidate.model_id ?? '');
              return (
                <div key={String(candidate.id)}>
                  <button type="button" onClick={() => select('calibration candidate', candidate, 'sfi_predictive_learning_events')}>
                    <span>CALIBRATION_CANDIDATE</span>
                    <strong>MODEL {modelId || 'SIN ID'}</strong>
                    <em>{String(candidate.created_at ?? '').slice(0, 16)}</em>
                  </button>
                  {modelId ? <button type="button" className="rs-inline-action" onClick={() => onAction({
                    id: `promote-model-${modelId}-${Date.now()}`,
                    label: 'PROMOTE VERSIONED MODEL',
                    effect: 'Verifica N≥30 casos cerrados y al menos un caso no musical; congela el modelo anterior y crea una versión activa nueva.',
                    target: modelId,
                    endpoint: `/api/root/predictive/models/${encodeURIComponent(modelId)}/promote`,
                    method: 'POST',
                    body: { confirm: true },
                  })}>REVIEW PROMOTION</button> : null}
                </div>
              );
            })}
          </div>
        ) : <div className="rs-empty"><b>NO CALIBRATION CANDIDATE</b><p>El corpus continúa acumulándose o no cumple calidad/cohorte.</p></div>}
      </article>

      <div className="rs-view-title secondary"><span>LEGACY</span><h2>MANUAL PROBABILITY CONTRACT</h2></div>
      <div className="rs-card-list horizontal">
        {state.predictions.data.legacyEntries.length ? state.predictions.data.legacyEntries.map((entry) => (
          <button type="button" key={String(entry.id)} onClick={() => select('legacy prediction', entry, 'sfi_prediction_entries')}>
            <span>LEGACY · {String(entry.estado_observacion ?? 'SIN DATO')}</span>
            <strong>{String(entry.prediccion_explicita ?? entry.hypothesis_id)}</strong>
            <em>{typeof entry.probabilidad_estimativa === 'number' ? `HUMAN P ${entry.probabilidad_estimativa}` : 'NO MEDIDO'}</em>
          </button>
        )) : <div className="rs-empty"><b>SIN PREDICCIONES LEGACY</b></div>}
      </div>
    </section>
  );
}
