import type { CSSProperties } from 'react';
import type { StudioProductionState } from '@/lib/studio/production/studioProductionTypes';
import { statusClass } from './workspaceModel';

const dimensions = ['temporal', 'informational', 'institutional', 'economic', 'cultural', 'technological', 'regulatory', 'adaptive capacity'];

export function StudioFrictionField({ state }: { state: StudioProductionState }) {
  return (
    <section className="studio-friction-field" aria-label="Friction field">
      <header><span>FRICTION FIELD</span><strong>{state.systemState.toUpperCase()}</strong></header>
      <div>
        {dimensions.map((dimension, index) => {
          const metric = state.metricValues[index % Math.max(1, state.metricValues.length)];
          const confidence = metric?.confidence ?? 0;
          return (
            <span key={dimension} className={statusClass(metric?.status ?? 'MISSING')} style={{ '--weight': `${2 + confidence * 10}px`, '--alpha': String(0.22 + confidence * 0.68) } as CSSProperties}>
              {dimension}
              <em>{metric?.status ?? 'MISSING'}</em>
            </span>
          );
        })}
      </div>
    </section>
  );
}
