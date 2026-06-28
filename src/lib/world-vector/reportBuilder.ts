import type { WorldVectorCycleRange, WorldVectorObservation, WorldVectorReport } from './types';

function percent(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'not_available';
  return `${Math.round(value * 100)}%`;
}

function topDomains(observation: WorldVectorObservation) {
  return observation.domain_values
    .slice(0, 5)
    .map((domain) => `${domain.domain}: value ${percent(domain.value)}, confidence ${percent(domain.confidence)}`)
    .join('\n');
}

function topSources(observation: WorldVectorObservation) {
  return observation.dominant_sources
    .slice(0, 5)
    .map((source) => `${source.domain}: ${source.label} (${percent(source.value)})`)
    .join('\n');
}

function publicStatus(status: WorldVectorObservation['status']) {
  if (status === 'observed') return 'observed';
  if (status === 'thin') return 'limited evidence';
  if (status === 'degraded') return 'degraded evidence';
  return 'not available';
}

export function buildWorldVectorInternalReport(input: {
  observation: WorldVectorObservation;
  cycleRange: WorldVectorCycleRange;
}): WorldVectorReport {
  const { observation, cycleRange } = input;
  const body = [
    'World Vector internal daily report',
    '',
    `Sector: ${observation.sector}`,
    `Day: ${observation.day_of_week}`,
    `Observed at: ${observation.observed_at ?? 'not_available'}`,
    `Status: ${observation.status}`,
    `Confidence: ${percent(observation.confidence)}`,
    `Source snapshot: ${observation.source_snapshot_id ?? 'not_available'}`,
    '',
    'Interpretation',
    observation.interpretation,
    '',
    'Dominant signal',
    observation.dominant_signal ?? 'not_available',
    '',
    'Domain values',
    topDomains(observation) || 'not_available',
    '',
    'Dominant sources',
    topSources(observation) || 'not_available',
    '',
    'Warnings',
    observation.warnings.length ? observation.warnings.join('\n') : 'none',
  ].join('\n');

  return {
    title: `World Vector internal daily - ${observation.day_of_week} - ${observation.sector}`,
    body,
    report_type: 'internal_daily',
    target_audience: 'founder',
    period_start: cycleRange.cycle_start_date,
    period_end: cycleRange.cycle_end_date,
    json_payload: { observation, cycleRange },
  };
}

export function buildWorldVectorPublicReport(input: {
  observation: WorldVectorObservation;
  cycleRange: WorldVectorCycleRange;
}): WorldVectorReport {
  const { observation, cycleRange } = input;
  const visibleDomains = observation.domain_values.slice(0, 3).map((domain) => domain.domain).join(', ') || 'not_available';
  const body = [
    'World Vector public weekly draft',
    '',
    `Current sector: ${observation.sector}`,
    `Evidence status: ${publicStatus(observation.status)}`,
    '',
    'Reading',
    observation.status === 'failed'
      ? 'World Vector does not have enough live evidence for a public reading today.'
      : observation.interpretation,
    '',
    'Visible domains',
    visibleDomains,
    '',
    'Note',
    'This is an interpretive report derived from WorldSpect measurements. It does not expose raw source payloads, private diagnostics, or Supabase internals.',
  ].join('\n');

  return {
    title: `World Vector public draft - ${cycleRange.cycle_start_date} to ${cycleRange.cycle_end_date}`,
    body,
    report_type: 'public_weekly',
    target_audience: 'linkedin',
    period_start: cycleRange.cycle_start_date,
    period_end: cycleRange.cycle_end_date,
    json_payload: {
      sector: observation.sector,
      day_of_week: observation.day_of_week,
      status: observation.status,
      confidence: observation.confidence,
      dominant_signal: observation.dominant_signal,
      visible_domains: observation.domain_values.slice(0, 3),
    },
  };
}

export function buildWorldVectorCycleCloseReport(input: {
  observation: WorldVectorObservation;
  cycleRange: WorldVectorCycleRange;
}): WorldVectorReport {
  const { observation, cycleRange } = input;
  const body = [
    'World Vector cycle close draft',
    '',
    `Period: ${cycleRange.cycle_start_date} to ${cycleRange.cycle_end_date}`,
    `Closing sector: ${observation.sector}`,
    `Status: ${observation.status}`,
    '',
    'Cycle read',
    observation.interpretation,
    '',
    'Dominant signal',
    observation.dominant_signal ?? 'not_available',
    '',
    'Closure condition',
    observation.status === 'failed'
      ? 'Cycle cannot be closed as reliable memory without a live WorldSpect snapshot.'
      : 'Cycle can be drafted as closed memory after founder review.',
  ].join('\n');

  return {
    title: `World Vector cycle close - ${cycleRange.cycle_start_date}`,
    body,
    report_type: 'cycle_close',
    target_audience: 'founder',
    period_start: cycleRange.cycle_start_date,
    period_end: cycleRange.cycle_end_date,
    json_payload: { observation, cycleRange },
  };
}
