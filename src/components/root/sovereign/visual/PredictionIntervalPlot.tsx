import type { RootRow } from '@/lib/root/sovereign/rootSovereignState';

function numeric(value: unknown) { return typeof value === 'number' && Number.isFinite(value) ? value : null; }
function subject(run: RootRow, index: number) { return [run.subject_type, run.subject_id].filter((value) => typeof value === 'string' && value.length > 0).join(' · ') || String(run.id ?? index); }

export function PredictionIntervalPlot({ runs }: { runs: RootRow[] }) {
  const valid = runs.map((run) => ({ run, lo: numeric(run.lower_bound), hi: numeric(run.upper_bound), point: numeric(run.prediction) })).filter((item) => item.lo !== null && item.hi !== null && item.point !== null).slice(0, 12);
  if (!valid.length) return <div className="rs-empty"><b>NO MEDIDO</b><p>No hay runs con intervalo observado. No se dibujan puntos sintéticos.</p></div>;
  const values = valid.flatMap((item) => [item.lo!, item.hi!, item.point!]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const scale = (value: number) => max === min ? 50 : ((value - min) / (max - min)) * 100;
  return <div className="rs-intervals">{valid.map(({ run, lo, hi, point }, index) => <div key={String(run.id ?? index)}><span>{subject(run, index)}</span><i style={{ left: `${scale(lo!)}%`, width: `${Math.max(1, scale(hi!) - scale(lo!))}%` }} /><b style={{ left: `${scale(point!)}%` }} title={`prediction ${point}`} /></div>)}</div>;
}
