import type { KernelContext, KernelOpportunity } from "@/core/contracts";


export interface OpportunitySignal {

  source: string;

  description: string;

  score: number;

  confidence: number;

}


export function OpportunityDiscoveryAgent(
  context: KernelContext
): KernelContext {

  const opportunities: OpportunitySignal[] = [];

  const evidence =
    context.evidence ?? [];

  const risks =
    context.risks ?? [];


  const riskLevel =
    risks.reduce(
      (total, risk) =>
        total + risk.severity,
      0
    );


  for (const item of evidence) {

    const payload =
      JSON.stringify(item.payload)
        .toLowerCase();


    const opportunityMarkers = [
      "emerge",
      "ventana",
      "potencial",
      "crecimiento",
      "mejora",
      "oportunidad",
      "capacidad"
    ];


    const detected =
      opportunityMarkers.filter(
        marker =>
          payload.includes(marker)
      );


    if (detected.length > 0) {

      const score =
        Math.max(
          0,
          Math.min(
            1,
            item.confidence -
            (riskLevel * 0.1)
          )
        );


      opportunities.push({

        source:
          item.source,

        description:
          payload,

        score,

        confidence:
          item.confidence

      });

    }

  }


  const generatedOpportunities: KernelOpportunity[] =
    opportunities.map(
      (opportunity) => ({

        id:
          crypto.randomUUID(),

        description:
          opportunity.description,

        score:
          opportunity.score

      })
    );


  context.opportunities.push(
    ...generatedOpportunities
  );


  context.metadata = {

    ...context.metadata,

    opportunityDiscovery: {

      detected:
        opportunities.length,

      executedAt:
        new Date().toISOString()

    }

  };


  return context;

}
