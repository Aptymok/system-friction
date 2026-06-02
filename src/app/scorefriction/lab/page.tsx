import { ScoreFrictionShell } from '@/scorefriction/components/ScoreFrictionShell';
import { ScoreFrictionLabClient } from '@/scorefriction/components/ScoreFrictionLabClient';

export default function ScoreFrictionLabPage() {
  return (
    <ScoreFrictionShell
      title="Lab"
      subtitle="Consola de operacion para carga manual, normalizacion, evaluacion de vectores y generacion de prototipos."
    >
      <ScoreFrictionLabClient />
    </ScoreFrictionShell>
  );
}
