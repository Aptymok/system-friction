export const SFI_INSTITUTIONAL_DISCOVERY_MESH_CONTRACT = 'SFI-INSTITUTIONAL-DISCOVERY-MESH-1.1' as const;
export const SFI_EXTERNAL_REALITY_GRAPH_CONTRACT = 'SFI-EXTERNAL-REALITY-GRAPH-1.0' as const;
export const SFI_PROPAGATION_GRAPH_CONTRACT = 'SFI-PROPAGATION-GRAPH-1.1' as const;
export const SFI_CONVERGENCE_GRAPH_CONTRACT = 'SFI-CONVERGENCE-GRAPH-1.1' as const;
export const SFI_DISCOVERY_LIFECYCLE_CONTRACT = 'SFI-DISCOVERY-LIFECYCLE-1.0' as const;

export const SFI_DISCOVERY_LENSES = Object.freeze([
  { id: 'KNOWLEDGE', meaning: 'What SFI knows through canonical objects and evidence-linked semantic state.' },
  { id: 'REALITY', meaning: 'Observed external entities and semantically typed relations in the canonical graph.' },
  { id: 'PROPAGATION', meaning: 'Evidence-backed movement of SFI objects through external contexts and nodes.' },
  { id: 'CONVERGENCE', meaning: 'Evidence-backed external chains evaluated against a declared institutional attractor.' },
] as const);

export const SFI_REALITY_NODE_CLASSES = Object.freeze([
  'PERSON',
  'INSTITUTION',
  'UNIVERSITY',
  'LAB',
  'COMPANY',
  'FOUNDATION',
  'FUND',
  'GOVERNMENT',
  'PROGRAM',
  'EVENT',
  'VENUE',
  'MEDIA',
  'PUBLICATION',
  'COMMUNITY',
] as const);
export type SfiRealityNodeClass = typeof SFI_REALITY_NODE_CLASSES[number];

export const SFI_REALITY_RELATIONS = Object.freeze([
  'AFFILIATED_WITH',
  'OPERATES',
  'FUNDS',
  'HOSTS',
  'CONTROLS_ACCESS_TO',
  'PRODUCES',
  'CITES',
  'INTRODUCED_SFI_TO',
  'REQUESTED',
  'PRODUCED_RETURN_AT',
  'RETRIEVED',
  'DISCOVERED',
  'RECOGNIZED',
  'INTERACTED_WITH',
  'TRANSPORTED_TO',
  'RELATED_TO',
] as const);
export type SfiRealityRelation = typeof SFI_REALITY_RELATIONS[number];

export const SFI_RELATION_STATES = Object.freeze([
  'NONE',
  'INDIRECT',
  'RELEVANT',
  'QUALIFIED',
  'ACTIVE',
  'PULLING',
] as const);
export type SfiRelationState = typeof SFI_RELATION_STATES[number];

export const SFI_RETURN_STATES = Object.freeze([
  'MISSING',
  'OPEN',
  'OBSERVED',
  'POSITIVE',
  'NEGATIVE',
  'CONTRADICTORY',
] as const);
export type SfiDiscoveryReturnState = typeof SFI_RETURN_STATES[number];

export const SFI_DISCOVERY_STAGES = Object.freeze([
  'EXPOSURE',
  'DISCOVERY',
  'RECOGNITION',
  'INTERACTION',
  'RELATION',
  'PROPAGATION',
  'PULL',
  'RETURN',
] as const);
export type SfiDiscoveryStage = typeof SFI_DISCOVERY_STAGES[number];

export const SFI_DISCOVERY_OPERATIONS = Object.freeze([
  'EMIT',
  'EXPOSE',
  'TRANSPORT',
  'OBSERVE',
  'RETURN',
] as const);

export const SFI_DISCOVERY_LIFECYCLE = Object.freeze({
  contract: SFI_DISCOVERY_LIFECYCLE_CONTRACT,
  stages: [
    { id: 'EXPOSURE', meaning: 'An SFI object was placed on a surface or in a context where it could be encountered.' },
    { id: 'DISCOVERY', meaning: 'A third party actually retrieved or found the object.' },
    { id: 'RECOGNITION', meaning: 'The third party correctly identified SFI or the object.' },
    { id: 'INTERACTION', meaning: 'The third party acted in response to the object or institution.' },
    { id: 'RELATION', meaning: 'The interaction survived at least one subsequent transition.' },
    { id: 'PROPAGATION', meaning: 'An external node transported SFI or an SFI object to another node.' },
    { id: 'PULL', meaning: 'The outside network requested or introduced SFI without founder-forced transition.' },
    { id: 'RETURN', meaning: 'An observable real-world state changed and was bound to evidence.' },
  ],
  operations: SFI_DISCOVERY_OPERATIONS,
  boundary: {
    exposureIsNotDiscovery: true,
    discoveryIsNotRecognition: true,
    recognitionIsNotInteraction: true,
    interactionIsNotRelation: true,
    relationIsNotPropagation: true,
    propagationIsNotPull: true,
    pullIsNotReturn: true,
    missingStageIsNeverInferredFromLaterNarrative: true,
  },
});

export const SFI_MANHATTAN_ATTRACTOR = Object.freeze({
  key: 'MANHATTAN_OBJECTIVE',
  type: 'INSTITUTIONAL_ATTRACTOR',
  geography: ['USA', 'NEW_YORK', 'NYC', 'MANHATTAN'],
  principle: 'Manhattan becomes less inadequate when outside nodes generate evidence-backed pull; geography is a lens, not an ontology.',
  dimensions: [
    'evidence_density',
    'institutional_relations',
    'independent_representation',
    'qualified_access',
    'capital',
    'audience',
    'research_adjacency',
    'client_return',
  ],
  minimumEvidenceGate: {
    independentNycRelationships: 3,
    concreteSfiObjectRequests: 1,
    thirdPartyIntroductions: 1,
    realCasesWithObservedReturn: 1,
  },
  attainmentRule: 'The gate is evidence support for convergence, not proof that Manhattan has been attained or that relocation is causally warranted.',
});

export const SFI_PUBLICATION_MESH = Object.freeze({
  state: 'CANONICAL_NAMESPACE_CHANGE_SEPARATE_GATE' as const,
  currentCanonicalObjectType: 'PUBLICATION' as const,
  proposedNamespace: '/publications',
  proposedKinds: [
    'BOOK',
    'TEMPORAL_NOTE',
    'FOUNDER_LETTER',
    'EPISTEMIC_NOTE',
    'FIELD_NOTE',
    'CONVERGENCE_NOTE',
    'PUBLIC_SIGNAL_BRIEF',
    'INSTITUTIONAL_ESSAY',
  ],
  boundary: 'Publication kind/series/issue are editorial dimensions. They must not create dozens of canonical object types or silently rewrite existing canonical URLs.',
});

type Row = Record<string, unknown>;

type SfiDiscoverySampleCompleteness = {
  graphNodes: boolean;
  graphEdges: boolean;
  trajectoryEvents: boolean;
};

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}
function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
function stringList(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.map((item) => text(item)).filter((item): item is string => Boolean(item)))] : [];
}
function normalized(value: unknown): string {
  return text(value)?.toUpperCase().replace(/[\s-]+/g, '_') ?? '';
}
function oneOf<T extends readonly string[]>(value: unknown, allowed: T): T[number] | null {
  const candidate = normalized(value);
  return (allowed as readonly string[]).includes(candidate) ? candidate as T[number] : null;
}
function nodeId(row: Row) {
  return text(row.node_id) ?? text(row.node_key) ?? text(row.id) ?? null;
}
function edgeId(row: Row) {
  return text(row.edge_id) ?? text(row.edge_key) ?? text(row.id) ?? null;
}
function nodeClass(row: Row): SfiRealityNodeClass | null {
  const attrs = record(row.attributes ?? row.payload ?? row.metadata);
  return oneOf(attrs.realityNodeClass ?? attrs.nodeClass ?? row.ontology_type ?? row.node_type, SFI_REALITY_NODE_CLASSES);
}
function relationType(row: Row): SfiRealityRelation | null {
  const attrs = record(row.attributes ?? row.payload ?? row.metadata);
  return oneOf(attrs.semanticRelation ?? row.relation_type ?? row.relation, SFI_REALITY_RELATIONS);
}
function geography(attrs: Row) {
  const raw = attrs.geography ?? attrs.location ?? attrs.geo;
  if (typeof raw === 'string') return [raw];
  if (Array.isArray(raw)) return stringList(raw);
  const geo = record(raw);
  return [geo.country, geo.region, geo.city, geo.borough, geo.neighborhood]
    .map((item) => text(item))
    .filter((item): item is string => Boolean(item));
}
function includesNyc(values: readonly string[]) {
  const corpus = values.join(' ').toLowerCase();
  return /\b(new york|nyc|manhattan|brooklyn|queens|bronx|staten island|roosevelt island)\b/.test(corpus);
}
function observedEpistemic(value: unknown) {
  const v = normalized(value);
  return v === 'OBSERVED' || v === 'VERIFIED' || v === 'CANONICAL';
}

export type SfiRealityNodeProjection = {
  nodeId: string;
  label: string;
  nodeClass: SfiRealityNodeClass;
  geography: string[];
  capabilityControlled: string[];
  relationState: SfiRelationState;
  sfiIntersection: string[];
  returnState: SfiDiscoveryReturnState;
  epistemicState: string;
  provenance: string | null;
  lineage: string[];
  updatedAt: string | null;
};

export type SfiRealityEdgeProjection = {
  edgeId: string;
  sourceNodeId: string;
  targetNodeId: string;
  relation: SfiRealityRelation;
  epistemicState: string;
  evidenceRefs: string[];
  observedAt: string | null;
  founderForced: boolean | null;
  provenance: string | null;
};

export function projectExternalRealityGraph(nodeRows: readonly Row[], edgeRows: readonly Row[]) {
  const nodes = nodeRows.flatMap((row): SfiRealityNodeProjection[] => {
    const id = nodeId(row);
    const klass = nodeClass(row);
    if (!id || !klass) return [];
    const attrs = record(row.attributes ?? row.payload ?? row.metadata);
    return [{
      nodeId: id,
      label: text(row.label) ?? text(row.name) ?? id,
      nodeClass: klass,
      geography: geography(attrs),
      capabilityControlled: stringList(attrs.capabilityControlled ?? attrs.capabilitiesControlled ?? attrs.capabilities),
      relationState: oneOf(attrs.relationState ?? attrs.manhattanLevel, SFI_RELATION_STATES) ?? 'NONE',
      sfiIntersection: stringList(attrs.sfiIntersection ?? attrs.intersections),
      returnState: oneOf(attrs.returnState, SFI_RETURN_STATES) ?? 'MISSING',
      epistemicState: normalized(row.epistemic_class ?? attrs.epistemicClass) || 'UNKNOWN',
      provenance: text(row.provenance ?? attrs.provenance),
      lineage: stringList(row.lineage ?? attrs.lineage),
      updatedAt: text(row.updated_at ?? attrs.updatedAt),
    }];
  });
  const ids = new Set(nodes.map((node) => node.nodeId));
  const edges = edgeRows.flatMap((row): SfiRealityEdgeProjection[] => {
    const id = edgeId(row);
    const relation = relationType(row);
    const attrs = record(row.attributes ?? row.payload ?? row.metadata);
    const source = text(row.source_node_id ?? row.source_node_key ?? attrs.sourceNodeId);
    const target = text(row.target_node_id ?? row.target_node_key ?? attrs.targetNodeId);
    if (!id || !relation || !source || !target || !ids.has(source) || !ids.has(target)) return [];
    return [{
      edgeId: id,
      sourceNodeId: source,
      targetNodeId: target,
      relation,
      epistemicState: normalized(row.epistemic_class ?? attrs.epistemicClass) || 'UNKNOWN',
      evidenceRefs: stringList(attrs.evidenceRefs ?? attrs.evidence_refs),
      observedAt: text(attrs.observedAt ?? row.updated_at ?? row.created_at),
      founderForced: typeof attrs.founderForced === 'boolean' ? attrs.founderForced : null,
      provenance: text(row.provenance ?? attrs.provenance),
    }];
  });
  return {
    contract: SFI_EXTERNAL_REALITY_GRAPH_CONTRACT,
    state: nodes.length ? 'OBSERVED_SAMPLE' as const : 'NOT_OBSERVED' as const,
    nodes,
    edges,
    boundary: {
      genericConnectedToEdgesCountAsSemanticEvidence: false,
      unsupportedRelationsIgnored: true,
      inferredEdgesCreated: false,
      missingAttributesRemainUnknown: true,
    },
  };
}

export type SfiPropagationEventProjection = {
  eventId: string;
  objectRef: string;
  stage: SfiDiscoveryStage | null;
  stageSource: 'EXPLICIT_SEMANTIC_STATE' | 'EVIDENCE_BACKED_PUBLICATION_EVENT' | 'EVIDENCE_BACKED_RETURN_EVENT' | 'UNCLASSIFIED';
  relation: string;
  platform: string | null;
  sourceUri: string | null;
  externalNodeId: string | null;
  observedAt: string | null;
  evidenceRefs: string[];
  epistemicState: string;
};

export function projectPropagationGraph(trajectoryRows: readonly Row[]) {
  const events = trajectoryRows.flatMap((row): SfiPropagationEventProjection[] => {
    const id = text(row.id);
    const objectRef = text(row.object_ref);
    if (!id || !objectRef) return [];
    const semantic = record(row.semantic_state);
    const payload = record(row.payload);
    const explicitStage = oneOf(semantic.discoveryStage ?? semantic.discovery_stage, SFI_DISCOVERY_STAGES);
    const relation = normalized(row.relation) || 'UNKNOWN';
    const evidenceRefs = stringList(row.evidence_refs);
    const epistemicState = normalized(
      semantic.epistemicState ?? semantic.epistemic_state ?? payload.epistemicState ?? payload.epistemic_state,
    ) || 'UNKNOWN';
    const stageEvidenceAdmissible = evidenceRefs.length > 0 && observedEpistemic(epistemicState);
    let stage: SfiDiscoveryStage | null = explicitStage && stageEvidenceAdmissible ? explicitStage : null;
    let stageSource: SfiPropagationEventProjection['stageSource'] = stage ? 'EXPLICIT_SEMANTIC_STATE' : 'UNCLASSIFIED';
    if (!stage && relation === 'PUBLICATION' && stageEvidenceAdmissible) {
      stage = 'EXPOSURE';
      stageSource = 'EVIDENCE_BACKED_PUBLICATION_EVENT';
    }
    if (!stage && relation === 'RETURN' && stageEvidenceAdmissible) {
      stage = 'RETURN';
      stageSource = 'EVIDENCE_BACKED_RETURN_EVENT';
    }
    return [{
      eventId: id,
      objectRef,
      stage,
      stageSource,
      relation,
      platform: text(row.platform),
      sourceUri: text(row.source_uri),
      externalNodeId: text(semantic.externalNodeId ?? semantic.external_node_id ?? payload.externalNodeId),
      observedAt: text(row.observed_at),
      evidenceRefs,
      epistemicState,
    }];
  });
  const stageRank = new Map(SFI_DISCOVERY_STAGES.map((stage, index) => [stage, index]));
  const byObject = new Map<string, SfiPropagationEventProjection[]>();
  for (const event of events) byObject.set(event.objectRef, [...(byObject.get(event.objectRef) ?? []), event]);
  const trajectories = [...byObject.entries()].map(([objectRef, objectEvents]) => {
    const classified = objectEvents.filter((event): event is SfiPropagationEventProjection & { stage: SfiDiscoveryStage } => Boolean(event.stage));
    const highest = classified.sort((a, b) => (stageRank.get(b.stage) ?? -1) - (stageRank.get(a.stage) ?? -1))[0] ?? null;
    return {
      objectRef,
      eventCount: objectEvents.length,
      highestObservedStage: highest?.stage ?? null,
      externalNodeIds: [...new Set(objectEvents.map((event) => event.externalNodeId).filter((id): id is string => Boolean(id)))],
      evidenceRefs: [...new Set(objectEvents.flatMap((event) => event.evidenceRefs))],
    };
  });
  return {
    contract: SFI_PROPAGATION_GRAPH_CONTRACT,
    state: events.length ? 'OBSERVED_SAMPLE' as const : 'NOT_OBSERVED' as const,
    events,
    trajectories,
    boundary: {
      publicationDoesNotImplyDiscovery: true,
      copyDoesNotImplyPropagation: true,
      laterStageDoesNotBackfillMissingEarlierStage: true,
      semanticStageRequiresEvidenceAndObservedEpistemicState: true,
      returnRequiresEvidenceBackedEvent: true,
    },
  };
}

function semanticAdjacency(edges: readonly SfiRealityEdgeProjection[]) {
  const map = new Map<string, SfiRealityEdgeProjection[]>();
  for (const edge of edges) map.set(edge.sourceNodeId, [...(map.get(edge.sourceNodeId) ?? []), edge]);
  return map;
}

export function boundedNodesOfNodes(
  reality: ReturnType<typeof projectExternalRealityGraph>,
  startNodeId: string,
  maxDepth = 4,
) {
  const nodesById = new Map(reality.nodes.map((node) => [node.nodeId, node]));
  const adjacency = semanticAdjacency(reality.edges);
  const paths: Array<{ nodeIds: string[]; relations: SfiRealityRelation[]; terminalCapabilities: string[] }> = [];
  const queue: Array<{ nodeId: string; nodeIds: string[]; relations: SfiRealityRelation[] }> = [{ nodeId: startNodeId, nodeIds: [startNodeId], relations: [] }];
  while (queue.length) {
    const current = queue.shift()!;
    if (current.relations.length >= maxDepth) continue;
    for (const edge of adjacency.get(current.nodeId) ?? []) {
      if (current.nodeIds.includes(edge.targetNodeId)) continue;
      const nodeIds = [...current.nodeIds, edge.targetNodeId];
      const relations = [...current.relations, edge.relation];
      const target = nodesById.get(edge.targetNodeId);
      if (target?.capabilityControlled.length) {
        paths.push({ nodeIds, relations, terminalCapabilities: target.capabilityControlled });
      }
      queue.push({ nodeId: edge.targetNodeId, nodeIds, relations });
    }
  }
  return {
    startNodeId,
    maxDepth,
    paths,
    boundary: 'A path is observed graph reachability only. It does not imply access, influence, introduction willingness or causal leverage.',
  };
}

export function projectConvergenceGraph(
  reality: ReturnType<typeof projectExternalRealityGraph>,
  propagation: ReturnType<typeof projectPropagationGraph>,
  evidenceSampleComplete = true,
) {
  const nycNodes = reality.nodes.filter((node) => includesNyc(node.geography));
  const nycIds = new Set(nycNodes.map((node) => node.nodeId));
  const activeNycRelationships = nycNodes.filter((node) => ['ACTIVE', 'PULLING'].includes(node.relationState));
  const observedEdges = reality.edges.filter((edge) => observedEpistemic(edge.epistemicState) || edge.evidenceRefs.length > 0);
  const requests = observedEdges.filter((edge) => edge.relation === 'REQUESTED' && nycIds.has(edge.sourceNodeId));
  const introductions = observedEdges.filter((edge) => edge.relation === 'INTRODUCED_SFI_TO'
    && edge.founderForced === false
    && (nycIds.has(edge.sourceNodeId) || nycIds.has(edge.targetNodeId)));
  const pullEdges = observedEdges.filter((edge) => ['REQUESTED', 'INTRODUCED_SFI_TO'].includes(edge.relation) && edge.founderForced === false);
  const returnNodeIds = new Set(propagation.events
    .filter((event) => event.stage === 'RETURN')
    .map((event) => event.externalNodeId)
    .filter((id): id is string => Boolean(id)));
  const realCasesWithObservedReturn = [...returnNodeIds].filter((id) => nycIds.has(id)).length;
  const gate = SFI_MANHATTAN_ATTRACTOR.minimumEvidenceGate;
  const evidence = {
    independentNycRelationships: activeNycRelationships.length,
    concreteSfiObjectRequests: requests.length,
    thirdPartyIntroductions: introductions.length,
    realCasesWithObservedReturn,
  };
  const gateSatisfied = evidence.independentNycRelationships >= gate.independentNycRelationships
    && evidence.concreteSfiObjectRequests >= gate.concreteSfiObjectRequests
    && evidence.thirdPartyIntroductions >= gate.thirdPartyIntroductions
    && evidence.realCasesWithObservedReturn >= gate.realCasesWithObservedReturn;
  const pullingNodes = nycNodes.filter((node) => node.relationState === 'PULLING');
  const routes = activeNycRelationships.map((node) => boundedNodesOfNodes(reality, node.nodeId));
  const minimumEvidenceGateSatisfied = gateSatisfied ? true : evidenceSampleComplete ? false : null;
  const disposition = gateSatisfied
    ? 'MANHATTAN_LESS_INADEQUATE_BY_MINIMUM_GATE' as const
    : evidenceSampleComplete
      ? 'INSUFFICIENT_EVIDENCE_FOR_MINIMUM_GATE' as const
      : 'BOUNDED_SAMPLE_CANNOT_FALSIFY_MINIMUM_GATE' as const;
  const state = reality.state === 'NOT_OBSERVED'
    ? 'NOT_OBSERVED' as const
    : gateSatisfied || evidenceSampleComplete
      ? 'EVIDENCE_EVALUATED' as const
      : 'BOUNDED_SAMPLE_EVALUATED' as const;

  return {
    contract: SFI_CONVERGENCE_GRAPH_CONTRACT,
    attractor: SFI_MANHATTAN_ATTRACTOR,
    state,
    geographyLens: 'NYC',
    evidenceSampleComplete,
    nycNodes,
    activeNycRelationships,
    pullingNodes,
    pullEdges,
    routes,
    evidence,
    minimumEvidenceGateSatisfied,
    disposition,
    boundary: {
      gateIsNotAttainment: true,
      pathIsNotAccess: true,
      relevanceIsNotRelationship: true,
      publicationIsNotPull: true,
      founderForcedOutreachCannotCountAsPull: true,
      unknownIntroductionOriginCannotCountAsThirdParty: true,
      saturatedSampleCannotProveInsufficiency: true,
      missingEvidenceRemainsMissing: true,
    },
  };
}

export function projectInstitutionalDiscoveryMesh(input: {
  graphNodes: readonly Row[];
  graphEdges: readonly Row[];
  trajectoryEvents: readonly Row[];
  sampleCompleteness?: SfiDiscoverySampleCompleteness;
}) {
  const reality = projectExternalRealityGraph(input.graphNodes, input.graphEdges);
  const propagation = projectPropagationGraph(input.trajectoryEvents);
  const completeness = input.sampleCompleteness ?? { graphNodes: true, graphEdges: true, trajectoryEvents: true };
  const evidenceSampleComplete = completeness.graphNodes && completeness.graphEdges && completeness.trajectoryEvents;
  const convergence = projectConvergenceGraph(reality, propagation, evidenceSampleComplete);
  return {
    contract: SFI_INSTITUTIONAL_DISCOVERY_MESH_CONTRACT,
    lenses: SFI_DISCOVERY_LENSES,
    lifecycle: SFI_DISCOVERY_LIFECYCLE,
    reality,
    propagation,
    convergence,
    publicationMesh: SFI_PUBLICATION_MESH,
    boundary: {
      oneCanonicalGraph: true,
      secondRealityDatabaseCreated: false,
      secondCanonCreated: false,
      secondPublicationReceiptOwnerCreated: false,
      attractorIsLensNotOntology: true,
      boundedSamplesCannotCreateNegativeEvidence: true,
    },
  };
}
