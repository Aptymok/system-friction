import { buildScoreFrictionScopeState } from '@/lib/amv/scopes/scorefriction/scorefrictionStateConnector';
import { ScoreFrictionInterpretationPanel } from '@/scorefriction/components/ScoreFrictionInterpretationPanel';
import { ScoreFrictionShell } from '@/scorefriction/components/ScoreFrictionShell';

export default async function ScoreFrictionPage() {
  const state = await buildScoreFrictionScopeState();

  return (
    <ScoreFrictionShell
      title="Observatorio"
      subtitle="Lectura cultural de senales imperfectas: evidencia, friccion, protoatractor y ruta de observacion sin convertirlo en calificacion estetica."
    >
      <ScoreFrictionInterpretationPanel initialState={state} />
    </ScoreFrictionShell>
  );
}
