import type { RootSelection } from './sovereignTypes';

type Row = Record<string, unknown>;

const LABELS: Record<string, string> = {
  id: 'Identificador interno',
  title: 'Título',
  name: 'Nombre',
  label: 'Nombre',
  status: 'Estado',
  state: 'Estado',
  type: 'Tipo',
  event_type: 'Tipo de evento',
  source: 'Fuente',
  observed_at: 'Fecha observada',
  created_at: 'Fecha de registro',
  updated_at: 'Última actualización',
  confidence: 'Confianza',
  value: 'Valor',
  predicted_value: 'Valor esperado',
  outcome_value: 'Resultado observado',
  error: 'Diferencia observada',
  description: 'Descripción',
  summary: 'Resumen',
  action: 'Acción',
  effect: 'Efecto esperado',
  target: 'Objetivo',
  warning: 'Advertencia',
  evidence_ids: 'Evidencia relacionada',
};

function humanLabel(key: string) {
  if (LABELS[key]) return LABELS[key];
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function humanValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Sin dato';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'Sin dato';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    if (!value.length) return 'Sin elementos';
    return value.map((item) => typeof item === 'object' ? 'Registro relacionado' : String(item)).join(' · ');
  }
  return 'Información disponible en detalle técnico';
}

function readableRows(value: unknown): Array<[string, string]> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.entries(value as Row)
    .filter(([, entry]) => entry !== null && entry !== undefined && entry !== '')
    .slice(0, 18)
    .map(([key, entry]) => [humanLabel(key), humanValue(entry)]);
}

export function RootInspector({ selection }: { selection: RootSelection | null }) {
  if (!selection) {
    return (
      <aside className="rs-inspector">
        <div className="rs-section-head"><span>DETALLE</span><strong>Nada seleccionado</strong></div>
        <div className="rs-empty"><b>Selecciona un elemento</b><p>Haz clic en un punto, registro, propuesta, memoria o acción para conocer qué representa, de dónde proviene y qué puedes hacer con él.</p></div>
      </aside>
    );
  }

  const rows = readableRows(selection.data);

  return (
    <aside className="rs-inspector">
      <div className="rs-section-head"><span>DETALLE DEL ELEMENTO</span><strong>{selection.title}</strong></div>
      <dl className="rs-inspector-meta">
        <div><dt>Qué es</dt><dd>{humanValue(selection.kind)}</dd></div>
        <div><dt>De dónde proviene</dt><dd>{selection.source || 'Fuente no indicada'}</dd></div>
        <div><dt>Cuándo se observó</dt><dd>{selection.observedAt ?? 'Fecha no disponible'}</dd></div>
        <div><dt>Nivel de confianza</dt><dd>{selection.confidence === null ? 'No calculado' : `${(selection.confidence * 100).toFixed(1)}%`}</dd></div>
        <div><dt>Advertencias</dt><dd>{selection.warning ?? 'Sin advertencias'}</dd></div>
        <div><dt>Evidencia relacionada</dt><dd>{selection.evidenceIds.length ? `${selection.evidenceIds.length} registro(s)` : 'Todavía no hay evidencia enlazada'}</dd></div>
      </dl>

      <div className="rs-payload">
        <span>INFORMACIÓN COMPRENSIBLE</span>
        {rows.length ? (
          <dl className="rs-inspector-meta">
            {rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          </dl>
        ) : <div className="rs-empty compact">No hay más información legible para mostrar.</div>}

        <details>
          <summary>Mostrar detalle técnico</summary>
          <pre>{JSON.stringify(selection.data, null, 2)}</pre>
        </details>
      </div>
    </aside>
  );
}
