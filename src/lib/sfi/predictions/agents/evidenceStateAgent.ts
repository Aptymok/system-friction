import type { SfiPredictionEntry, SfiPredictionEvidenceAgentResult, SfiPredictionVerification } from '../types';

function timeValue(value: string | null | undefined) {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

function hasReturnEvidence(entry: SfiPredictionEntry) {
  return Boolean(
    entry.resultado_72h
    || entry.resultado_7d
    || entry.resultado_30d
    || entry.resultado_90d
    || entry.ssp_observada
    || entry.friccion_respuesta_campo
  );
}

/**
 * DT-TRUTH-001 / R19:
 * prediction_matched / prediction_failed ya NO se derivan de fallo_hipotesis
 * por texto libre. Solo se derivan de una verificaciÃ³n formal CLOSED con
 * evaluation_result TRUE/FALSE.
 */
export function runEvidenceStateAgent(
  entry: SfiPredictionEntry,
  verifications: SfiPredictionVerification[] = [],
): SfiPredictionEvidenceAgentResult {
  const registeredAt = timeValue(entry.prediction_registered_at);
  const perturbationAt = timeValue(entry.perturbation_applied_at);
  const predictionRegisteredBeforePerturbation = Boolean(
    registeredAt !== null && (perturbationAt === null || perturbationAt > registeredAt)
  );

  const activeVerifications = verifications.filter((v) => v.verification_state !== 'SUPERSEDED');
  const closedResult = activeVerifications.find(
    (v) => v.verification_state === 'CLOSED' && (v.evaluation_result === 'TRUE' || v.evaluation_result === 'FALSE'),
  );

  const matched = closedResult ? closedResult.evaluation_result === 'TRUE' : null;
  const failed = closedResult ? closedResult.evaluation_result === 'FALSE' : null;

  const legacyNotePresentUnformalized = Boolean(entry.fallo_hipotesis?.trim()) && !closedResult;
  const evidenceDegraded = entry.evidence_state === 'DEGRADED' || entry.estado_observacion === 'degraded';

  const warnings = [
    !predictionRegisteredBeforePerturbation ? 'retrospective_only_not_predictive_evidence' : null,
    entry.evidence_state === 'VERIFIED' && !hasReturnEvidence(entry) ? 'verified_without_return_evidence' : null,
    legacyNotePresentUnformalized ? 'legacy_fallo_hipotesis_present_requires_formal_verification' : null,
  ].filter((item): item is string => Boolean(item));

  return {
    agent: 'evidenceStateAgent',
    mode: 'passive_deterministic',
    ok: true,
    hypothesis_id: entry.hypothesis_id,
    blocked: [],
    warnings,
    root_approval_required: true,
    prediction_registered_before_perturbation: predictionRegisteredBeforePerturbation,
    prediction_matched: matched,
    prediction_failed: failed,
    evidence_degraded: evidenceDegraded,
    requires_refinement: failed === true || evidenceDegraded || Boolean(entry.refinamiento),
    retrospective_only: !predictionRegisteredBeforePerturbation || !entry.is_predictive_evidence,
  };
}