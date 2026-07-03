import { NextResponse } from 'next/server';
import { requireRootActor, auditRootAction } from '@/lib/root/server';
import { createPredictionEntry } from '@/lib/sfi/predictions/service';
import type { ScoreFrictionPredictionDraft } from '@/lib/scorefriction/predictionDraft';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function requireRoot(action: string) {
  try {
    return await requireRootActor(action);
  } catch (error) {
    return {
      ok: false as const,
      status: 503,
      body: {
        ok: false,
        error: 'root_auth_unavailable',
        details: error instanceof Error ? error.message : 'unknown_root_auth_error',
      },
    };
  }
}

function isValidDraft(value: unknown): value is ScoreFrictionPredictionDraft {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Partial<ScoreFrictionPredictionDraft>;
  return (
    typeof draft.hypothesis_id === 'string'
    && typeof draft.statement === 'string'
    && typeof draft.prediction === 'string'
    && typeof draft.verification_window === 'string'
    && typeof draft.expected_change === 'string'
    && typeof draft.falsification_condition === 'string'
    && draft.persistence === 'draft_not_persisted'
    && typeof draft.substrate_kind === 'string'
    && Array.isArray(draft.metrics)
    && Array.isArray(draft.indices)
    && Array.isArray(draft.domains)
  );
}

export async function POST(request: Request) {
  const gate = await requireRoot('sfi.predictions.approve_scorefriction_draft');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, error: 'invalid_json_body' }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const draft = record.draft;

  if (!isValidDraft(draft)) {
    return NextResponse.json(
      { ok: false, error: 'invalid_or_missing_prediction_draft', hint: 'pass the exact object returned by /api/scorefriction/evaluate as draft' },
      { status: 400 },
    );
  }

  const probabilidad = record.probabilidad_estimativa;
  if (typeof probabilidad !== 'number' || probabilidad < 0 || probabilidad > 1) {
    return NextResponse.json(
      { ok: false, error: 'probabilidad_estimativa_required', hint: 'a human must declare a 0-1 probability; it is never inferred silently from the contract' },
      { status: 400 },
    );
  }

  if (!draft.case_id) {
    return NextResponse.json(
      { ok: false, error: 'draft_missing_case_id', hint: 'regenerate the draft through /api/scorefriction/evaluate with case_id in the body' },
      { status: 422 },
    );
  }

  const result = await createPredictionEntry({
    case_id: draft.case_id,
    hypothesis_id: draft.hypothesis_id,
    fenotipo_estimado: draft.statement,
    ep_estado_inicial: typeof record.ep_estado_inicial === 'string'
      ? record.ep_estado_inicial
      : `substrate=${draft.substrate_kind}; domains=${draft.domains.join(',') || 'none'}; indices=${draft.indices.join(',') || 'none'}`,
    ssp_esperada: draft.expected_change,
    perturbacion_tipo: 'scorefriction_substrate_evaluation',
    perturbacion_aplicada: typeof record.perturbacion_aplicada === 'string'
      ? record.perturbacion_aplicada
      : draft.prediction,
    prediccion_explicita: draft.prediction,
    probabilidad_estimativa: probabilidad,
    operator_mode: typeof record.operator_mode === 'string' ? record.operator_mode : 'scorefriction_root_approval',
    created_by: gate.ctx.user.id,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error, details: 'details' in result ? result.details : undefined }, { status: 400 });
  }

  await auditRootAction({
    actorId: gate.ctx.user.id,
    action: 'sfi.predictions.approve_scorefriction_draft',
    target: result.data.id,
    payload: {
      hypothesis_id: draft.hypothesis_id,
      case_id: draft.case_id,
      scorefriction_observation_id: draft.scorefriction_observation_id,
      evidence_hash: draft.evidence_hash,
      substrate_kind: draft.substrate_kind,
      verification_window: draft.verification_window,
      probabilidad_estimativa: probabilidad,
    },
    request,
  });

  return NextResponse.json({
    ok: true,
    prediction_entry: result.data,
    persistence: 'persisted',
    source: 'scorefriction_draft_approved_by_root',
  });
}
