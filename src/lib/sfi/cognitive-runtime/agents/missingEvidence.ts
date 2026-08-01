import type { KernelContext, KernelEvidence } from "../kernelContext";


export interface MissingEvidenceFinding {

  target: string;

  missing: string;

  reason: string;

  confidence: number;

}


export function MissingEvidenceAgent(
  context: KernelContext
): KernelContext {

  const findings: MissingEvidenceFinding[] = [];

  const hypotheses = context.hypotheses ?? [];

  const evidence = context.evidence ?? [];


  for (const hypothesis of hypotheses) {

    const hasSupport =
      evidence.some(
        (item) =>
          JSON.stringify(item.payload)
            .toLowerCase()
            .includes(
              hypothesis.statement
                .toLowerCase()
                .slice(0, 30)
            )
      );


    if (!hasSupport) {

      findings.push({

        target:
          hypothesis.statement,

        missing:
          "Evidencia verificable asociada",

        reason:
          "La hipótesis existe sin trazabilidad suficiente hacia fuentes observables.",

        confidence:
          hypothesis.confidence

      });

    }

  }


  const generatedEvidence: KernelEvidence[] =
    findings.map((finding) => ({

      id:
        crypto.randomUUID(),

      source:
        "MissingEvidenceAgent",

      confidence:
        finding.confidence,

      payload:
        finding

    }));


  context.evidence.push(
    ...generatedEvidence
  );


  context.metadata = {

    ...context.metadata,

    missingEvidence: {

      findings:
        findings.length,

      executedAt:
        new Date().toISOString()

    }

  };


  return context;

}
