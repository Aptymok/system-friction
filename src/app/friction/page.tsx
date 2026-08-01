import { readInstitutionalViewState } from '@/lib/sfi/institutionalViewState';

export const dynamic = 'force-dynamic';

export default async function FrictionExplorerPage() {
  const state = await readInstitutionalViewState({ entityId: 'friction', entityType: 'STATE', label: 'Friction explorer' });

  return (
    <main style={{ padding: 24, maxWidth: 960, margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1>Friction Explorer</h1>
      <p>Donde está la fricción, qué la activa y qué impide que ocurra el estado deseado.</p>
      <section style={{ marginTop: 20, border: '1px solid #ddd', padding: 16 }}>
        <h2>Friction Field</h2>
        <p>{state.friction.summary}</p>
        <ul>
          {state.friction.nodes.map((node) => <li key={node.id}>{node.label}: {node.value.toFixed(2)}</li>)}
        </ul>
        <p><strong>Top friction:</strong> {state.friction.topFriction.toFixed(3)}</p>
      </section>
    </main>
  );
}
