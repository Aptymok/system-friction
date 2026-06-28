import { createServerSupabaseClient, createServiceSupabaseClient } from '@/runtime/supabase/server';
import { isRootUser } from '@/lib/server/productionBackend';
import { readOperationalConsoleState } from '@/lib/sfi/operationalConsole';
import { generateSfiOperationalResponse } from '@/lib/sfi/responseEngine';
import { readCanonicalGraphState } from '@/lib/graph/canonicalGraph';
import type {
  FounderActionCapability,
  FounderAtlasItem,
  FounderConsoleReadResult,
  FounderConsoleSourceState,
  FounderConsoleState,
  FounderFieldConnection,
  FounderFieldNode,
  FounderObservationCard,
  FounderRepairTask,
  FounderRouteDisposition,
  FounderTimelineItem,
} from './types';

type Row = Record<string, unknown>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

const LIVE_TABLES = [
  'worldspect_snapshots',
  'scorefriction_observations',
  'scorefriction_vectors',
  'sfi_evidence_trace',
  'epistemic_events',
  'root_audit_events',
  'action_proposals',
  'sfi_execution_ledger',
  'sfi_execution_recovery_queue',
  'sfi_field_perturbations',
  'sfi_lab_analyses',
  'sfi_proposal_alignment',
] as const;

const VIEW_SOURCES = [
  'vw_sfi_operational_cycle',
  'vw_sfi_evidence_map',
  'vw_sfi_execution_recovery_queue',
  'vw_worldspect_real',
  'vw_scorefriction_real',
  'vw_sfi_stability',
  'vw_sfi_pipeline_loss',
  'vw_sfi_reality_console_state',
  'vw_epistemic_signal',
  'vw_root_technical_audit',
] as const;

function asRecord(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function number01(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(1, parsed));
}

function firstText(row: Row, keys: string[], fallback = '') {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return fallback;
}

function proposalType(row: Row) {
  const expected = asRecord(row.expected_field_delta);
  const payload = asRecord(expected.payload);
  const proposal = asRecord(payload.proposal);
  const proportionality = asRecord(row.proportionality_check);
  return text(
    row.proposal_type
      ?? expected.proposalType
      ?? expected.proposal_type
      ?? proposal.proposalType
      ?? proposal.proposal_type
      ?? proportionality.proposalType
      ?? proportionality.proposal_type,
    '',
  );
}

function isTrajectoryRelevant(item: FounderTimelineItem) {
  if (item.source_table !== 'root_audit_events') return true;
  const blob = `${item.signal} ${item.status} ${item.decision_impact} ${JSON.stringify(item.raw)}`.toLowerCase();
  if (blob.includes('root.me.read') && !blob.includes('blocked') && !blob.includes('failed') && !blob.includes('mutation') && !blob.includes('proposal')) return false;
  return blob.includes('blocked') || blob.includes('failed') || blob.includes('mutation') || blob.includes('proposal') || blob.includes('repair');
}

function timelineWeight(item: FounderTimelineItem) {
  let score = 0;
  if (['action_proposals', 'sfi_execution_recovery_queue', 'sfi_proposal_alignment', 'sfi_field_perturbations'].includes(item.source_table)) score += 8;
  if (['sfi_evidence_trace', 'epistemic_events', 'sfi_lab_analyses', 'worldspect_snapshots'].includes(item.source_table)) score += 5;
  if (item.status !== 'not_available') score += 2;
  if (item.decision_impact && item.decision_impact !== 'observe') score += 2;
  if (item.confidence !== null) score += 1;
  if (item.source_table === 'root_audit_events') score -= 5;
  return score;
}

function latestDate(row: Row) {
  return firstText(row, ['observed_at', 'created_at', 'updated_at', 'latest_observed_at', 'timestamp'], '');
}

function sourceState(result: { ok: boolean; data: unknown; degraded?: boolean }): FounderConsoleSourceState {
  if (result.degraded) return 'degraded';
  if (!result.ok) return 'missing';
  if (Array.isArray(result.data) && result.data.length === 0) return 'missing';
  if (result.data === null) return 'missing';
  return 'alive';
}

function result<T>(source: string, data: T, state: FounderConsoleSourceState, error?: string): FounderConsoleReadResult<T> {
  return { ok: state === 'alive' || state === 'backup_reference', source, state, data, ...(error ? { error } : {}) };
}

async function readRows(table: string, limit = 35): Promise<FounderConsoleReadResult<Row[]>> {
  try {
    const service = createServiceSupabaseClient();
    let query = service.from(table).select('*').limit(limit);
    if (table === 'worldspect_snapshots') query = query.order('observed_at', { ascending: false });
    else query = query.order('created_at', { ascending: false });
    const { data, error } = await query;
    if (error) throw error;
    const state: FounderConsoleSourceState = data?.length ? 'alive' : 'missing';
    return result(table, (data ?? []) as Row[], state);
  } catch (error) {
    return result(table, [], 'degraded', error instanceof Error ? error.message : `${table}_read_failed`);
  }
}

async function countRows(table: string, schema?: string): Promise<number | null> {
  try {
    const service = createServiceSupabaseClient();
    const source = schema ? service.schema(schema).from(table) : service.from(table);
    const { count, error } = await source.select('*', { count: 'exact', head: true });
    if (error) return null;
    return count ?? 0;
  } catch {
    return null;
  }
}

async function readAccess() {
  const supabase = await createServerSupabaseClient();
  const service = createServiceSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { authenticated: false, authorized: false, userId: null, email: null, role: null };

  const { data: profile } = await service
    .from('profiles')
    .select('role,email,user_id')
    .eq('user_id', user.id)
    .maybeSingle();
  const role = text((profile as Row | null)?.role, null as unknown as string);
  const authorized = isRootUser(role, user.email);
  return {
    authenticated: true,
    authorized,
    userId: user.id,
    email: user.email ?? null,
    role: role || null,
  };
}

function timelineFromRows(source: string, input: Row[]): FounderTimelineItem[] {
  return input.slice(0, 12).map((row, index) => {
    const id = firstText(row, ['id', 'event_id', 'proposal_id'], `${source}:${index}`);
    const signal = firstText(row, ['title', 'event_name', 'signal', 'summary', 'objective', 'status', 'source_id'], source);
    const confidence = row.confidence ?? row.trust ?? row.alignment_score ?? row.score;
    return {
      id: `${source}:${id}`,
      source_table: source,
      source_id: id,
      observed_at: latestDate(row) || null,
      signal,
      confidence: typeof confidence === 'number' ? confidence : null,
      status: firstText(row, ['status', 'state', 'recommended_status', 'regime'], 'not_available'),
      trajectory_weight: typeof row.trajectory_weight === 'number' ? row.trajectory_weight : typeof row.weight === 'number' ? row.weight : null,
      decision_impact: firstText(row, ['decision_impact', 'recommendation', 'next_action', 'required_next_action'], 'observe'),
      raw: row,
    };
  });
}

function buildObservationCard(item: FounderTimelineItem | null, generatedAt: string): FounderObservationCard {
  const sourceTable = item?.source_table ?? null;
  const confidence = item?.confidence ?? null;
  const needsRepair = !item || item.status === 'missing' || item.status === 'not_available';
  const category = item?.source_table.includes('evidence')
    ? 'evidence'
    : item?.source_table.includes('proposal')
      ? 'proposal'
      : item?.source_table.includes('worldspect')
        ? 'world tension'
        : 'operational signal';

  return {
    id: item ? `runtime-observation-${item.id}` : 'runtime-observation-empty',
    phenomenon: item?.signal ?? 'not_available',
    input_evidence: item,
    source: item?.source_table ?? 'not_available',
    source_table: sourceTable,
    source_id: item?.source_id ?? null,
    time_range: { first_observed_at: item?.observed_at ?? null, latest_observed_at: item?.observed_at ?? null },
    world_tension: item?.source_table === 'worldspect_snapshots' ? item.signal : null,
    hypothesis: item ? `This ${category} may affect persistence, repair priority, or founder decision.` : 'No timeline item selected.',
    related_nodes_or_sources: item ? [item.source_table] : [],
    attractors: item?.source_table.includes('proposal') ? ['founder_attractor_alignment'] : [],
    ejectors: needsRepair ? ['missing_required_field_or_trace'] : [],
    risk: needsRepair ? 'medium' : 'low',
    projection: needsRepair ? 'Cannot project safely until required evidence is available.' : 'Eligible for derived Atlas review and founder decision.',
    confidence,
    decision_recommendation: needsRepair ? 'require_evidence' : confidence !== null && confidence < 0.45 ? 'repair' : 'save',
    atlas_eligibility: Boolean(item && !needsRepair),
    next_action: needsRepair ? 'require_evidence' : 'review_save_reject_repair_prune_decision',
    repair_task_if_needed: needsRepair ? 'complete_missing_evidence_or_status_before_persistence' : null,
    pruning_decision_if_needed: null,
    audit_trail: [{ source: 'founder_console_runtime', action: 'observation_card_generated_without_persistence', at: generatedAt }],
    created_at: generatedAt,
    updated_at: generatedAt,
    sqlProposalRequired: true,
  };
}

function atlasFromTimeline(timeline: FounderTimelineItem[], card: FounderObservationCard): FounderAtlasItem[] {
  const base = timeline.filter(isTrajectoryRelevant).slice(0, 10).map((item): FounderAtlasItem => {
    const isRepair = item.status === 'missing' || item.decision_impact.includes('repair');
    const isProposal = item.source_table.includes('proposal') || item.source_table.includes('action_proposals');
    const isWorld = item.source_table.includes('worldspect');
    return {
      id: `atlas-derived-${item.id}`,
      category: isRepair ? 'Repair signal' : isProposal ? 'Systemic opportunity' : isWorld ? 'Narrative pressure' : 'Weak signal',
      title: item.signal,
      description: `Derived from ${item.source_table}; no Atlas table persistence declared.`,
      linked_evidence: [item.id],
      confidence: item.confidence,
      state: 'alive',
      next_action: item.decision_impact || 'observe',
    };
  });

  if (card.atlas_eligibility) {
    base.unshift({
      id: `atlas-derived-${card.id}`,
      category: 'Weak signal',
      title: card.phenomenon,
      description: 'Runtime ObservationCard is eligible for derived Atlas review only.',
      linked_evidence: card.input_evidence ? [card.input_evidence.id] : [],
      confidence: card.confidence,
      state: 'alive',
      next_action: card.next_action,
    });
  }

  return base;
}

function blockedAction(input: {
  id: string;
  label: string;
  decision: FounderActionCapability['decision'];
  scope: FounderActionCapability['scope'];
  targetId?: string | null;
  targetSource: string;
  blocker: string;
  reason: string;
  sqlProposalRequired?: boolean;
}): FounderActionCapability {
  return {
    id: input.id,
    label: input.label,
    decision: input.decision,
    scope: input.scope,
    status: 'recommended_decision_blocked',
    target_id: input.targetId ?? null,
    target_source: input.targetSource,
    endpoint: null,
    method: null,
    confirmationRequired: false,
    confirmationText: null,
    blocker: input.blocker,
    reason: input.reason,
    sqlProposalRequired: Boolean(input.sqlProposalRequired),
    payload: null,
  };
}

function activeAction(input: {
  id: string;
  label: string;
  decision: FounderActionCapability['decision'];
  scope: FounderActionCapability['scope'];
  targetId: string;
  targetSource: string;
  endpoint: string;
  reason: string;
  confirmationText: string;
  payload?: Record<string, unknown>;
}): FounderActionCapability {
  return {
    id: input.id,
    label: input.label,
    decision: input.decision,
    scope: input.scope,
    status: 'active',
    target_id: input.targetId,
    target_source: input.targetSource,
    endpoint: input.endpoint,
    method: 'POST',
    confirmationRequired: true,
    confirmationText: input.confirmationText,
    blocker: null,
    reason: input.reason,
    sqlProposalRequired: false,
    payload: input.payload ?? {},
  };
}

function buildActionCapabilities(input: {
  timeline: FounderTimelineItem[];
  founderTasks: FounderTimelineItem[];
  repairTasks: FounderRepairTask[];
  observationCard: FounderObservationCard;
}): FounderActionCapability[] {
  const actions: FounderActionCapability[] = [
    blockedAction({
      id: 'observation-save-blocked',
      label: 'save ObservationCard',
      decision: 'save',
      scope: 'observation_card',
      targetId: input.observationCard.source_id,
      targetSource: input.observationCard.source_table ?? 'runtime_observation_card',
      blocker: 'runtime_only_observation_card',
      reason: 'ObservationCard has no approved persistence table or exact safe write contract.',
      sqlProposalRequired: true,
    }),
    blockedAction({
      id: 'observation-require-evidence-blocked',
      label: 'require evidence',
      decision: 'require_evidence',
      scope: 'observation_card',
      targetId: input.observationCard.source_id,
      targetSource: input.observationCard.source_table ?? 'runtime_observation_card',
      blocker: 'endpoint_missing_root_gate',
      reason: '/api/sfi/proposals/[id]/request-evidence writes without the approved ROOT gate for this surface.',
    }),
    blockedAction({
      id: 'observation-repair-blocked',
      label: 'repair trace',
      decision: 'repair',
      scope: 'observation_card',
      targetId: input.observationCard.source_id,
      targetSource: input.observationCard.source_table ?? 'runtime_observation_card',
      blocker: 'endpoint_missing_root_gate',
      reason: '/api/sfi/proposals/[id]/apply-repair writes without the approved ROOT gate for this surface.',
    }),
    blockedAction({
      id: 'observation-prune-blocked',
      label: 'prune',
      decision: 'prune',
      scope: 'observation_card',
      targetId: input.observationCard.source_id,
      targetSource: input.observationCard.source_table ?? 'runtime_observation_card',
      blocker: 'missing_safe_endpoint',
      reason: 'No exact ROOT-gated prune endpoint exists for route/source/module decisions.',
      sqlProposalRequired: true,
    }),
    blockedAction({
      id: 'observation-protect-blocked',
      label: 'protect',
      decision: 'protect',
      scope: 'observation_card',
      targetId: input.observationCard.source_id,
      targetSource: input.observationCard.source_table ?? 'runtime_observation_card',
      blocker: 'missing_safe_endpoint',
      reason: 'No exact ROOT-gated protect endpoint exists for route/source/module decisions.',
      sqlProposalRequired: true,
    }),
    blockedAction({
      id: 'observation-publish-ready-blocked',
      label: 'publish ready',
      decision: 'publish_ready',
      scope: 'observation_card',
      targetId: input.observationCard.source_id,
      targetSource: input.observationCard.source_table ?? 'runtime_observation_card',
      blocker: 'missing_safe_endpoint',
      reason: 'No approved publish-readiness persistence contract exists for runtime ObservationCard output.',
      sqlProposalRequired: true,
    }),
  ];

  for (const item of input.founderTasks) {
    const sourceId = item.source_id;
    if (!sourceId || !UUID_RE.test(sourceId) || item.source_table !== 'action_proposals') continue;

    const type = proposalType(item.raw);
    const status = item.status;
    const acpCompatible = !type || type === 'twin_proposal';
    const mutationCompatible = type === 'mutation';

    if (acpCompatible && status === 'proposed') {
      actions.push(activeAction({
        id: `acp-approve-${sourceId}`,
        label: 'approve ACP proposal',
        decision: 'approve',
        scope: 'founder_task',
        targetId: sourceId,
        targetSource: 'action_proposals',
        endpoint: `/api/acp/proposals/${sourceId}/approve`,
        reason: 'ROOT-gated ACP approval exists and proposal status is proposed.',
        confirmationText: `Approve ACP proposal ${sourceId}?`,
      }));
      actions.push(activeAction({
        id: `acp-reject-${sourceId}`,
        label: 'reject ACP proposal',
        decision: 'reject',
        scope: 'founder_task',
        targetId: sourceId,
        targetSource: 'action_proposals',
        endpoint: `/api/acp/proposals/${sourceId}/reject`,
        reason: 'ROOT-gated ACP rejection exists and proposal status is proposed.',
        confirmationText: `Reject ACP proposal ${sourceId}?`,
        payload: { reason: 'founder_console_rejected' },
      }));
    } else if (acpCompatible && status === 'design_approved') {
      actions.push(activeAction({
        id: `acp-prepare-${sourceId}`,
        label: 'prepare ACP proposal',
        decision: 'prepare',
        scope: 'founder_task',
        targetId: sourceId,
        targetSource: 'action_proposals',
        endpoint: `/api/acp/proposals/${sourceId}/prepare`,
        reason: 'ROOT-gated ACP preparation exists and proposal status is design_approved.',
        confirmationText: `Prepare ACP proposal ${sourceId}?`,
      }));
    } else if (acpCompatible && status === 'queued') {
      actions.push(activeAction({
        id: `acp-outcome-${sourceId}`,
        label: 'register ACP outcome',
        decision: 'register_outcome',
        scope: 'founder_task',
        targetId: sourceId,
        targetSource: 'action_proposals',
        endpoint: `/api/acp/proposals/${sourceId}/outcome`,
        reason: 'ROOT-gated ACP outcome registration exists and proposal status is queued.',
        confirmationText: `Register outcome for ACP proposal ${sourceId}?`,
        payload: {
          outcome_status: 'observed_effect',
          next_state: 'closed',
          field_effect: { source: 'founder_console', evidence: item.id },
          notes: 'Founder Console registered outcome from existing task card.',
        },
      }));
    }

    if (mutationCompatible && (status === 'proposed' || status === 'queued')) {
      actions.push(activeAction({
        id: `mutation-accept-${sourceId}`,
        label: 'accept mutation',
        decision: 'accept_mutation',
        scope: 'founder_task',
        targetId: sourceId,
        targetSource: 'action_proposals',
        endpoint: '/api/mutations/accept',
        reason: 'ROOT-gated mutation accept exists for mutation proposal.',
        confirmationText: `Accept mutation proposal ${sourceId}?`,
        payload: { proposalId: sourceId },
      }));
      actions.push(activeAction({
        id: `mutation-reject-${sourceId}`,
        label: 'reject mutation',
        decision: 'reject_mutation',
        scope: 'founder_task',
        targetId: sourceId,
        targetSource: 'action_proposals',
        endpoint: '/api/mutations/reject',
        reason: 'ROOT-gated mutation reject exists for mutation proposal.',
        confirmationText: `Reject mutation proposal ${sourceId}?`,
        payload: { proposalId: sourceId, reason: 'founder_console_rejected' },
      }));
    }
  }

  for (const task of input.repairTasks.slice(0, 8)) {
    actions.push(activeAction({
      id: `mutation-create-${task.id}`,
      label: 'create mutation proposal',
      decision: 'create_mutation',
      scope: 'system_mutation',
      targetId: task.id,
      targetSource: task.source,
      endpoint: '/api/mutations/propose',
      reason: 'ROOT-gated mutation proposal endpoint exists; this creates a proposal only.',
      confirmationText: `Create mutation proposal for ${task.id}?`,
      payload: {
        mutationType: 'repair_decision',
        target: task.source,
        currentState: { state: task.state, reason: task.reason },
        proposedState: { next_action: task.next_action, sqlProposalRequired: task.sqlProposalRequired },
        mutation: {
          repair_task_id: task.id,
          title: task.title,
          source: task.source,
          state: task.state,
          reason: task.reason,
          next_action: task.next_action,
          sqlProposalRequired: task.sqlProposalRequired,
        },
      },
    }));
  }

  return actions;
}

function repairTask(id: string, title: string, source: string, state: FounderConsoleSourceState, reason: string, next_action: string, sqlProposalRequired = false): FounderRepairTask {
  return { id, title, source, state, reason, next_action, sqlProposalRequired };
}

function routeDisposition(): FounderRouteDisposition[] {
  return [
    ['/', 'institutional landing', 'SFI_NAVIGATION', 'route_disposition', 'keep_static', 'Public entry remains static; primary action moves to founder console.', 'Update primary CTA to /founder-console.'],
    ['/root', 'protected ROOT surface', '/api/root/*', 'operations', 'keep_as_data_provider', 'ROOT remains protected and should not compete as founder center.', 'Keep protected, link as source.'],
    ['/scorefriction', 'ScoreFriction instrument', '/api/scorefriction/*', 'founder_tasks', 'keep_as_data_provider', 'Cultural friction remains an instrument feeding founder console.', 'Subordinate in navigation.'],
    ['/world-vector', 'WorldSpect instrument', '/api/worldspect/*', 'timeline', 'keep_as_data_provider', 'World state feeds founder console current/timeline/trend.', 'Subordinate in navigation.'],
    ['/sfi-console', 'previous operational console', '/api/sfi/operational-state', 'my_panel', 'keep_as_data_provider', 'No longer SFI-01 primary surface; useful as internal source during transition.', 'Label internal and keep temporary.'],
    ['/repository', 'institutional archive', 'static repository components', 'atlas', 'archive_doc_only', 'Repository is evidence/document context, not operating center.', 'Keep static.'],
    ['/moph', 'MOP-H instrument', 'MophFieldGate', 'field', 'keep_as_data_provider', 'Instrument can feed interpretation, not founder center.', 'Subordinate in navigation.'],
    ['/instruments', 'instrument index', 'SFI_NAVIGATION', 'route_disposition', 'integrate_into_founder_console', 'Founder console includes instrument state directly.', 'Keep as public index or remove from primary nav later.'],
    ['/surfaces', 'surface map', 'buildSfiSurfaceState', 'route_disposition', 'integrate_into_founder_console', 'Route disposition mode supersedes standalone surface map.', 'Keep as support until parity.'],
    ['/contact', 'contact page', 'NEXT_PUBLIC_CONTACT_EMAIL', 'route_disposition', 'keep_static', 'Public contact remains outside operations.', 'Keep static.'],
    ['/observatory', 'observatory shell', '/api/worldspect/state + SfiObservatoryOS', 'field', 'show_degraded_repair', 'Overlaps with /campo and founder field; classify before pruning.', 'Propose consolidation into founder console.'],
    ['/campo', 'observatory shell duplicate', '/api/worldspect/state + SfiObservatoryOS', 'field', 'show_degraded_repair', 'Duplicates /observatory pattern.', 'Propose one canonical destination.'],
    ['/cluster-atlas', 'scoped AMV dashboard', 'ScopedDashboardShell', 'atlas', 'integrate_into_founder_console', 'Derived Atlas belongs in founder console first.', 'Subordinate or remove from primary nav.'],
    ['/cognitive-twin-engine', 'scoped AMV dashboard', 'ScopedDashboardShell', 'operations', 'integrate_into_founder_console', 'Cognitive Twin state should be summarized in founder operations.', 'Subordinate.'],
    ['/governance-reality', 'scoped AMV dashboard', 'ScopedDashboardShell', 'system_mutation', 'integrate_into_founder_console', 'Governance mutation state belongs in founder mutation mode.', 'Subordinate.'],
    ['/observatories', 'AMV scope index', 'buildAllAmvScopeStates', 'route_disposition', 'remove_from_navigation', 'Index fragments operating center.', 'Keep route until replacement proven.'],
    ['/signal-vane', 'scoped AMV dashboard', 'ScopedDashboardShell', 'timeline', 'integrate_into_founder_console', 'Signals belong in timeline/evaluation modes.', 'Subordinate.'],
    ['/terminal', 'protected cognitive terminal', '/api/node/bootstrap', 'operations', 'keep_as_data_provider', 'Operational terminal remains protected, not primary console.', 'Keep protected.'],
    ['/user', 'user dashboard', 'UserDashboardClient', 'route_disposition', 'keep_as_data_provider', 'User surface remains separate from founder/root operating center.', 'Keep protected.'],
  ].map(([route, current_role, data_source_api, founder_console_mode, disposition, reason, action_proposed]) => ({
    route,
    current_role,
    data_source_api,
    founder_console_mode: founder_console_mode as FounderRouteDisposition['founder_console_mode'],
    disposition: disposition as FounderRouteDisposition['disposition'],
    reason,
    action_proposed,
  }));
}

function buildField(input: {
  sources: Record<string, FounderConsoleReadResult<unknown>>;
  repairTasks: FounderRepairTask[];
  responseDecision: string;
}): { nodes: FounderFieldNode[]; connections: FounderFieldConnection[] } {
  const sourceState = (key: string): FounderConsoleSourceState => input.sources[key]?.state ?? 'missing';
  const repairFor = (source: string) => input.repairTasks.find((item) => item.source === source)?.title;
  const nodes: FounderFieldNode[] = [
    ['founder', 'Founder / Aptymok', 'owner decisions', 'profile/root access', 'alive', 'field', 'choose next decision'],
    ['amv', 'AMV', 'empty public AMV memory', 'public.sfi_amv_memory', sourceState('sfi_amv_memory'), 'operations', 'rehydration decision required'],
    ['cognitive_twin', 'Cognitive Twin', 'runtime/proposal state', 'epistemic_events/root_audit_events', sourceState('epistemic_events'), 'operations', 'observe/protect'],
    ['worldspect', 'WorldSpect', 'external pressure', 'vw_worldspect_real/worldspect_snapshots', sourceState('worldspect_snapshots'), 'timeline', 'observe WSV-LONG-02'],
    ['scorefriction', 'ScoreFriction', 'cultural friction', 'scorefriction_observations/vectors', sourceState('scorefriction_observations'), 'founder_tasks', 'align evidence'],
    ['mihm', 'MIHM', 'regime interpretation', 'vw_sfi_operational_cycle', sourceState('operationalConsole'), 'field', 'read regime'],
    ['psi', 'PSI', 'persistent signals', 'sfi_lab_analyses/epistemic_events', sourceState('sfi_lab_analyses'), 'timeline', 'observe persistence'],
    ['root', 'ROOT', 'protected operations', 'root_audit_events', sourceState('root_audit_events'), 'operations', 'protect'],
    ['atlas', 'Atlas', 'derived memory', 'derived from evidence/proposals/lab', sourceState('sfi_evidence_trace'), 'atlas', 'derive only'],
    ['repository', 'Repository', 'evidence context', '/repository', 'alive', 'atlas', 'show/protect'],
    ['recovery_queue', 'Recovery Queue', 'pending repair/execution', 'vw_sfi_execution_recovery_queue', sourceState('operationalConsole'), 'founder_tasks', 'prepare/reject/repair'],
    ['attractors', 'Attractors', 'founder/system alignment', 'sfi_declared_attractors/sfi_proposal_alignment', sourceState('sfi_proposal_alignment'), 'founder_tasks', 'align'],
    ['world_attractors', 'World Attractors', 'world pressure clusters', 'worldspect_snapshots', sourceState('worldspect_snapshots'), 'timeline', 'observe'],
    ['mutations', 'Mutations', 'system repair/prune', 'route disposition + repair tasks', input.repairTasks.length ? 'degraded' : 'alive', 'system_mutation', 'review mutation'],
    ['evidence', 'Evidence', 'trace basis', 'sfi_evidence_trace', sourceState('sfi_evidence_trace'), 'evaluation', 'evaluate'],
    ['protected', 'Protected Surfaces', 'access boundary', '/root /terminal /user', 'blocked', 'route_disposition', 'protect'],
  ].map(([id, label, observes, source, state, mode, decisionEnabled]) => ({
    id,
    label,
    observes,
    source,
    state: state as FounderConsoleSourceState,
    evidenceWeight: state === 'alive' ? 0.78 : state === 'empty_live_table' ? 0.18 : 0.36,
    importance: id === 'founder' ? 1 : id === 'worldspect' || id === 'evidence' ? 0.88 : 0.66,
    urgency: state === 'degraded' || state === 'empty_live_table' || state === 'blocked' ? 0.82 : 0.38,
    trust: state === 'alive' ? 0.8 : state === 'backup_reference' ? 0.32 : 0.45,
    mode: mode as FounderFieldNode['mode'],
    decisionEnabled: String(decisionEnabled),
    nextAction: id === 'mutations' ? input.responseDecision : String(decisionEnabled),
    repairState: repairFor(String(source)),
  }));

  const connectionRows: Array<[string, string, number, string]> = [
    ['founder', 'attractors', 0.9, 'declares'],
    ['worldspect', 'timeline', 0.8, 'feeds'],
    ['worldspect', 'evidence', 0.72, 'contextualizes'],
    ['scorefriction', 'evidence', 0.74, 'measures'],
    ['evidence', 'atlas', 0.86, 'derives'],
    ['attractors', 'recovery_queue', 0.82, 'aligns'],
    ['recovery_queue', 'mutations', 0.76, 'requires'],
    ['root', 'protected', 0.92, 'guards'],
    ['amv', 'cognitive_twin', 0.55, 'interprets'],
  ];
  const connections: FounderFieldConnection[] = connectionRows.map(([from, to, strength, relation]) => ({ from, to, strength, relation }));

  return { nodes, connections };
}

async function readTrend(origin?: string) {
  if (!origin) return null;
  try {
    const response = await fetch(new URL('/api/worldspect/trend?days=90&debug=1', origin), { cache: 'no-store' });
    return await response.json() as Row;
  } catch {
    return null;
  }
}

export async function buildFounderConsoleState(origin?: string): Promise<FounderConsoleState> {
  const generatedAt = new Date().toISOString();
  const access = await readAccess();

  const [
    operational,
    sfiResponse,
    graph,
    trend,
    graphNodeCount,
    graphEdgeCount,
    amvMemoryCount,
    backupGraphNodeCount,
    backupGraphEdgeCount,
    backupAmvMemoryCount,
    ...tableResults
  ] = await Promise.all([
    readOperationalConsoleState(),
    generateSfiOperationalResponse().catch((error) => ({ ok: false, decision: 'observe', next_action: error instanceof Error ? error.message : 'sfi_response_failed' })),
    readCanonicalGraphState('sfi'),
    readTrend(origin),
    countRows('graph_nodes'),
    countRows('graph_edges'),
    countRows('sfi_amv_memory'),
    countRows('graph_nodes', 'sfi_backup_20260618'),
    countRows('graph_edges', 'sfi_backup_20260618'),
    countRows('sfi_amv_memory', 'sfi_backup_20260618'),
    ...LIVE_TABLES.map((table) => readRows(table, table === 'root_audit_events' ? 20 : 35)),
  ]);

  const sources: Record<string, FounderConsoleReadResult<unknown>> = {
    operationalConsole: result('readOperationalConsoleState', operational, operational.ok ? 'alive' : 'degraded'),
    sfiResponse: result('generateSfiOperationalResponse', sfiResponse, (sfiResponse as Row).ok === false ? 'degraded' : 'alive'),
    graph: result('/api/graph/state?profile=sfi', graph, graph.sourceState === 'observed' ? 'alive' : 'empty_live_table'),
    trend: result('/api/worldspect/trend?days=90&debug=1', trend, trend ? 'alive' : 'degraded'),
    graph_nodes: result('public.graph_nodes', { rows: graphNodeCount ?? 0 }, graphNodeCount === 0 ? 'empty_live_table' : 'alive'),
    graph_edges: result('public.graph_edges', { rows: graphEdgeCount ?? 0 }, graphEdgeCount === 0 ? 'empty_live_table' : 'alive'),
    sfi_amv_memory: result('public.sfi_amv_memory', { rows: amvMemoryCount ?? 0 }, amvMemoryCount === 0 ? 'empty_live_table' : 'alive'),
  };

  tableResults.forEach((item, index) => {
    sources[LIVE_TABLES[index]] = item;
  });

  VIEW_SOURCES.forEach((view) => {
    const key = view.replace(/^vw_/, '');
    const data = (operational as Row)[key] ?? null;
    if (data) sources[view] = result(view, data, sourceState(data as { ok: boolean; data: unknown; degraded?: boolean }));
  });

  const rawTimeline = tableResults
    .flatMap((item) => timelineFromRows(item.source, rows(item.data)))
    .sort((a, b) => String(b.observed_at ?? '').localeCompare(String(a.observed_at ?? '')))
    .slice(0, 120);
  const timeline = rawTimeline
    .filter(isTrajectoryRelevant)
    .sort((a, b) => {
      const byWeight = timelineWeight(b) - timelineWeight(a);
      return byWeight || String(b.observed_at ?? '').localeCompare(String(a.observed_at ?? ''));
    })
    .slice(0, 60);

  const observationCard = buildObservationCard(timeline[0] ?? null, generatedAt);
  const atlas = atlasFromTimeline(timeline, observationCard);
  const trendDomains = rows(trend?.domains);
  const thinDomains = trendDomains.filter((domain) => domain.status === 'thin' || Number(domain.sample_count ?? 0) < 3);
  const wsvLongRepair = thinDomains.length
    ? repairTask('WSV-LONG-02', 'Append-only per-domain vector timeseries or persistence adjustment', '/api/worldspect/trend', 'degraded', 'WorldSpect current state is usable, but per-domain longitudinal samples remain thin.', 'Owner approval required before backfill or persistence adjustment.', true)
    : null;

  const graphNodesTask = repairTask('GRAPH-NODES-EMPTY', 'Public graph nodes empty', 'public.graph_nodes', graphNodeCount === 0 ? 'empty_live_table' : 'alive', 'Do not render fake graph nodes.', 'Review backup graph as rehydration reference only.', true);
  const graphEdgesTask = repairTask('GRAPH-EDGES-EMPTY', 'Public graph edges empty', 'public.graph_edges', graphEdgeCount === 0 ? 'empty_live_table' : 'alive', 'Do not render fake graph edges.', 'Review backup graph as rehydration reference only.', true);
  const amvTask = repairTask('AMV-MEMORY-EMPTY', 'Public AMV memory empty', 'public.sfi_amv_memory', amvMemoryCount === 0 ? 'empty_live_table' : 'alive', 'Do not render fake AMV memory.', 'Review backup AMV memory as rehydration reference only.', true);
  const backupTasks = [
    repairTask('BACKUP-GRAPH-NODES', 'Backup graph nodes available', 'sfi_backup_20260618.graph_nodes', 'backup_reference', `${backupGraphNodeCount ?? 0} backup rows are reference only.`, 'Owner-approved SQL required for rehydration.', true),
    repairTask('BACKUP-GRAPH-EDGES', 'Backup graph edges available', 'sfi_backup_20260618.graph_edges', 'backup_reference', `${backupGraphEdgeCount ?? 0} backup rows are reference only.`, 'Owner-approved SQL required for rehydration.', true),
    repairTask('BACKUP-AMV-MEMORY', 'Backup AMV memory available', 'sfi_backup_20260618.sfi_amv_memory', 'backup_reference', `${backupAmvMemoryCount ?? 0} backup rows are reference only.`, 'Owner-approved SQL required for rehydration.', true),
  ];

  const repairTasks = [
    ...(graphNodeCount === 0 ? [graphNodesTask] : []),
    ...(graphEdgeCount === 0 ? [graphEdgesTask] : []),
    ...(amvMemoryCount === 0 ? [amvTask] : []),
    ...(wsvLongRepair ? [wsvLongRepair] : []),
    ...backupTasks,
  ];

  const field = buildField({
    sources,
    repairTasks,
    responseDecision: text((sfiResponse as Row).decision, 'observe'),
  });

  const degraded = Object.values(sources).filter((item) => item.state === 'degraded' || item.state === 'empty_live_table' || item.state === 'blocked');
  const alive = Object.values(sources).filter((item) => item.state === 'alive');
  const founderTasks = timeline.filter((item) => ['action_proposals', 'sfi_execution_recovery_queue', 'sfi_proposal_alignment', 'sfi_field_perturbations'].includes(item.source_table)).slice(0, 24);
  const actionCapabilities = buildActionCapabilities({ timeline, founderTasks, repairTasks, observationCard });
  const activeActionCount = actionCapabilities.filter((item) => item.status === 'active').length;

  return {
    ok: access.authorized,
    generated_at: generatedAt,
    access,
    regime: firstText(asRecord((operational as Row).operationalCycle && asRecord((operational as Row).operationalCycle).data), ['operational_regime', 'regime'], 'unknown'),
    degradation: number01(asRecord(asRecord((operational as Row).pipelineLoss).data).loss_ratio, degraded.length ? 0.6 : 0.2),
    urgency: number01(founderTasks.length / 12, degraded.length ? 0.7 : 0.25),
    trust: number01(alive.length / Math.max(1, Object.keys(sources).length), 0.5),
    continuity: number01(rows(sources.worldspect_snapshots?.data).length / 31, 0.3),
    sources,
    field,
    timeline,
    observationCard,
    atlas,
    myPanel: {
      alive: [
        `${alive.length} live sources`,
        ...alive.slice(0, 5).map((item) => item.source),
      ],
      broken: degraded.length ? [
        `${degraded.length} degraded or blocked sources`,
        ...degraded.slice(0, 5).map((item) => `${item.source}: ${item.state}`),
      ] : ['No degraded source detected in current read model.'],
      producing_value: [
        `WorldSpect snapshots: ${rows(sources.worldspect_snapshots?.data).length}`,
        `Founder tasks: ${founderTasks.length}`,
        `Active safe actions: ${activeActionCount}`,
      ],
      repair_required: repairTasks.filter((item) => item.state === 'empty_live_table' || item.state === 'degraded').slice(0, 6).map((item) => item.title),
      prune_candidates: routeDisposition().filter((item) => item.disposition === 'remove_from_navigation' || item.disposition === 'show_degraded_repair').slice(0, 6).map((item) => item.route),
      showable: ['/founder-console', '/world-vector', '/scorefriction', '/repository'],
      protected: ['/founder-console', '/root', '/terminal', '/user'],
      decision_required_now: [
        activeActionCount ? `${activeActionCount} safe action(s) available` : 'No exact safe action available for current selected state',
        text((sfiResponse as Row).next_action, 'observe'),
        ...repairTasks.filter((item) => item.sqlProposalRequired).slice(0, 3).map((item) => item.next_action),
      ],
    },
    founderTasks,
    systemMutations: repairTasks,
    actionCapabilities,
    routeDisposition: routeDisposition(),
    worldSpect: {
      current_state: sources.vw_worldspect_real?.state ?? sources.worldspect_snapshots?.state ?? 'missing',
      snapshot_timeline: rows(sources.worldspect_snapshots?.data).length ? 'alive' : 'missing',
      longitudinal_status: text(trend?.trend_quality, 'missing') as 'missing' | 'thin' | 'usable',
      repair_task: wsvLongRepair,
    },
    graphAmv: {
      graph_nodes: graphNodesTask,
      graph_edges: graphEdgesTask,
      sfi_amv_memory: amvTask,
      backup_rehydration_candidates: backupTasks,
    },
    sqlRequiredBlockers: repairTasks.filter((item) => item.sqlProposalRequired),
  };
}
