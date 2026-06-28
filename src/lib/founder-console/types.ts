export type FounderConsoleAccess = {
  authenticated: boolean;
  authorized: boolean;
  userId: string | null;
  email: string | null;
  role: string | null;
};

export type FounderConsoleSourceState = 'alive' | 'degraded' | 'blocked' | 'missing' | 'empty_live_table' | 'backup_reference';

export type FounderConsoleReadResult<T> = {
  ok: boolean;
  source: string;
  state: FounderConsoleSourceState;
  data: T;
  error?: string;
};

export type FounderConsoleMode =
  | 'field'
  | 'operations'
  | 'timeline'
  | 'evaluation'
  | 'atlas'
  | 'my_panel'
  | 'founder_tasks'
  | 'system_mutation'
  | 'route_disposition';

export type FounderFieldNode = {
  id: string;
  label: string;
  observes: string;
  source: string;
  state: FounderConsoleSourceState;
  evidenceWeight: number;
  importance: number;
  urgency: number;
  trust: number;
  mode: FounderConsoleMode;
  decisionEnabled: string;
  nextAction: string;
  repairState?: string;
};

export type FounderFieldConnection = {
  from: string;
  to: string;
  strength: number;
  relation: string;
};

export type FounderTimelineItem = {
  id: string;
  source_table: string;
  source_id: string | null;
  observed_at: string | null;
  signal: string;
  confidence: number | null;
  status: string;
  trajectory_weight: number | null;
  decision_impact: string;
  raw: Record<string, unknown>;
};

export type FounderObservationDecision =
  | 'save'
  | 'reject'
  | 'repair'
  | 'prune'
  | 'require_evidence'
  | 'protect'
  | 'publish_ready';

export type FounderActionStatus =
  | 'active'
  | 'recommendation'
  | 'recommended_decision_blocked';

export type FounderActionCapability = {
  id: string;
  label: string;
  decision: FounderObservationDecision | 'approve' | 'prepare' | 'register_outcome' | 'create_mutation' | 'accept_mutation' | 'reject_mutation';
  scope: 'observation_card' | 'timeline_item' | 'founder_task' | 'system_mutation';
  status: FounderActionStatus;
  target_id: string | null;
  target_source: string;
  endpoint: string | null;
  method: 'POST' | null;
  confirmationRequired: boolean;
  confirmationText: string | null;
  blocker: string | null;
  reason: string;
  sqlProposalRequired: boolean;
  payload: Record<string, unknown> | null;
};

export type FounderObservationCard = {
  id: string;
  phenomenon: string;
  input_evidence: FounderTimelineItem | null;
  source: string;
  source_table: string | null;
  source_id: string | null;
  time_range: { first_observed_at: string | null; latest_observed_at: string | null };
  world_tension: string | null;
  hypothesis: string;
  related_nodes_or_sources: string[];
  attractors: string[];
  ejectors: string[];
  risk: string;
  projection: string;
  confidence: number | null;
  decision_recommendation: FounderObservationDecision;
  atlas_eligibility: boolean;
  next_action: string;
  repair_task_if_needed: string | null;
  pruning_decision_if_needed: string | null;
  audit_trail: Array<{ source: string; action: string; at: string }>;
  created_at: string;
  updated_at: string;
  sqlProposalRequired: boolean;
};

export type FounderAtlasItem = {
  id: string;
  category:
    | 'Saturation'
    | 'Duplication'
    | 'Habituation'
    | 'Weak signal'
    | 'Deviated trajectory'
    | 'Institutional degradation'
    | 'Narrative pressure'
    | 'Technical friction'
    | 'Cultural emergence'
    | 'Systemic opportunity'
    | 'Repair signal'
    | 'Prune candidate'
    | 'Backup rehydration candidate'
    | 'Empty live table repair';
  title: string;
  description: string;
  linked_evidence: string[];
  confidence: number | null;
  state: FounderConsoleSourceState;
  next_action: string;
};

export type FounderRouteDisposition = {
  route: string;
  current_role: string;
  data_source_api: string;
  founder_console_mode: FounderConsoleMode;
  disposition:
    | 'integrate_into_founder_console'
    | 'keep_as_data_provider'
    | 'show_degraded_repair'
    | 'archive_doc_only'
    | 'remove_from_navigation'
    | 'delete_runtime_route'
    | 'keep_static';
  reason: string;
  action_proposed: string;
};

export type FounderRepairTask = {
  id: string;
  title: string;
  source: string;
  state: FounderConsoleSourceState;
  reason: string;
  next_action: string;
  sqlProposalRequired: boolean;
};

export type FounderConsoleState = {
  ok: boolean;
  generated_at: string;
  access: FounderConsoleAccess;
  regime: string;
  degradation: number;
  urgency: number;
  trust: number;
  continuity: number;
  sources: Record<string, FounderConsoleReadResult<unknown>>;
  field: {
    nodes: FounderFieldNode[];
    connections: FounderFieldConnection[];
  };
  timeline: FounderTimelineItem[];
  observationCard: FounderObservationCard;
  atlas: FounderAtlasItem[];
  myPanel: {
    alive: string[];
    broken: string[];
    producing_value: string[];
    repair_required: string[];
    prune_candidates: string[];
    showable: string[];
    protected: string[];
    decision_required_now: string[];
  };
  founderTasks: FounderTimelineItem[];
  systemMutations: FounderRepairTask[];
  actionCapabilities: FounderActionCapability[];
  routeDisposition: FounderRouteDisposition[];
  worldSpect: {
    current_state: FounderConsoleSourceState;
    snapshot_timeline: FounderConsoleSourceState;
    longitudinal_status: 'missing' | 'thin' | 'usable';
    repair_task: FounderRepairTask | null;
  };
  graphAmv: {
    graph_nodes: FounderRepairTask;
    graph_edges: FounderRepairTask;
    sfi_amv_memory: FounderRepairTask;
    backup_rehydration_candidates: FounderRepairTask[];
  };
  sqlRequiredBlockers: FounderRepairTask[];
};
