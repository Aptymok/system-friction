import { NextRequest, NextResponse } from 'next/server';
import { normalizeEvidenceInput, parseEvidenceUpload } from '@/lib/scorefriction/ingestion/parsers';
import { recordScoreFrictionObservation } from '@/lib/scorefriction/store';
import { isScoreFrictionEvidenceType, type ScoreFrictionEvidenceInput } from '@/lib/scorefriction/evidence-contract';

export const dynamic = 'force-dynamic';

async function ingestOne(input: ScoreFrictionEvidenceInput) {
  const result = await recordScoreFrictionObservation({
    case_id: input.case_id,
    source_name: input.source_name,
    source_url: input.source_url,
    territory: input.territory ?? 'MX',
    evidence_type: input.evidence_type,
    reliability_score: input.reliability_score ?? 0.5,
    provenance_notes: input.provenance_notes ?? null,
    raw_payload: input.raw_payload,
  });

  return result.ok
    ? {
      ok: true,
      observation_id: result.data.observation.id,
      evidence_hash: result.data.evidence_hash,
      vector_summary: result.data.vector.mihm_cultural_vector,
    }
    : result;
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') ?? '';
  const inputs: ScoreFrictionEvidenceInput[] = [];

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    const caseId = String(form.get('case_id') ?? '');
    if (!caseId) return NextResponse.json({ ok: false, error: 'case_id_required' }, { status: 400 });
    const sourceName = String(form.get('source_name') ?? 'manual_upload');
    const territory = String(form.get('territory') ?? 'MX');
    const reliability = Number(form.get('reliability_score') ?? 0.5);
    const provenance = String(form.get('provenance_notes') ?? '');
    const evidenceType = form.get('evidence_type');
    const files = form.getAll('file').filter((item): item is File => item instanceof File);

    for (const file of files) {
      const content = await file.text();
      inputs.push(...parseEvidenceUpload({
        case_id: caseId,
        source_name: sourceName,
        territory,
        fileName: file.name,
        content,
        evidence_type: isScoreFrictionEvidenceType(evidenceType) ? evidenceType : undefined,
        reliability_score: Number.isFinite(reliability) ? reliability : 0.5,
        provenance_notes: provenance || `operator upload: ${file.name}`,
      }));
    }
  } else {
    const body = await request.json().catch(() => null);
    const rows = Array.isArray(body) ? body : [body];
    for (const row of rows) {
      const normalized = normalizeEvidenceInput(row);
      if (normalized) inputs.push(normalized);
    }
  }

  const results = [];
  for (const input of inputs) {
    try {
      results.push(await ingestOne(input));
    } catch (error) {
      results.push({ ok: false, error: error instanceof Error ? error.message : 'scorefriction_ingest_failed' });
    }
  }

  const accepted = results.filter((result) => result.ok).length;
  const failed = results.length - accepted;

  return NextResponse.json({ ok: failed === 0, accepted, failed, results }, { status: accepted > 0 || failed === 0 ? 200 : 400 });
}
