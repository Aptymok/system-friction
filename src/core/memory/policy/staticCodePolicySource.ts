// src/core/memory/policy/staticCodePolicySource.ts
//
// UNA implementación de MemoryPolicySource — no LA arquitectura de política.
// Hoy es la única fuente disponible porque no existe todavía gobernanza
// versionada para esto en el repo (no hay tabla `sfi_memory_policies` ni
// documento institucional que la defina — se verificó, no existe).
//
// Cuando esa fuente exista, se escribe una nueva clase que implemente
// MemoryPolicySource (p.ej. SupabaseMemoryPolicySource,
// InstitutionalDocumentPolicySource) y se cambia UNA línea en
// institutionalEventPipeline.ts. Nada más se toca: ni el pipeline, ni
// governance, ni los agentes que emiten eventos.

import type { EpistemicEventRow } from '../epistemicEventWriter';
import { type MemoryPolicySource, type MemoryDecision, denyByDefault } from './contract';

const SOURCE_ID = 'static-code-policy-v1';

type PolicyRule = (event: EpistemicEventRow) => Omit<MemoryDecision, 'policySourceId'>;

const RULES: Record<string, PolicyRule> = {
  'governance.blind_mode.blocked': (event) => ({
    shouldWrite: true,
    entityType: 'GOVERNANCE_EVENT',
    memoryType: 'governance.blind_mode.blocked',
    confidence: event.confidence,
    reason: 'blind_mode_block_is_institutional_knowledge',
  }),
  'governance.acp.seen': (event) => ({
    shouldWrite: true,
    entityType: 'GOVERNANCE_EVENT',
    memoryType: 'governance.acp.seen',
    confidence: event.confidence,
    reason: 'acp_presence_change_is_institutional_knowledge',
  }),
  'governance.acp.returned': (event) => ({
    shouldWrite: true,
    entityType: 'GOVERNANCE_EVENT',
    memoryType: 'governance.acp.returned',
    confidence: event.confidence,
    reason: 'acp_presence_change_is_institutional_knowledge',
  }),
  'governance.thought.inhibited': (event) => ({
    shouldWrite: true,
    entityType: 'GOVERNANCE_EVENT',
    memoryType: 'DECISION_CONSTRAINT_APPLIED',
    confidence: event.confidence,
    reason: 'inhibition_is_a_constraint_worth_remembering',
  }),
  'runtime.decision_gate.recorded': (event) => ({
    shouldWrite: (event.payload as any)?.gate?.approved === true,
    entityType: 'DECISION_GATE',
    memoryType: 'runtime.decision_gate.approved',
    confidence: event.confidence,
    reason: 'only_approved_gates_are_institutional_knowledge_rejected_gates_are_noise',
  }),
  'runtime.intent.created': () => ({
    shouldWrite: true,
    entityType: 'INTENT',
    memoryType: 'runtime.intent.created',
    confidence: 1,
    reason: 'human_authored_intent_is_always_institutional_knowledge',
  }),
  'runtime.intent.updated': () => ({
    shouldWrite: true,
    entityType: 'INTENT',
    memoryType: 'runtime.intent.updated',
    confidence: 1,
    reason: 'human_authored_intent_is_always_institutional_knowledge',
  }),
  'runtime.action.recorded': (event) => ({
    shouldWrite: (event.payload as any)?.gateDecision?.approved === true,
    entityType: 'ACTION',
    memoryType: 'runtime.action.executed',
    confidence: event.confidence,
    reason: 'only_gate_approved_actions_become_memory',
  }),
  'runtime.observation.recorded': () => ({
    shouldWrite: false,
    reason: 'raw_metric_observations_stay_in_ledger_only_not_promoted_to_memory_individually',
  }),
};

export const staticCodePolicySource: MemoryPolicySource = {
  id: SOURCE_ID,

  resolve(event: EpistemicEventRow): MemoryDecision {
    const rule = RULES[event.event_name];
    if (!rule) {
      return denyByDefault(event, SOURCE_ID);
    }
    return { ...rule(event), policySourceId: SOURCE_ID };
  },
};