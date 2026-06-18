import { NextRequest, NextResponse } from 'next/server';
import { appendAmvLearning } from '@/lib/amv/learning';
import { appendLogbookEntry } from '@/lib/logbook/query';
import { analyzeSfiLabInput } from '@/lib/sfi-psi/analyzer';
import { buildMediaPlan } from '@/lib/sfi-psi/campaign';
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
      mode: 'generate_assets',
      source: typeof body.source === 'string' ? body.source : 'scorefriction-lab-media-plan',
    });
  }
  const mediaPlan = buildMediaPlan(analysis);
  const render = body.generate === true
    ? await fetch(new URL('/api/scorefriction/media/render', request.url), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          case_id: analysis.analysisId,
          prompt: mediaPlan.imagePrompts[0] ?? mediaPlan.videoPrompts[0] ?? 'SFI-LAB media plan',
          assets: ['text', 'image', 'video'],
        }),
        cache: 'no-store',
      }).then((response) => response.json()).catch((error) => ({ ok: false, status: 'render_failed', error: error instanceof Error ? error.message : 'render_failed' }))
    : null;
  await appendAmvLearning({
    case_id: analysis.analysisId,
    source: 'scorefriction.lab.media_plan',
    event_type: 'media_plan',
    summary: 'SFI-LAB genero un media-plan y declaro proveedores/fallbacks.',
    payload: { mediaPlan, render },
  });
  await appendLogbookEntry({
    scope: 'scorefriction',
    visibility: 'root',
    case_id: analysis.analysisId,
    event_type: 'lab_media_plan',
    title: 'SFI-LAB media plan',
    summary: render ? `Media-plan con render ${String(render.status ?? render.ok)}` : 'Media-plan generado sin render binario.',
    payload: { mediaPlan, render },
  });
  return NextResponse.json({
    ok: true,
    analysisId: analysis.analysisId,
    mediaPlan,
    imagePrompts: mediaPlan.imagePrompts,
    videoPrompts: mediaPlan.videoPrompts,
    audioDirection: mediaPlan.audioDirection,
    shotList: mediaPlan.shotList,
    publishPlan: mediaPlan.publishPlan,
    render,
  });
}

