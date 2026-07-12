import type { RootSelection } from './sovereignTypes';

function display(value: unknown) {
  if (value === null || value === undefined || (typeof value === 'number' && !Number.isFinite(value))) return 'SIN DATO';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value, null, 2);
}

export function RootInspector({ selection }: { selection: RootSelection | null }) {
  if (!selection) return <aside className="rs-inspector"><div className="rs-section-head"><span>INSPECTOR</span><strong>NINGUNA ENTIDAD</strong></div><div className="rs-empty"><b>SIN SELECCIÓN</b><p>Seleccione una fila, nodo, propuesta, memoria o acción para ver fuente, evidencia y payload.</p></div></aside>;
  return (
    <aside className="rs-inspector">
      <div className="rs-section-head"><span>INSPECTOR · {selection.kind}</span><strong>{selection.title}</strong></div>
      <dl className="rs-inspector-meta">
        <div><dt>ID</dt><dd>{selection.id}</dd></div><div><dt>SOURCE</dt><dd>{selection.source}</dd></div>
        <div><dt>OBSERVED</dt><dd>{selection.observedAt ?? 'NO MEDIDO'}</dd></div><div><dt>CONFIDENCE</dt><dd>{selection.confidence === null ? 'NO MEDIDO' : selection.confidence.toFixed(3)}</dd></div>
        <div><dt>WARNING</dt><dd>{selection.warning ?? 'SIN ALERTA'}</dd></div><div><dt>EVIDENCE</dt><dd>{selection.evidenceIds.length ? selection.evidenceIds.join(', ') : 'SIN EVIDENCIA'}</dd></div>
      </dl>
      <div className="rs-payload"><span>PAYLOAD / TRACE</span><pre>{display(selection.data)}</pre></div>
    </aside>
  );
}
