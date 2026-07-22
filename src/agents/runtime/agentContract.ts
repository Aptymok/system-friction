import type { SFIEvent } from '../../../packages/events/src/schema';

export type AgentAction =
  | "ANALYZE"
  | "PUBLISH"
  | "SCHEDULE"
  | "OBSERVE"
  | "STORE_MEMORY"
  | "REQUEST_APPROVAL"
  | "PLAN_TASK"
  | "RECONSTRUCT_CONTEXT"
  | "SIMULATE_FIELD"
  | "CALIBRATE_REALITY"
  | "EVALUATE_GOVERNANCE"
  | "MANAGE_PROJECT";

export type SfiAgentDomain = "temporal" | "evidence" | "simulation" | "governance";

export type SfiAgentAuthorityLevel = "observer" | "analyst" | "advisor" | "executor";

export interface SFI_AgentContract {
  id: string;
  purpose: string;
  domain: SfiAgentDomain;
  listensTo: Array<SFIEvent | string>;
  emits: Array<SFIEvent | string>;
  readsMemory: string[];
  writesMemory: string[];
  confidenceModel: {
    method: string;
    calibration: string;
  };
  authorityLevel: SfiAgentAuthorityLevel;
  simulationAllowed: boolean;
  humanApprovalRequired: boolean;
}

export type SfiAgentContract = SFI_AgentContract;

export interface AgentContext {
  state: any;
  user?: any;
  node?: any;
  metrics: any;
}

export function resolveAction(ctx: AgentContext): AgentAction[] {
  const actions: AgentAction[] = [];

  if (ctx.metrics.ldi > 0.85) actions.push("REQUEST_APPROVAL");
  if (ctx.metrics.ihg < -0.8) actions.push("ANALYZE");
  if (ctx.state.actions.length > 0) actions.push("STORE_MEMORY");

  return actions;
}
