import type { KernelContext, KernelRisk } from "../kernelContext";


export interface RiskAssessment {

  source: string;

  description: string;

  severity: number;

  confidence: number;

}


export function RiskAgent(
  context: KernelContext
): KernelContext {

  const assessments: RiskAssessment[] = [];

  const evidence =
    context.evidence ?? [];

  const contradictions =
    context.contradictions ?? [];


  for (const item of evidence) {

    const payload =
      JSON.stringify(item.payload)
        .toLowerCase();


    const riskMarkers = [
      "fallo",
      "error",
      "bloqueo",
      "riesgo",
      "incertidumbre",
      "falta",
      "ausencia",
      "conflicto",
      "contradicción"
    ];


    const detected =
      riskMarkers.filter(
        marker =>
          payload.includes(marker)
      );


    if (detected.length > 0) {

      assessments.push({

        source:
          item.source,

        description:
          payload,

        severity:
          Math.min(
            detected.length / riskMarkers.length,
            1
          ),

        confidence:
          item.confidence

      });

    }

  }


  for (const contradiction of contradictions) {

    assessments.push({

      source:
        "ContradictionAgent",

      description:
        JSON.stringify(
          contradiction.payload
        ),

      severity:
        0.8,

      confidence:
        contradiction.confidence

    });

  }


  const generatedRisks: KernelRisk[] =
    assessments.map(
      (risk) => ({

        id:
          crypto.randomUUID(),

        description:
          risk.description,

        severity:
          risk.severity

      })
    );


  context.risks.push(
    ...generatedRisks
  );


  context.metadata = {

    ...context.metadata,

    riskAgent: {

      risksDetected:
        generatedRisks.length,

      executedAt:
        new Date().toISOString()

    }

  };


  return context;

}
