import { useState } from 'react';
import { monteCarloSimulation } from '@/lib/mihmEngine';
import stateData from '@/data/state.json';

export default function Laboratorio() {
  const [result, setResult] = useState(null);

  const run = () => {
    const vectors = Object.fromEntries((stateData.nodes || []).map((n, idx) => [`N${idx + 1}`, { C: n.C, E: n.E, L: n.L, M: n.M }]));
    setResult(monteCarloSimulation(3000, { vectors }));
  };

  return (
    <section>
      <h2>Laboratorio</h2>
      <button type="button" onClick={run}>Simular Monte Carlo</button>
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </section>
  );
}
