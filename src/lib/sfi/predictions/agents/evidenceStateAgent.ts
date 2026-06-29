import type { SfiPredictionEntry, SfiPredictionEvidenceAgentResult } from '../types';

function timeValue(value: string | null | undefined) {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

function parseFailure(value: string | null) {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (['false', 'no', '0', 'matched', 'confirmada', 'confirmed'].includes(normalized)) return false;
  if (['true', 'si', 'yes', '1', 'failed', 'fallo', 'falla'].includes(normalized)) return true;
  return null;
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

export function runEvidenceStateAgent(entry: SfiPredictionEntry): SfiPredictionEvidenceAgentResult {
  const registeredAt = timeValue(entry.prediction_registered_at);
  const perturbationAt = timeValue(entry.perturbation_applied_at);
  const predictionRegisteredBeforePerturbation = Boolean(
    registeredAt !== null && (perturbationAt === null || perturbationAt > registeredAt)
  );
  const failure = parseFailure(entry.fallo_hipotesis);
  const evidenceDegraded = entry.evidence_state === 'DEGRADED' || entry.estado_observacion === 'degraded';
  const warnings = [
    !predictionRegisteredBeforePerturbation ? 'retrospective_only_not_predictive_evidence' : null,
    entry.evidence_state === 'VERIFIED' && !hasReturnEvidence(entry) ? 'verified_without_return_evidence' : null,
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
    prediction_matched: failure === false ? true : null,
    prediction_failed: failure === true ? true : null,
    evidence_degraded: evidenceDegraded,
    requires_refinement: failure === true || evidenceDegraded || Boolean(entry.refinamiento),
    retrospective_only: !predictionRegisteredBeforePerturbation || !entry.is_predictive_evidence,
  };
}
