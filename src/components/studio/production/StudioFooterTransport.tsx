import type { StudioProductionState } from '@/lib/studio/production/studioProductionTypes';

export function StudioFooterTransport({ state }: { state: StudioProductionState }) {
  return (
    <section className="sfi-production__transport">
      <div>
        <span>FLOW</span>
        <strong>OBJECT - ANALYSIS - HYPOTHESIS - PMV - VALIDATION - ARCHIVE</strong>
      </div>
      <div>
        <span>ANALYSIS JOB</span>
        <a href={state.activeObject.id ? `/api/studio/objects/${state.activeObject.id}/analyze` : '/api/studio/production/state'}>
          {state.activeObject.status.toUpperCase()}
        </a>
      </div>
      <div>
        <span>EXPORT</span>
        <a href="/api/studio/exports/build">BUILD PACKAGE</a>
      </div>
    </section>
  );
}
