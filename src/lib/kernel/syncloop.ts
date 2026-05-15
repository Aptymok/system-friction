import { getState, setState } from "./systemState";

export function runSyncLoop(externalMetrics: any) {
  const state = getState();

  const divergence =
    Math.abs(externalMetrics.ihg - state.metrics.ihg) +
    Math.abs(externalMetrics.ldi - state.metrics.ldi);

  setState({
    divergence,
    metrics: externalMetrics,
  });

  return divergence;
}