import { ScoreFrictionPanel, ScoreFrictionShell } from '@/scorefriction/components/ScoreFrictionShell';

export default function ScoreFrictionEvidencePage() {
  return (
    <ScoreFrictionShell
      title="Evidence"
      subtitle="Ledger operativo para que cada hipotesis quede ligada a fuente, payload, normalizacion, hash, vector y verificacion."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <ScoreFrictionPanel title="Registro">
          POST /api/scorefriction/observe/manual guarda raw_payload, normalized_payload, evidence_hash y vectores derivados.
        </ScoreFrictionPanel>
        <ScoreFrictionPanel title="Evaluacion">
          POST /api/scorefriction/evaluate calcula vectores sin exigir que una API externa este lista.
        </ScoreFrictionPanel>
        <ScoreFrictionPanel title="Prototipo">
          POST /api/scorefriction/propose convierte el vector MIHM-Cultural en brief, prompt y plan de verificacion.
        </ScoreFrictionPanel>
        <ScoreFrictionPanel title="Verificacion">
          POST /api/scorefriction/verify guarda metricas longitudinales por plataforma y su interpretacion.
        </ScoreFrictionPanel>
      </div>
    </ScoreFrictionShell>
  );
}
