import 'server-only';

import { randomUUID } from 'crypto';
import { appendEpistemicEvent } from '@/lib/events/eventStore';
import { recordProposalOutcomeFromObservedReturn } from '@/lib/governance/proposalOutcome';
import { appendOperationalEvent, createActionProposal, recordValue, stringValue, updateActionProposalStatus } from '@/lib/operational/common';
import { isMaterialExternalAction } from '@/lib/execution/governedExecutionClassification';
import { runCognitiveAgent } from '@/lib/sfi/cognitive-runtime/runtimeAgentExecutor';
import type { KernelContext } from '@/lib/sfi/cognitive-runtime/kernelContext';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const AI_EXECUTION_ROUTER_PROPOSAL_ID = '87cc094a-e9df-40e8-9a35-92c679c60ef2';
export const SELF_HEALING_BOOTSTRAP_PROPOSAL_ID = '5e4803b2-0b23-4047-9ba3-38a588c78f82';

const SYSTEM_ACTOR = 'sfi_execution_router';
const MAX_RETRIES_PER_AGENT = 1;

type Row = Record<string, unknown>;
type PersistedExecutionState = 'ASSIGNED' | 'RUNNING' | 'REMEDIATION_REQUIRED' | 'NO_EXECUTOR';

export type GovernedExecutionClass = 'COGNITIVE_INTERNAL' | 'INTERNAL_PLATFORM' | 'EXTERNAL_ACTION';

export type GovernedExecutionAdapter = {
  capabilityId: string;
  name: string;
  domain: string;
  actionsSupported: string[];
  inputContract: string;
  outputContract: string;
  requiredScopes: string[];
  authorityBoundary: string;
  riskClass: 'LOW' | 'MEDIUM' | 'HIGH';
  reversibility: 'REVERSIBLE' | 'BOUNDED' | 'EXTERNAL_DEPENDENT';
  executorRef: string;
  healthStatus: 'AVAILABLE' | 'GATED';
};

export const SFI_GOVERNED_EXECUTION_ADAPTERS: GovernedExecutionAdapter[] = [
  {
    capabilityId: 'cognitive_runtime_v1',
    name: 'SFI Cognitive Runtime',
    domain: 'internal_cognition',
    actionsSupported: ['analyze', 'research', 'reconstruct', 'plan', 'simulate', 'risk', 'opportunity', 'report_readiness'],
    inputContract: 'queued action_proposal + declared objective/context',
    outputContract: 'agent execution trace + observed execution receipt + proposal-scoped RETURN',
    requiredScopes: [],
    authorityBoundary: 'May execute cognitive/internal work after governed queue authorization; no external side effects or canon.',
    riskClass: 'LOW',
    reversibility: 'REVERSIBLE',
    executorRef: 'runCognitiveAgent',
    healthStatus: 'AVAILABLE',
  },
  {
    capabilityId: 'governed_execution_router_v1',
    name: 'Governed Execution Router',
    domain: 'internal_execution_control',
    actionsSupported: ['classify', 'route', 'assign', 'retry', 'reroute', 'record_return'],
    inputContract: 'queued action_proposal',
    outputContract: 'routing event + execution/blocked state + RETURN when execution is observed',
    requiredScopes: [],
    authorityBoundary: 'Cannot self-approve proposals, expand scope, perform unknown external actions, or promote canon.',
    riskClass: 'LOW',
    reversibility: 'REVERSIBLE',
    executorRef: 'dispatchQueuedProposal',
    healthStatus: 'AVAILABLE',
  },
  {
    capabilityId: 'self_healing_bootstrap_v1',
    name: 'Self-healing Capability Bootstrap',
    domain: 'execution_remediation',
    actionsSupported: ['detect_missing_capability', 'reuse_existing', 'open_remediation_child', 'resume_on_future_run'],
    inputContract: 'queued proposal + missing execution capability',
    outputContract: 'deduplicated remediation proposal + parent remains traceable and queued',
    requiredScopes: [],
    authorityBoundary: 'May compose existing internal capabilities automatically. A new external/code mutation capability remains governed and must not be fabricated.',
    riskClass: 'MEDIUM',
    reversibility: 'BOUNDED',
    executorRef: 'openRemediationChild',
    healthStatus: 'AVAILABLE',
  },
];

function proposalPayload(row: Row) {
  return recordValue(recordValue(row.expected_field_delta).payload);
}

function requestedAction(row: Row) {
  return recordValue(proposalPayload(row).requested_action);
}

function proposalTypeOf(row: Row) {
  const expected = recordValue(row.expected_field_delta);
  const proportionality = recordValue(row.proportionality_check);
  return stringValue(row.proposal_type)
    ?? stringValue(expected.proposalType)
    ?? stringValue(expected.proposal_type)
    ?? stringValue(proportionality.proposalType)
    ?? stringValue(proportionality.proposal_type)
    ?? 'unknown';
}

function proposalText(row: Row) {
  const payload = proposalPayload(row);
  const action = requestedAction(row);
  return [row.title, row.description, recordValue(row.expected_field_delta).objective, payload.summary, action.type]
    .map((value) => stringValue(value)?.toLowerCase() ?? '')
    .filter(Boolean)
    .join(' | ');
}

function declaredAdapter(row: Row) {
  const outcome = recordValue(row.outcome);
  const patch = recordValue(outcome.payloadPatch);
  const plan = recordValue(patch.executionPlan);
  const assignment = recordValue(patch.assignment);
  return stringValue(
    assignment.adapterId ?? assignment.adapter ?? assignment.executorRoute ?? assignment.executor_route
      ?? plan.adapterId ?? plan.adapter ?? plan.executorRoute ?? plan.executor_route,
  );
}

export function classifyGovernedProposalWork(row: Row) {
  const id = stringValue(row.id);
  if (id === AI_EXECUTION_ROUTER_PROPOSAL_ID) {
    return { executionClass: 'INTERNAL_PLATFORM' as const, adapterId: 'governed_execution_router_v1', reason: 'The deployed router invocation itself is the bounded internal capability being verified.' };
  }
  if (id === SELF_HEALING_BOOTSTRAP_PROPOSAL_ID) {
    return { executionClass: 'INTERNAL_PLATFORM' as const, adapterId: 'self_healing_bootstrap_v1', reason: 'The deployed remediation path is the bounded internal capability being verified.' };
  }

  const text = proposalText(row);
  const actionType = stringValue(requestedAction(row).type)?.toLowerCase() ?? '';
  const materialExternal = isMaterialExternalAction(actionType, text);
  if (materialExternal) {
    return {
      executionClass: 'EXTERNAL_ACTION' as const,
      adapterId: declaredAdapter(row),
      reason: 'The requested action type or explicit operative wording declares a material external side effect and therefore requires a verified governed adapter.',
    };
  }

  return {
    executionClass: 'COGNITIVE_INTERNAL' as const,
    adapterId: 'cognitive_runtime_v1',
    reason: 'The requested work can be performed as internal cognition/planning/research without a declared material external mutation.',
  };
}

function routeAgentsForProposal(row: Row) {
  const text = proposalText(row);
  const actionType = stringValue(requestedAction(row).type)?.toLowerCase() ?? '';
  if (/(research|investig|evidence|mapping|map_|ecosystem)/.test(`${actionType} ${text}`)) {
    return ['field_observer', 'evidence_hunter', 'temporal_resolver', 'historical_scout', 'context_builder', 'trajectory_agent', 'risk_agent', 'opportunity_agent', 'project_execution_manager'];
  }
  if (/(protocol|operating|plan|stabilization|founder)/.test(`${actionType} ${text}`)) {
    return ['temporal_resolver', 'evidence_hunter', 'context_builder', 'risk_agent', 'opportunity_agent', 'project_execution_manager'];
  }
  if (/(simulat|scenario|counterfactual)/.test(`${actionType} ${text}`)) {
    return ['evidence_hunter', 'context_builder', 'cross_impact', 'friction_field_simulator', 'social_field_simulator', 'economic_field_simulator', 'policy_simulator', 'trajectory_agent', 'risk_agent', 'project_execution_manager'];
  }
  if (/(report|brief|summary|review)/.test(`${actionType} ${text}`)) {
    return ['field_observer', 'evidence_hunter', 'temporal_resolver', 'context_builder', 'risk_agent', 'opportunity_agent', 'project_execution_manager'];
  }
  return ['field_observer', 'evidence_hunter', 'temporal_resolver', 'context_builder', 'risk_agent', 'project_execution_manager'];
}

function buildKernelContext(row: Row, agents: string[]): KernelContext {
  const proposalId = stringValue(row.id) ?? randomUUID();
  return {
    cycleId: proposalId,
    logbookId: 'BR',
    taskId: `proposal:${proposalId}`,
    currentEvent: 'SFI_PROPOSAL_AUTHORIZED',
    evidence: [],
    hypotheses: [],
    contradictions: [],
    simulations: [],
    predictions: [],
    risks: [],
    opportunities: [],
    metadata: {
      objectKey: `proposal:${proposalId}`,
      proposalId,
      objective: stringValue(recordValue(row.expected_field_delta).objective) ?? stringValue(row.description) ?? stringValue(row.title),
      question: stringValue(row.title) ?? 'Governed proposal execution',
      requestedAgents: agents,
      executionAuthority: 'proposal_scope_only',
      canonicalPromotionAllowed: false,
      externalExecutionAllowed: false,
    },
  };
}

async function persistExecutionState(row: Row, input: {
  executionClass: GovernedExecutionClass;
  adapterId: string | null;
  executorId: string | null;
  state: PersistedExecutionState;
  eventId?: string | null;
  missingCapability?: string | null;
  blocker?: string | null;
  blockerOwner?: string | null;
  systemNextAction?: string | null;
}) {
  const proposalId = stringValue(row.id);
  if (!proposalId) return { ok: false as const, error: 'proposal_id_missing' };
  const outcome = recordValue(row.outcome);
  const patch = recordValue(outcome.payloadPatch);
  const priorAssignment = recordValue(patch.assignment);
  const now = new Date().toISOString();
  const assignment = {
    ...priorAssignment,
    executionClass: input.executionClass,
    adapterId: input.adapterId,
    executorId: input.executorId,
    state: input.state,
    assignedAt: stringValue(priorAssignment.assignedAt) ?? now,
    updatedAt: now,
  };
  const payloadPatch: Record<string, unknown> = {
    ...patch,
    assignment,
    executionState: input.state,
    executionBlockedReason: input.blocker ?? null,
    missingCapability: input.missingCapability ?? null,
    blockerOwner: input.blockerOwner ?? null,
    systemNextAction: input.systemNextAction ?? (input.state === 'RUNNING' ? 'EXECUTE_BOUNDED_SCOPE_AND_RECORD_RETURN' : null),
    expectedReturn: 'Observed proposal-scoped RETURN linked to execution evidence.',
    returnPurpose: 'Close the authorized execution loop without promoting model output or execution receipt to truth/canon.',
    closureCondition: 'Observed RETURN is persisted for this proposal and validated before outcome closure/executed_at.',
  };
  if (input.state === 'RUNNING') payloadPatch.executionStartedAt = stringValue(patch.executionStartedAt) ?? now;
  if (input.state === 'REMEDIATION_REQUIRED' || input.state === 'NO_EXECUTOR') payloadPatch.executionBlockedAt = now;

  return updateActionProposalStatus({
    proposalId,
    status: 'queued',
    actorId: SYSTEM_ACTOR,
    isRoot: false,
    systemActor: true,
    proposalType: proposalTypeOf(row),
    expectedStatuses: ['queued'],
    eventId: input.eventId ?? null,
    payloadPatch,
  });
}

async function appendObservedExecutionReceipt(input: {
  proposalId: string;
  executionClass: GovernedExecutionClass;
  adapterId: string;
  executedAgents: string[];
  failedAgents: string[];
  context?: KernelContext;
}) {
  return appendEpistemicEvent({
    eventName: 'SFI_PROPOSAL_EXECUTION_OBSERVED',
    epistemicClass: 'observed',
    confidence: 1,
    occurredAt: new Date().toISOString(),
    source: { sourceId: SYSTEM_ACTOR, sourceType: 'governed_execution_router' },
    logbookId: 'BR',
    lineage: [input.proposalId],
    payload: {
      proposalId: input.proposalId,
      executionClass: input.executionClass,
      adapterId: input.adapterId,
      executedAgents: input.executedAgents,
      failedAgents: input.failedAgents,
      outputCounts: input.context ? {
        evidence: input.context.evidence.length,
        hypotheses: input.context.hypotheses.length,
        simulations: input.context.simulations.length,
        predictions: input.context.predictions.length,
        risks: input.context.risks.length,
        opportunities: input.context.opportunities.length,
      } : null,
      claimBoundary: 'This OBSERVED event attests that bounded execution occurred. Agent/model outputs retain their own DERIVED/SIMULATED epistemic status and are not promoted to observed truth.',
    },
  });
}

async function appendProposalReturn(input: {
  proposalId: string;
  executionClass: GovernedExecutionClass;
  adapterId: string;
  executionEvidenceRef: string;
  summary: string;
}) {
  return appendEpistemicEvent({
    eventName: 'SFI_PROPOSAL_RETURN_RECORDED',
    epistemicClass: 'observed',
    confidence: 1,
    occurredAt: new Date().toISOString(),
    source: { sourceId: SYSTEM_ACTOR, sourceType: 'governed_execution_router' },
    logbookId: 'BR',
    lineage: [input.proposalId, input.executionEvidenceRef],
    payload: {
      proposalId: input.proposalId,
      observed_at: new Date().toISOString(),
      outcome: {
        status: 'EXECUTED_BOUNDED_SCOPE',
        executionClass: input.executionClass,
        adapterId: input.adapterId,
        summary: input.summary,
      },
      evidenceRefs: [input.executionEvidenceRef],
      canonicalPromotionAllowed: false,
    },
  });
}

async function findExistingRemediation(parentProposalId: string, missingCapability: string) {
  const db = createServiceSupabaseClient();
  const read = await db.from('action_proposals').select('*').in('status', ['proposed', 'waiting_evidence', 'design_approved', 'queued']).order('created_at', { ascending: false }).limit(200);
  if (read.error) return null;
  return (read.data ?? []).find((candidate) => {
    const payload = proposalPayload(candidate as Row);
    return stringValue(payload.parentProposalId) === parentProposalId && stringValue(payload.missingCapability) === missingCapability;
  }) ?? null;
}

async function openRemediationChild(row: Row, missingCapability: string, reason: string) {
  const parentProposalId = stringValue(row.id);
  if (!parentProposalId) return { ok: false as const, error: 'parent_proposal_id_missing' };
  const existing = await findExistingRemediation(parentProposalId, missingCapability);
  if (existing) {
    return { ok: true as const, created: false, proposalId: String(existing.id), status: existing.status, missingCapability };
  }

  const event = await appendOperationalEvent({
    eventName: 'execution.remediation.requested',
    actorId: SYSTEM_ACTOR,
    confidence: 1,
    payload: {
      parentProposalId,
      missingCapability,
      reason,
      nextActor: 'ROOT_OR_AUTHORIZED_CONTROLLER',
      nextGate: 'AUTHORIZE_CAPABILITY_REMEDIATION',
      successCriterion: 'A real adapter/capability is verified and the queued parent can be rerouted without scope expansion.',
      canonicalPromotionAllowed: false,
    },
    lineage: [parentProposalId],
  });
  if (!event.ok) return event;

  const created = await createActionProposal({
    proposalType: 'execution_capability_remediation',
    actorId: SYSTEM_ACTOR,
    title: `Remediate execution capability · ${missingCapability}`,
    objective: `Restore progress for queued proposal ${parentProposalId} by reusing or implementing the minimum governed capability ${missingCapability}.`,
    status: 'proposed',
    eventId: String(event.data.id ?? ''),
    payload: {
      parentProposalId,
      missingCapability,
      reason,
      source: 'self_healing_bootstrap_v1',
      requested_action: {
        type: 'build_execution_adapter',
        capabilityId: missingCapability,
        guards: ['reuse_before_build', 'no_scope_expansion', 'bounded_test', 'observed_return_required', 'no_auto_canon'],
      },
      nextActor: 'ROOT_OR_AUTHORIZED_CONTROLLER',
      nextGate: 'AUTHORIZE_CAPABILITY_REMEDIATION',
    },
  });
  if (!created.ok) return created;
  return { ok: true as const, created: true, proposalId: String(created.data.id), status: created.data.status, missingCapability };
}

async function executeInternalPlatform(row: Row, adapterId: string) {
  const proposalId = stringValue(row.id)!;
  const receipt = await appendObservedExecutionReceipt({
    proposalId,
    executionClass: 'INTERNAL_PLATFORM',
    adapterId,
    executedAgents: [],
    failedAgents: [],
  });
  if (!receipt.ok) return receipt;
  const evidenceRef = String(receipt.data.event_id ?? receipt.data.id);
  const returned = await appendProposalReturn({
    proposalId,
    executionClass: 'INTERNAL_PLATFORM',
    adapterId,
    executionEvidenceRef: evidenceRef,
    summary: `${adapterId} is executing in the deployed governed runtime and its bounded health receipt was persisted.`,
  });
  if (!returned.ok) return returned;
  const returnEventId = String(returned.data.event_id ?? returned.data.id);
  const outcome = await recordProposalOutcomeFromObservedReturn({
    proposalId,
    actorId: SYSTEM_ACTOR,
    returnEventId,
    evidenceRefs: [evidenceRef],
    outcomeStatus: 'capability_operational',
    fieldEffect: { adapterId, health: 'AVAILABLE', executionClass: 'INTERNAL_PLATFORM' },
    notes: 'Functional capability observed. Canon remains ROOT-only.',
  });
  return { ok: outcome.ok, state: outcome.ok ? 'RETURN_RECORDED' : 'RETURN_RECORDED_OUTCOME_FAILED', proposalId, adapterId, receipt: evidenceRef, returnEventId, outcome };
}

async function executeCognitiveInternal(row: Row) {
  const proposalId = stringValue(row.id)!;
  const agents = routeAgentsForProposal(row);
  let context = buildKernelContext(row, agents);
  const executedAgents: string[] = [];
  const failedAgents: string[] = [];
  const attempts: Record<string, number> = {};
  const sequence = ['meta_orchestrator', ...agents];

  for (const agentId of sequence) {
    let executed = false;
    for (let attempt = 0; attempt <= MAX_RETRIES_PER_AGENT; attempt += 1) {
      attempts[agentId] = attempt + 1;
      const result = await runCognitiveAgent(agentId, context);
      context = result.context;
      if (result.executed) {
        executed = true;
        break;
      }
    }
    if (executed) executedAgents.push(agentId);
    else failedAgents.push(agentId);
  }

  if (failedAgents.length) {
    const missingCapability = `cognitive_runtime:${failedAgents.join(',')}`;
    const remediation = await openRemediationChild(row, missingCapability, 'One or more registered cognitive executors failed after the bounded retry policy.');
    await persistExecutionState(row, {
      executionClass: 'COGNITIVE_INTERNAL',
      adapterId: 'cognitive_runtime_v1',
      executorId: 'runCognitiveAgent',
      state: 'REMEDIATION_REQUIRED',
      missingCapability,
      blocker: 'REGISTERED_COGNITIVE_EXECUTOR_FAILED',
      blockerOwner: 'ROOT_OR_AUTHORIZED_CONTROLLER',
      systemNextAction: 'REMEDIATE_OR_RESTORE_EXECUTOR_THEN_REROUTE',
    });
    await appendOperationalEvent({
      eventName: 'execution.router.blocked',
      actorId: SYSTEM_ACTOR,
      confidence: 1,
      payload: { proposalId, executionClass: 'COGNITIVE_INTERNAL', failedAgents, executedAgents, attempts, remediation },
      lineage: [proposalId],
    });
    return { ok: false as const, state: 'BLOCKED_EXECUTOR_CAPABILITY', proposalId, executedAgents, failedAgents, attempts, remediation };
  }

  const receipt = await appendObservedExecutionReceipt({
    proposalId,
    executionClass: 'COGNITIVE_INTERNAL',
    adapterId: 'cognitive_runtime_v1',
    executedAgents,
    failedAgents,
    context,
  });
  if (!receipt.ok) return receipt;
  const evidenceRef = String(receipt.data.event_id ?? receipt.data.id);
  const returned = await appendProposalReturn({
    proposalId,
    executionClass: 'COGNITIVE_INTERNAL',
    adapterId: 'cognitive_runtime_v1',
    executionEvidenceRef: evidenceRef,
    summary: `Internal cognitive work executed through ${executedAgents.length} governed agent steps; outputs remain epistemically bounded.`,
  });
  if (!returned.ok) return returned;
  const returnEventId = String(returned.data.event_id ?? returned.data.id);
  const outcome = await recordProposalOutcomeFromObservedReturn({
    proposalId,
    actorId: SYSTEM_ACTOR,
    returnEventId,
    evidenceRefs: [evidenceRef],
    outcomeStatus: 'internal_execution_completed',
    fieldEffect: {
      adapterId: 'cognitive_runtime_v1',
      executedAgents,
      attempts,
      outputCounts: {
        evidence: context.evidence.length,
        hypotheses: context.hypotheses.length,
        simulations: context.simulations.length,
        predictions: context.predictions.length,
        risks: context.risks.length,
        opportunities: context.opportunities.length,
      },
    },
    notes: 'Execution completion is not a truth/canon claim. Longitudinal real-world return remains a separate cycle where the proposal requires it.',
  });
  return { ok: outcome.ok, state: outcome.ok ? 'RETURN_RECORDED' : 'RETURN_RECORDED_OUTCOME_FAILED', proposalId, executedAgents, failedAgents, attempts, evidenceRef, returnEventId, outcome };
}

export async function dispatchQueuedProposal(proposalId: string) {
  const db = createServiceSupabaseClient();
  const read = await db.from('action_proposals').select('*').eq('id', proposalId).maybeSingle();
  if (read.error) return { ok: false as const, state: 'READ_FAILED', proposalId, error: read.error.message };
  if (!read.data) return { ok: false as const, state: 'NOT_FOUND', proposalId };
  if (String(read.data.status ?? '').toLowerCase() !== 'queued') {
    return { ok: false as const, state: 'NOT_QUEUED', proposalId, status: read.data.status ?? null };
  }

  const row = read.data as Row;
  const classification = classifyGovernedProposalWork(row);
  const routed = await appendOperationalEvent({
    eventName: 'execution.router.routed',
    actorId: SYSTEM_ACTOR,
    confidence: 1,
    payload: {
      proposalId,
      executionClass: classification.executionClass,
      adapterId: classification.adapterId,
      reason: classification.reason,
      nextActor: classification.executionClass === 'EXTERNAL_ACTION' ? 'EXECUTION_ADAPTER' : 'SFI_RUNTIME',
      nextGate: classification.executionClass === 'EXTERNAL_ACTION' ? 'ADAPTER_HEALTH' : 'EXECUTE_BOUNDED_SCOPE',
      canonicalPromotionAllowed: false,
    },
    lineage: [proposalId],
  });
  const routeEventId = routed.ok ? String(routed.data.id ?? '') : null;

  if (classification.executionClass === 'INTERNAL_PLATFORM' && classification.adapterId) {
    const adapter = SFI_GOVERNED_EXECUTION_ADAPTERS.find((candidate) => candidate.capabilityId === classification.adapterId) ?? null;
    const assignment = await persistExecutionState(row, {
      executionClass: classification.executionClass,
      adapterId: classification.adapterId,
      executorId: adapter?.executorRef ?? null,
      state: 'RUNNING',
      eventId: routeEventId,
    });
    if (!assignment.ok) return { ok: false as const, state: 'ASSIGNMENT_PERSIST_FAILED', proposalId, details: assignment };
    return executeInternalPlatform(assignment.data as Row, classification.adapterId);
  }
  if (classification.executionClass === 'COGNITIVE_INTERNAL') {
    const assignment = await persistExecutionState(row, {
      executionClass: classification.executionClass,
      adapterId: 'cognitive_runtime_v1',
      executorId: 'runCognitiveAgent',
      state: 'RUNNING',
      eventId: routeEventId,
    });
    if (!assignment.ok) return { ok: false as const, state: 'ASSIGNMENT_PERSIST_FAILED', proposalId, details: assignment };
    return executeCognitiveInternal(assignment.data as Row);
  }

  const adapter = classification.adapterId
    ? SFI_GOVERNED_EXECUTION_ADAPTERS.find((candidate) => candidate.capabilityId === classification.adapterId && candidate.healthStatus === 'AVAILABLE')
    : null;
  if (adapter && adapter.domain !== 'internal_cognition' && adapter.domain !== 'internal_execution_control' && adapter.domain !== 'execution_remediation') {
    const missingCapability = `dispatcher:${adapter.capabilityId}`;
    const remediation = await openRemediationChild(row, missingCapability, 'The governed adapter is registered but no dispatcher implementation is available for this external domain.');
    await persistExecutionState(row, {
      executionClass: classification.executionClass,
      adapterId: adapter.capabilityId,
      executorId: adapter.executorRef,
      state: 'NO_EXECUTOR',
      eventId: routeEventId,
      missingCapability,
      blocker: 'DISPATCHER_NOT_IMPLEMENTED_FOR_ADAPTER',
      blockerOwner: 'ROOT_OR_AUTHORIZED_CONTROLLER',
      systemNextAction: 'AUTHORIZE_OR_IMPLEMENT_BOUNDED_DISPATCHER',
    });
    return { ok: false as const, state: 'NO_EXECUTOR', proposalId, adapterId: adapter.capabilityId, remediation };
  }

  const missingCapability = classification.adapterId ?? `external_adapter:${stringValue(requestedAction(row).type) ?? 'material_action'}`;
  const remediation = await openRemediationChild(row, missingCapability, classification.reason);
  await persistExecutionState(row, {
    executionClass: classification.executionClass,
    adapterId: classification.adapterId,
    executorId: null,
    state: 'REMEDIATION_REQUIRED',
    eventId: routeEventId,
    missingCapability,
    blocker: 'MISSING_EXECUTION_ADAPTER',
    blockerOwner: 'ROOT_OR_AUTHORIZED_CONTROLLER',
    systemNextAction: remediation.ok ? 'REVIEW_REMEDIATION_PROPOSAL' : 'REPAIR_REMEDIATION_PERSISTENCE_OR_REGISTER_ADAPTER',
  });
  await appendOperationalEvent({
    eventName: 'execution.router.blocked',
    actorId: SYSTEM_ACTOR,
    confidence: 1,
    payload: {
      proposalId,
      executionClass: classification.executionClass,
      adapterId: classification.adapterId,
      state: 'BLOCKED_EXECUTOR_CAPABILITY',
      missingCapability,
      remediation,
      nextActor: 'ROOT_OR_AUTHORIZED_CONTROLLER',
      nextGate: 'AUTHORIZE_CAPABILITY_REMEDIATION',
    },
    lineage: [proposalId],
  });
  return { ok: false as const, state: 'BLOCKED_EXECUTOR_CAPABILITY', proposalId, missingCapability, remediation };
}

export async function runGovernedExecutionRouter(input: { limit?: number; proposalIds?: string[] } = {}) {
  const db = createServiceSupabaseClient();
  const limit = Math.max(1, Math.min(25, input.limit ?? 10));
  let query = db.from('action_proposals').select('id,status').eq('status', 'queued').order('created_at', { ascending: true }).limit(limit);
  if (input.proposalIds?.length) query = query.in('id', input.proposalIds);
  const read = await query;
  if (read.error) return { ok: false as const, processed: 0, results: [], error: read.error.message };

  const results: unknown[] = [];
  for (const row of read.data ?? []) {
    results.push(await dispatchQueuedProposal(String(row.id)));
  }
  return {
    ok: true as const,
    processed: results.length,
    results,
    adapters: SFI_GOVERNED_EXECUTION_ADAPTERS.map((adapter) => ({ capabilityId: adapter.capabilityId, healthStatus: adapter.healthStatus, domain: adapter.domain })),
  };
}
