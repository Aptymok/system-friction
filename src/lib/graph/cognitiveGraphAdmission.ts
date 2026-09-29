import type { CanonicalGraphEdge, CanonicalGraphNode, CanonicalGraphState } from '../../../packages/graph/src';

export const SFI_COGNITIVE_GRAPH_ADMISSION = 'SFI-COGNITIVE-GRAPH-ADMISSION-1.1';

/**
 * Admission is intentionally open by ontology and closed by evidence.
 * New domains, object classes and edge situations do not need a code allow-list.
 * What they do need is reconstructable identity, provenance and epistemic state.
 */
const DOCUMENTARY_TYPES = new Set(['document','series','pattern','mihm_variable']);
const EPISTEMIC_STATES = new Set([
  'OBSERVED','DERIVED','INFERRED','HYPOTHESIZED','SIMULATED',
  'UNKNOWN','NOT_OBSERVED','NOT VERIFIED','NOT_VERIFIED','DECLARED',
]);

function value(record: Record<string, unknown>, key: string) {
  const candidate = record[key];
  return typeof candidate === 'string' ? candidate.trim().toUpperCase() : '';
}

function epistemicState(node: CanonicalGraphNode) {
  return value(node.attributes, 'epistemicClass')
    || value(node.attributes, 'epistemic_class')
    || value(node.attributes, 'state')
    || value(node.attributes, 'epistemicState');
}

export function cognitiveNodeAdmission(node: CanonicalGraphNode) {
  const projectionKind = value(node.attributes, 'projectionKind');
  const state = epistemicState(node);
  const documentary =
    node.origin === 'library_corpus'
    || projectionKind === 'DOCUMENTARY_RELATION'
    || (DOCUMENTARY_TYPES.has(node.ontologyType.toLowerCase()) && state === 'DECLARED' && node.attributes.doesNotImplyValidation === true);

  if (documentary) {
    return { admitted: false as const, reason: 'DOCUMENTARY_RELATION_NOT_COGNITIVE_STATE' };
  }

  if (!node.nodeId || !node.provenance) {
    return { admitted: false as const, reason: 'IDENTITY_OR_PROVENANCE_MISSING' };
  }

  // Legacy persisted operational objects predate explicit epistemic metadata.
  // Preserve them as reconstructable legacy state, but never treat missing state
  // as verified/observed. New writers should always emit an explicit state.
  if (!state) {
    return { admitted: true as const, reason: 'LEGACY_RECONSTRUCTABLE_STATE' };
  }

  if (!EPISTEMIC_STATES.has(state)) {
    return { admitted: false as const, reason: 'EPISTEMIC_STATE_UNRECOGNIZED' };
  }

  return { admitted: true as const, reason: 'EVIDENCE_BOUNDED_COGNITIVE_STATE' };
}

export function projectCognitiveGraph(state: CanonicalGraphState): CanonicalGraphState & {
  admission: { contract: string; sourceNodes: number; sourceEdges: number; admittedNodes: number; admittedEdges: number; excludedNodes: number; excludedEdges: number; excludedNodeReasons: Record<string, number> };
} {
  const nodeAdmission = state.nodes.map((node) => ({ node, result: cognitiveNodeAdmission(node) }));
  const nodes = nodeAdmission.filter((item) => item.result.admitted).map((item) => item.node);
  const excludedNodeReasons = nodeAdmission.filter((item) => !item.result.admitted).reduce<Record<string, number>>((counts, item) => { counts[item.result.reason] = (counts[item.result.reason] ?? 0) + 1; return counts; }, {});
  const ids = new Set(nodes.map((node) => node.nodeId));
  const edges = state.edges.filter((edge: CanonicalGraphEdge) => ids.has(edge.sourceNodeId) && ids.has(edge.targetNodeId));
  return {
    ...state,
    nodes,
    edges,
    admission: {
      contract: SFI_COGNITIVE_GRAPH_ADMISSION,
      sourceNodes: state.nodes.length,
      sourceEdges: state.edges.length,
      admittedNodes: nodes.length,
      admittedEdges: edges.length,
      excludedNodes: state.nodes.length - nodes.length,
      excludedEdges: state.edges.length - edges.length,
      excludedNodeReasons,
    },
  };
}
