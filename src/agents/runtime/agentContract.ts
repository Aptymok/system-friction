export type AgentAction =
  | "ANALYZE"
  | "PUBLISH"
  | "SCHEDULE"
  | "OBSERVE"
  | "STORE_MEMORY"
  | "REQUEST_APPROVAL";

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