import { readInstitutionalViewState } from '@/lib/sfi/institutionalViewState';

export const dynamic = 'force-dynamic';

export default async function LedgerPage() {
  const state = await readInstitutionalViewState({ entityId: 'ledger', entityType: 'REPORT', label: 'Institutional ledger' });

  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 960, margin: '0 auto' }}>
      <h1>Ledger</h1>
      <p>Vista de trazabilidad y registro institucional.</p>
      <ul>
        <li><strong>PHI_SFI:</strong> {state.metrics.phiSfi.toFixed(3)}</li>
        <li><strong>F_S:</strong> {state.metrics.fS.toFixed(3)}</li>
        <li><strong>Régimen:</strong> {state.metrics.regime}</li>
        <li><strong>Memoria persistida:</strong> {state.metrics.memoryCount}</li>
      </ul>
      <section style={{ marginTop: 20, border: '1px solid #ddd', padding: 16 }}>
        <h2>Últimos registros</h2>
        <ul>
          {state.ledger.map((item) => (
            <li key={`${item.kind}-${item.identity}`}>
              <strong>{item.title}</strong> · {item.kind} · {item.createdAt}
              <div>{item.summary}</div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
