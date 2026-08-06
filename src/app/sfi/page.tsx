import { readInstitutionalPhiState } from '@/lib/mihm/institutionalPhiState';

export const dynamic = 'force-dynamic';

function formatMetric(value: number | null | undefined) {
  return typeof value === 'number' ? value.toFixed(3) : '—';
}

export default async function SfiOperationalPage() {
  const state = await readInstitutionalPhiState();

  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 1200, margin: '0 auto' }}>
      <h1>SFI Operational View</h1>
      <p>Vista operacional unificada de observación, evidencia, decisión, memoria y ejecución.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginTop: 20 }}>
        <section style={{ border: '1px solid #ddd', padding: 16 }}>
          <h2>Observation</h2>
          <p>Se captura la señal y se prepara el contexto canónico.</p>
        </section>
        <section style={{ border: '1px solid #ddd', padding: 16 }}>
          <h2>Evidence</h2>
          <p>Los agentes generan evidencia y la dejan lista para validación.</p>
        </section>
        <section style={{ border: '1px solid #ddd', padding: 16 }}>
          <h2>Governance</h2>
          <p>La decisión se evalúa bajo el régimen canónico.</p>
        </section>
        <section style={{ border: '1px solid #ddd', padding: 16 }}>
          <h2>Institutional Memory</h2>
          <p>Todo el ciclo persiste en memoria institucional con trazabilidad.</p>
        </section>
      </div>
      <div style={{ marginTop: 24, border: '1px solid #ddd', padding: 16 }}>
        <h2>Canonical Institutional State</h2>
        <ul>
          <li><strong>Φ_SFI:</strong> {formatMetric(state.metrics?.phi)}</li>
          <li><strong>F_S:</strong> {formatMetric(state.metrics?.fs)}</li>
          <li><strong>Régimen:</strong> {state.metrics?.regime ?? '—'}</li>
          <li><strong>Estado probatorio:</strong> {state.status}</li>
          <li><strong>Observado:</strong> {state.observedAt ?? 'sin snapshot institucional'}</li>
        </ul>
        {state.warnings.length > 0 ? <p>Advertencias: {state.warnings.join(' · ')}</p> : null}
      </div>
    </main>
  );
}
