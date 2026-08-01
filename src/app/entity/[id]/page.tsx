import { readInstitutionalViewState } from '@/lib/sfi/institutionalViewState';

export const dynamic = 'force-dynamic';

export default async function EntityPage({ params }: { params: { id: string } }) {
  const state = await readInstitutionalViewState({ entityId: params.id, entityType: 'PHENOMENON', label: params.id });

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1>Entity View</h1>
      <p>Vista universal para navegar cualquier entidad desde cualquier vista institucional.</p>
      <section style={{ marginTop: 20, border: '1px solid #ddd', padding: 16 }}>
        <h2>Entidad</h2>
        <p>{state.entityContext.entityId}</p>
        <ul>
          {state.entityContext.entitySummary.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>
      <section style={{ marginTop: 20, border: '1px solid #ddd', padding: 16 }}>
        <h2>Relaciones</h2>
        {state.graph.edges.length === 0 ? <p>No hay relaciones del grafo disponibles todavía.</p> : (
          <ul>
            {state.graph.edges.map((edge) => <li key={edge.id}>{edge.source} → {edge.target} ({edge.relation})</li>)}
          </ul>
        )}
      </section>
      <section style={{ marginTop: 20, border: '1px solid #ddd', padding: 16 }}>
        <h2>Timeline</h2>
        <ul>{state.entityContext.timeline.map((item) => <li key={`${item.step}-${item.value}`}>{item.step}: {item.value}</li>)}</ul>
      </section>
      <section style={{ marginTop: 20, border: '1px solid #ddd', padding: 16 }}>
        <h2>Friction Field</h2>
        <p>{state.friction.summary}</p>
        <p>Top friction: {state.friction.topFriction.toFixed(2)}</p>
      </section>
      <section style={{ marginTop: 20, border: '1px solid #ddd', padding: 16 }}>
        <h2>Attractor Scorecard</h2>
        <p>Knowledge velocity: {state.attractor.knowledgeVelocity.toFixed(2)}</p>
        <p>Attractor distance: {state.attractor.attractorDistance.toFixed(2)}</p>
      </section>
      <section style={{ marginTop: 20, border: '1px solid #ddd', padding: 16 }}>
        <h2>Tomografía institucional</h2>
        <p>{state.tomography.sections.join(' · ')}</p>
        {state.tomography.frictions.length > 0 ? <ul>{state.tomography.frictions.map((item) => <li key={item}>{item}</li>)}</ul> : <p>No hay fricciones registradas todavía.</p>}
      </section>
    </main>
  );
}
