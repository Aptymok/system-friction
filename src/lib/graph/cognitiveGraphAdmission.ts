import type { CanonicalGraphEdge, CanonicalGraphNode, CanonicalGraphState } from '../../../packages/graph/src';

export const SFI_COGNITIVE_GRAPH_ADMISSION = 'SFI-COGNITIVE-GRAPH-ADMISSION-1.0';

const DOCUMENTARY_TYPES = new Set(['document','series','pattern','mihm_variable']);

function value(record: Record<string, unknown>, key: string) {
  const candidate = record[key];
  return typeof candidate === 'string' ? candidate.trim().toUpperCase() : '';
}

export function cognitiveNodeAdmission(node: CanonicalGraphNode) {
  const projectionKind = value(node.attributes, 'projectionKind');
  const epistemicClass = value(node.attributes, 'epistemicClass');
  const documentary =
    node.origin === 'library_corpus'
    || projectionKind === 'DOCUMENTARY_RELATION'
    || (DOCUMENTARY_TYPES.has(node.ontologyType.toLowerCase()) && epistemicClass === 'DECLARED' && node.attributes.doesNotImplyValidation === true);

  if (documentary) {
    return { admitted: false as const, reason: 'DOCUMENTARY_RELATION_NOT_COGNITIVE_STATE' };
  }

  if (!node.nodeId || !node.provenance) {
    return { admitted: false as const, reason: 'IDENTITY_OR_PROVENANCE_MISSING' };
  }

  return { admitted: true as const, reason: 'CANONICAL_PERSISTED_OBJECT' };
}

export function projectCognitiveGraph(state: CanonicalGraphState): CanonicalGraphState & {
  admission: { contract: string; admittedNodes: number; excludedNodes: number; excludedEdges: number };
} {
  const nodes = state.nodes.filter((node) => cognitiveNodeAdmission(node).admitted);
  const ids = new Set(nodes.map((node) => node.nodeId));
  const edges = state.edges.filter((edge: CanonicalGraphEdge) => ids.has(edge.sourceNodeId) && ids.has(edge.targetNodeId));
  return {
    ...state,
    nodes,
    edges,
    admission: {
      contract: SFI_COGNITIVE_GRAPH_ADMISSION,
      admittedNodes: nodes.length,
      excludedNodes: state.nodes.length - nodes.length,
      excludedEdges: state.edges.length - edges.length,
    },
  };
}
