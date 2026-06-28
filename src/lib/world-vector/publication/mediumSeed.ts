import { getWorldVectorToday } from '../readModel';
import { buildWorldVectorCycleCloseReport, buildWorldVectorPublicReport } from '../reportBuilder';
import type { WorldVectorPublicationDraft } from './types';

export async function buildMediumSeed(): Promise<WorldVectorPublicationDraft> {
  const today = await getWorldVectorToday();
  const base = today.cycle_day.isCycleClose
    ? buildWorldVectorCycleCloseReport({ observation: today.observation, cycleRange: today.cycle_range })
    : buildWorldVectorPublicReport({ observation: today.observation, cycleRange: today.cycle_range });
  const body = [
    `Title: ${base.title}`,
    `Subtitle: World Vector interpretation for ${today.cycle_day.sectorLabel}`,
    '',
    'Outline:',
    '1. What WorldSpect measured',
    '2. What World Vector interprets',
    '3. Dominant signal and evidence status',
    '4. Institutional meaning',
    '5. What remains unknown',
    '',
    'Seed:',
    base.body,
  ].join('\n');

  return {
    kind: 'medium_seed',
    title: base.title,
    body,
    source_report: base,
    warnings: today.observation.warnings,
    publication: {
      external_publish_performed: false,
      reason: 'manual_approval_required',
    },
  };
}
