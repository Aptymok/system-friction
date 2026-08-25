import 'server-only';

import { classifyProposalDecision, controllerCanDecideProposal, type ProposalDecisionClass } from '@/lib/governance/proposalDecisionAuthority';
import { normalizeProposalState } from '@/lib/governance/proposalLifecycle';
import { readRootReportHealth, readRootReportInbox } from '@/lib/reports/rootReportInbox';
import { SFI_AGENTIC_CAPABILITIES } from '@/lib/sfi/agenticCapabilityRegistry';
import { SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY } from '@/lib/sfi/cognitive-runtime/convergedRegistry';
import { readObservedSfiCognitiveRuntime } from '@/lib/sfi/cognitive-runtime/observedRuntime';
import { readUniversalOpenCycles } from '@/lib/sfi/universalSignalCycle';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export type WorkboardAuthority = 'root' | 'controller' | null;
export type ExecutionAdapterState = 'BOUND_UNVERIFIED' | 'MISSING_EXECUTION_ADAPTER' | 'NOT_APPLICABLE';

type Row = Record<string, unknown>;

export const RESERVED_CAPABILITY_PROPOSALS = [
  { id: '87cc094a-e9df-40e8-9a35-92c679c60ef2', name: 'AI Execution Router' },
  { id: '5e4803b2-0b23-4047-9ba3-38a588c78f82', name: 'Self-healing capability bootstrap' },
] as const;

const GOVERNED_FOUNDATION_PROPOSALS = [
  { id: 'fafd0dc4-0ade-4f5d-ac3c-1efebe4e8abd', name: 'Consola de ciclo end-to-end' },
  { id: '25061b67-9eb2-49e5-b192-bebe5aa796ce', name: 'Multi-actor' },
  { id: '95f9c1d0-3626-4bac-82dd-cee6bb462b7c', name: 'Delegación progresiva' },
] as const;

function rec(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}
function arr(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function rows(value: unknown): Row[] { return arr(value).filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)); }
function text(value: unknown, fallback = '') { return typeof value === 'string' && value.trim() ? value.trim() : fallback; }
function unique(values: Array<string | null | undefined>) { return [...new Set(values.filter((value): value is string => Boolean(value && value.trim())))]; }
function createdAt(row: Row) { return text(row.created_at ?? row.occurred_at ?? row.updated_at) || null; }

function proposalText(row: Row) {
  const expected = rec(row.expected_field_delta);
  const payload = rec(expected.payload);
  const proportionality = rec(row.proportionality_check);
  return [row.title, row.description, row.proposal_type, expected.proposalType, expected.proposal_type, expected.objective, payload.proposalType, payload.proposal_type, proportionality.proposalType, proportionality.proposal_type]
    .map((value) => text(value).toLowerCase()).filter(Boolean).join(' | ');
}

function proposalType(row: Row) {
  const expected = rec(row.expected_field_delta);
  const proportionality = rec(row.proportionality_check);
  return text(row.proposal_type ?? expected.proposalType ?? expected.proposal_type ?? proportionality.proposalType ?? proportionality.proposal_type, 'unknown');
}

function executionSupportAgents(row: Row) {
  const haystack = proposalText(row);
  const ids = new Set<string>(['project_execution_manager']);
  if (/mem_estruc|memory|memoria|cognitive twin|amv|identity/.test(haystack)) {
    ['field_observer', 'evidence_hunter', 'temporal_resolver', 'reality_calibration'].forEach((id) => ids.add(id));
  }
  if (/world|field|observ/.test(haystack)) ['field_observer', 'risk_agent', 'opportunity_agent', 'reality_calibration'].forEach((id) => ids.add(id));
  if (/risk|riesgo|opportun|oportunidad/.test(haystack)) ['risk_agent', 'opportunity_agent'].forEach((id) => ids.add(id));
  if (/report|reporte/.test(haystack)) ['field_observer', 'evidence_hunter', 'reality_calibration'].forEach((id) => ids.add(id));
  const registered = new Set(SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.map((agent) => agent.id));
  return [...ids].filter((id) => registered.has(id));
}

function declaredExecutor(row: Row) {
  const outcome = rec(row.outcome);
  const patch = rec(outcome.payloadPatch);
  const plan = rec(patch.executionPlan);
  const assignment = rec(patch.assignment);
  return text(
    assignment.executorId ?? assignment.executor_id ?? assignment.executor ?? assignment.route
      ?? plan.executorId ?? plan.executor_id ?? plan.executor ?? plan.executorRoute ?? plan.adapter,
  ) || null;
}

function executionReadiness(row: Row) {
  const state = normalizeProposalState(row.status);
  if (!['queued', 'design_approved'].includes(state)) {
    return { state: 'NOT_IN_EXECUTION_QUEUE', coordinator: null, supportingAgents: [], executor: null, adapterState: 'NOT_APPLICABLE' as ExecutionAdapterState, assignmentState: 'NOT_APPLICABLE', dispatchAllowed: false };
  }
  const executor = declaredExecutor(row);
  return {
    state: state === 'design_approved' ? 'LEGACY_AUTHORIZED_NOT_QUEUED' : 'AWAITING_EXECUTOR_RETURN',
    coordinator: 'project_execution_manager',
    supportingAgents: executionSupportAgents(row),
    executor,
    adapterState: executor ? 'BOUND_UNVERIFIED' as ExecutionAdapterState : 'MISSING_EXECUTION_ADAPTER' as ExecutionAdapterState,
    assignmentState: executor ? 'DECLARED_UNVERIFIED' : 'UNASSIGNED',
    dispatchAllowed: false,
    boundary: executor
      ? 'An executor is declared in persisted proposal state but this workboard does not dispatch it; the binding must be verified by the governed execution path.'
      : 'No proposal-specific execution adapter is persisted. Cognitive agents may support analysis/readiness but are not treated as mutation executors.',
  };
}

function decisionActor(row: Row) {
  const outcome = rec(row.outcome);
  return {
    id: text(outcome.actorId) || null,
    label: text(outcome.actorLabel) || null,
    authority: text(outcome.decisionAuthority) || null,
  };
}

function outcomeState(row: Row) {
  const outcome = rec(row.outcome);
  const patch = rec(outcome.payloadPatch);
  return {
    recorded: patch.outcomeRecorded === true || outcome.outcomeRecorded === true,
    status: text(patch.outcomeStatus ?? outcome.outcomeStatus) || null,
    promotionReceipt: rec(outcome.promotionReceipt),
    evidenceRefs: arr(patch.evidenceRefs ?? outcome.evidenceRefs).filter((value): value is string => typeof value === 'string'),
  };
}

function proposalItem(row: Row) {
  const state = normalizeProposalState(row.status);
  return {
    id: text(row.id),
    title: text(row.title, proposalType(row)),
    proposalType: proposalType(row),
    status: state,
    rawStatus: row.status ?? null,
    riskLevel: text(row.risk_level, 'unknown'),
    decisionClass: classifyProposalDecision(row),
    decisionActor: decisionActor(row),
    createdAt: createdAt(row),
    executedAt: text(row.executed_at) || null,
    execution: executionReadiness(row),
    outcome: outcomeState(row),
  };
}

function allowedProposalRows(source: Row[], authority: WorkboardAuthority) {
  if (authority === 'root') return source;
  if (authority === 'controller') return source.filter((row) => controllerCanDecideProposal(row));
  return [];
}

function extractRiskOpportunity(runRows: Row[]) {
  const items: Array<{ id: string; kind: 'risk' | 'opportunity'; text: string; epistemicClass: string; sourceRunId: string; createdAt: string | null }> = [];
  for (const run of runRows) {
    const envelope = rec(run.output_envelope);
    const buckets: Array<['risk' | 'opportunity', unknown]> = [
      ['risk', envelope.risks],
      ['opportunity', envelope.opportunities],
    ];
    for (const [kind, value] of buckets) {
      rows(value).slice(0, 8).forEach((item, index) => {
        const statement = text(item.statement ?? item.title ?? item.description ?? item.risk ?? item.opportunity);
        if (!statement) return;
        items.push({
          id: `${text(run.id, 'run')}:${kind}:${index}`,
          kind,
          text: statement,
          epistemicClass: text(item.epistemicClass ?? item.epistemic_class, 'UNSPECIFIED_RUNTIME_OUTPUT'),
          sourceRunId: text(run.id),
          createdAt: createdAt(run),
        });
      });
    }
  }
  return items.slice(0, 16);
}

function reservedCapabilityState(allRows: Row[]) {
  return RESERVED_CAPABILITY_PROPOSALS.map((definition) => {
    const row = allRows.find((item) => text(item.id) === definition.id) ?? null;
    const state = row ? normalizeProposalState(row.status) : 'unknown';
    return {
      ...definition,
      status: row ? state : 'NOT_FOUND',
      executionAuthorized: row ? ['queued', 'accepted'].includes(state) : false,
      implementationPerformedByWorkboard: false,
      boundary: 'Observed governance gate only. This workboard never activates the reserved capability itself.',
    };
  });
}

function foundationState(allRows: Row[]) {
  return GOVERNED_FOUNDATION_PROPOSALS.map((definition) => {
    const row = allRows.find((item) => text(item.id) === definition.id) ?? null;
    return { ...definition, status: row ? normalizeProposalState(row.status) : 'NOT_FOUND' };
  });
}

export async function readRootOperationalWorkboard(input: { authority: WorkboardAuthority }) {
  const db = createServiceSupabaseClient();
  const reservedIds = RESERVED_CAPABILITY_PROPOSALS.map((item) => item.id);
  const foundationIds = GOVERNED_FOUNDATION_PROPOSALS.map((item) => item.id);

  const [recentProposals, pinnedProposals, reportInbox, runtime, openCycles, recentRuns, returnEvents] = await Promise.all([
    db.from('action_proposals').select('*').order('created_at', { ascending: false }).limit(180),
    db.from('action_proposals').select('*').in('id', [...reservedIds, ...foundationIds]),
    readRootReportInbox(80),
    readObservedSfiCognitiveRuntime(),
    readUniversalOpenCycles(24),
    db.from('sfi_cognitive_twin_runs').select('id,task_id,role,status,objective,output_envelope,evidence_refs,limitations,created_at,finished_at').order('created_at', { ascending: false }).limit(80),
    db.from('epistemic_events').select('event_id,event_name,epistemic_class,confidence,payload,occurred_at,lineage,source').in('event_name', ['SFI_UNIVERSAL_RETURN_RECORDED', 'acp.proposal.outcome_recorded']).order('sequence', { ascending: false }).limit(40),
  ]);

  const reportHealth = await readRootReportHealth(reportInbox);
  const proposalWarnings = [recentProposals.error?.message, pinnedProposals.error?.message].filter((value): value is string => Boolean(value));
  const allRowsById = new Map<string, Row>();
  [...rows(recentProposals.data), ...rows(pinnedProposals.data)].forEach((row) => {
    const id = text(row.id);
    if (id) allRowsById.set(id, row);
  });
  const allRows = [...allRowsById.values()];
  const visibleRows = allowedProposalRows(allRows, input.authority);

  const decisions = visibleRows
    .filter((row) => ['proposed', 'waiting_evidence', 'conflicted'].includes(normalizeProposalState(row.status)))
    .map(proposalItem);
  const executions = visibleRows
    .filter((row) => ['design_approved', 'queued'].includes(normalizeProposalState(row.status)))
    .map(proposalItem);
  const resolved = visibleRows
    .filter((row) => ['accepted', 'rejected', 'frozen', 'superseded'].includes(normalizeProposalState(row.status)))
    .map(proposalItem);
  const canonCandidates = input.authority === 'root'
    ? allRows.filter((row) => {
      const item = outcomeState(row);
      return normalizeProposalState(row.status) === 'accepted' && item.recorded && Object.keys(item.promotionReceipt).length === 0;
    }).map(proposalItem)
    : [];
  const twinProposals = visibleRows.filter((row) => /twin|cognitive/.test(proposalText(row))).map(proposalItem).slice(0, 20);

  const blockedReports = reportHealth.lanes.filter((lane) => ['CURRENT_BLOCKED', 'MISSING_CURRENT_PERIOD', 'NEVER_GENERATED'].includes(lane.state));
  const executionGaps = executions.filter((item) => item.execution.adapterState === 'MISSING_EXECUTION_ADAPTER');
  const runtimeWarnings = runtime.agents
    .filter((agent) => agent.status === 'missing' || agent.status === 'degraded')
    .flatMap((agent) => agent.evidence.warnings.map((warning) => `${agent.id}:${warning}`));
  const warnings = unique([
    ...proposalWarnings,
    recentRuns.error ? `sfi_cognitive_twin_runs:${recentRuns.error.message}` : null,
    returnEvents.error ? `epistemic_events:${returnEvents.error.message}` : null,
    ...reportHealth.warnings,
    ...openCycles.warnings,
    ...runtimeWarnings,
  ]).slice(0, 40);

  const blockers = [
    ...executionGaps.map((item) => ({ id: `executor:${item.id}`, kind: 'execution_adapter', title: item.title, state: item.execution.adapterState, detail: item.execution.boundary, proposalId: item.id })),
    ...blockedReports.map((lane) => ({ id: `report:${lane.key}`, kind: 'report_lane', title: lane.label, state: lane.state, detail: lane.lastStatus ?? 'No current-period report', proposalId: null })),
    ...runtime.agents.filter((agent) => agent.status === 'missing' || agent.status === 'degraded').map((agent) => ({ id: `agent:${agent.id}`, kind: 'agent_runtime', title: agent.name, state: agent.status.toUpperCase(), detail: agent.evidence.warnings[0] ?? 'Runtime support is incomplete.', proposalId: null })),
  ].slice(0, 40);

  const runRows = rows(recentRuns.data);
  const returns = rows(returnEvents.data).map((event) => ({
    id: text(event.event_id),
    eventName: text(event.event_name),
    epistemicClass: text(event.epistemic_class, 'missing'),
    confidence: typeof event.confidence === 'number' ? event.confidence : null,
    occurredAt: text(event.occurred_at) || null,
    payload: rec(event.payload),
    lineage: arr(event.lineage).filter((value): value is string => typeof value === 'string'),
  }));

  return {
    generatedAt: new Date().toISOString(),
    authority: input.authority,
    contract: {
      flow: ['proposal', 'authorization', 'routing', 'assignment', 'execution', 'return', 'calibration', 'learning', 'canon_or_close'],
      routingMode: 'OBSERVE_AND_MATCH_ONLY',
      autoDispatch: false,
      selfHealing: false,
      canonAuthority: 'ROOT_ONLY',
      principle: 'The workboard makes handoffs and missing execution adapters visible. It does not treat cognitive support agents as mutation executors and does not activate ungoverned reserved capabilities.',
    },
    summary: {
      decisions: decisions.length,
      executions: executions.length,
      executionAdapterGaps: executionGaps.length,
      openUniversalCycles: openCycles.universal.length,
      returns: returns.length,
      canonCandidates: canonCandidates.length,
      reports: reportInbox.items.length,
      blockedReportLanes: blockedReports.length,
      runtime: runtime.summary,
      registeredAgents: runtime.contract.registeredAgents,
      executorAgents: runtime.contract.executorAgents,
      warnings: warnings.length,
    },
    decisions,
    executions,
    blockers,
    twinProposals,
    reports: {
      health: reportHealth,
      recent: reportInbox.items.slice(0, 12).map((item) => ({
        id: item.id,
        category: item.category,
        cadence: item.cadence,
        scheduleKey: item.scheduleKey,
        title: item.title,
        body: item.body,
        status: item.status,
        createdAt: item.createdAt,
        evidence: item.evidence,
        warnings: item.warnings,
        approvalQueue: item.approvalQueue,
      })),
    },
    riskOpportunity: extractRiskOpportunity(runRows),
    returns,
    canonCandidates,
    recentResolved: resolved.slice(0, 20),
    openCycles: { universal: openCycles.universal.slice(0, 12), worldHypotheses: rows(openCycles.worldHypotheses).slice(0, 12) },
    runtime: {
      status: runtime.status,
      summary: runtime.summary,
      registeredAgents: runtime.contract.registeredAgents,
      executorAgents: runtime.contract.executorAgents,
      agents: runtime.agents.map((agent) => ({ id: agent.id, name: agent.name, layer: agent.layer, status: agent.status, authorityLevel: agent.authorityLevel })),
      agenticCapabilities: SFI_AGENTIC_CAPABILITIES.map((capability) => ({ id: capability.id, route: capability.route, approvalRequired: capability.approvalRequired, executes: capability.executes })),
    },
    governanceGates: {
      foundation: foundationState(allRows),
      reservedCapabilities: reservedCapabilityState(allRows),
    },
    warnings,
  };
}
