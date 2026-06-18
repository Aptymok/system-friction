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
  user_question?: string | null;
  run_contrast?: boolean;
};

export type ObjectPresence = 'missing' | 'provided';

export type MihmReadout = {
  available: boolean;
  reason?: string;
  homeostasis: number | null;
  friction: number | null;
  coherence: number | null;
  degradation: number | null;
  regime: 'insufficient_object' | 'stable' | 'tension' | 'critical';
  meaning: string;
};

export type PsiReadout = {
  available: boolean;
  reason?: string;
  recurrence: number | null;
  symbolic_identity: number | null;
  persistence: number | null;
  signal_life: 'none' | 'short' | 'medium' | 'long';
  weak_signal_count: number;
  meaning: string;
};

export type ScoreFrictionReadout = {
  available: boolean;
  reason?: string;
  direction_bias: number | null;
  attraction: number | null;
  friction: number | null;
  perturbation_need: number | null;
  opportunity: number | null;
  meaning: string;
};

export type OperationalExperiment = {
  id: string;
  vector: string;
  status: 'blocked_no_object' | 'watch_only' | 'ready_for_test' | 'do_not_intervene';
  hypothesis: string;
  recommended_surface: string | null;
  action: string;
  expected_effect: string;
  verification_window: string;
  success_condition: string;
  failure_condition: string;
  evidence_required: string[];
  confidence: number | null;
  plain_language: string;
};

export type FormalOperationalReport = {
  filename: string;
  markdown: string;
};

export type OperationalCycleState = {
  case_id: string;
  objective: string | null;
  object_presence: ObjectPresence;
  twin_state: unknown;
  world_vector: unknown;
  filtered_vector: unknown;
  weak_signals: unknown[];
  persistent_signals: unknown[];
  signal_lifetimes: unknown[];
  attractors: unknown[];
  world_context?: {
    summary: string;
    regime: string | null;
    wsi: number | null;
    nti: number | null;
    sourceCoverage: number | null;
    strongest_vectors: Array<{ domain: string; persistence: number; trust: number; degradation: number }>;
  };
  mihm?: MihmReadout;
  psi?: PsiReadout;
  scorefriction?: ScoreFrictionReadout;
  object_vs_world?: {
    available: boolean;
    verdict: string;
    compared_against: {
      world: string;
      filtered_vector: string;
    };
    meaning: string;
  };
  recommended_experiments?: OperationalExperiment[];
  amv_answer?: {
    question: string | null;
    answer: string;
    can_answer: boolean;
  };
  formal_report?: FormalOperationalReport;
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
  operational_analysis?: unknown;
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