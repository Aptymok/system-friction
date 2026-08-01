import type { KernelContext, KernelEvidence } from "@/core/contracts";


export interface ArchaeologicalPattern {

  originSignal: string;

  previousOccurrence: string;

  structuralPattern: string;

  confidence: number;

}


export function ArchaeologistAgent(
  context: KernelContext
): KernelContext {

  const patterns: ArchaeologicalPattern[] = [];

  const evidence = context.evidence ?? [];


  for (const item of evidence) {

    const payload =
      JSON.stringify(item.payload)
        .toLowerCase();


    const originMarkers = [
      "origen",
      "inicio",
      "apareció",
      "surgió",
      "primera vez",
      "antecedente",
      "precedente"
    ];


    const detected =
      originMarkers.some(
        marker =>
          payload.includes(marker)
      );


    if (detected) {

      patterns.push({

        originSignal:
          markerMatch(payload, originMarkers),

        previousOccurrence:
          payload,

        structuralPattern:
          "Configuración histórica equivalente detectada.",

        confidence:
          item.confidence

      });

    }

  }


  const generatedEvidence: KernelEvidence[] =
    patterns.map((pattern) => ({

      id:
        crypto.randomUUID(),

      source:
        "ArchaeologistAgent",

      confidence:
        pattern.confidence,

      payload:
        pattern

    }));


  context.evidence.push(
    ...generatedEvidence
  );


  context.metadata = {

    ...context.metadata,

    archaeologist: {

      patternsDetected:
        patterns.length,

      executedAt:
        new Date().toISOString()

    }

  };


  return context;

}


function markerMatch(
  payload: string,
  markers: string[]
): string {

  return (
    markers.find(
      marker =>
        payload.includes(marker)
    )
    ?? "unknown"
  );

}
