'use client';

import { useMemo, useState } from 'react';
import type { MetricValue, StudioProductionState } from '@/lib/studio/production/studioProductionTypes';
import { useStudioWorkspaceStore } from '@/stores/studioWorkspaceStore';
import { formatMetricValue, statusBucket, statusClass } from './workspaceModel';

type MatrixFilter = 'ALL' | 'OBSERVED' | 'DERIVED' | 'CALIBRATED' | 'BLOCKED';

function bucketForFilter(metric: MetricValue): MatrixFilter {
  if (metric.status === 'DERIVED') return 'DERIVED';
  if (metric.status === 'CALIBRATED') return 'CALIBRATED';
  if (statusBucket(metric.status) === 'BLOCKED' || statusBucket(metric.status) === 'FAILED') return 'BLOCKED';
  return 'OBSERVED';
}

function metricRows(state: StudioProductionState, filter: MatrixFilter, sortByConfidence: boolean) {
  const seen = new Set<string>();
  return state.metricValues
    .filter((metric) => {
      if (seen.has(metric.key)) return false;
      seen.add(metric.key);
      return filter === 'ALL' || bucketForFilter(metric) === filter;
    })
    .sort((left, right) => (
      sortByConfidence
        ? right.confidence - left.confidence || left.label.localeCompare(right.label)
        : statusBucket(left.status).localeCompare(statusBucket(right.status)) || left.label.localeCompare(right.label)
    ));
}

export function StudioEpistemicMatrix({ state }: { state: StudioProductionState }) {
  const setActiveMetric = useStudioWorkspaceStore((store) => store.setActiveMetric);
  const [filter, setFilter] = useState<MatrixFilter>('ALL');
  const [sortByConfidence, setSortByConfidence] = useState(false);
  const rows = useMemo(() => metricRows(state, filter, sortByConfidence).slice(0, 80), [filter, sortByConfidence, state]);
  return (
    <section className="studio-epistemic-matrix" aria-label="Epistemic metric matrix">
      <div className="studio-epistemic-matrix__controls" aria-label="Metric matrix controls">
        {(['ALL', 'OBSERVED', 'DERIVED', 'CALIBRATED', 'BLOCKED'] as MatrixFilter[]).map((item) => (
          <button key={item} type="button" onClick={() => setFilter(item)} aria-pressed={filter === item}>{item}</button>
        ))}
        <button type="button" onClick={() => setSortByConfidence(!sortByConfidence)} aria-pressed={sortByConfidence}>CONFIDENCE SORT</button>
      </div>
      <header>
        <span>OBSERVED</span>
        <span>DERIVED</span>
        <span>CALIBRATED</span>
        <span>BLOCKED</span>
      </header>
      <div role="table" aria-label="Metric status matrix">
        {rows.map((metric: MetricValue) => (
          <button key={metric.key} role="row" type="button" className={statusClass(metric.status)} onClick={() => setActiveMetric(metric.key)}>
            <span>{metric.label}</span>
            <strong>{formatMetricValue(metric)}</strong>
            <em>{metric.status}</em>
            <small>{metric.unit ?? 'NO_UNIT'}</small>
            <small>{metric.source ?? 'NO_SOURCE'}</small>
            <small>{metric.confidence.toFixed(3)}</small>
          </button>
        ))}
      </div>
    </section>
  );
}
