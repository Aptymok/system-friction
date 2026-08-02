import type { CSSProperties } from 'react';
import type { StudioProductionState } from '@/lib/studio/production/studioProductionTypes';

const variables = ['IHG', 'NTI', 'LDI', 'Phi', 'F_s', 'C_field', 'D_cog', 'E_r', 'V_i', 'I_mc', 'R_sem', 'C_sem'];

export function StudioMihmField({ state }: { state: StudioProductionState }) {
  const values: Record<string, number | null> = {
    IHG: state.mihmReport.individual,
    NTI: state.mihmReport.group,
    LDI: state.mihmReport.institutional,
    Phi: state.metricValues.find((metric) => metric.key.toLowerCase() === 'phi')?.value as number | null ?? null,
    F_s: state.mihmReport.systemic,
    C_field: state.mihmReport.civilizational,
    D_cog: null,
    E_r: null,
    V_i: null,
    I_mc: state.metricValues.find((metric) => metric.key === 'stereo_width')?.value as number | null ?? null,
    R_sem: null,
    C_sem: null,
  };
  return (
    <section className="studio-mihm-field" aria-label="MIHM field">
      <header><span>MIHM FIELD</span><strong>{state.mihmReport.score === null ? 'PARTIAL' : state.mihmReport.score.toFixed(3)}</strong></header>
      <div>
        {variables.map((name, index) => {
          const value = values[name];
          const angle = (index / variables.length) * Math.PI * 2;
          const radius = value === null ? 34 : 34 + value * 38;
          return (
            <span
              key={name}
              style={{ '--x': `${Math.cos(angle) * radius}px`, '--y': `${Math.sin(angle) * radius}px`, '--size': `${value === null ? 8 : 12 + value * 12}px` } as CSSProperties}
              data-empty={value === null}
              title={value === null ? `${name}: no value, not zero` : `${name}: ${value.toFixed(3)}`}
            >
              {name}
            </span>
          );
        })}
      </div>
    </section>
  );
}
