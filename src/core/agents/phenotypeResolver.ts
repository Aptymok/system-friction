import type { KernelContext, KernelEvidence } from "@/core/contracts";


export interface PhenotypeResolution {

  sourcePattern: string;

  matchedStructure: string;

  similarity: number;

  confidence: number;

}


export function PhenotypeResolverAgent(
  context: KernelContext
): KernelContext {

  const resolutions: PhenotypeResolution[] = [];

  const evidence = context.evidence ?? [];

  const hypotheses = context.hypotheses ?? [];


  for (const hypothesis of hypotheses) {

    const statement =
      hypothesis.statement.toLowerCase();


    for (const item of evidence) {

      const payload =
        JSON.stringify(item.payload)
          .toLowerCase();


      const sharedTerms =
        statement
          .split(" ")
          .filter(
            word =>
              word.length > 5 &&
              payload.includes(word)
          );


      if (sharedTerms.length > 0) {

        resolutions.push({

          sourcePattern:
            hypothesis.statement,

          matchedStructure:
            `Patrón detectado mediante términos compartidos: ${sharedTerms.join(", ")}`,

          similarity:
            Math.min(
              sharedTerms.length / 10,
              1
            ),

          confidence:
            Math.min(
              hypothesis.confidence *
              item.confidence,
              1
            )

        });

      }

    }

  }


  const generatedEvidence: KernelEvidence[] =
    resolutions.map((resolution) => ({

      id:
        crypto.randomUUID(),

      source:
        "PhenotypeResolverAgent",

      confidence:
        resolution.confidence,

      payload:
        resolution

    }));


  context.evidence.push(
    ...generatedEvidence
  );


  context.metadata = {

    ...context.metadata,

    phenotypeResolver: {

      resolved:
        resolutions.length,

      executedAt:
        new Date().toISOString()

    }

  };


  return context;

}
