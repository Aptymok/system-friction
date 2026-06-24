import { NextRequest, NextResponse } from 'next/server';
import { buildSfiEvidenceRequirements } from '@/lib/sfi/evidenceRequirements';

export const dynamic = 'force-dynamic';

const ROUTE = '/api/sfi/evidence-requirements';
const DEFAULT_CASE_ID = 'SFI-OPS-001';

export async function GET(request: NextRequest) {
  const proposalId = request.nextUrl.searchParams.get('proposal_id');
  const caseId = request.nextUrl.searchParams.get('case_id') ?? DEFAULT_CASE_ID;

  try {
    return NextResponse.json({
      ok: true,
      route: ROUTE,
      data: await buildSfiEvidenceRequirements({ proposalId, caseId }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'sfi_evidence_requirements_failed';
    return NextResponse.json({
      ok: false,
      route: ROUTE,
      error: message,
      data: {
        ok: false,
        generated_at: new Date().toISOString(),
        source: 'sfi_evidence_requirements',
        case_id: caseId,
        degraded: true,
        degraded_sources: [{ source: 'sfi_evidence_requirements_route', error: message }],
        current_response: {
          decision: 'unavailable',
          blocking_condition: null,
          target_id: proposalId,
          external_execution_allowed: false,
        },
        items: [],
      },
    });
  }
}
