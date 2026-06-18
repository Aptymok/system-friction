import { NextRequest, NextResponse } from 'next/server';
import { appendLogbookEntry } from '@/lib/logbook/query';
import { analyzeSfiLabInput } from '@/lib/sfi-psi/analyzer';
import { buildSfiLabReport } from '@/lib/sfi-psi/report';
import { getSfiLabAnalysis } from '@/lib/sfi-psi/store';
import type { SfiLabAnalysis } from '@/lib/sfi-psi/types';

export const dynamic = 'force-dynamic';

function isAnalysis(value: unknown): value is SfiLabAnalysis {
  return Boolean(value && typeof value === 'object' && (value as SfiLabAnalysis).ok === true && (value as SfiLabAnalysis).analysisId);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  let analysis: SfiLabAnalysis | null = isAnalysis(body.analysis) ? body.analysis : null;
  if (!analysis && typeof body.analysisId === 'string') analysis = await getSfiLabAnalysis(body.analysisId);
  if (!analysis) {
    analysis = analyzeSfiLabInput({
      text: typeof body.text === 'string' ? body.text : '',
      mode: 'generate_report',
      source: typeof body.source === 'string' ? body.source : 'scorefriction-lab-report',
      tags: Array.isArray(body.tags) ? body.tags.filter((tag): tag is string => typeof tag === 'string') : [],
    });
  }
  const report = buildSfiLabReport(analysis);
  await appendLogbookEntry({
    scope: 'scorefriction',
    visibility: 'root',
    case_id: analysis.analysisId,
    event_type: 'lab_report',
    title: 'SFI-LAB report',
    summary: 'Reporte SFI-LAB generado desde ScoreFriction.',
    payload: report,
  });
  return NextResponse.json({ ok: true, ...report });
}

