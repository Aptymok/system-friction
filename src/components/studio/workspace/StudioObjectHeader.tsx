import type { StudioProductionState } from '@/lib/studio/production/studioProductionTypes';
import { formatMetricValue, metricByKey } from './workspaceModel';

export function StudioObjectHeader({ state }: { state: StudioProductionState }) {
  const lufs = metricByKey(state, 'lufs_integrated');
  const truePeak = metricByKey(state, 'true_peak_dbtp');
  const tempo = metricByKey(state, 'tempo_global_bpm');
  return (
    <section className="studio-object-header" aria-label="Active Studio object">
      <div>
        <span>OBJECT</span>
        <h1>{state.activeObject.title}</h1>
        <p>{state.activeObject.mimeType ?? state.activeObject.type} / {state.activeObject.readiness.toUpperCase()} / {state.activeObject.id ?? 'NO_OBJECT'}</p>
      </div>
      <dl>
        <div><dt>LUFS</dt><dd>{formatMetricValue(lufs)}</dd></div>
        <div><dt>True Peak</dt><dd>{formatMetricValue(truePeak)}</dd></div>
        <div><dt>Tempo</dt><dd>{formatMetricValue(tempo)}</dd></div>
        <div><dt>Trace</dt><dd>{state.evidence[0]?.id ?? state.session.id ?? 'NO_TRACE'}</dd></div>
      </dl>
    </section>
  );
}
