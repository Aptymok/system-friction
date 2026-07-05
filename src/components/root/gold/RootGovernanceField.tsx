'use client';

import { Maximize2, Pause, Play } from 'lucide-react';
import type { RootGovernanceState } from '@/lib/root/gold/rootGovernanceState';
import type { RootGovernanceViewMode } from './visual/rootGoldTypes';
import { RootGovernanceFieldRenderer } from './visual/RootGovernanceFieldRenderer';

function metric(value: number | null) {
  return value === null ? 'NULL' : value > 1 ? String(value) : value.toFixed(2);
}

export function RootGovernanceField({
  state,
  mode,
  playing,
  onMode,
  onToggle,
}: {
  state: RootGovernanceState;
  mode: RootGovernanceViewMode;
  playing: boolean;
  onMode: (mode: RootGovernanceViewMode) => void;
  onToggle: () => void;
}) {
  const summary = state.governanceSummary;
  return (
    <main className="sfi-root-gold__main sfi-root-gold__panel">
      <div className="sfi-root-gold__main-head">
        <div><h1>CAMPO DE GOBERNANZA</h1><p>TOPOLOGIA DE FRICCION SISTEMICA</p></div>
        <div className="sfi-root-gold__controls">
          <span>VISTA:</span>
          {(['topologia', 'flujo', 'malla'] as const).map((item) => <button className={mode === item ? 'active' : ''} onClick={() => onMode(item)} key={item}>{item.toUpperCase()}</button>)}
          <button onClick={onToggle} aria-label={playing ? 'Pausar campo' : 'Reproducir campo'}>{playing ? <Pause size={13} /> : <Play size={13} />}</button>
          <button aria-label="Pantalla completa"><Maximize2 size={14} /></button>
        </div>
      </div>
      <div className="sfi-root-gold__topology-stage">
        <RootGovernanceFieldRenderer field={state.governanceField} mode={mode} playing={playing} />
      </div>
      <div className="sfi-root-gold__metrics-row">
        <span>FRICCION SISTEMICA<strong>{metric(summary.systemicFriction)}</strong></span>
        <span>COHERENCIA<strong>{metric(summary.coherence)}</strong></span>
        <span>RESILIENCIA<strong>{metric(summary.resilience)}</strong></span>
        <span>ALINEACION<strong>{metric(summary.alignment)}</strong></span>
        <span>NODOS ACTIVOS<strong>{summary.activeNodes ?? 'NULL'}</strong></span>
      </div>
    </main>
  );
}
