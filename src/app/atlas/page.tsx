import { readInstitutionalViewState } from '@/lib/sfi/institutionalViewState';

export const dynamic = 'force-dynamic';

export default async function AtlasPage() {
  const state = await readInstitutionalViewState({ entityId: 'atlas', entityType: 'ORGANIZATION', label: 'Atlas institucional' });

  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 960, margin: '0 auto' }}>
      <h1>Atlas</h1>
      <p>Vista de mapa de campo y contexto institucional alimentada por el estado operativo y el grafo canónico.</p>
      <ul>
        <li><strong>C_FIELD:</strong> {state.metrics.cField.toFixed(3)}</li>
        <li><strong>PSI_MOPH:</strong> {state.metrics.psiMoph.toFixed(3)}</li>
        <li><strong>Grafo:</strong> {state.metrics.graphNodeCount} nodos · {state.metrics.graphEdgeCount} relaciones</li>
        <li><strong>Fricción:</strong> {state.friction.topFriction.toFixed(3)} · {state.friction.summary}</li>
      </ul>
      <section style={{ marginTop: 20, border: '1px solid #ddd', padding: 16 }}>
        <h2>Contexto institucional</h2>
        <ul>{state.entityContext.entitySummary.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>
    </main>
  );
}
