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


  // The existing EvidenceHunter may have identified real material gaps.
  // When the original cognitive plan omitted risk review, this reconstruction
  // agent may REQUEST a bounded risk analysis; the broker alone decides.
  const graph = context.metadata?.taskGraph;
  const graphNodes = graph && typeof graph === 'object' && 'nodes' in graph
    && Array.isArray(graph.nodes) ? graph.nodes : [];
  const parent = graphNodes.find((node: unknown) =>
    node && typeof node === 'object' && 'capabilityId' in node
    && node.capabilityId === 'context_builder') as { nodeId?: string } | undefined;
  const planned = context.metadata?.cognitivePlan;
  const executionOrder = planned && typeof planned === 'object' && 'executionOrder' in planned
    && Array.isArray(planned.executionOrder) ? planned.executionOrder : [];
  const missingEvidence = evidence.filter((item) => {
    const payload = item.payload && typeof item.payload === 'object' && !Array.isArray(item.payload)
      ? item.payload as Record<string, unknown> : {};
    return payload.epistemicClass === 'missing'
      && item.source === 'EvidenceHunterAgent'
      && typeof payload.question === 'string'
      && payload.question.length > 0;
  });
  const priorRequests = Array.isArray(context.metadata?.capabilityRequests)
    ? context.metadata.capabilityRequests : [];
  const alreadyRequested = priorRequests.some((item) =>
    item && typeof item === 'object'
      && 'requestedByCapabilityId' in item && item.requestedByCapabilityId === 'context_builder'
      && 'requestedCapabilityId' in item && item.requestedCapabilityId === 'risk_agent');
  const needsBrokerReview = missingEvidence.length > 0
    && context.hypotheses.length > 0
    && !executionOrder.includes('risk_agent')
    && !alreadyRequested
    && typeof parent?.nodeId === 'string';
  const riskRequest = needsBrokerReview ? {
    requestId: crypto.randomUUID(),
    trajectoryId: context.cycleId,
    parentStepId: parent!.nodeId!,
    requestedByCapabilityId: 'context_builder',
    requestedCapabilityId: 'risk_agent',
    reason: 'Real evidence sufficiency review identified unsupported hypotheses; assess uncertainty and downside without treating missing evidence as observation.',
    requiredInputs: [],
    availableEvidenceRefs: missingEvidence.map((item) => item.id).slice(0, 12),
    requestedOutputs: ['RECOMMENDATION'],
    urgency: 'NORMAL',
    requestedAt: new Date().toISOString(),
  } : null;

  context.metadata = {

    ...context.metadata,
    capabilityRequests: riskRequest
      ? [...priorRequests, riskRequest] : priorRequests,

    contextBuilder: {

      brokerRiskReviewRequested: Boolean(riskRequest),
      materialEvidenceGapsObserved: missingEvidence.length,
      executed:
        true,

      confidence,

      executedAt:
        new Date().toISOString()

    }

  };


  return context;

}
