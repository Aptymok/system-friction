import type { RootRow } from '@/lib/root/sovereign/rootSovereignState';

function numeric(value: unknown) { return typeof value === 'number' && Number.isFinite(value) ? value : null; }

export function PredictionOutcomeScatter({ runs, outcomes }: { runs: RootRow[]; outcomes: RootRow[] }) {
  const byId = new Map(runs.map((run) => [String(run.id), run]));
  const points = outcomes.map((outcome) => {
    const run = byId.get(String(outcome.run_id));
    return { id: String(outcome.id), predicted: numeric(run?.prediction), actual: numeric(outcome.actual_value) };
  }).filter((point): point is { id: string; predicted: number; actual: number } => point.predicted !== null && point.actual !== null);
  if (!points.length) return <div className="rs-empty"><b>NO MEDIDO</b><p>No hay outcomes emparejados con runs. No se inventan puntos.</p></div>;
  const values = points.flatMap((point) => [point.predicted, point.actual]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const scale = (value: number) => max === min ? 50 : 8 + ((value - min) / (max - min)) * 84;
  return <svg className="rs-scatter" viewBox="0 0 320 220" role="img" aria-label="Predicted versus actual"><line x1="24" y1="196" x2="300" y2="20" />{points.map((point) => <circle key={point.id} cx={scale(point.predicted) * 3} cy={210 - scale(point.actual) * 2} r="4" tabIndex={0}><title>{`predicted ${point.predicted}; actual ${point.actual}`}</title></circle>)}</svg>;
}
