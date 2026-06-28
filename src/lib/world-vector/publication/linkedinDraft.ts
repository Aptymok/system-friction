import { getWorldVectorToday } from '../readModel';
import { buildWorldVectorPublicReport } from '../reportBuilder';
import type { WorldVectorPublicationDraft } from './types';

export async function buildLinkedInDraft(): Promise<WorldVectorPublicationDraft> {
  const today = await getWorldVectorToday();
  const report = buildWorldVectorPublicReport({
    observation: today.observation,
    cycleRange: today.cycle_range,
  });
  const signal = today.observation.dominant_signal ?? 'señal todavía no dominante';
  const body = [
    `World Vector: ${today.cycle_day.sectorLabel}`,
    '',
    report.body.split('\n').filter(Boolean).slice(0, 6).join('\n'),
    '',
    `Señal dominante: ${signal}`,
    `Estado: ${today.observation.status}`,
    '',
    'Sin publicación automática. Requiere aprobación humana.',
  ].join('\n');

  return {
    kind: 'linkedin_draft',
    title: report.title,
    body,
    source_report: report,
    warnings: today.observation.warnings,
    publication: {
      external_publish_performed: false,
      reason: 'manual_approval_required',
    },
  };
}
