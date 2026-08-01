import type {
  KernelContext,
  KernelPrediction
} from "@/core/contracts";


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


    const predictionStatement =
      prediction.statement;



    const relatedEvidence =

      evidence.find(

        item =>

          JSON.stringify(item.payload)

            .toLowerCase()

            .includes(

              predictionStatement

                .toLowerCase()

                .slice(0,30)

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

        prediction.id ??
        crypto.randomUUID(),


      predicted:

        predictionStatement,


      observed,


      error,


      adjustmentRequired:

        error > 0.3


    });


  }





  const calibrationPredictions:

    KernelPrediction[] =



    results.map(

      (result) => ({


        id:

          crypto.randomUUID(),


        statement:

          `Calibración: ${result.predictionId} | error=${result.error}`,


        confidence:

          Math.max(

            0,

            1 - result.error

          )


      })

    );





  context.predictions.push(

    ...calibrationPredictions

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