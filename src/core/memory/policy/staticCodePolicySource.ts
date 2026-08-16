// src/core/memory/policy/staticCodePolicySource.ts
// Static governed policy source. Undefined events are denied by default.

import type { EpistemicEventRow } from '../epistemicEventWriter';
import { type MemoryPolicySource, type MemoryDecision, denyByDefault } from './contract';

const SOURCE_ID = 'static-code-policy-v2';
type PolicyRule = (event: EpistemicEventRow) => Omit<MemoryDecision, 'policySourceId'>;

const RULES: Record<string, PolicyRule> = {
  'governance.blind_mode.blocked': (event) => ({ shouldWrite:true, entityType:'GOVERNANCE_EVENT', memoryType:'governance.blind_mode.blocked', confidence:event.confidence, reason:'blind_mode_block_is_institutional_knowledge' }),
  'governance.acp.seen': (event) => ({ shouldWrite:true, entityType:'GOVERNANCE_EVENT', memoryType:'governance.acp.seen', confidence:event.confidence, reason:'acp_presence_change_is_institutional_knowledge' }),
  'governance.acp.returned': (event) => ({ shouldWrite:true, entityType:'GOVERNANCE_EVENT', memoryType:'governance.acp.returned', confidence:event.confidence, reason:'acp_presence_change_is_institutional_knowledge' }),
  'governance.thought.inhibited': (event) => ({ shouldWrite:true, entityType:'GOVERNANCE_EVENT', memoryType:'DECISION_CONSTRAINT_APPLIED', confidence:event.confidence, reason:'inhibition_is_a_constraint_worth_remembering' }),
  'runtime.decision_gate.recorded': (event) => ({ shouldWrite:(event.payload as any)?.gate?.approved===true, entityType:'DECISION_GATE', memoryType:'runtime.decision_gate.approved', confidence:event.confidence, reason:'only_approved_gates_are_institutional_knowledge_rejected_gates_are_noise' }),
  'runtime.intent.created': () => ({ shouldWrite:true, entityType:'INTENT', memoryType:'runtime.intent.created', confidence:1, reason:'human_authored_intent_is_always_institutional_knowledge' }),
  'runtime.intent.updated': () => ({ shouldWrite:true, entityType:'INTENT', memoryType:'runtime.intent.updated', confidence:1, reason:'human_authored_intent_is_always_institutional_knowledge' }),
  'runtime.action.recorded': (event) => ({ shouldWrite:(event.payload as any)?.gateDecision?.approved===true, entityType:'ACTION', memoryType:'runtime.action.executed', confidence:event.confidence, reason:'only_gate_approved_actions_become_memory' }),
  'runtime.observation.recorded': () => ({ shouldWrite:false, reason:'raw_metric_observations_stay_in_ledger_only_not_promoted_to_memory_individually' }),
  'cognitive_twin.experience.recorded': (event) => ({
    shouldWrite:true,
    entityType:'COGNITIVE_TWIN_EXPERIENCE',
    memoryType:String((event.payload as any)?.memoryType ?? 'STATE'),
    confidence:event.confidence,
    reason:'founder_canon_checked_cognitive_experience_enters_institutional_memory_only_through_epistemic_event_policy',
  }),
  'sfi.pipeline.execution.requested': () => ({ shouldWrite:false, reason:'runtime_requests_are_audit_events_not_institutional_memory' }),
  'sfi.pipeline.agent.executed': () => ({ shouldWrite:false, reason:'agent_execution_details_stay_in_epistemic_ledger_unless_final_runtime_policy_promotes_them' }),
  'sfi.pipeline.agent.failed': (event) => ({ shouldWrite:true, entityType:'SFI_AGENT_EXECUTION_ERROR', memoryType:'sfi.pipeline.agent.failed', confidence:event.confidence, reason:'agent_failure_is_institutional_runtime_knowledge' }),
  'sfi.pipeline.execution.completed': (event) => ({ shouldWrite:true, entityType:'SFI_PIPELINE_EXECUTION', memoryType:'sfi.pipeline.execution.completed', confidence:event.confidence, reason:'completed_canonical_runtime_execution_is_institutional_memory' }),
  'sfi.pipeline.execution.failed': (event) => ({ shouldWrite:true, entityType:'SFI_PIPELINE_EXECUTION_ERROR', memoryType:'sfi.pipeline.execution.failed', confidence:event.confidence, reason:'failed_canonical_runtime_execution_is_institutional_runtime_knowledge' }),
};

export const staticCodePolicySource: MemoryPolicySource = {
  id: SOURCE_ID,
  resolve(event: EpistemicEventRow): MemoryDecision {
    const rule=RULES[event.event_name];
    if(!rule) return denyByDefault(event,SOURCE_ID);
    return {...rule(event),policySourceId:SOURCE_ID};
  },
};
