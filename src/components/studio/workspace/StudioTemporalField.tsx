'use client';

import { Pause, Play, Repeat, ZoomIn, ZoomOut } from 'lucide-react';
import type { StudioProductionState } from '@/lib/studio/production/studioProductionTypes';
import { useStudioWorkspaceStore } from '@/stores/studioWorkspaceStore';
import { StudioLayerControls } from './StudioLayerControls';
import { StudioSegmentLane } from './StudioSegmentLane';
import { StudioWaveform } from './StudioWaveform';
import { formatMetricValue, metricByKey } from './workspaceModel';

export function StudioTemporalField({ state }: { state: StudioProductionState }) {
  const isPlaying = useStudioWorkspaceStore((store) => store.isPlaying);
  const setPlaying = useStudioWorkspaceStore((store) => store.setPlaying);
  const zoom = useStudioWorkspaceStore((store) => store.zoom);
  const setZoom = useStudioWorkspaceStore((store) => store.setZoom);
  const loopEnabled = useStudioWorkspaceStore((store) => store.loopEnabled);
  const toggleLoop = useStudioWorkspaceStore((store) => store.toggleLoop);
  const selection = useStudioWorkspaceStore((store) => store.selection);
  const tempo = metricByKey(state, 'tempo_global_bpm');
  const onsets = metricByKey(state, 'rhythm_onset_count');
  const beats = metricByKey(state, 'beat_count');
  const harmonicStability = metricByKey(state, 'harmonic_stability');
  const key = metricByKey(state, 'key_estimate');
  const zoomMode = zoom < 2.2 ? 'OVERVIEW' : zoom < 6 ? 'ANALYSIS' : 'MICRO';
  return (
    <section className="studio-temporal-field" aria-label="Temporal field">
      <h2 className="studio-temporal-field__title">TEMPORAL FIELD</h2>
      <div className="studio-temporal-field__toolbar">
        <button type="button" onClick={() => setPlaying(!isPlaying)} aria-label={isPlaying ? 'Pause audio' : 'Play audio'}>
          {isPlaying ? <Pause size={18} aria-hidden /> : <Play size={18} aria-hidden />}
        </button>
        <button type="button" onClick={toggleLoop} aria-pressed={loopEnabled} aria-label="Toggle loop">
          <Repeat size={18} aria-hidden />
        </button>
        <button type="button" onClick={() => setZoom(zoom - 1)} aria-label="Zoom out"><ZoomOut size={18} aria-hidden /></button>
        <button type="button" onClick={() => setZoom(zoom + 1)} aria-label="Zoom in"><ZoomIn size={18} aria-hidden /></button>
        <span>Zoom {zoom.toFixed(1)}x / {zoomMode}</span>
        <span>{selection ? `${selection.startSeconds.toFixed(2)}s - ${selection.endSeconds.toFixed(2)}s` : 'No range selected'}</span>
      </div>
      <StudioWaveform state={state} />
      <StudioSegmentLane state={state} />
      <div className="studio-temporal-field__summary">
        <span>Tempo {formatMetricValue(tempo)}</span>
        <span>Onsets {formatMetricValue(onsets)}</span>
        <span>Beats {formatMetricValue(beats)}</span>
        <span>Key {formatMetricValue(key)}</span>
        <span>Harmony {formatMetricValue(harmonicStability)}</span>
      </div>
      <StudioLayerControls state={state} />
    </section>
  );
}
