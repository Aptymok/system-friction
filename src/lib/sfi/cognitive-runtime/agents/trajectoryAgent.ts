import type { KernelContext } from "../kernelContext";

export function TrajectoryAgent(
  context: KernelContext
): KernelContext {

  context.metadata = {
    ...context.metadata,

    trajectoryAssessment: {
      executedAt: new Date().toISOString(),
      status: "observed",
    },
  };

  return context;
}