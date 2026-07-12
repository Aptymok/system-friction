import type { RootRow } from '@/lib/root/sovereign/rootSovereignState';

function metric(model: RootRow, key: string) {
  const metrics = model.metrics && typeof model.metrics === 'object' && !Array.isArray(model.metrics) ? model.metrics as Record<string, unknown> : {};
  const value = metrics[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function CalibrationMatrix({ models, runs }: { models: RootRow[]; runs: RootRow[] }) {
  if (!models.length) return <div className="rs-empty"><b>SIN MODELOS</b><p>No se devolvieron modelos predictivos persistidos.</p></div>;
  return (
    <div className="rs-calibration">
      {models.map((model, index) => {
        const modelRuns = runs.filter((run) => String(run.model_id ?? '') === String(model.id ?? ''));
        const calibration = modelRuns.find((run) => typeof run.calibration_status === 'string')?.calibration_status;
        const brier = metric(model, 'brier');
        const bias = metric(model, 'bias');
        return (
          <div key={String(model.id ?? index)}>
            <strong>{String(model.model_key ?? 'SIN MODELO')}</strong>
            <span>v{String(model.version ?? '—')} · {String(model.status ?? 'SIN ESTADO')}</span>
            <em>{String(calibration ?? 'NO MEDIDO')}</em>
            <b>{typeof model.verified_sample_count === 'number' ? `${model.verified_sample_count} verificadas` : 'NO MEDIDO'}</b>
            <small>{brier === null ? 'BRIER —' : `BRIER ${brier.toFixed(4)}`} · {bias === null ? 'BIAS —' : `BIAS ${bias.toFixed(4)}`}</small>
          </div>
        );
      })}
    </div>
  );
}
