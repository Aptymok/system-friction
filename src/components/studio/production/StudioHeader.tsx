import type { StudioProductionState } from '@/lib/studio/production/studioProductionTypes';

export function StudioHeader({ state, stage, onOpenIntake }: { state: StudioProductionState; stage: string; onOpenIntake: () => void }) {
  const time = new Date(state.generatedAt).toISOString().slice(11, 19);
  const confidence = Math.max(...state.metricValues.map((metric) => metric.confidence), 0);

  return (
    <header className="sfi-production__header">
      <div className="sfi-production__header-title">
        <span>SYSTEM FRICTION INSTITUTE</span>
        <strong>STUDIO · {stage}</strong>
      </div>
      <div className="sfi-production__header-object">
        <span>OBJETO ACTIVO</span>
        <strong>{state.activeObject.title}</strong>
        <small>{state.activeObject.type.toUpperCase()} · {state.activeObject.analysisStatus}</small>
      </div>
      <div className="sfi-production__header-state">
        <span>SISTEMA</span>
        <strong>{state.systemState.toUpperCase()}</strong>
        <em>{Math.round(confidence * 100)}% MAX CONF · {time} UTC</em>
      </div>
      <button type="button" onClick={onOpenIntake}>NUEVO OBJETO</button>
    </header>
  );
}
