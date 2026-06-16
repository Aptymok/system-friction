import { NextRequest, NextResponse } from 'next/server';
import { analyzeSfiLabInput } from '@/lib/sfi-psi/analyzer';
import { buildMediaPlan } from '@/lib/sfi-psi/campaign';
import { buildSfiMediaRenderRuntime } from '@/lib/sfi/media/sfiMediaRenderRuntime';
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
      mode: 'generate_assets',
      source: typeof body.source === 'string' ? body.source : 'sfi-lab-media-plan',
    });
  }

  const mediaPlan = buildMediaPlan(analysis);
  const firstPrompt = mediaPlan.imagePrompts[0] ?? mediaPlan.videoPrompts[0] ?? 'SFI Lab media plan';
  const render = body.generate === true
    ? await buildSfiMediaRenderRuntime({
        provider: 'auto',
        video_provider: 'auto',
        case_id: analysis.analysisId,
        prompt: firstPrompt,
        request: { text: firstPrompt, provider: 'auto', video_provider: 'auto' },
        pipeline: {
          material: {
            title: analysis.campaign.title,
            body: analysis.campaign.hypothesis,
            image_prompt: firstPrompt,
            video_prompt: mediaPlan.videoPrompts[0],
          },
        },
      })
    : null;

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
