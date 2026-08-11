export const FOUNDER_EDITION_SOURCE = {
  title: 'Instrumentalización de una Mente Fragmentada',
  subtitle: 'Del conocimiento tácito a una arquitectura observable',
  edition: 'The Founder Edition v1.2 FINAL',
  institution: 'System Friction Institute',
  date: '2026-08',
  role: 'AUXILIARY_METHOD_SOURCE',
  boundary: 'Method cards guide laboratory procedure; their use is not evidence that the method itself is validated.',
};

export const SFI_METHODS = [
  { id: 'MIHM_BASELINE', status: 'CANON', family: 'MIHM v3', purpose: 'Build a sufficiently traceable state configuration without treating an aggregate as the whole system.', operations: ['identify object/domain', 'declare resolution/nodes/context', 'validate source integrity', 'preserve missingness', 'version the vector', 'set re-observation window'] },
  { id: 'WSV_CONTEXT', status: 'STABLE', family: 'World Spectrum Vector', purpose: 'Build a contextual baseline while preserving provenance and dependency between sources.', operations: ['declare question', 'set contextual scope', 'select justified sources', 'record source dependence', 'capture weak signals', 'classify epistemic state'] },
  { id: 'DIOL_RETROLONGITUDINAL', status: 'STABLE', family: 'DIOL-SF v2', purpose: 'Update the model of the past without rewriting the original historical record.', operations: ['preserve original reading', 'register new evidence', 'identify changed interpretation', 'construct rival hypotheses', 'inspect precursor capacities', 'update model not record'] },
  { id: 'MOPH_PRIOR_HYPOTHESIS', status: 'STABLE', family: 'MOP-H', purpose: 'Freeze a prediction before an intervention so the result cannot be rewritten retrospectively.', operations: ['assign case/hypothesis id', 'state baseline', 'state exact perturbation', 'state expected result/time', 'state risk', 'freeze before observation'] },
  { id: 'SFI_INFERENCE', status: 'IN_DEVELOPMENT', family: 'Método SFI de Inferencia v0.1', purpose: 'Reduce the possibility space without converting interpretation into observation.', operations: ['audit preconditions', 'separate fact/inference', 'enumerate rivals', 'check precursor capacities', 'inspect node history/context', 'seek independent evidence', 'define discriminating observation'] },
  { id: 'MINIMAL_PERTURBATION', status: 'IN_DEVELOPMENT', family: 'Perturbación Mínima de Campo', purpose: 'Produce information with the smallest reversible change sufficient to discriminate hypotheses.', operations: ['baseline', 'declare objective/hypothesis', 'identify invariants/degrees of freedom', 'assess risk/return', 'one minimal change', 'observe side effects', 'reobserve before escalation'] },
  { id: 'RESULT_CONTRAST', status: 'IN_DEVELOPMENT', family: 'Método de Observación y Contraste de Resultados', purpose: 'Compare expected and observed results while distinguishing intention, execution and outcome.', operations: ['recover frozen baseline/hypothesis', 'register observed result', 'compare variables/relations', 'identify unplanned effects', 'contrast rivals', 'classify persistence/reversal/new trajectory'] },
  { id: 'TRANSDIMENSIONAL_CONTRAST', status: 'IN_DEVELOPMENT', family: 'Método de Coherencia Transdimensional', purpose: 'Test whether identity survives a change of domain by preserving roles, relations and invariants rather than superficial similarity.', operations: ['declare source/destination', 'identify vertebral invariants', 'map functions', 'register unavoidable loss', 'contrast attractor/invariants', 'classify loss'] },
  { id: 'MOPS_BASELINE', status: 'EXPERIMENTAL', family: 'MOP-S', purpose: 'Observe signal persistence across acquisition, signal, publication, visualization, recovery and traceability without collapsing stages.', operations: ['preserve immutable original', 'hash/describe carrier', 'declare detector', 'separate A/S/P/V/G/T', 'register known transformations', 'keep unresolved transformations unresolved'] },
];

export const SFI_METHOD_BY_ID = Object.fromEntries(SFI_METHODS.map((m) => [m.id, m]));
