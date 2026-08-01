import { calculatePsiMoph } from '@/core/formulas/canonicalFormulas';

export default function MophPage() {
  const psiMoph = calculatePsiMoph(0.75, 0.6, 0.2, 0.02, 0.1);

  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 960, margin: '0 auto' }}>
      <h1>MOP-H</h1>
      <p>Vista operativa del modelo de campo y oportunidad institucional.</p>
      <p><strong>PSI_MOPH:</strong> {psiMoph.toFixed(3)}</p>
    </main>
  );
}
