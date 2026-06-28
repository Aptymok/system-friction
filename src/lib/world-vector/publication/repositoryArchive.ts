import { getWorldVectorToday } from '../readModel';
import { buildWorldVectorPublicReport } from '../reportBuilder';
import type { WorldVectorPublicationDraft } from './types';

export async function buildRepositoryArchiveEntry(): Promise<WorldVectorPublicationDraft> {
  const today = await getWorldVectorToday();
  const report = buildWorldVectorPublicReport({
    observation: today.observation,
    cycleRange: today.cycle_range,
  });
  const traceId = today.observation.source_snapshot_id ?? 'not_available';
  const body = [
    `# ${report.title}`,
    '',
    `- Cycle: ${today.cycle_range.cycle_start_date} to ${today.cycle_range.cycle_end_date}`,
    `- Sector: ${today.observation.sector}`,
    `- Dominant signal: ${today.observation.dominant_signal ?? 'not_available'}`,
    `- Confidence: ${today.observation.confidence}`,
    `- Internal trace id: ${traceId}`,
    '',
    '## Public Summary',
    report.body,
  ].join('\n');

  return {
    kind: 'repository_entry',
    title: `Repository entry - ${today.cycle_range.cycle_start_date}`,
    body,
    source_report: report,
    warnings: today.observation.warnings,
    publication: {
      external_publish_performed: false,
      reason: 'manual_approval_required',
    },
  };
}
