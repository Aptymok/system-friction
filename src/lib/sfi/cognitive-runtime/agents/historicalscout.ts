import type {
  KernelContext
} from "../kernelContext";


export function HistoricalScoutAgent(
  context: KernelContext
): KernelContext {

  return {

    ...context,

    metadata: {

      ...context.metadata,

      historicalScout: {

        executed:
          true

      }

    }

  };

}
