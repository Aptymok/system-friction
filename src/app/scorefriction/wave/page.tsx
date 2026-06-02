import { ScoreFrictionPanel, ScoreFrictionShell } from '@/scorefriction/components/ScoreFrictionShell';

const METRICS = ['NTI_C', 'IHG_C', 'ICE_C', 'CRM_C', 'FS_C', 'LCP', 'PAC', 'VFE', 'SCR'];

export default function ScoreFrictionWavePage() {
  return (
    <ScoreFrictionShell
      title="Cultural Wave Map"
      subtitle="Mapa de lectura MIHM-Cultural derivado de senales acusticas, semanticas, memeticas y de plataforma."
    >
      <div className="grid gap-4 md:grid-cols-3">
        {METRICS.map((metric) => (
          <ScoreFrictionPanel key={metric} title={metric}>
            Valor 0-1 calculado desde evidencia normalizada. No es certeza: es lectura operacional para decidir que observar, proponer o verificar despues.
          </ScoreFrictionPanel>
        ))}
      </div>
    </ScoreFrictionShell>
  );
}
