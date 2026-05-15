import { runSyncLoop } from "./syncloop";
import { resolveAction } from "../agents/runtime/agentContract";
import { getState } from "./systemState";

export function tickSystem(externalMetrics: any) {
  const divergence = runSyncLoop(externalMetrics);
  const state = getState();

  const actions = resolveAction({
    state,
    metrics: state.metrics,
    node: state.node,
  });

  return {
    divergence,
    actions,
    state,
  };
}