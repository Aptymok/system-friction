import { NextRequest, NextResponse } from 'next/server';
import { buildScoreFrictionEvaluationContract } from '@/lib/scorefriction/evaluationContract';
import { buildScoreFrictionPredictionDraft } from '@/lib/scorefriction/predictionDraft';
import { evaluateScoreFrictionCase, evaluateScoreFrictionObservation } from '@/lib/scorefriction/store';
import type { ScoreFrictionSubstrateKind, ScoreFrictionTextSubtype } from '@/lib/scorefriction/substrateMatrix';

export const dynamic = 'force-dynamic';

const SUBSTRATES: ScoreFrictionSubstrateKind[] = [
  'text',
  'audio',
  'image',
  'video',
  'conversation',
  'document',
  'repository',
  'operation',
  'event',
  'world_domain',
  'multimodal',
];

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function substrateKind(value: unknown): ScoreFrictionSubstrateKind {
  const raw = stringValue(value)?.toLowerCase();
  return SUBSTRATES.includes(raw as ScoreFrictionSubstrateKind) ? raw as ScoreFrictionSubstrateKind : 'text';
}

function modalityList(value: unknown): ScoreFrictionSubstrateKind[] | null {
  if (!Array.isArray(value)) return null;
  const modalities = value
    .map((item) => substrateKind(item))
    .filter((item) => item !== 'multimodal');
  return modalities.length ? [...new Set(modalities)] : null;
}

function inferSubstrate(body: Record<string, unknown>): ScoreFrictionSubstrateKind {
  const declared = stringValue(body.substrate ?? body.substrate_kind ?? body.object_kind);
  if (declared) return substrateKind(declared);

  const evidenceType = stringValue(body.evidence_type)?.toLowerCase() ?? '';
  if (evidenceType.includes('audio')) return 'audio';
  if (evidenceType.includes('image')) return 'image';
  if (evidenceType.includes('video')) return 'video';
  if (evidenceType.includes('conversation')) return 'conversation';
  if (evidenceType.includes('repository') || evidenceType.includes('github')) return 'repository';
  if (evidenceType.includes('operation') || evidenceType.includes('moph')) return 'operation';
  if (evidenceType.includes('event')) return 'event';
  if (evidenceType.includes('world')) return 'world_domain';
  return 'text';
}

function buildContract(body: Record<string, unknown>) {
  const substrate = inferSubstrate(body);
  const subtype = stringValue(body.subtype ?? body.text_subtype ?? body.evidence_type) as ScoreFrictionTextSubtype | null;
  const modalities = substrate === 'multimodal' ? modalityList(body.modalities) ?? ['audio', 'text'] : modalityList(body.modalities);
  const confidence = typeof body.confidence === 'number' ? body.confidence : null;
  const notes = Array.isArray(body.notes) ? body.notes.filter((item): item is string => typeof item === 'string') : [];

  return buildScoreFrictionEvaluationContract({
    substrate,
    subtype,
    modalities,
    confidence,
    notes: ['generic_scorefriction_evaluate_endpoint', ...notes],
  });
}

export async function GET(request: NextRequest) {
  const caseId = request.nextUrl.searchParams.get('case_id');
  if (!caseId) return NextResponse.json({ error: 'case_id_required' }, { status: 400 });

  const result = await evaluateScoreFrictionCase(caseId);
  if (!result) return NextResponse.json({ error: 'case_not_found', case_id: caseId }, { status: 404 });

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = record(await request.json().catch(() => ({})));
  const rawPayload = record(body.raw_payload);
  const contract = buildContract(body);
  const predictionDraft = buildScoreFrictionPredictionDraft({
    contract,
    objectLabel: stringValue(body.object_label ?? body.title ?? body.case_id),
    declaredIntent: stringValue(body.declared_intent ?? body.observation_goal ?? body.intent),
    caseId: stringValue(body.case_id),
    scorefrictionObservationId: stringValue(body.observation_id),
    evidenceHash: stringValue(rawPayload.evidence_hash),
  });
  const result = await evaluateScoreFrictionObservation({
    ...body,
    raw_payload: {
      ...rawPayload,
      substrate_contract: contract,
      prediction_draft: predictionDraft,
    },
  });

  return NextResponse.json({
    ...result,
    substrate_contract: contract,
    prediction_draft: predictionDraft,
    prediction_persistence: 'draft_not_persisted',
    root_approval_required: true,
    warnings: [
      ...((result as { warnings?: string[] }).warnings ?? []),
      'prediction_draft_not_persisted',
      'root_approval_required_before_calibration',
    ],
  }, { status: result.ok ? 200 : 400 });
}
