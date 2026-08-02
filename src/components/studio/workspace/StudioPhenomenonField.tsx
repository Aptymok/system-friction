import { EntityLink } from '@/components/entity/EntityLink';
import type { StudioProductionState } from '@/lib/studio/production/studioProductionTypes';

export function StudioPhenomenonField({ state }: { state: StudioProductionState }) {
  const phenomenonMetrics = state.metricValues.filter((metric) => metric.key.includes('phenomen') || metric.label.includes('PHENOMEN'));
  return (
    <section className="studio-phenomenon-field" aria-label="Phenomenon field">
      <header><span>PHENOMENON</span><strong>{phenomenonMetrics.length ? 'DERIVED' : 'PARTIAL'}</strong></header>
      {phenomenonMetrics.length ? (
        <ul>
          {phenomenonMetrics.map((metric) => <li key={metric.key}>{metric.label}<em>{metric.status}</em></li>)}
        </ul>
      ) : (
        <p>No hay fenomeno institucional persistido enlazado a este objeto.</p>
      )}
      {state.activeObject.id ? <EntityLink entityId={state.activeObject.id} entityType="EVIDENCE" label="Open active object context" compact /> : null}
    </section>
  );
}
