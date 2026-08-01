import type {
  KernelContext,
  KernelEvidence
} from "../kernelContext";


export interface ContextCoordinate {

  actors: string[];

  forces: string[];

  constraints: string[];

  vectors: string[];

  tensions: string[];

}


export function ContextBuilderAgent(
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


  const extractSignals = (
    terms: string[]
  ): string[] => {

    return terms.filter(
      term =>
        text.includes(term)
    );

  };


  const coordinate: ContextCoordinate = {

    actors:
      extractSignals([
        "actor",
        "organización",
        "persona",
        "institución",
        "comunidad"
      ]),

    forces:
      extractSignals([
        "presión",
        "cambio",
        "mercado",
        "política",
        "tecnología"
      ]),

    constraints:
      extractSignals([
        "limitación",
        "bloqueo",
        "recurso",
        "restricción"
      ]),

    vectors:
      extractSignals([
        "tendencia",
        "dirección",
        "trayectoria",
        "movimiento"
      ]),

    tensions:
      extractSignals([
        "conflicto",
        "fricción",
        "contradicción",
        "riesgo"
      ])

  };


  const confidence =
    Math.min(
      (
        coordinate.actors.length +
        coordinate.forces.length +
        coordinate.constraints.length +
        coordinate.vectors.length +
        coordinate.tensions.length
      ) / 20,
      1
    );


  const evidenceOutput: KernelEvidence = {

    id:
      crypto.randomUUID(),

    source:
      "ContextBuilderAgent",

    confidence,

    payload:
      coordinate

  };


  context.evidence.push(
    evidenceOutput
  );


  context.metadata = {

    ...context.metadata,

    contextBuilder: {

      executed:
        true,

      confidence,

      executedAt:
        new Date().toISOString()

    }

  };


  return context;

}
