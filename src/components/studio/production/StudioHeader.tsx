import type { StudioProductionState } from '@/lib/studio/production/studioProductionTypes';

export function StudioHeader({ state }: { state: StudioProductionState }) {
  const time = new Date(state.generatedAt).toISOString().slice(11, 19);

  return (
    <header className="sfi-production__header">
      <div>
        <span>SYSTEM FRICTION INSTITUTE</span>
        <strong>STUDIO / OBJECT EVALUATION LAB</strong>
      </div>
      <div className="sfi-production__header-object">
        <span>ACTIVE OBJECT</span>
        <strong>{state.activeObject.title}</strong>
      </div>
      <div className="sfi-production__header-state">
        <span>ESTADO</span>
        <strong>{state.systemState.toUpperCase()}</strong>
        <em>{time} UTC</em>
      </div>
    </header>
  );
}
