import type { StudioProductionState } from '@/lib/studio/production/studioProductionTypes';

export function StudioFooterTransport({ state }: { state: StudioProductionState }) {
  const hasObject = Boolean(state.activeObject.id);
  const analyzeHref = hasObject ? `/api/studio/objects/${state.activeObject.id}/analyze` : '/api/studio/production/state';

  return (
    <section className="sfi-production__transport">
      <div>
        <span>TRANSPORT</span>
        <strong>PLAY · PAUSE · STOP · +10S · {hasObject ? 'TIMELINE READY' : 'NO TIMELINE'}</strong>
      </div>
      <div>
        <span>ANALYSIS JOB</span>
        <a href={analyzeHref}>{state.activeObject.status.toUpperCase()}</a>
      </div>
      <div>
        <span>EXPORT</span>
        <a href="/api/studio/exports/build">BUILD PACKAGE</a>
      </div>
    </section>
  );
}
