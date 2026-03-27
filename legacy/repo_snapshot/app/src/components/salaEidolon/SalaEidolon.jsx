import { useEidolon } from '@/hooks/useEidolon';
import { EidolonUIFull } from '@/lib/eidolon';

function MiniChart({ values }) {
  const points = values.map((v, i) => `${10 + i * 40},${80 - (v * 40)}`).join(' ');
  return (
    <svg width="180" height="90">
      <polyline points={points} fill="none" stroke="#c8a96e" strokeWidth="2" />
    </svg>
  );
}

export default function SalaEidolon() {
  const eidolon = useEidolon();

  return (
    <section>
      <h2>Sala Eidolon</h2>
      <MiniChart values={[eidolon.mihmState.ihg, eidolon.mihmState.nti, eidolon.mihmState.deltaIHG, eidolon.mihmState.deltaNTI]} />
      <EidolonUIFull state={eidolon} onTextSubmit={eidolon.updateWithText} onRetroRun={eidolon.runRetroSimulation} />
    </section>
  );
}
