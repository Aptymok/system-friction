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
import type { ReducedMihmInput } from '../../../packages/mihm-core/src';

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
  const count = nodes.length;
  const missingValues = count - observedValues.length;
  const missingNti = count - observedNti.length;
  const warnings = [
    ...(count === 0 ? ['no_node_entries', 'empty_kernel_numeric_default_is_not_measurement'] : []),
    ...(missingValues ? ['value_missing_not_zero'] : []),
    ...(missingNti ? ['nti_missing_not_zero'] : []),
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
