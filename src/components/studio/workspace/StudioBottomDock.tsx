import type { StudioProductionState } from '@/lib/studio/production/studioProductionTypes';

export function StudioBottomDock({ state }: { state: StudioProductionState }) {
  const limitations = [
    ...state.provenance.limits,
    ...state.metricValues.flatMap((metric) => metric.warnings),
    ...state.degradedSources,
  ].filter((item, index, all) => item && all.indexOf(item) === index).slice(0, 12);
  return (
    <footer className="studio-bottom-dock" aria-label="Limitations and trace">
      <strong>LIMITATIONS</strong>
      {limitations.length ? limitations.map((item) => <span key={item}>{item}</span>) : <span>NO_REPORTED_LIMITATIONS</span>}
    </footer>
  );
}
