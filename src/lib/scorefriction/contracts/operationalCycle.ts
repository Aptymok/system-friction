export type AnalysisMode = 'MIHM' | 'PSI' | 'WSV' | 'SCOREFRICTION' | 'AMV';

export type ScoreFrictionScope =
  | 'world'
  | 'culture'
  | 'music'
  | 'writing'
  | 'cinema'
  | 'institution'
  | 'personal'
  | 'project'
  | 'campaign'
  | 'custom';

export type OperationalCycleInput = {
  case_id: string;
  user_id?: string | null;
  objective?: string | null;
  scope: ScoreFrictionScope;
  analysis_modes: AnalysisMode[];
  evidence_input?: unknown;
  evaluated_object?: unknown;
  run_contrast?: boolean;
};

export type OperationalCycleState = {
  case_id: string;
  objective: string | null;
  twin_state: unknown;
  world_vector: unknown;
  filtered_vector: unknown;
  weak_signals: unknown[];
  persistent_signals: unknown[];
  signal_lifetimes: unknown[];
  attractors: unknown[];
  degradation: {
    level: number | null;
    trend: 'rising' | 'falling' | 'stable' | 'unknown';
    notes: string[];
  };
  regime: {
    world: string | null;
    vector: string | null;
    previous?: string | null;
    changed: boolean;
  };
  direction: {
    current: string | null;
    projected: string | null;
    confidence: number | null;
  };
  contrast?: unknown;
  minimal_action?: unknown;
  alert?: {
    active: boolean;
    severity: 'none' | 'watch' | 'warning' | 'critical';
    reason: string;
    window: string | null;
    action_required: string | null;
  };
  evidence: unknown[];
  amv_learning: unknown;
  technical_state: {
    worldspect_ok: boolean;
    scorefriction_ok: boolean;
    python_ok: boolean;
    supabase_ok: boolean;
    fallback_used: boolean;
    saved: boolean;
    warnings: string[];
  };
};

