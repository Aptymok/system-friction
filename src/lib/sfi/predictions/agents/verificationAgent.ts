import type {
  SfiPredictionEntry,
  SfiPredictionReturnWindow,
  SfiPredictionVerification,
  SfiPredictionVerificationAgentResult,
} from '../types';
import { SFI_PREDICTION_RETURN_WINDOWS } from '../types';
import { closedVerificationOutcome } from './closedVerificationOutcome';

function parseLegacyFalloHipotesisPresence(entry: SfiPredictionEntry): boolean {
  return typeof entry.fallo_hipotesis === 'string' && entry.fallo_hipotesis.trim().length > 0;
}

/**
 * Agente pasivo determinista: no inventa fuente, no cierra sin regla, no
 * publica. Solo agrega lo que ROOT ya registrÃ³ en sfi_prediction_verifications.
 */
export function runVerificationAgent(
  entry: SfiPredictionEntry,
  verifications: SfiPredictionVerification[] = [],
): SfiPredictionVerificationAgentResult {
  const outcome = closedVerificationOutcome(verifications);
  const { active, closed, disputed } = outcome;

  const coveredWindows = new Set(active.map((v) => v.return_window));
  const unformalizedWindows = SFI_PREDICTION_RETURN_WINDOWS.filter(
    (window) => !coveredWindows.has(window),
  ) as SfiPredictionReturnWindow[];

  // PFI must not inherit an arbitrary first-window verdict.

  const blocked = verifications.length === 0 && parseLegacyFalloHipotesisPresence(entry)
    ? ['legacy_result_present_but_not_formalized_as_verification']
    : [];

  return {
    agent: 'verificationAgent',
    mode: 'passive_deterministic',
    ok: true,
    hypothesis_id: entry.hypothesis_id,
    blocked,
    warnings: [
      ...(disputed.length > 0 ? ['prediction_has_disputed_verifications'] : []),
      ...(outcome.mixedClosedResults ? ['conflicting_closed_verifications_across_windows'] : []),
    ],
    root_approval_required: true,
    verifications: active,
    closed_count: closed.length,
    disputed_count: disputed.length,
    unformalized_windows: unformalizedWindows,
    pfi_eligible: outcome.verdict !== null,
    pfi_contribution: outcome.verdict,
    legacy_fallo_hipotesis_present_unformalized: parseLegacyFalloHipotesisPresence(entry) && outcome.eligible.length === 0,
  };
}