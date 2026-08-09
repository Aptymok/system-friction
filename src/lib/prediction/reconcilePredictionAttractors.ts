import 'server-only';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

type Row = Record<string, unknown>;

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}
function number01(value: unknown, fallback = 0.35) {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const normalized = parsed > 1 ? parsed / 100 : parsed;
  return Math.max(0, Math.min(1, normalized));
}
function strings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())) : [];
}
function originFor(row: Row) {
  const scope = text(row.scope).toLowerCase();
  const subjectType = text(row.subject_type).toLowerCase();
  if (scope.includes('world') || scope.includes('field') || scope.includes('map') || subjectType.includes('world') || subjectType.includes('field') || subjectType.includes('map')) {
    return 'SFI_AUTONOMOUS_OBSERVATION';
  }
  if (!row.created_by && !row.owner_id) return 'SFI_AUTONOMOUS_OR_UNATTRIBUTED';
  return 'REQUESTED_OR_ACTOR_INITIATED';
}

export async function reconcilePredictionAttractors() {
  const service = createServiceSupabaseClient();
  const [runs, legacy] = await Promise.all([
    service.from('sfi_predictive_runs')
      .select('id,scope,subject_type,subject_id,target_key,target_kind,status,prediction,confidence,evidence_refs,verification_rule,created_by,owner_id,created_at,updated_at')
      .order('created_at', { ascending: false })
      .limit(250),
    service.from('sfi_prediction_entries')
      .select('id,hypothesis_id,case_id,case_label,prediccion_explicita,probabilidad_estimativa,fenotipo_estimado,evidence_state,estado_observacion,prediction_registered_at,created_at,updated_at')
      .order('created_at', { ascending: false })
      .limit(250),
  ]);

  const warnings = [runs.error?.message, legacy.error?.message].filter((item): item is string => Boolean(item));
  const candidates = [
    ...(runs.data ?? []).map((row: Row) => ({
      id: text(row.id),
      label: text(row.prediction, text(row.target_key, 'Hipótesis predictiva')).slice(0, 180),
      confidence: number01(row.confidence),
      evidenceRefs: strings(row.evidence_refs),
      createdAt: text(row.created_at ?? row.updated_at, new Date().toISOString()),
      prediction: text(row.prediction),
      hypothesisId: null as string | null,
      verificationRule: text(row.verification_rule),
      subjectId: text(row.subject_id),
      targetKey: text(row.target_key),
      origin: originFor(row),
      status: text(row.status, 'OPEN'),
    })),
    ...(legacy.data ?? []).map((row: Row) => ({
      id: text(row.id),
      label: text(row.prediccion_explicita, text(row.case_label, 'Hipótesis legacy')).slice(0, 180),
      confidence: number01(row.probabilidad_estimativa),
      evidenceRefs: [] as string[],
      createdAt: text(row.prediction_registered_at ?? row.created_at, new Date().toISOString()),
      prediction: text(row.prediccion_explicita),
      hypothesisId: text(row.hypothesis_id) || null,
      verificationRule: '',
      subjectId: text(row.case_id),
      targetKey: text(row.fenotipo_estimado),
      origin: 'LEGACY_REGISTRY',
      status: text(row.estado_observacion ?? row.evidence_state, 'WAITING_EVIDENCE'),
    })),
  ].filter((item) => item.id);

  let reconciled = 0;
  for (const candidate of candidates) {
    const key = `prediction-attractor:${candidate.id}`;
    const payload = {
      predictionRunId: candidate.hypothesisId ? null : candidate.id,
      legacyPredictionEntryId: candidate.hypothesisId ? candidate.id : null,
      hypothesisId: candidate.hypothesisId,
      prediction: candidate.prediction,
      origin: candidate.origin,
      evidenceRefs: candidate.evidenceRefs,
      verificationRule: candidate.verificationRule || null,
      subjectId: candidate.subjectId || null,
      targetKey: candidate.targetKey || null,
      predictionStatus: candidate.status,
      declaredAt: candidate.createdAt,
      relationSemantics: 'The attractor is the declared direction/target associated with the prediction. It does not prove that the prediction is correct.',
    };
    const write = await service.from('sfi_attractors').upsert({
      attractor_key: key,
      label: candidate.label || `Attractor · ${candidate.id}`,
      module: 'predictive',
      owner_node_key: `prediction:${candidate.id}`,
      attractor_type: 'predictive',
      confidence: candidate.confidence,
      persistence: 0,
      trust: candidate.confidence,
      weight: candidate.confidence,
      evidence_count: candidate.evidenceRefs.length,
      status: 'declared',
      vector: payload,
      first_seen: candidate.createdAt,
      last_seen: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'attractor_key' });
    if (write.error) warnings.push(`${key}:${write.error.message}`);
    else reconciled += 1;
  }

  return { ok: warnings.length === 0, reconciled, warnings: [...new Set(warnings)] };
}
