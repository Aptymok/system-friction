import { NextResponse } from 'next/server';
import { buildScoreFrictionDetectionState } from '@/lib/scorefriction/detectionState';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function params(req: Request) {
  const url = new URL(req.url);
  return {
    case_id: url.searchParams.get('case_id'),
    evidence_type: url.searchParams.get('evidence_type'),
    source_name: url.searchParams.get('source_name'),
    territory: url.searchParams.get('territory'),
    q: url.searchParams.get('q'),
    limit: Number(url.searchParams.get('limit') ?? 25),
  };
}

export async function GET(req: Request) {
  try {
    return NextResponse.json(await buildScoreFrictionDetectionState(params(req)));
  } catch (error) {
    return NextResponse.json({
      ok: false,
      generated_at: new Date().toISOString(),
      source: 'scorefriction_detection_state',
      error: error instanceof Error ? error.message : 'scorefriction_detect_failed',
    }, { status: 500 });
  }
}
