/**
 * MIHM foundation research-only observation audit.
 *
 * The reduced kernel currently converts missing node readings into numeric zero.
 * This module makes that loss of information explicit without changing canonical
 * MIHM methods, the legacy reduced-kernel calculation, or execution policy.
 *
 * Inputs are caller-provided readings, not invented observations. Results are
 * DERIVED diagnostics, not empirical homeostasis, Phi, RETURN or validation.
 */
import { computeReducedMihm, type ReducedMihmInput } from '../../../packages/mihm-core/src';

export type MihmObservationCoverage = {
  epistemicClass: 'DERIVED';
  scope: 'REDUCED_KERNEL_INPUT_AUDIT';
  nodeEntries: number;
  observedValues: number;
  missingValues: number;
  explicitZeroValues: number;
  observedNti: number;
  missingNti: number;
  explicitZeroNti: number;
  pairedObservedNodes: number;
  pairedCoverage: number | null;
  pairedValueMean: number | null;
  pairedNtiMean: number | null;
  jointReadiness: 'NO_PAIRED_MEASUREMENTS' | 'PARTIAL_PAIRED_MEASUREMENTS' | 'PAIRED_INPUTS_ONLY';
  valueCoverage: number | null;
  ntiCoverage: number | null;
  completeCaseValueMean: number | null;
  completeCaseNtiMean: number | null;
  zeroImputedValueMean: number | null;
  zeroImputedNtiMean: number | null;
  readiness: 'NO_MEASURED_NODES' | 'PARTIAL_MEASUREMENT' | 'MEASURED_INPUTS_ONLY';
  missingZeroConflationRisk: boolean;
  canonicalPhiCalculated: false;
  empiricalHomeostasisClaimed: false;
  warnings: string[];
};

function measured(values: Array<number | null>, field: string): number[] {
  for (const value of values) {
    if (value !== null && (!Number.isFinite(value) || value < 0 || value > 1)) {
      throw new RangeError('MIHM_OBSERVATION_INVALID_' + field);
    }
  }
  return values.filter((value): value is number => value !== null);
}

function mean(values: number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

export function assessMihmObservationCoverage(input: ReducedMihmInput): MihmObservationCoverage {
  const nodes = input.campo.nodes;
  const values = nodes.map((node) => node.value);
  const nti = nodes.map((node) => node.nti);
  const observedValues = measured(values, 'VALUE');
  const observedNti = measured(nti, 'NTI');
  // Marginal coverage can be nonzero for both dimensions while no single
  // node has both readings. Never treat that as joint measurement evidence.
  const paired = nodes.filter((node) => node.value !== null && node.nti !== null);
  const count = nodes.length;
  const missingValues = count - observedValues.length;
  const missingNti = count - observedNti.length;
  const warnings = [
    ...(count === 0 ? ['no_node_entries', 'empty_kernel_numeric_default_is_not_measurement'] : []),
    ...(missingValues ? ['value_missing_not_zero'] : []),
    ...(missingNti ? ['nti_missing_not_zero'] : []),
    ...(count > 0 && paired.length === 0 ? ['no_joint_value_nti_observation'] : []),
    ...(count > 0 && paired.length < count ? ['joint_measurement_coverage_incomplete'] : []),
    ...(input.campo.sourceState !== 'observed' ? ['campo_source_not_observed'] : []),
    ...(input.graph.sourceState !== 'observed' ? ['graph_source_not_observed'] : []),
    ...(nodes.some((node) => node.simulated) ? ['simulated_inputs_present'] : []),
    'node_entry_count_is_not_verified_unique_node_count',
    'graph_edge_weights_do_not_establish_provenance_or_viability',
  ];
  return {
    epistemicClass: 'DERIVED',
    scope: 'REDUCED_KERNEL_INPUT_AUDIT',
    nodeEntries: count,
    observedValues: observedValues.length,
    missingValues,
    explicitZeroValues: observedValues.filter((value) => value === 0).length,
    observedNti: observedNti.length,
    missingNti,
    explicitZeroNti: observedNti.filter((value) => value === 0).length,
    pairedObservedNodes: paired.length,
    pairedCoverage: count ? paired.length / count : null,
    pairedValueMean: mean(paired.map((node) => node.value as number)),
    pairedNtiMean: mean(paired.map((node) => node.nti as number)),
    jointReadiness: paired.length === 0
      ? 'NO_PAIRED_MEASUREMENTS'
      : paired.length < count
        ? 'PARTIAL_PAIRED_MEASUREMENTS'
        : 'PAIRED_INPUTS_ONLY',
    valueCoverage: count ? observedValues.length / count : null,
    ntiCoverage: count ? observedNti.length / count : null,
    completeCaseValueMean: mean(observedValues),
    completeCaseNtiMean: mean(observedNti),
    // The current reduced kernel averages null as zero; these are comparison
    // diagnostics only, not recommended imputation or corrected model outputs.
    zeroImputedValueMean: count ? observedValues.reduce((a, b) => a + b, 0) / count : null,
    zeroImputedNtiMean: count ? observedNti.reduce((a, b) => a + b, 0) / count : null,
    readiness: !observedValues.length || !observedNti.length
      ? 'NO_MEASURED_NODES'
      : missingValues || missingNti
        ? 'PARTIAL_MEASUREMENT'
        : 'MEASURED_INPUTS_ONLY',
    missingZeroConflationRisk: count === 0 || Boolean(missingValues || missingNti),
    canonicalPhiCalculated: false,
    empiricalHomeostasisClaimed: false,
    warnings,
  };
}


/**
 * Fail-closed research adapter: the historical reduced kernel is unchanged.
 *
 * Never produce a numeric diagnostic from absent, partially paired, simulated
 * or structurally inconsistent inputs. Even when numeric output is available,
 * it is a legacy REDUCED_KERNEL_CONTINUITY diagnostic, NOT an empirical
 * measurement of homeostasis, a canonical Phi, or an intervention decision.
 *
 * This is deliberately caller-owned and research-only until an approved
 * instrument route uses it. No source flag alone authenticates provenance.
 */
export type MihmGatedResearchReading = {
  epistemicClass: 'DERIVED';
  decision: 'ABSTAIN' | 'LEGACY_DIAGNOSTIC_ONLY';
  reasons: string[];
  coverage: MihmObservationCoverage;
  legacyDiagnostic: import('../../../packages/mihm-core/src').ReducedMihmResult | null;
  canonicalPhiCalculated: false;
  empiricalHomeostasisClaimed: false;
  sourceProvenanceVerified: false;
  realWorldInterventionAuthorized: false;
};

export function evaluateReducedMihmResearchInput(input: ReducedMihmInput): MihmGatedResearchReading {
  const coverage = assessMihmObservationCoverage(input);
  const reasons: string[] = [];
  if (coverage.nodeEntries === 0) reasons.push('NO_NODE_MEASUREMENTS');
  if (coverage.pairedCoverage !== 1) reasons.push('MISSING_OR_UNPAIRED_NODE_MEASUREMENTS');
  if (input.campo.sourceState !== 'observed') reasons.push('CAMPO_SOURCE_NOT_OBSERVED');
  if (input.graph.sourceState !== 'observed') reasons.push('GRAPH_SOURCE_NOT_OBSERVED');
  if (input.campo.nodes.some((node) => node.simulated)) reasons.push('SIMULATED_INPUTS_NOT_EMPIRICAL');
  if (input.graph.nodes.length !== coverage.nodeEntries) reasons.push('GRAPH_NODE_COUNT_MISMATCH');
  if (!input.observedAt || !Number.isFinite(Date.parse(input.observedAt))) reasons.push('OBSERVATION_TIMESTAMP_INVALID');
  if (!Number.isFinite(input.campo.confidence) || input.campo.confidence < 0 || input.campo.confidence > 1) {
    reasons.push('CAMPO_CONFIDENCE_INVALID');
  }
  if (input.campo.nodes.some((node) => !Number.isFinite(node.weight) || node.weight < 0 || node.weight > 1)) {
    reasons.push('NODE_WEIGHT_INVALID');
  }
  // This legacy numerical result has no empirical provenance or future T1
  // verification. An observed source flag is not a proof of observed-world truth.
  return {
    epistemicClass: 'DERIVED',
    decision: reasons.length ? 'ABSTAIN' : 'LEGACY_DIAGNOSTIC_ONLY',
    reasons,
    coverage,
    legacyDiagnostic: reasons.length ? null : computeReducedMihm(input),
    canonicalPhiCalculated: false,
    empiricalHomeostasisClaimed: false,
    sourceProvenanceVerified: false,
    realWorldInterventionAuthorized: false,
  };
}
