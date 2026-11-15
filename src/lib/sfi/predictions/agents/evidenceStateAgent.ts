import type { SfiPredictionEntry, SfiPredictionEvidenceAgentResult, SfiPredictionVerification } from '../types';
import { closedVerificationOutcome } from './closedVerificationOutcome';

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

  const outcome = closedVerificationOutcome(verifications);
  // A prediction can have distinct 72h, 7d, 30d and 90d results.
  // Do not infer an aggregate verdict from whichever database row was read first.
  const matched = outcome.verdict === null ? null : outcome.verdict === 'TRUE';
  const failed = outcome.verdict === null ? null : outcome.verdict === 'FALSE';

  const legacyNotePresentUnformalized = Boolean(entry.fallo_hipotesis?.trim()) && outcome.eligible.length === 0;
  const evidenceDegraded = entry.evidence_state === 'DEGRADED' || entry.estado_observacion === 'degraded';

  const warnings = [
    !predictionRegisteredBeforePerturbation ? 'retrospective_only_not_predictive_evidence' : null,
    entry.evidence_state === 'VERIFIED' && !hasReturnEvidence(entry) ? 'verified_without_return_evidence' : null,
    legacyNotePresentUnformalized ? 'legacy_fallo_hipotesis_present_requires_formal_verification' : null,
    outcome.mixedClosedResults ? 'conflicting_closed_verifications_across_windows' : null,
    outcome.disputed.length > 0 ? 'prediction_has_disputed_verifications' : null,
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