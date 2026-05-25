import type { FieldOntologyNode } from '@/observatory/components/field/fieldOntology';
import { coreFieldPatterns, fieldPatterns, type FieldPattern } from './patternModel';
import type { PatternRankResult } from './patternActivation';
import { computeNodeActivation, scoreMihmToNode, scoreTraceToNode, topActivatedNodeIds } from './vectorScoring';
import type {
  FieldEdgeVector,
  FieldNodeVector,
  GraphVectorState,
  PatternVector,
  UserSignalVector,
} from './vectorTypes';

function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function clusterForNode(node: FieldOntologyNode) {
  if (node.commandMode === 'mihm') return 'mihm';
  if (node.commandMode === 'project_manager') return 'decision';
  if (node.commandMode === 'logbook') return 'bitacora';
  if (node.commandMode === 'media' || node.commandMode === 'social') return 'salida_publica';
  if (node.commandMode === 'calendar') return 'ejecucion';
  if (node.commandMode === 'evidence') return 'evidencia';
  if (node.type === 'twin') return 'usuario';
  return node.type;
}

export function buildFieldNodeVectors(nodes: FieldOntologyNode[]): FieldNodeVector[] {
  return nodes.map((node) => {
    const mihmVariables = (node.variables || []).filter((variable) => ['IHG', 'NTI', 'LDI', 'ICE', 'CRM', 'F'].includes(variable));
    const docRefs = [...node.linkedSfNodes, ...(node.patterns || []).filter((pattern) => pattern.startsWith('SF_'))];
    return {
      nodeId: node.id,
      label: node.label,
      commandMode: node.commandMode,
      layer: node.type,
      cluster: clusterForNode(node),
      variables: node.variables || [],
      patterns: node.patterns || [],
      linkedSfNodes: node.linkedSfNodes,
      linkedComponents: node.linkedComponents,
      linkedEndpoints: node.linkedEndpoints,
      mihmVariables,
      docRefs,
      relationIds: [...node.activationConditions, ...node.linkedSfNodes],
      baseWeight: node.type === 'module' ? 0.72 : node.type === 'sf' ? 0.64 : 0.48,
      activation: 0,
      frictionScore: 0,
      traceScore: 0,
      stabilityScore: 0,
      activityScore: 0,
    };
  });
}

export function buildPatternVectors(patterns: FieldPattern[] = fieldPatterns): PatternVector[] {
  return patterns.map((pattern) => ({
    patternId: pattern.id,
    palabra: pattern.palabra,
    activationTerms: pattern.que_lo_activa.map(normalize),
    relatedNodes: pattern.nodos_relacionados.map(normalize),
    frictionLevel: pattern.nivel_friccion,
    action: pattern.accion_sugerida,
    isCore: coreFieldPatterns.some((corePattern) => corePattern.id === pattern.id),
  }));
}

export function buildEdgeVectors(nodes: FieldOntologyNode[]): FieldEdgeVector[] {
  const edges: FieldEdgeVector[] = [];
  for (const from of nodes) {
    for (const to of nodes) {
      if (from.id === to.id) continue;
      const sharedSf = from.linkedSfNodes.filter((node) => to.linkedSfNodes.includes(node));
      const sharedPattern = (from.patterns || []).filter((pattern) => (to.patterns || []).includes(pattern));
      if (!sharedSf.length && !sharedPattern.length) continue;
      const baseWeight = Math.min(1, 0.18 + sharedSf.length * 0.12 + sharedPattern.length * 0.08);
      edges.push({
        edgeId: `${from.id}->${to.id}`,
        fromNodeId: from.id,
        toNodeId: to.id,
        relation: [...sharedSf, ...sharedPattern].join(' // '),
        baseWeight,
        finalWeight: baseWeight,
      });
    }
  }
  return edges;
}

export function buildGraphVectorState(input: {
  nodes: FieldOntologyNode[];
  patterns?: FieldPattern[];
  rankedPatterns: PatternRankResult;
  activeNode?: FieldOntologyNode | string | null;
  userSignal: UserSignalVector;
}): GraphVectorState {
  const baseNodeVectors = buildFieldNodeVectors(input.nodes);
  const activeNodeId = typeof input.activeNode === 'string' ? input.activeNode : input.activeNode?.id || input.userSignal.activeNodeId;
  const nodeVectors = baseNodeVectors.map((nodeVector) => {
    const activityScore = activeNodeId === nodeVector.nodeId ? 1 : 0;
    const traceScore = scoreTraceToNode(nodeVector);
    const stabilityScore = scoreMihmToNode(nodeVector);
    const frictionScore = Math.max(
      input.rankedPatterns.primaryPattern ? input.rankedPatterns.primaryPattern.pattern.nivel_friccion / 5 : 0,
      ...input.rankedPatterns.secondaryPatterns.map((item) => item.pattern.nivel_friccion / 5),
    );
    const activation = computeNodeActivation({
      nodeVector: { ...nodeVector, traceScore, stabilityScore, activityScore, frictionScore },
      rankedPatterns: input.rankedPatterns,
      userSignal: input.userSignal,
    });
    return {
      ...nodeVector,
      activation,
      frictionScore,
      traceScore,
      stabilityScore,
      activityScore,
    };
  });

  const edgeVectors = buildEdgeVectors(input.nodes).map((edge) => {
    const from = nodeVectors.find((node) => node.nodeId === edge.fromNodeId);
    const to = nodeVectors.find((node) => node.nodeId === edge.toNodeId);
    const finalWeight = Math.min(1, edge.baseWeight + ((from?.activation || 0) + (to?.activation || 0)) / 4);
    return { ...edge, finalWeight };
  });

  const graph = { nodeVectors } satisfies Pick<GraphVectorState, 'nodeVectors'>;

  return {
    nodeVectors,
    edgeVectors,
    patternVectors: buildPatternVectors(input.patterns || fieldPatterns),
    mihmVector: {
      IHG: null,
      NTI_obs: null,
      LDI_hours: null,
      PHI_SF: null,
      ICE: null,
      CRM: null,
      F: null,
    },
    traceVector: {
      docRefs: nodeVectors.flatMap((node) => node.docRefs),
      traceScore: Math.max(0, ...nodeVectors.map((node) => node.traceScore)),
      originAvailable: nodeVectors.some((node) => node.docRefs.length > 0),
    },
    userSignal: input.userSignal,
    primaryPatternId: input.rankedPatterns.primaryPattern?.pattern.id || null,
    secondaryPatternIds: input.rankedPatterns.secondaryPatterns.map((item) => item.pattern.id),
    hiddenPatternIds: input.rankedPatterns.hiddenPatterns.map((item) => item.pattern.id),
    activationScore: input.rankedPatterns.activationScore,
    topActivatedNodeIds: topActivatedNodeIds(graph, 7),
    graphLayoutMode: input.rankedPatterns.activationScore > 0.55 ? 'focused' : input.userSignal.fieldMode === 'NODE_CT' ? 'trace' : 'field',
  };
}
