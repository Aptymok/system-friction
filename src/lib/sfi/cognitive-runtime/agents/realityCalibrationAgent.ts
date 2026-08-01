import type { KernelContext, KernelPrediction } from "../kernelContext";


export interface RealityCalibrationResult {

  predictionId: string;

  predicted: string;

  observed: string;

  error: number;

  adjustmentRequired: boolean;

}


export function RealityCalibrationAgent(
  context: KernelContext
): KernelContext {

  const results: RealityCalibrationResult[] = [];

  const predictions =
    context.predictions ?? [];


  const evidence =
    context.evidence ?? [];


  for (const prediction of predictions) {

    const relatedEvidence =
      evidence.find(
        item =>
          JSON.stringify(item.payload)
            .toLowerCase()
            .includes(
              prediction.description
                .toLowerCase()
                .slice(0, 30)
            )
      );


    const observed =
      relatedEvidence
        ? JSON.stringify(
            relatedEvidence.payload
          )
        : "sin observación registrada";


    const error =
      relatedEvidence
        ? Math.abs(
            prediction.confidence -
            relatedEvidence.confidence
          )
        : 1;


    results.push({

      predictionId:
        prediction.id,

      predicted:
        prediction.description,

      observed,

      error,

      adjustmentRequired:
        error > 0.3

    });

  }


  const calibrationEvidence: KernelPrediction[] =
    results.map(
      (result) => ({

        id:
          crypto.randomUUID(),

        description:
          `Calibración: ${result.predictionId} | error=${result.error}`,

        confidence:
          Math.max(
            0,
            1 - result.error
          )

      })
    );


  context.predictions.push(
    ...calibrationEvidence
  );


  context.metadata = {

    ...context.metadata,

    realityCalibration: {

      evaluated:
        results.length,

      adjustments:
        results.filter(
          result =>
            result.adjustmentRequired
        ).length,

      executedAt:
        new Date().toISOString()

    }

  };


  return context;

}
