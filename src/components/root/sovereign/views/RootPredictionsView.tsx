import type { RootSovereignState, RootRow } from '@/lib/root/sovereign/rootSovereignState';
import type { RootSelection } from '../sovereignTypes';
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

export function RootPredictionsView({ state, onSelect }: { state: RootSovereignState; onSelect: (selection: RootSelection) => void }) {
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

  return (
    <section className="rs-view">
      <div className="rs-view-title"><span>PREDICTIONS</span><h1>PREDICTIVE ENGINE</h1><p>Modelos persistidos, runs, outcomes y contrato manual legacy.</p></div>
      {state.predictions.error ? <div className="rs-source-warning">FUENTE DEGRADADA · {state.predictions.error}</div> : null}
      <div className="rs-prediction-grid">
        <article><header>INTERVAL PLOT</header><PredictionIntervalPlot runs={state.predictions.data.runs} /></article>
        <article><header>DUE TIMELINE</header><PredictionTimeline runs={state.predictions.data.runs} /></article>
        <article><header>CALIBRATION MATRIX</header><CalibrationMatrix models={state.predictions.data.models} runs={state.predictions.data.runs} /></article>
        <article><header>PREDICTED VS ACTUAL</header><PredictionOutcomeScatter runs={state.predictions.data.runs} outcomes={state.predictions.data.outcomes} /></article>
        <article><header>RUNS / OUTCOMES</header><div className="rs-card-list">{state.predictions.data.runs.map((run) => <button type="button" key={String(run.id)} onClick={() => select('predictive run', run, 'sfi_predictive_runs')}><span>{String(run.status ?? 'SIN DATO')}</span><strong>{subject(run)}</strong><em>{String(run.due_at ?? 'SIN VENTANA').slice(0, 16)}</em></button>)}</div></article>
      </div>
      <div className="rs-view-title secondary"><span>LEGACY</span><h2>MANUAL PROBABILITY CONTRACT</h2></div>
      <div className="rs-card-list horizontal">{state.predictions.data.legacyEntries.length ? state.predictions.data.legacyEntries.map((entry) => <button type="button" key={String(entry.id)} onClick={() => select('legacy prediction', entry, 'sfi_prediction_entries')}><span>LEGACY · {String(entry.estado_observacion ?? 'SIN DATO')}</span><strong>{String(entry.prediccion_explicita ?? entry.hypothesis_id)}</strong><em>{typeof entry.probabilidad_estimativa === 'number' ? `HUMAN P ${entry.probabilidad_estimativa}` : 'NO MEDIDO'}</em></button>) : <div className="rs-empty"><b>SIN PREDICCIONES LEGACY</b></div>}</div>
    </section>
  );
}
