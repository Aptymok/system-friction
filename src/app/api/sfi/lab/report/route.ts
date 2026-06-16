import { NextRequest, NextResponse } from 'next/server';
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

  if (!analysis && typeof body.analysisId === 'string') {
    analysis = await getSfiLabAnalysis(body.analysisId);
  }

  if (!analysis) {
    analysis = analyzeSfiLabInput({
      text: typeof body.text === 'string' ? body.text : '',
      mode: 'generate_report',
      source: typeof body.source === 'string' ? body.source : 'sfi-lab-report',
      tags: Array.isArray(body.tags) ? body.tags.filter((tag): tag is string => typeof tag === 'string') : [],
    });
  }

  const report = buildSfiLabReport(analysis);
  return NextResponse.json({ ok: true, ...report });
}
