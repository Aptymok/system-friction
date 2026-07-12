import type { RootRow } from '@/lib/root/sovereign/rootSovereignState';

function subject(run: RootRow) {
  return [run.subject_type, run.subject_id].filter((value) => typeof value === 'string' && value.length > 0).join(' · ') || 'SIN SUJETO';
}

export function PredictionTimeline({ runs }: { runs: RootRow[] }) {
  const due = runs.filter((run) => typeof run.due_at === 'string').sort((a, b) => String(a.due_at).localeCompare(String(b.due_at))).slice(0, 12);
  return due.length ? <ol className="rs-timeline">{due.map((run, index) => <li key={String(run.id ?? index)}><time>{String(run.due_at).slice(0, 16)}</time><strong>{subject(run)}</strong><span>{String(run.status ?? 'SIN DATO')}</span></li>)}</ol> : <div className="rs-empty"><b>SIN VENTANAS</b><p>No hay runs con due_at.</p></div>;
}
