import type { LlmRequirements } from '@/lib/ai/providerRouter';

export type SfiOperationModelRequirements = {
  reasoning: 'LOW' | 'MEDIUM' | 'HIGH' | 'FRONTIER';
  structuredOutput: boolean;
  web: boolean;
  multimodal: boolean;
  computer: boolean;
  code: boolean;
  minContextTokens: number;
  latencyClass: 'INTERACTIVE' | 'NORMAL' | 'BATCH';
  costClass: 'ECONOMY' | 'STANDARD' | 'QUALITY' | 'FRONTIER' | 'PRIVATE_LOCAL' | 'SPECIALIST';
  privacyClass: string;
  providerAllowlist?: string[];
  providerDenylist?: string[];
};

type AgentModelRequirementTier = 'QUALITY_LONG' | 'STANDARD_LONG' | 'INTERACTIVE' | 'STANDARD';

const QUALITY_LONG_AGENT_IDS = new Set([
  'risk_agent',
  'economic_field_simulator',
  'cross_impact',
  'trajectory_agent',
  'reality_calibration',
  'phenotype_resolver',
  'friction_field_simulator',
  'temporal_resolver',
]);

const STANDARD_LONG_AGENT_IDS = new Set([
  'opportunity_agent',
  'historical_scout',
  'context_builder',
]);

const INTERACTIVE_AGENT_IDS = new Set([
  'evidence_hunter',
  'field_observer',
  'project_execution_manager',
]);

function tierForAgent(agentId: string): AgentModelRequirementTier {
  if (QUALITY_LONG_AGENT_IDS.has(agentId)) return 'QUALITY_LONG';
  if (STANDARD_LONG_AGENT_IDS.has(agentId)) return 'STANDARD_LONG';
  if (INTERACTIVE_AGENT_IDS.has(agentId)) return 'INTERACTIVE';
  return 'STANDARD';
}

export function operationModelRequirementsForAgent(agentId: string): SfiOperationModelRequirements {
  switch (tierForAgent(agentId)) {
    case 'QUALITY_LONG':
      return {
        reasoning: 'HIGH',
        structuredOutput: true,
        web: false,
        multimodal: false,
        computer: false,
        code: false,
        minContextTokens: 100_000,
        latencyClass: 'NORMAL',
        costClass: 'QUALITY',
        privacyClass: 'INTERNAL',
      };
    case 'STANDARD_LONG':
      return {
        reasoning: 'MEDIUM',
        structuredOutput: true,
        web: false,
        multimodal: false,
        computer: false,
        code: false,
        minContextTokens: 100_000,
        latencyClass: 'NORMAL',
        costClass: 'STANDARD',
        privacyClass: 'INTERNAL',
      };
    case 'INTERACTIVE':
      return {
        reasoning: 'LOW',
        structuredOutput: true,
        web: false,
        multimodal: false,
        computer: false,
        code: false,
        minContextTokens: 0,
        latencyClass: 'INTERACTIVE',
        costClass: 'ECONOMY',
        privacyClass: 'INTERNAL',
      };
    case 'STANDARD':
      return {
        reasoning: 'MEDIUM',
        structuredOutput: true,
        web: false,
        multimodal: false,
        computer: false,
        code: false,
        minContextTokens: 0,
        latencyClass: 'NORMAL',
        costClass: 'STANDARD',
        privacyClass: 'INTERNAL',
      };
  }
}

export function requirementsForAgent(agentId: string): LlmRequirements {
  switch (tierForAgent(agentId)) {
    case 'QUALITY_LONG':
      return { reasoning: true, structuredOutput: true, minContextTokens: 100_000, priority: 'quality' };
    case 'STANDARD_LONG':
      return { reasoning: true, structuredOutput: true, minContextTokens: 100_000, priority: 'balanced' };
    case 'INTERACTIVE':
      return { structuredOutput: true, priority: 'speed' };
    case 'STANDARD':
      return { reasoning: true, structuredOutput: true, priority: 'balanced' };
  }
}
