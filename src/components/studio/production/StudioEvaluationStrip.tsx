import type { StudioProductionState } from '@/lib/studio/production/studioProductionTypes';

function pct(value: number | null) {
  return value === null ? 'SIN DATO' : `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

export function StudioEvaluationStrip({ state }: { state: StudioProductionState }) {
  const items = [
    { label: 'OBJECT READINESS', value: state.activeObject.readiness.toUpperCase(), source: state.activeObject.id ?? 'NO_OBJECT' },
    { label: 'FEATURE LAYERS', value: String(state.objectFeatures.layers.length), source: state.objectFeatures.readiness },
    { label: 'PROJECT COHERENCE', value: pct(state.mihmReport.score), source: state.mihmReport.source },
    { label: 'HYPOTHESES', value: String(state.hypotheses?.hypotheses.length ?? 0), source: state.hypotheses ? 'hypothesisEngine' : 'BLOCKED' },
    { label: 'EVIDENCE TRACE', value: String(state.archive.evidenceTraceCount ?? 0), source: state.archive.integrity },
    { label: 'EXPORTS', value: String(state.exports.packages.length), source: state.exports.signoffReadiness },
  ];

  return (
    <footer className="sfi-production__evaluation-strip">
      {items.map((item) => (
        <div key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          <em>{item.source}</em>
        </div>
      ))}
    </footer>
  );
}
