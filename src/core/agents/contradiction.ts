import type {
  KernelContext,
  KernelContradiction
} from "@/core/contracts";


export interface ContradictionFinding {

  hypothesisId: string;

  hypothesis: string;

  contradiction: string;

  confidence: number;

}



export function ContradictionAgent(
  context: KernelContext
): KernelContext {


  const findings: ContradictionFinding[] = [];


  const hypotheses =
    context.hypotheses ?? [];


  const evidence =
    context.evidence ?? [];



  for (const hypothesis of hypotheses) {


    for (const item of evidence) {


      const payload =
        JSON.stringify(item.payload)
          .toLowerCase();



      const statement =
        hypothesis.statement
          .toLowerCase();



      const negativeSignals = [

        "false",

        "contradice",

        "error",

        "invalid",

        "no",

        "imposible",

        "falló"

      ];



      const containsContradiction =

        negativeSignals.some(signal =>
          payload.includes(signal)
        );



      if (

        containsContradiction &&

        payload.includes(
          statement.slice(0,20)
        )

      ) {


        findings.push({


          hypothesisId:

            hypothesis.id ??
            crypto.randomUUID(),


          hypothesis:

            hypothesis.statement,


          contradiction:

            payload,


          confidence:

            item.confidence

        });


      }

    }

  }




  const contradictions:
    KernelContradiction[] =


    findings.map((finding) => ({


      id:

        crypto.randomUUID(),


      description:

        finding.contradiction,


      severity:

        finding.confidence,


      payload:

        finding,


      confidence:

        finding.confidence


    }));





  context.contradictions.push(

    ...contradictions

  );





  context.metadata = {


    ...context.metadata,


    contradictionAgent: {


      contradictionsDetected:

        findings.length,


      executedAt:

        new Date().toISOString()


    }

  };



  return context;

}