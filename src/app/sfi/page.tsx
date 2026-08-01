import { calculatePhiSfi, calculateFS, resolveRegime } from '@/core/formulas/canonicalFormulas';

export default function SfiOperationalPage() {
  const phiSfi = calculatePhiSfi(0.68, 0.74, 0.22, 0.05);
  const fS = calculateFS(phiSfi);
  const regime = resolveRegime(phiSfi);

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
        <h2>Canonical State</h2>
        <ul>
          <li><strong>PHI_SFI:</strong> {phiSfi.toFixed(3)}</li>
          <li><strong>F_S:</strong> {fS.toFixed(3)}</li>
          <li><strong>Régimen:</strong> {regime}</li>
        </ul>
      </div>
    </main>
  );
}
