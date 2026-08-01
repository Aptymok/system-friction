import type {
  KernelContext,
  KernelEvidence
} from "@/core/contracts";


export interface TemporalResolution {

  referenceTime: string;

  horizonDetected: string;

  temporalSignals: string[];

  temporalConfidence: number;

}


export function TemporalResolverAgent(
  context: KernelContext
): KernelContext {

  const evidence =
    context.evidence ?? [];


  const text =
    evidence
      .map(
        item =>
          JSON.stringify(item.payload)
            .toLowerCase()
      )
      .join(" ");


  const temporalSignals =
    [
      "pasado",
      "presente",
      "futuro",
      "fecha",
      "periodo",
      "tendencia",
      "cambio",
      "ventana",
      "horizonte",
      "trayectoria"
    ]
    .filter(
      term =>
        text.includes(term)
    );


  const now =
    new Date();


  const resolution: TemporalResolution = {

    referenceTime:
      now.toISOString(),

    horizonDetected:
      temporalSignals.includes("futuro")
        ? "future_projection"
        : temporalSignals.includes("pasado")
          ? "historical_reconstruction"
          : "current_observation",

    temporalSignals,

    temporalConfidence:
      Math.min(
        temporalSignals.length / 10,
        1
      )

  };


  const evidenceOutput: KernelEvidence = {

    id:
      crypto.randomUUID(),

    source:
      "TemporalResolverAgent",

    confidence:
      resolution.temporalConfidence,

    payload:
      resolution

  };


  context.evidence.push(
    evidenceOutput
  );


  context.metadata = {

    ...context.metadata,

    temporalResolver: {

      executed:
        true,

      horizon:
        resolution.horizonDetected,

      confidence:
        resolution.temporalConfidence,

      executedAt:
        new Date().toISOString()

    }

  };


  return context;

}
