import { useMemo } from 'react';
import { useEidolon } from '@/hooks/useEidolon';
import { friction } from '@/lib/mihmEngine';

export default function ScoreFriction() {
  const { mihmState } = useEidolon();
  const score = useMemo(() => friction(Math.abs(mihmState.ihg) + 0.5, 1, Math.max(0, 1 - mihmState.nti)), [mihmState]);

  return (
    <section>
      <h1>ScoreFriction</h1>
      <p>f = (t/T) + O</p>
      <p>{score.toFixed(4)}</p>
    </section>
  );
}
