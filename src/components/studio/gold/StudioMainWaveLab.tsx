import { Maximize2 } from 'lucide-react';
import type { StudioGoldState } from '@/lib/studio/gold/studioGoldState';
import { StudioCulturalWaveRenderer } from './visual/StudioCulturalWaveRenderer';

function metric(value: number, suffix = '') {
  return `${value.toFixed(value >= 1 ? 2 : 2)}${suffix}`;
}

export function StudioMainWaveLab({ state }: { state: StudioGoldState }) {
  const metrics = [
    ['COHERENCIA GLOBAL', metric(state.culturalWave.coherenceGlobal), 'indice'],
    ['ENTROPIA CULTURAL', metric(state.culturalWave.culturalEntropy), 'indice'],
    ['DENSIDAD SIMBOLICA', metric(state.culturalWave.symbolicDensity), 'indice'],
    ['PLASTICIDAD', metric(state.culturalWave.plasticity), 'indice'],
    ['VELOCIDAD DE ONDA', metric(state.culturalWave.waveSpeed), 'Hz'],
    ['COBERTURA ANALITICA', `${Math.round(state.culturalWave.analyticCoverage * 100)}%`, ''],
  ];

  return (
    <main className="sfi-studio-gold__wave-lab sfi-studio-gold__panel">
      <div className="sfi-studio-gold__wave-head">
        <div>
          <h1><span>CULTURAL WAVE</span> / WAVE LAB</h1>
          <p>CAMPO CULTURAL EN RESOLUCION MULTIDIMENSIONAL</p>
        </div>
        <div className="sfi-studio-gold__wave-controls">
          <span>VISTA:</span>
          <span>TOPOLOGIA</span>
          <Maximize2 size={15} strokeWidth={1.4} aria-hidden="true" />
        </div>
      </div>
      <div className="sfi-studio-gold__wave-stage">
        <StudioCulturalWaveRenderer wave={state.culturalWave} />
      </div>
      <div className="sfi-studio-gold__metric-strip">
        {metrics.map(([label, value, unit]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            {unit ? <em>{unit}</em> : null}
          </div>
        ))}
      </div>
    </main>
  );
}
