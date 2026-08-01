import type { KernelContext, KernelEvidence } from "@/core/contracts";


export interface FieldObservation {

  source: string;

  category: string;

  description: string;

  confidence: number;

}


export function FieldObserverAgent(
  context: KernelContext
): KernelContext {

  const observations: FieldObservation[] = [];

  const existingEvidence = context.evidence ?? [];


  for (const evidence of existingEvidence) {

    observations.push({

      source: evidence.source,

      category: "observed_evidence",

      description:
        typeof evidence.payload === "string"
          ? evidence.payload
          : JSON.stringify(evidence.payload),

      confidence: evidence.confidence

    });

  }


  const generatedEvidence: KernelEvidence[] =
    observations.map((observation) => ({

      id: crypto.randomUUID(),

      source: "FieldObserverAgent",

      confidence: observation.confidence,

      payload: observation

    }));


  context.evidence.push(
    ...generatedEvidence
  );


  context.metadata = {

    ...context.metadata,

    fieldObserver: {

      observations: observations.length,

      executedAt: new Date().toISOString(),

      confidence:

        observations.length > 0

          ? observations.reduce(
              (sum, item) =>
                sum + item.confidence,
              0
            ) / observations.length

          : 0

    }

  };


  return context;

}
