import type { CSSProperties } from 'react';
import type { StudioProductionState } from '@/lib/studio/production/studioProductionTypes';

export function StudioMihmField({ state }: { state: StudioProductionState }) {
  const dimensions: Array<{ name: string; value: number | null }> = [
    { name: 'INDIVIDUAL', value: state.mihmReport.individual },
    { name: 'GROUP', value: state.mihmReport.group },
    { name: 'INSTITUTIONAL', value: state.mihmReport.institutional },
    { name: 'SYSTEMIC', value: state.mihmReport.systemic },
    { name: 'CIVILIZATIONAL', value: state.mihmReport.civilizational },
  ];
  return (
    <section className="studio-mihm-field" aria-label="MIHM field">
      <header><span>MIHM FIELD</span><strong>{state.mihmReport.score === null ? 'PARTIAL / NO SCORE' : state.mihmReport.score.toFixed(3)}</strong></header>
      <div>
        {dimensions.map(({ name, value }, index) => {
          const angle = (index / dimensions.length) * Math.PI * 2;
          const radius = value === null ? 34 : 34 + Math.max(0, Math.min(1, value)) * 38;
          return (
            <span
              key={name}
              style={{ '--x': `${Math.cos(angle) * radius}px`, '--y': `${Math.sin(angle) * radius}px`, '--size': `${value === null ? 8 : 12 + Math.max(0, Math.min(1, value)) * 12}px` } as CSSProperties}
              data-empty={value === null}
              title={value === null ? `${name}: no value, not zero` : `${name}: ${value.toFixed(3)} · ${state.mihmReport.source}`}
            >
              {name}
            </span>
          );
        })}
      </div>
    </section>
  );
}
