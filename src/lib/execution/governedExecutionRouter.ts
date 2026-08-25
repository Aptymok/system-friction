import 'server-only';

import { appendOperationalEvent, recordValue } from '@/lib/operational/common';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { executionAdapterById, executionAdapterForAction, type ExecutionAdapterDefinition } from './executionAdapterRegistry';

type Row = Record<string, unknown>;
type RouterState = 'AUTHORIZED' | 'ROUTING' | 'DECOMPOSED' | 'ASSIGNED' | 'EXECUTING' | 'AWAITING_RETURN' | 'RETURN_OBSERVED' | 'CALIBRATING' | 'VALIDATED' | 'FAILED' | 'BLOCKED_EXECUTOR_CAPABILITY' | 'ESCALATED' | 'CLOSED';

const RESERVED_ROUTER_PROPOSAL = '87cc094a-e9df-40e8-9a35-92c679c60ef2';
const RESERVED_SELF_HEAL_PROPOSAL = '5e4803b2-0b23-4047-9ba3-38a588c78f82';

function text(value: unknown) { return typeof value === 'string' && value.trim() ? value.trim() : null; }
function lower(value: unknown) { return text(value)?.toLowerCase() ?? ''; }
function row(value: unknown): Row { return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}; }

function proposalIntent(proposal: Row) {
  const expected = row(proposal.expected_field_delta);
  const payload = row(expected.payload);
  const requestedAction = row(payload.requested_action);
  const direct = text(requestedAction.type) ?? text(payload.action) ?? text(payload.accion) ?? text(expected.action);
  const haystack = [proposal.title, proposal.description, proposal.proposal_type, expected.proposalType, payload.summary, payload.objective]
    .map(lower).filter(Boolean).join(' | ');
  return { direct, requestedAction, payload, haystack };
}

function inferDomainAndAdapter(proposal: Row): { domain: string; adapter: ExecutionAdapterDefinition | null; requiredCapability: string } {
  const intent = proposalIntent(proposal);
  const directAdapter = executionAdapterForAction(intent.direct);
  if (directAdapter) return { domain: directAdapter.domain, adapter: directAdapter, requiredCapability: directAdapter.id };

  if (proposal.id === RESERVED_ROUTER_PROPOSAL || proposal.id === RESERVED_SELF_HEAL_PROPOSAL) {
    const adapter = executionAdapterById('internal_site_development_executor');
    return { domain: 'internal_site_development', adapter, requiredCapability: 'internal_site_development_executor' };
  }
  if (/ct[-_ ]?a01|cognitive twin|ct_reentry|decision transfer|decision_transfer/.test(intent.haystack)) {
    const adapter = executionAdapterById('ct_reentry_decision_transfer');
    return { domain: 'cognitive_twin', adapter, requiredCapability: 'ct_reentry_decision_transfer' };
  }
  if (/repository|github|vercel|frontend|site|route|endpoint|api|code|código|deploy|deployment|root visibility|mem_estruc/.test(intent.haystack)) {
    const adapter = executionAdapterById('internal_site_development_executor');
    return { domain: 'internal_site_development', adapter, requiredCapability: 'internal_site_development_executor' };
  }
  if (/sociotechnical_simulation/.test(intent.haystack)) {
    const adapter = executionAdapterById('method_lab_sociotechnical');
    return { domain: 'method_lab', adapter, requiredCapability: 'method_lab_sociotechnical' };
  }
  if (/economic_simulation/.test(intent.haystack)) {
    const adapter = executionAdapterById('method_lab_economic');
    return { domain: 'method_lab', adapter, requiredCapability: 'method_lab_economic' };
  }
  return { domain: 'unclassified', adapter: null, requiredCapability: `unclassified:${text(proposal.proposal_type) ?? 'unknown'}` };
}

function riskOf(proposal: Row) {
  const risk = lower(proposal.risk_level);
  if (risk === 'critical' || risk === 'high') return risk;
  if (risk === 'medium') return 'medium';
  return 'low';
}

function routerSnapshot(input: {
  state: RouterState;
  proposal: Row;
  domain: string;
  adapter: ExecutionAdapterDefinition | null;
  requiredCapability: string;
  remediationProposalId?: string | null;
  question?: string | null;
  nextGate?: string | null;
}) {
  const risk = riskOf(input.proposal);
  return {
    contract: 'SFI-GOVERNED-EXECUTION-ROUTER-1.0',
    state: input.state,
    routedAt: new Date().toISOString(),
    domain: input.domain,
    risk,
    reversibility: input.adapter?.reversibility ?? 'unknown',
    authority: risk === 'high' || risk === 'critical' ? 'ROOT_REQUIRED' : 'GOVERNED_DELEGATION_ALLOWED',
    nextActor: input.state === 'BLOCKED_EXECUTOR_CAPABILITY' ? 'self_healing_capability_bootstrap' : 'project_execution_manager',
    nextGate: input.nextGate ?? (input.state === 'BLOCKED_EXECUTOR_CAPABILITY' ? 'remediation_approval' : input.adapter?.runtimeBinding === 'EXTERNAL_PULL' ? 'external_executor_pull' : 'adapter_input_contract'),
    requiredCapability: input.requiredCapability,
    assignment: input.adapter ? {
      adapter: input.adapter.id,
      executor: input.adapter.executorRef,
      executorRef: input.adapter.executorRef,
      route: input.adapter.route,
      runtimeBinding: input.adapter.runtimeBinding,
      inputContract: input.adapter.inputContract,
      outputContract: input.adapter.outputContract,
      requiredScopes: input.adapter.requiredScopes,
    } : null,
    remediationProposalId: input.remediationProposalId ?? null,
    specificDecisionQuestion: input.question ?? null,
    stopConditions: ['scope_change_required', 'risk_exceeds_authorized_boundary', 'material_evidence_contradiction', 'executor_capability_missing', 'return_not_observed'],
    returnContract: { required: true, proposalScoped: true, evidenceRefsRequired: true, canonicalPromotionAllowed: false },
  };
}

async function writeRouterState(proposal: Row, snapshot: ReturnType<typeof routerSnapshot>) {
  const db = createServiceSupabaseClient();
  const outcome = recordValue(proposal.outcome);
  const patch = recordValue(outcome.payloadPatch);
  const nextOutcome = { ...outcome, payloadPatch: { ...patch, executionRouter: snapshot, assignment: snapshot.assignment ?? patch.assignment ?? null }, updatedAt: new Date().toISOString() };
  const update = await db.from('action_proposals').update({ outcome: nextOutcome, updated_at: new Date().toISOString() }).eq('id', proposal.id).eq('status', 'queued').select('id,status,outcome').maybeSingle();
  if (update.error) return { ok: false as const, error: update.error.message };
  const event = await appendOperationalEvent({
    eventName: 'execution.router.state_changed',
    actorId: 'sfi:meta_orchestrator',
    confidence: 1,
    payload: { proposal_id: proposal.id, ...snapshot },
    lineage: [String(proposal.id), ...(snapshot.remediationProposalId ? [snapshot.remediationProposalId] : [])],
  });
  return { ok: true as const, update: update.data, event: event.ok ? event.data : event };
}

async function findOrCreateRemediation(parent: Row, domain: string, requiredCapability: string) {
  const db = createServiceSupabaseClient();
  const existing = await db.from('action_proposals')
    .select('id,status,title,expected_field_delta')
    .eq('proposal_type', 'execution_capability_remediation')
    .in('status', ['proposed', 'waiting_evidence', 'design_approved', 'queued'])
    .contains('expected_field_delta', { payload: { parentProposalId: String(parent.id), requiredCapability } })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing.error) return { ok: false as const, error: existing.error.message };
  if (existing.data) return { ok: true as const, proposal: existing.data, created: false };

  const title = `Remediar capacidad faltante · ${requiredCapability}`;
  const expected = {
    proposalType: 'execution_capability_remediation',
    payload: {
      source: 'self_healing_capability_bootstrap',
      parentProposalId: String(parent.id),
      requiredCapability,
      domain,
      observedProblem: `La propuesta autorizada ${String(parent.id)} no tiene un adapter ejecutor BOUND para completar su alcance.`,
      requestedAction: {
        type: 'capability_remediation',
        searchReuseBeforeBuild: true,
        buildMinimalAdapterIfNeeded: true,
        testBounded: true,
        registerCapabilityAfterVerification: true,
        resumeParentAfterObservedReturn: true,
      },
      successCriteria: ['adapter BOUND or verified EXTERNAL_PULL contract', 'bounded test passes', 'field observation recorded', 'reality calibration recorded', 'parent can resume without scope expansion'],
      rollback: 'Disable/unregister the new adapter binding while preserving lineage and evidence.',
      decision_authority: 'root_only',
    },
  };
  const insert = await db.from('action_proposals').insert({
    proposal_type: 'execution_capability_remediation',
    title,
    description: `SFI observó una capacidad ejecutora faltante para ${domain}. Se solicita autorizar la remediación mínima y verificable de ${requiredCapability}.`,
    objective: `Restaurar el flujo del proposal ${String(parent.id)} sin ampliar autoridad ni fingir ejecución.`,
    status: 'proposed',
    risk_level: 'medium',
    expected_field_delta: expected,
    proportionality_check: { proposalType: 'execution_capability_remediation', parentProposalId: String(parent.id), approvalRequired: true, riskAssessmentState: 'MEDIUM_INTERNAL_CHANGE' },
    approval_required: true,
  }).select('*').single();
  if (insert.error || !insert.data) return { ok: false as const, error: insert.error?.message ?? 'remediation_insert_failed' };
  await appendOperationalEvent({
    eventName: 'execution.self_healing.remediation_proposed',
    actorId: 'sfi:self_healing_capability_bootstrap',
    confidence: 1,
    payload: { parent_proposal_id: parent.id, remediation_proposal_id: insert.data.id, required_capability: requiredCapability, domain },
    lineage: [String(parent.id), String(insert.data.id)],
  });
  return { ok: true as const, proposal: insert.data, created: true };
}

export async function routeQueuedProposal(proposal: Row, options: { selfHealingAuthorized: boolean }) {
  const { domain, adapter, requiredCapability } = inferDomainAndAdapter(proposal);
  const risk = riskOf(proposal);
  if (risk === 'high' || risk === 'critical') {
    const snapshot = routerSnapshot({ state: 'ESCALATED', proposal, domain, adapter, requiredCapability, question: '¿Autoriza ROOT este alcance de alto riesgo antes de cualquier ejecución?' });
    return writeRouterState(proposal, snapshot);
  }
  if (!adapter || adapter.runtimeBinding === 'MISSING') {
    if (!options.selfHealingAuthorized) {
      const snapshot = routerSnapshot({
        state: 'BLOCKED_EXECUTOR_CAPABILITY', proposal, domain, adapter, requiredCapability,
        nextGate: 'self_healing_governance',
        question: `Se observa capacidad faltante ${requiredCapability}, pero el bootstrap self-healing no tiene autorización vigente. ¿Autorizar esa capacidad antes de remediar?`,
      });
      return writeRouterState(proposal, snapshot);
    }
    const remediation = await findOrCreateRemediation(proposal, domain, requiredCapability);
    const remediationId = remediation.ok ? String(remediation.proposal.id) : null;
    const snapshot = routerSnapshot({
      state: 'BLOCKED_EXECUTOR_CAPABILITY', proposal, domain, adapter, requiredCapability, remediationProposalId: remediationId,
      question: `Se observa capacidad faltante ${requiredCapability}. ¿Autorizar remediación mínima y reanudación automática del ciclo padre?`,
    });
    return writeRouterState(proposal, snapshot);
  }
  const snapshot = routerSnapshot({ state: 'ASSIGNED', proposal, domain, adapter, requiredCapability });
  return writeRouterState(proposal, snapshot);
}

export async function runGovernedExecutionRouterCycle(limit = 50) {
  const db = createServiceSupabaseClient();
  const routerGate = await db.from('action_proposals').select('id,status').eq('id', RESERVED_ROUTER_PROPOSAL).maybeSingle();
  const selfHealGate = await db.from('action_proposals').select('id,status').eq('id', RESERVED_SELF_HEAL_PROPOSAL).maybeSingle();
  const routerAuthorized = routerGate.data?.status === 'queued' || routerGate.data?.status === 'accepted';
  const selfHealingAuthorized = selfHealGate.data?.status === 'queued' || selfHealGate.data?.status === 'accepted';
  if (!routerAuthorized) return { ok: true as const, active: false, reason: 'execution_router_not_governed_authorized', routed: 0, results: [] };

  const queued = await db.from('action_proposals').select('*').eq('status', 'queued').order('created_at', { ascending: true }).limit(Math.max(1, Math.min(limit, 100)));
  if (queued.error) return { ok: false as const, active: true, error: queued.error.message, routed: 0, results: [] };
  const rows = (queued.data ?? []) as Row[];
  const results = [];
  for (const proposal of rows) {
    const result = await routeQueuedProposal(proposal, { selfHealingAuthorized });
    results.push({ proposalId: String(proposal.id), ...result });
  }
  return {
    ok: true as const,
    active: true,
    routerProposalId: RESERVED_ROUTER_PROPOSAL,
    selfHealingAuthorized,
    selfHealingProposalId: RESERVED_SELF_HEAL_PROPOSAL,
    routed: results.length,
    results,
    boundary: 'Routing/assignment is automatic only after router authorization. Child remediation is automatic only after self-healing bootstrap authorization. Material execution remains adapter-specific and completion requires proposal-scoped observed RETURN.',
  };
}
