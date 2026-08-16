import type { StudioProductionState } from '@/lib/studio/production/studioProductionTypes';

export function StudioTrajectoryField({ state }: { state: StudioProductionState }) {
  const institutionalPoints = state.archive.events.length;
  const objectSegments = state.audioFeatures.energySegments.length;
  const kind = institutionalPoints > 1 ? 'institutional_record_timeline' : institutionalPoints === 1 ? 'single_institutional_record' : 'unresolved_trajectory';
  return (
    <section className="studio-trajectory-field" aria-label="Trajectory field">
      <header><span>TRAJECTORY KIND</span><strong>{kind.toUpperCase()}</strong></header>
      <dl>
        <div><dt>Institutional timeline points</dt><dd>{institutionalPoints}</dd></div>
        <div><dt>Object-local segments</dt><dd>{objectSegments}</dd></div>
        <div><dt>Projected</dt><dd>NO_FORECAST</dd></div>
        <div><dt>Systemic velocity</dt><dd>NO_VALUE</dd></div>
        <div><dt>Method</dt><dd>Trajectory requires persisted temporal states or a declared model; object tempo is not systemic velocity.</dd></div>
      </dl>
    </section>
  );
}
