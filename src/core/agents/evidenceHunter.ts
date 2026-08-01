import type { KernelContext, KernelEvidence } from "@/core/contracts";


export interface EvidenceRequirement {

  question: string;

  missing: boolean;

  reason: string;

  confidence: number;

}


export function EvidenceHunterAgent(
  context: KernelContext
): KernelContext {

  const requirements: EvidenceRequirement[] = [];

  const hypotheses = context.hypotheses ?? [];

  const evidence = context.evidence ?? [];


  for (const hypothesis of hypotheses) {

    const relatedEvidence = evidence.filter(
      (item) =>
        JSON.stringify(item.payload)
          .toLowerCase()
          .includes(
            hypothesis.statement.toLowerCase()
          )
    );


    if (relatedEvidence.length === 0) {

      requirements.push({

        question:
          `¿Qué evidencia sostiene la hipótesis: ${hypothesis.statement}?`,

        missing: true,

        reason:
          "No existe evidencia asociada dentro del contexto actual.",

        confidence:
          hypothesis.confidence

      });

    }

  }


  const generatedEvidence: KernelEvidence[] =
    requirements.map((requirement) => ({

      id: crypto.randomUUID(),

      source: "EvidenceHunterAgent",

      confidence: requirement.confidence,

      payload: requirement

    }));


  context.evidence.push(
    ...generatedEvidence
  );


  context.metadata = {

    ...context.metadata,

    evidenceHunter: {

      missingEvidenceDetected:
        requirements.length,

      executedAt:
        new Date().toISOString()

    }

  };


  return context;

}
