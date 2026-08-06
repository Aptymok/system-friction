import { readInstitutionalViewState } from '@/lib/sfi/institutionalViewState';

export const dynamic = 'force-dynamic';

function metric(value: number | null) {
  return value === null ? '—' : value.toFixed(3);
}

export default async function MihmPage() {
  const state = await readInstitutionalViewState({ entityId: 'mihm', entityType: 'STATE', label: 'MIHM institutional state' });

  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 960, margin: '0 auto' }}>
      <h1>MIHM</h1>
      <p>Marco metodológico de instrumentos diferenciados por objeto, dimensión y ventana temporal.</p>
      <ul>
        <li><strong>Φ_SFI:</strong> {metric(state.metrics.phiSfi)}</li>
        <li><strong>F_S:</strong> {metric(state.metrics.fS)}</li>
        <li><strong>Régimen:</strong> {state.metrics.regime ?? '—'}</li>
        <li><strong>Estado probatorio:</strong> {state.metrics.status}</li>
        <li><strong>Evidence count:</strong> {state.metrics.evidenceCount}</li>
        <li><strong>Prediction count:</strong> {state.metrics.predictionCount}</li>
      </ul>
      {state.metrics.warnings.length > 0 ? <p>Advertencias: {state.metrics.warnings.join(' · ')}</p> : null}
      <p>Φ_H, Φ_S, Φ_F, Φ_W y Φ_SFI pertenecen a instrumentos distintos y no se promedian entre sí.</p>
    </main>
  );
}
