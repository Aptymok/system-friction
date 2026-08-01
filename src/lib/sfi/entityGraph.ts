import { readCanonicalGraphState } from '../graph/canonicalGraph';

export { buildEntityContext, collectEntityTimeline, resolveEntityTrajectory } from './entityContext';

export type CanonicalEntityNode = {
  id: string;
  label: string;
  ontologyType: string;
  attributes?: Record<string, unknown>;
};

export type CanonicalEntityEdge = {
  id: string;
  source: string;
  target: string;
  relation: string;
  weight?: number;
};

export type CanonicalEntityGraph = {
  nodes: CanonicalEntityNode[];
  edges: CanonicalEntityEdge[];
};

export async function buildInstitutionalEntityGraph(input: { entityId: string; entityType: string; label: string }) {
  const graphState = await readCanonicalGraphState('shared');
  const entityKey = input.entityId.trim().toLowerCase();

  const matchingNodes = graphState.nodes.filter((node) => {
    const haystack = [node.nodeId, node.label, node.ontologyType].join(' ').toLowerCase();
    return entityKey.length > 0 ? haystack.includes(entityKey) : false;
  });

  const nodes = matchingNodes.length > 0 ? matchingNodes : [];
  const nodeIds = new Set(nodes.map((node) => node.nodeId));
  const edges = graphState.edges.filter((edge) => nodeIds.has(edge.sourceNodeId) || nodeIds.has(edge.targetNodeId));

  return {
    nodes: nodes.map((node) => ({
      id: node.nodeId,
      label: node.label,
      ontologyType: node.ontologyType,
      attributes: node.attributes,
    })),
    edges: edges.map((edge) => ({
      id: edge.edgeId,
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
      relation: edge.relation,
      weight: edge.weight,
    })),
  } satisfies CanonicalEntityGraph;
}
