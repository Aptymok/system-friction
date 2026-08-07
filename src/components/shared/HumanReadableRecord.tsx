import type { ReactNode } from 'react';

const LABELS: Record<string, string> = {
  id: 'Identificador',
  event_id: 'Identificador del evento',
  event_name: 'Evento',
  name: 'Nombre',
  title: 'Título',
  label: 'Nombre',
  status: 'Estado',
  state: 'Estado',
  summary: 'Resumen',
  description: 'Descripción',
  purpose: 'Propósito',
  result: 'Resultado',
  outcome: 'Resultado observado',
  reason: 'Razón',
  warning: 'Advertencia',
  warnings: 'Advertencias',
  error: 'Error',
  error_code: 'Código de error',
  confidence: 'Confianza',
  source: 'Fuente',
  provider: 'Proveedor',
  model: 'Modelo',
  authorityLevel: 'Nivel de autoridad',
  authority_level: 'Nivel de autoridad',
  humanApprovalRequired: 'Requiere aprobación humana',
  autonomy_level: 'Nivel de autonomía',
  created_at: 'Registrado',
  updated_at: 'Actualizado',
  observed_at: 'Observado',
  occurred_at: 'Ocurrió',
  generatedAt: 'Generado',
  evidence: 'Evidencia',
  evidence_refs: 'Referencias de evidencia',
  requiresEvidence: 'Evidencia requerida',
  minimumEvidence: 'Evidencia mínima',
  blockedReason: 'Razón de bloqueo',
  readsMemory: 'Memoria consultada',
  writesMemory: 'Memoria escrita',
  emits: 'Eventos emitidos',
  listensTo: 'Eventos escuchados',
};

function labelFor(key: string) {
  if (LABELS[key]) return LABELS[key];
  return key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatPrimitive(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Sin dato';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 'Sin dato';
    if (value >= 0 && value <= 1 && value !== 0 && value !== 1) return `${Number((value * 100).toFixed(1))}%`;
    return Number(value.toFixed(4)).toString();
  }
  if (typeof value === 'string') return value;
  return '';
}

function objectSummary(value: Record<string, unknown>) {
  for (const key of ['title', 'name', 'label', 'statement', 'summary', 'description', 'id']) {
    const candidate = value[key];
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  const keys = Object.keys(value);
  return keys.length ? `Registro con ${keys.length} campo(s)` : 'Registro vacío';
}

function readableValue(value: unknown): ReactNode {
  const primitive = formatPrimitive(value);
  if (primitive) return primitive;

  if (Array.isArray(value)) {
    if (!value.length) return 'Sin elementos';
    if (value.every((item) => ['string', 'number', 'boolean'].includes(typeof item))) {
      return value.map((item) => formatPrimitive(item)).join(' · ');
    }
    return (
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {value.slice(0, 12).map((item, index) => (
          <li key={index}>{item && typeof item === 'object' && !Array.isArray(item) ? objectSummary(item as Record<string, unknown>) : formatPrimitive(item)}</li>
        ))}
        {value.length > 12 ? <li>… {value.length - 12} elemento(s) adicionales</li> : null}
      </ul>
    );
  }

  if (value && typeof value === 'object') return objectSummary(value as Record<string, unknown>);
  return 'Sin dato';
}

export function HumanReadableRecord({ value, title = 'Resumen comprensible', maxFields = 24 }: {
  value: unknown;
  title?: string;
  maxFields?: number;
}) {
  const entries = value && typeof value === 'object' && !Array.isArray(value)
    ? Object.entries(value as Record<string, unknown>).filter(([, item]) => item !== undefined && item !== null && item !== '')
    : [];

  return (
    <section style={{ display: 'grid', gap: 12 }}>
      <div>
        <strong style={{ display: 'block', fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase' }}>{title}</strong>
        {entries.length ? (
          <dl style={{ display: 'grid', gap: 8, margin: '10px 0 0' }}>
            {entries.slice(0, maxFields).map(([key, item]) => (
              <div key={key} style={{ display: 'grid', gridTemplateColumns: 'minmax(150px,.55fr) minmax(0,1.45fr)', gap: 12, borderTop: '1px solid rgba(160,140,100,.16)', paddingTop: 8 }}>
                <dt style={{ opacity: .62 }}>{labelFor(key)}</dt>
                <dd style={{ margin: 0, overflowWrap: 'anywhere' }}>{readableValue(item)}</dd>
              </div>
            ))}
          </dl>
        ) : <p style={{ opacity: .65 }}>No hay información estructurada adicional.</p>}
      </div>

      <details>
        <summary style={{ cursor: 'pointer', opacity: .72 }}>Ver JSON técnico</summary>
        <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 11, lineHeight: 1.55, padding: 12, border: '1px solid rgba(160,140,100,.2)', background: 'rgba(0,0,0,.2)' }}>{JSON.stringify(value, null, 2)}</pre>
      </details>
    </section>
  );
}
