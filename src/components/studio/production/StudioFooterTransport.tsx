import type { StudioProductionState } from '@/lib/studio/production/studioProductionTypes';

export function StudioFooterTransport({ state }: { state: StudioProductionState }) {
  const hasObject = Boolean(state.activeObject.id);

  return (
    <section className="sfi-production__transport">
      <div>
        <span>TRANSPORT</span>
        <strong>{hasObject && state.audioFeatures.waveform.length ? 'AUDIO BUFFER OBSERVED' : 'NO PLAYBACK BUFFER'}</strong>
      </div>
      <div>
        <span>PHASE EVENTS</span>
        <strong>{state.phaseStates.filter((item) => item.status === 'FAILED' || item.status === 'MISSING').length} BLOCKED / MISSING</strong>
      </div>
      <div>
        <span>ANALYSIS JOB</span>
        <strong>{state.activeObject.analysisStatus}</strong>
      </div>
    </section>
  );
}
