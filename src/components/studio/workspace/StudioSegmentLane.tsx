'use client';

import type { CSSProperties } from 'react';
import type { StudioProductionState } from '@/lib/studio/production/studioProductionTypes';
import { useStudioWorkspaceStore } from '@/stores/studioWorkspaceStore';

export function StudioSegmentLane({ state }: { state: StudioProductionState }) {
  const setSelection = useStudioWorkspaceStore((store) => store.setSelection);
  const setActiveSegment = useStudioWorkspaceStore((store) => store.setActiveSegment);
  const duration = Number(state.metricValues.find((metric) => metric.key === 'duration_seconds')?.value ?? state.audioFeatures.energySegments.length);
  const segments = state.audioFeatures.energySegments.map((value, index) => ({
    id: `energy-${index}`,
    startSeconds: duration ? (index / state.audioFeatures.energySegments.length) * duration : index,
    endSeconds: duration ? ((index + 1) / state.audioFeatures.energySegments.length) * duration : index + 1,
    value,
  }));
  if (!segments.length) return <div className="studio-segment-lane is-empty">Sin segmentos temporales persistidos</div>;
  return (
    <div className="studio-segment-lane" aria-label="Energy segments">
      {segments.slice(0, 96).map((segment) => (
        <button
          key={segment.id}
          type="button"
          style={{ '--segment-level': String(Math.max(0.08, Math.min(1, segment.value))) } as CSSProperties}
          onClick={() => {
            setActiveSegment(segment.id);
            setSelection({ startSeconds: segment.startSeconds, endSeconds: segment.endSeconds });
          }}
          aria-label={`Select segment ${segment.id}`}
        />
      ))}
    </div>
  );
}
