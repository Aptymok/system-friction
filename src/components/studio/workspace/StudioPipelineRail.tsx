'use client';

import type { StudioProductionState } from '@/lib/studio/production/studioProductionTypes';
import { useStudioWorkspaceStore } from '@/stores/studioWorkspaceStore';
import { STUDIO_PIPELINE_STAGES, metricByKey, statusClass } from './workspaceModel';

export function StudioPipelineRail({ state }: { state: StudioProductionState }) {
  const setActiveMetric = useStudioWorkspaceStore((store) => store.setActiveMetric);
  return (
    <nav className="studio-pipeline-rail" aria-label="Studio pipeline stages">
      {STUDIO_PIPELINE_STAGES.map((stage, index) => {
        const metric = metricByKey(state, stage.metric);
        const status = metric?.status ?? (stage.metric.includes('.') ? 'CAPABILITY_MISSING' : 'MISSING');
        const canRetry = ['FAILED', 'INSUFFICIENT_SIGNAL'].includes(status);
        return (
          <button key={stage.key} type="button" className={statusClass(status)} onClick={() => setActiveMetric(metric?.key ?? null)}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <strong>{stage.key}</strong>
            <em>{status}</em>
            <small>{metric ? `confidence ${metric.confidence.toFixed(3)}` : 'NO_OUTPUT'}</small>
            <small>{canRetry ? 'RETRY_ALLOWED_AFTER_INPUT_CHECK' : status === 'CAPABILITY_MISSING' ? 'IMPLEMENTATION_REQUIRED' : 'INSPECT_TRACE'}</small>
          </button>
        );
      })}
    </nav>
  );
}
