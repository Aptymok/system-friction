'use client';

import { useMemo, useState } from 'react';
import { resolvedStudioRootCapabilityReadModel } from '@/lib/studio/capabilities/resolvedStudioCapabilities';
import { RootCapabilityInspector } from './RootCapabilityInspector';
import { RootCapabilityStatus } from './RootCapabilityStatus';
import './root-capability-matrix.css';

const visibleCapabilities = new Set([
  'audio.loudness.integrated_lufs',
  'audio.dynamic.true_peak',
  'audio.rhythm.beat_tempo_meter',
  'audio.pitch.tracking',
  'audio.pitch.chroma',
  'audio.pitch.key_estimation',
  'audio.harmony.harmonic_change',
  'audio.harmony.harmonic_stability',
  'audio.harmony.tonal_ambiguity',
  'audio.spectrum.core',
  'audio.spectrum.advanced',
  'audio.structure.novelty_repetition',
  'voice.semantic.audio',
  'sfi.variable.d_cog',
  'sfi.variable.e_r',
  'sfi.variable.v_i',
  'sfi.variable.i_mc',
]);

export function RootCapabilityMatrix() {
  const capabilities = useMemo(() => resolvedStudioRootCapabilityReadModel().filter((item) => visibleCapabilities.has(item.capability)), []);
  const [selectedId, setSelectedId] = useState(capabilities[0]?.capability ?? null);
  const selected = capabilities.find((item) => item.capability === selectedId) ?? null;
  const calibrationQueue = capabilities.filter((item) => item.status === 'CALIBRATION_REQUIRED' || item.lastCalibration === 'required');
  return (
    <section className="root-capability-matrix" aria-label="ROOT capability matrix">
      <header>
        <span>CAPABILITY MATRIX</span>
        <strong>{capabilities.length} motores y variables / {calibrationQueue.length} calibraciones</strong>
      </header>
      <div className="root-capability-matrix__body">
        <div role="table" aria-label="Studio and ROOT capabilities">
          {capabilities.map((item) => (
            <button key={item.capability} role="row" type="button" onClick={() => setSelectedId(item.capability)} data-selected={selectedId === item.capability}>
              <span>{item.capability}</span>
              <RootCapabilityStatus status={item.status} />
              <em>{item.area}</em>
              <em>{item.engine ?? 'NO_ENGINE'}</em>
              <small>{item.lastCalibration}</small>
              <small>{item.confidence === null ? 'NO_CONFIDENCE' : item.confidence.toFixed(3)}</small>
            </button>
          ))}
        </div>
        <RootCapabilityInspector capability={selected} />
      </div>
    </section>
  );
}