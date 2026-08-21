import { NextRequest, NextResponse } from 'next/server';
import { recordScoreFrictionObservation } from '@/lib/scorefriction/store';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const result = await recordScoreFrictionObservation({
    case_id: body.case_id,
    source_name: body.source_name,
    source_url: body.source_url,
    territory: body.territory,
    evidence_type: body.evidence_type,
    reliability_score: body.reliability_score,
    provenance_notes: body.provenance_notes,
    source_coverage_contribution: body.source_coverage_contribution,
    raw_payload: body.raw_payload ?? {},
    vector_overrides: body.vector_overrides,
  });
  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}
