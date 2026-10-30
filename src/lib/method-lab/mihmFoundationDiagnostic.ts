import { computeReducedMihm, type ReducedMihmInput } from '../../../packages/mihm-core/src';
import { evaluateReducedMihmResearchInput } from '../mihm/foundationObservationCoverage';

/**
 * G1 synthetic missingness contrast. Pure and repeatable.
 * No external evidence or observed-world event is generated from these fixtures.
 */
export function evaluateMihmFoundationMissingness() {
  const base: ReducedMihmInput = {
    observedAt: '2026-10-11T00:00:00.000Z',
    campo: {
      confidence: 0.9,
      sourceState: 'observed', // Deliberate stress case: aggregate source flag cannot certify every node field.
      nodes: [
        { type: 'node-a', weight: 0.8, value: 0.8, nti: 0.2, simulated: true },
        { type: 'node-b', weight: 0.7, value: 0.6, nti: 0.4, simulated: true },
        { type: 'node-c', weight: 0.6, value: null, nti: null, simulated: true },
      ],
    },
    graph: { sourceState: 'observed', nodes: ['node-a', 'node-b', 'node-c'], edges: [{ weight: 0.5 }, { weight: 0.5 }] },
  };
  const copy = (value: ReducedMihmInput): ReducedMihmInput => structuredClone(value);
  const explicitZero = copy(base);
  explicitZero.campo.nodes[2].value = 0;
  explicitZero.campo.nodes[2].nti = 0;
  const highValue = copy(base);
  highValue.campo.nodes[2].value = 1;
  highValue.campo.nodes[2].nti = 1;
  const noNodes = copy(base);
  noNodes.campo.nodes = [];
  const nullResult = computeReducedMihm(base);
  const zeroResult = computeReducedMihm(explicitZero);
  const highResult = computeReducedMihm(highValue);
  const emptyResult = computeReducedMihm(noNodes);
  // G1 keeps the old computation unchanged, but exercises the gated research
  // candidate on exactly the same synthetic fixtures. Neither is empirical.
  const guardNull = evaluateReducedMihmResearchInput(base);
  const guardMeasuredZero = evaluateReducedMihmResearchInput(explicitZero);
  const guardEmpty = evaluateReducedMihmResearchInput(noNodes);
  const comparable = (value: typeof nullResult) => ({
    regime: value.regime, vector: value.vector, confidence: value.confidence,
    warnings: value.warnings, degradation: value.degradation, operationalCapacity: value.operationalCapacity,
  });
  const equality = JSON.stringify(comparable(nullResult)) === JSON.stringify(comparable(zeroResult));
  const coverage = base.campo.nodes.filter((node) => node.value !== null).length / base.campo.nodes.length;
  const avgWithNullAsZero = base.campo.nodes.reduce((a, n) => a + (n.value ?? 0), 0) / base.campo.nodes.length;
  const avgOnlyObserved = base.campo.nodes.filter((n) => n.value !== null).reduce((a, n) => a + (n.value as number), 0) / (base.campo.nodes.filter((n) => n.value !== null).length);
  return {
    experiment: 'SFI-MIHM-FOUNDATION-G1-MISSINGNESS',
    epistemicClass: 'SIMULATED' as const,
    validationLevel: 'SIMULATION' as const,
    source: 'CONTROLLED_SYNTHETIC_FIXTURE' as const,
    measuredSystemClaim: false as const,
    observations: {
      nullVsZeroIdentical: equality,
      nullInputsExplicitlyWarned: nullResult.warnings.some((w) => /null|missing|incomplete/i.test(w)),
      measuredCoverage: coverage,
      meanZeroImputed: avgWithNullAsZero,
      meanAvailableCase: avgOnlyObserved,
      noNodesProducesNumericContinuity: Number.isFinite(emptyResult.vector.continuity),
      controlNumericPerturbationChangesOutput: JSON.stringify(comparable(nullResult)) !== JSON.stringify(comparable(highResult)),
      guardedMissingAbstains: guardNull.decision === 'ABSTAIN' && guardNull.legacyDiagnostic === null,
      guardedSyntheticZeroAbstains: guardMeasuredZero.decision === 'ABSTAIN' && guardMeasuredZero.legacyDiagnostic === null,
      guardedEmptyAbstains: guardEmpty.decision === 'ABSTAIN' && guardEmpty.legacyDiagnostic === null,
    },
    outputs: {
      null: comparable(nullResult),
      explicitZero: comparable(zeroResult),
      highValue: comparable(highResult),
      noNodes: comparable(emptyResult),
      gatedResearchCandidate: {
        missing: { decision: guardNull.decision, reasons: guardNull.reasons, pairedCoverage: guardNull.coverage.pairedCoverage },
        measuredZeroSynthetic: { decision: guardMeasuredZero.decision, reasons: guardMeasuredZero.reasons, pairedCoverage: guardMeasuredZero.coverage.pairedCoverage },
        empty: { decision: guardEmpty.decision, reasons: guardEmpty.reasons, pairedCoverage: guardEmpty.coverage.pairedCoverage },
        sourceProvenanceVerified: false,
        canonicalPhiCalculated: false,
        realWorldInterventionAuthorized: false,
      },
    },
    interpretation: equality
      ? 'Null and explicit zero are observationally indistinguishable in this reduced computation. This does not prove that the actual system state is zero.'
      : 'Null and explicit zero generated different reduced outputs; investigate whether warning and coverage semantics are correct.',
    decision: 'ABSTAIN_FROM_EMPIRICAL_HOMEOSTASIS_CLAIM' as const,
    limitations: [
      'All node scores are controlled synthetic inputs.',
      'No real-world homeostasis, intervention, or external return was measured.',
      'The reduced continuity metric is not canonical Phi.',
      'The candidate abstention guard is research-only and all fixtures are simulated. Its presence does not change deployed kernel callers.',
      'A null/zero diagnostic alone does not establish predictive performance, cross-node gain or causal identification.',
    ],
  };
}
