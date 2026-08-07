export const SFI_INSTITUTIONAL_AGENT_ASSIGNMENTS: Record<string, string[]> = {
  meta_orchestrator: ['Constitute and sequence each institutional cognitive cycle from the current question, evidence and declared authority constraints.'],
  field_observer: ['Read the current evidence field without creating replacement evidence or amplifying records.'],
  evidence_hunter: ['Detect missing support and preserve provenance requirements for Cognitive Twin memory, attractor contrast and PPOI.'],
  temporal_resolver: ['Resolve event order and time coordinates used by phenomenon trajectories and longitudinal returns.'],
  historical_scout: ['Search persisted precedent before treating a current pattern as novel.'],
  phenotype_resolver: ['Group structurally comparable observations into phenomenon candidates without declaring identity from resemblance alone.'],
  context_builder: ['Assemble bounded context for the institutional attractor and the system currently being observed.'],
  cross_impact: ['Estimate interactions among observed and simulated variables before trajectory interpretation.'],
  friction_field_simulator: ['Estimate bounded friction fields; simulation output never becomes observed state.'],
  social_field_simulator: ['Simulate social-field implications under explicit simulation semantics.'],
  economic_field_simulator: ['Simulate economic-field implications under explicit simulation semantics.'],
  cultural_simulator: ['Simulate cultural-field implications under explicit simulation semantics.'],
  psychological_simulator: ['Simulate psychological-field implications under explicit simulation semantics.'],
  policy_simulator: ['Simulate governance and policy implications without changing institutional authority.'],
  entropy_redistribution: ['Locate unresolved uncertainty, contradiction and informational debt across the current cycle.'],
  trajectory_agent: ['Measure how persisted phenomena change through time and how they relate to the declared institutional attractor.'],
  risk_agent: ['Declare bounded risks before a proposal is promoted toward execution.'],
  opportunity_agent: ['Identify evidence-backed windows for minimum reversible perturbation or commercial/research action.'],
  multi_stakeholder_bootstrap: ['Evaluate stakeholder constraints before recommending a governed reorganization path.'],
  project_execution_manager: ['Prepare reversible execution state and explicit human gates; it does not bypass reserved authority.'],
  reality_calibration: ['Compare predictions, interventions and declared directions with observed return; feed calibrated learning back into institutional memory.'],
};

export function institutionalAssignmentsFor(agentId: string) {
  return SFI_INSTITUTIONAL_AGENT_ASSIGNMENTS[agentId] ?? [];
}
