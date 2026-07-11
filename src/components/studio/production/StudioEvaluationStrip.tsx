import type { MetricValue, StudioProductionState } from '@/lib/studio/production/studioProductionTypes';
import { StudioObjectSynthesisPanel } from './StudioObjectSynthesisPanel';

function value(metric: MetricValue | null) {
  if (!metric || metric.value === null) return 'SIN DATO';
  if (typeof metric.value === 'number') return String(Number(metric.value.toFixed(3)));
  return metric.value;
}

export function StudioEvaluationStrip({ state }: { state: StudioProductionState }) {
  const pick = (key: string) => state.metricValues.find((item) => item.key === key) ?? null;
  const items = [
    pick('active_object'),
    pick('storage_verified'),
    pick('feature_coverage'),
    pick('mihm_activation'),
    pick('cultural_resonance'),
    {
      key: 'exports',
      label: 'Exports',
      value: String(state.exports.packages.length),
      unit: null,
      status: state.exports.packages.length ? 'OBSERVED' as const : 'MISSING' as const,
      source: 'studio_exports',
      evidenceIds: state.exports.packages.map((item) => item.id),
      confidence: state.exports.packages.length ? 1 : 0,
      observedAt: null,
      formulaVersion: null,
      warnings: state.exports.packages.length ? [] : ['EXPORT_GENERATOR_NOT_CONNECTED'],
      explanation: 'Count of persisted export rows.',
    },
  ];

  return (
    <>
      <StudioObjectSynthesisPanel objectId={state.activeObject.id} />
      <footer className="sfi-production__evaluation-strip">
        {items.map((item) => (
          <div key={item?.key ?? 'missing'}>
            <span>{item?.label ?? 'MISSING'}</span>
            <strong>{value(item)}</strong>
            <em>{item ? `${item.status} / ${item.source ?? 'NO_SOURCE'} / ${item.status === 'MISSING' || item.source === null ? 'UNKNOWN' : Number(item.confidence.toFixed(2))}` : 'MISSING'}</em>
          </div>
        ))}
      </footer>
    </>
  );
}
