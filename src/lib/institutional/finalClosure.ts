export const FINAL_CLOSURE_CONTRACT = 'SFI-FINAL-CLOSURE-1.0' as const;

export type ClosureGateState = 'IMPLEMENTED' | 'GATED_EXTERNAL' | 'GATED_LIVE_EVIDENCE';

export type FinalClosureGate = {
  id: string;
  name: string;
  state: ClosureGateState;
  invariant: string;
  implementation: string[];
  nextGate: string;
};

export const FINAL_CLOSURE_GATES: FinalClosureGate[] = [
  {
    id: 'CRL_PERSISTENCE',
    name: 'Cognitive Relational Lab persistence convergence',
    state: 'IMPLEMENTED',
    invariant: 'CRL is one Method Lab protocol; dedicated CRL rows are protocol-local evidence and sfi_lab_analyses is the common institutional run ledger. No CRL output self-promotes to canon.',
    implementation: ['src/lib/cognitive-lab', 'src/lib/method-lab', 'ROOT/ACP lifecycle'],
    nextGate: 'Verify production schema and execute the first governed CRL run.',
  },
  {
    id: 'CT_ANCESTRAL_REENTRY',
    name: 'Cognitive Twin ancestral functional reentry',
    state: 'IMPLEMENTED',
    invariant: 'Ancestor capabilities return only as individually named experimental capabilities with evidence, evaluation, rollback and zero authority expansion.',
    implementation: ['episodic continuity', 'salience', 'observer effect', 'counterfactual self-model', 'bounded subject-policy adaptation', 'meta-observer', 'communication disposition'],
    nextGate: 'Evaluate each capability in Method Lab before retention in a later CT subject version.',
  },
  {
    id: 'SIMULATION_SPECIALIZATION',
    name: 'Sociotechnical and observable economic simulation specialization',
    state: 'IMPLEMENTED',
    invariant: 'Both specializations share the Method Lab apparatus but declare different state variables, observables and return contracts. Simulation remains SIMULATED.',
    implementation: ['sociotechnical state model contract', 'observable economic state model contract', 'common run envelope'],
    nextGate: 'Run each specialization against persisted evidence and later observed returns.',
  },
  {
    id: 'STUDIO_FIELD_HANDOFF',
    name: 'Studio to Field to Return identity contract',
    state: 'IMPLEMENTED',
    invariant: 'A designed intervention keeps one immutable handoff identity across Studio design, Method Lab simulation, Field execution, return and contrast.',
    implementation: ['handoff id', 'source object id', 'intervention id', 'prediction seal', 'return window', 'evidence refs'],
    nextGate: 'Use the handoff in a real end-to-end case.',
  },
  {
    id: 'MANDATORY_RETURN_CONTRAST',
    name: 'Mandatory return and contrast',
    state: 'IMPLEMENTED',
    invariant: 'No case may satisfy longitudinal completion without a frozen expectation, observed return, residual/error, rival interpretation and stopping condition.',
    implementation: ['expected', 'observed', 'residual', 'absolute error', 'rival', 'stopping condition'],
    nextGate: 'Persist a real closed Field return.',
  },
  {
    id: 'OBSERVATORY_PUBLICATION_GATE',
    name: 'Observatory publication gate',
    state: 'IMPLEMENTED',
    invariant: 'Public Observatory material must be observed/derived evidence or an explicitly authorized projection; SIMULATED and private candidate states cannot silently cross the boundary.',
    implementation: ['epistemic class', 'authority state', 'source refs', 'publication disposition'],
    nextGate: 'Publish an authorized longitudinal view from a real return cycle.',
  },
  {
    id: 'TOTAL_PROOF_REALITY',
    name: 'SFI end-to-end reality proof',
    state: 'GATED_LIVE_EVIDENCE',
    invariant: 'Software completion cannot satisfy a return that has not happened.',
    implementation: ['Total Proof structural gate'],
    nextGate: 'Complete one real observation → intervention → time → return → learning → governance cycle.',
  },
  {
    id: 'EXTERNAL_TIME_AND_REPLICATION',
    name: 'Independent time anchoring and replication',
    state: 'GATED_EXTERNAL',
    invariant: 'Internal hash chains are not described as independently timestamped or replicated until a third party supplies that property.',
    implementation: ['exportable lineage checkpoint'],
    nextGate: 'Anchor selected checkpoint hashes externally and obtain independent replication.',
  },
];

export const ARCHITECTURE_FREEZE = {
  active: true,
  rule: 'No new major SFI organ is added while any IMPLEMENTED closure gate has not been exercised through its existing organ. New hypotheses enter Method Lab as protocols/cases, not parallel platforms.',
} as const;
