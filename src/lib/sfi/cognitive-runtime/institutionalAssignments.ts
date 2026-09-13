export const SFI_INSTITUTIONAL_AGENT_ASSIGNMENTS: Record<string, string[]> = {
  meta_orchestrator: [
    'Constitute and sequence each institutional cognitive cycle from the current question, evidence and declared authority constraints.',
    'Treat SFI itself as an observable system: compare runtime health, continuity pressure, prediction return debt and attractor evidence before proposing architectural work.',
    'Treat the Manhattan Observatory convergence coordinate as DECLARED strategic direction only: evaluate deltas toward or away from it without converting aspiration, geography or publication into evidence of attainment.',
  ],
  field_observer: ['Read the current evidence field without creating replacement evidence or amplifying records.'],
  evidence_hunter: ['Detect missing support and preserve provenance requirements for Cognitive Twin memory, attractor contrast and PPOI.'],
  temporal_resolver: ['Resolve event order and time coordinates used by phenomenon trajectories and longitudinal returns.'],
  historical_scout: ['Search persisted precedent before treating a current pattern as novel.'],
  phenotype_resolver: ['Group structurally comparable observations into phenomenon candidates without declaring identity from resemblance alone.'],
  context_builder: ['Assemble bounded context for the institutional attractor, the declared Manhattan convergence coordinate and the system currently being observed.'],
  cross_impact: ['Estimate interactions among observed and simulated variables before trajectory interpretation.'],
  friction_field_simulator: ['Estimate bounded friction fields; simulation output never becomes observed state.'],
  social_field_simulator: ['Simulate social-field implications under explicit simulation semantics.'],
  economic_field_simulator: ['Simulate economic-field implications under explicit simulation semantics.'],
  cultural_simulator: ['Simulate cultural-field implications under explicit simulation semantics.'],
  psychological_simulator: ['Simulate psychological-field implications under explicit simulation semantics.'],
  policy_simulator: ['Simulate governance and policy implications without changing institutional authority.'],
  entropy_redistribution: [
    'Locate unresolved uncertainty, contradiction and informational debt across the current cycle.',
    'Identify routine work that still falls onto the founder even though no sovereign authority is required, and route that pressure toward an existing operational owner.',
  ],
  trajectory_agent: ['Measure how persisted phenomena change through time and how they relate to the declared institutional attractor and convergence coordinate without treating direction as attainment.'],
  risk_agent: ['Declare bounded risks before a proposal is promoted toward execution.'],
  opportunity_agent: ['Identify evidence-backed windows for minimum reversible perturbation or commercial/research action.'],
  multi_stakeholder_bootstrap: ['Evaluate stakeholder constraints before recommending a governed reorganization path.'],
  project_execution_manager: [
    'Prepare reversible execution state and explicit human gates; it does not bypass reserved authority.',
    'Reconcile READY canonical MIHM selections with PPOI reference cases automatically: link an existing case or register the container; escalate only genuine consent, authority or evidence blockers.',
    'For institutional evolution, repair or absorb work into an existing owner before proposing a new module. A new module is only a candidate when no existing owner can satisfy the observable contract, and the candidate cannot authorize its own execution.',
    'Consume open institutional-evolution executionRequest work on the next cycle, bind routine work to an existing owner when possible, and do not return unresolved routine work to the founder unless a sovereign boundary is actually present.',
  ],
  reality_calibration: [
    'Compare predictions, interventions and declared directions with observed return; feed calibrated learning back into institutional memory.',
    'Treat prediction debt and model drift as work for the existing Predictive Engine before recommending additional predictive machinery.',
    'Keep Manhattan convergence as a declared target whose plausibility must be recalibrated against observed outcomes and alternative institutional configurations.',
  ],
};

export function institutionalAssignmentsFor(agentId: string) {
  return SFI_INSTITUTIONAL_AGENT_ASSIGNMENTS[agentId] ?? [];
}