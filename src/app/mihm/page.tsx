import { readInstitutionalViewState } from '@/lib/sfi/institutionalViewState';

export const dynamic = 'force-dynamic';

export default async function MihmPage() {
  const state = await readInstitutionalViewState({ entityId: 'mihm', entityType: 'STATE', label: 'MIHM institutional state' });

  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 960, margin: '0 auto' }}>
      <h1>MIHM</h1>
      <p>Vista canónica de salud institucional y estado de fricción.</p>
      <ul>
        <li><strong>PHI_SFI:</strong> {state.metrics.phiSfi.toFixed(3)}</li>
        <li><strong>F_S:</strong> {state.metrics.fS.toFixed(3)}</li>
        <li><strong>Régimen:</strong> {state.metrics.regime}</li>
        <li><strong>Evidence count:</strong> {state.metrics.evidenceCount}</li>
        <li><strong>Prediction count:</strong> {state.metrics.predictionCount}</li>
      </ul>
      <p>Esta vista consume el estado operativo canónico y la memoria institucional para exponer el sistema sin depender de lógica antigua.</p>
    </main>
  );
}
