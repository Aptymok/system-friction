import type { KernelContext } from "./kernelContext";

export function createKernelContext(
  cycleId: string,
  logbookId: string,
  initialEvent: string
): KernelContext {

  return {

    cycleId,

    logbookId,

    currentEvent: initialEvent,

    evidence: [],

    hypotheses: [],

    contradictions: [],

    simulations: [],

    predictions: [],

    risks: [],

    opportunities: [],

    metadata: {}

  };

}