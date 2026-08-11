export const SFI_SPECIALIZED_MODEL_CONTRACT = 'SFI-METHOD-LAB-SPECIALIZED-MODELS-1.0' as const;

export type SpecializedModelId = 'SOCIOTECHNICAL_STATE_MODEL' | 'OBSERVABLE_ECONOMIC_STATE_MODEL';

export type SpecializedModelContract = {
  id: SpecializedModelId;
  parentProtocol: 'sociotechnical_simulation' | 'economic_simulation';
  epistemicClass: 'SIMULATED';
  stateVariables: string[];
  observables: string[];
  perturbations: string[];
  returnContract: string[];
  forbiddenClaims: string[];
};

export const SPECIALIZED_MODELS: SpecializedModelContract[] = [
  {
    id:'SOCIOTECHNICAL_STATE_MODEL',
    parentProtocol:'sociotechnical_simulation',
    epistemicClass:'SIMULATED',
    stateVariables:['actors','roles','institutions','resources','constraints','information_flows','incentives','coordination_edges','authority','memory','friction_points'],
    observables:['coordination_latency','handoff_failure_rate','information_loss','resource_bottleneck','actor_churn','conflict_density','goal_alignment','intervention_fidelity'],
    perturbations:['rule_change','information_change','resource_reallocation','coordination_change','minimum_field_intervention'],
    returnContract:['frozen_baseline','declared_perturbation','predicted_observable_signals','return_window','observed_signals','residuals','rival_explanations'],
    forbiddenClaims:['simulation_is_observation','simulation_is_causal_validation','simulation_authorizes_external_execution'],
  },
  {
    id:'OBSERVABLE_ECONOMIC_STATE_MODEL',
    parentProtocol:'economic_simulation',
    epistemicClass:'SIMULATED',
    stateVariables:['employment','household_income','consumption','firm_density','sector_composition','credit_liquidity','inflation','productive_capacity','security_disruption','logistics','territorial_concentration','institutional_intervention'],
    observables:['employment_change','income_change','consumption_change','firm_open_close_rate','sector_shift','price_change','credit_stress','logistics_delay','territorial_concentration_change'],
    perturbations:['policy_shock','liquidity_change','logistics_disruption','demand_shift','capacity_change','institutional_intervention'],
    returnContract:['historical_calibration_window','frozen_state_vector','declared_perturbation','predicted_observables','future_observation_cutoff','observed_outcomes','error_vector','calibration_update'],
    forbiddenClaims:['macro_forecast_without_observable_variables','historical_replay_as_prospective_proof','simulation_is_observation'],
  },
];

export function specializedModel(id: SpecializedModelId) {
  return SPECIALIZED_MODELS.find((item) => item.id === id) ?? null;
}
