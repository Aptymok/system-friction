'use client';

import type { StudioProductionState } from '@/lib/studio/production/studioProductionTypes';
import { ALL_STUDIO_LAYERS, type StudioLayerId, useStudioWorkspaceStore } from '@/stores/studioWorkspaceStore';
import { metricAvailability, statusClass } from './workspaceModel';

const labels: Record<StudioLayerId, string> = {
  WAVEFORM: 'Waveform',
  MOMENTARY_LUFS: 'Momentary LUFS',
  SHORT_TERM_LUFS: 'Short-Term LUFS',
  TRUE_PEAK_EVENTS: 'True Peak',
  RMS: 'RMS',
  SPECTRAL_CENTROID: 'Centroid',
  TRANSIENTS: 'Transients',
  ONSETS: 'Onsets',
  BEATS: 'Beats',
  TEMPO: 'Tempo',
  PITCH: 'Pitch',
  CHROMA: 'Chroma',
  HARMONIC_CHANGES: 'Harmony',
  SEGMENTS: 'Segments',
  EVIDENCE: 'Evidence',
  PHENOMENA: 'Phenomena',
  ANNOTATIONS: 'Annotations',
};

export function StudioLayerControls({ state }: { state: StudioProductionState }) {
  const activeLayers = useStudioWorkspaceStore((store) => store.activeLayers);
  const toggleLayer = useStudioWorkspaceStore((store) => store.toggleLayer);
  return (
    <section className="studio-layer-controls" aria-label="Temporal layers">
      {ALL_STUDIO_LAYERS.map((layer) => {
        const availability = metricAvailability(state, layer);
        const active = activeLayers.includes(layer);
        return (
          <button key={layer} type="button" className={`${active ? 'is-active' : ''} ${statusClass(availability)}`} onClick={() => toggleLayer(layer)} aria-pressed={active}>
            <span>{labels[layer]}</span>
            <em>{availability}</em>
          </button>
        );
      })}
    </section>
  );
}
