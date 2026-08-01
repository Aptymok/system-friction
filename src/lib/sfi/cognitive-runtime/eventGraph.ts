export const EVENT_GRAPH = {

  SFI_TASK_CREATED: [

    "field_observer",

    "historical_scout",

    "evidence_hunter"

  ],

  historical_reconstruction_completed: [

    "phenotype_resolver",

    "archaeologist"

  ],

  SFI_PHENOTYPE_RESOLVED: [

    "social_field_simulator",

    "economic_field_simulator",

    "policy_field_simulator",

    "cultural_field_simulator",

    "psychological_field_simulator",

    "friction_field_simulator"

  ],

  SFI_FIELD_SIMULATION_COMPLETED: [

    "cross_impact",

    "risk_agent",

    "opportunity_agent"

  ],

  SFI_RISK_DECLARED: [

    "multi_stakeholder_bootstrap"

  ],

  SFI_MULTI_STAKEHOLDER_SIMULATED: [

    "project_execution_manager"

  ],

  SFI_PROJECT_EXECUTION_STATE_DECLARED: [

    "reality_calibration"

  ],

  SFI_REALITY_CALIBRATED: [

    "contextual_hallucination_seeder",

    "entropy_redistribution"

  ]

} as const;