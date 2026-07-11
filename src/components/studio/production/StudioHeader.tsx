import type { StudioProductionState } from '@/lib/studio/production/studioProductionTypes';
import './studio-console-overrides.css';

export function StudioHeader({ state, stage, onOpenIntake }: { state: StudioProductionState; stage: string; onOpenIntake: () => void }) {
  const time = new Date(state.generatedAt).toISOString().slice(11, 19);
  const confidence = Math.max(...state.metricValues.map((metric) => metric.confidence), 0);

  return (
    <header className="sfi-production__header">
      <div className="sfi-production__header-title">
        <span>SFI STUDIO · {state.session.status.toUpperCase()}</span>
        <strong>{state.activeObject.title}</strong>
        <small>{state.activeObject.type.toUpperCase()} · {state.activeObject.analysisStatus}</small>
      </div>
      <div className="sfi-production__header-center">
        <span>SYSTEM FRICTION INSTITUTE</span>
        <strong>STUDIO</strong>
        <small>{stage} · OBJECT INTELLIGENCE ENVIRONMENT</small>
      </div>
      <div className="sfi-production__header-state">
        <span>SYSTEM STATE</span>
        <strong>{state.systemState.toUpperCase()} · {Math.round(confidence * 100)}% MAX CONF</strong>
        <em>{time} UTC · {state.activeObject.readiness.toUpperCase()}</em>
      </div>
      <button type="button" onClick={onOpenIntake}>CARGAR OBJETO</button>
    </header>
  );
}
