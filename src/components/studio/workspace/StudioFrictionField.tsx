import type { CSSProperties } from 'react';
import type { StudioProductionState } from '@/lib/studio/production/studioProductionTypes';
import { statusClass } from './workspaceModel';

const FRICTION_KEYS = /friction|constraint|latency|dependency|contradiction|failure/i;

export function StudioFrictionField({ state }: { state: StudioProductionState }) {
  const frictionMetrics = state.metricValues.filter((metric) => FRICTION_KEYS.test(`${metric.key} ${metric.label}`));
  return (
    <section className="studio-friction-field" aria-label="Friction field">
      <header><span>FRICTION FIELD</span><strong>{frictionMetrics.length ? state.systemState.toUpperCase() : 'NO VALUE'}</strong></header>
      <div>
        {frictionMetrics.length ? frictionMetrics.slice(0, 12).map((metric) => {
          const confidence = Number.isFinite(metric.confidence) ? metric.confidence : 0;
          return (
            <span key={metric.key} className={statusClass(metric.status)} style={{ '--weight': `${2 + confidence * 10}px`, '--alpha': String(0.22 + confidence * 0.68) } as CSSProperties}>
              {metric.label}
              <em>{metric.status}</em>
            </span>
          );
        }) : <span className={statusClass('MISSING')} style={{ '--weight': '2px', '--alpha': '.36' } as CSSProperties}>NO GROUNDED FRICTION METRIC<em>MISSING</em></span>}
      </div>
    </section>
  );
}
