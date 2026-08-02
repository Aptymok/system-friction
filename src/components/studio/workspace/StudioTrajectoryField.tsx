import type { StudioProductionState } from '@/lib/studio/production/studioProductionTypes';
import { formatMetricValue, metricByKey } from './workspaceModel';

export function StudioTrajectoryField({ state }: { state: StudioProductionState }) {
  const points = state.archive.events.length + state.audioFeatures.energySegments.length;
  const kind = points > 1 ? 'institutional_record_timeline' : 'partial_record_timeline';
  const tempo = metricByKey(state, 'tempo_global_bpm');
  return (
    <section className="studio-trajectory-field" aria-label="Trajectory field">
      <header><span>TRAJECTORY KIND</span><strong>{kind.toUpperCase()}</strong></header>
      <dl>
        <div><dt>Timeline points</dt><dd>{points}</dd></div>
        <div><dt>Projected</dt><dd>NO_FORECAST</dd></div>
        <div><dt>Velocity</dt><dd>{formatMetricValue(tempo)}</dd></div>
        <div><dt>Method</dt><dd>Read-only institutional and audio timeline; no cultural forecast.</dd></div>
      </dl>
    </section>
  );
}
