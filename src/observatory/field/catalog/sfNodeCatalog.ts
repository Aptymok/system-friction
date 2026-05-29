import { getDefaultFieldNodes } from '@/observatory/components/field/fieldOntology';
import { sfStaticDataset } from './sfStaticDataset';
import { asRecord, asStringArray, clamp01, type FieldNodeCatalogItem } from './fieldMatrixBuilder';

type CanonicalGraphNode = {
  nodeId?: string;
  label?: string;
  ontologyType?: string;
  attributes?: Record<string, unknown>;
};

type CanonicalGraphState = {
  sourceState?: string;
  nodes?: CanonicalGraphNode[];
};

function nodeTypeFrom(value: unknown): FieldNodeCatalogItem['nodeType'] {
  if (value === 'module' || value === 'twin' || value === 'document' || value === 'pattern' || value === 'execution') return value;
  return 'sf';
}

function staticDatasetNodes(): FieldNodeCatalogItem[] {
  const rows = Array.isArray(sfStaticDataset.nodes) ? sfStaticDataset.nodes : [];
  return rows.map((node): FieldNodeCatalogItem => {
    const record = asRecord(node);
    const mihm = asRecord(record.mihm_v3);
    return {
      nodeKey: String(record.id || 'unknown'),
      label: String(record.name || record.id || 'Unknown node'),
      nodeType: 'sf',
      variables: asStringArray(record.variables),
      patterns: asStringArray(record.patterns),
      linkedSfNodes: asStringArray(record.relations),
      linkedDocuments: asStringArray(record.docRelations),
      activationConditions: [
        String(record.layer || 'field'),
        String(record.cluster || 'unclustered'),
        String(mihm.variable || 'derived'),
      ].filter(Boolean),
      runtimeState: 'static',
    };
  });
}

export function buildNodeCatalog(graph: CanonicalGraphState | null | undefined): FieldNodeCatalogItem[] {
  const runtimeState: FieldNodeCatalogItem['runtimeState'] = graph?.sourceState === 'observed' ? 'observed' : graph?.sourceState ? 'degraded' : 'static';
  const graphNodes = Array.isArray(graph?.nodes) ? graph.nodes : [];

  const observed = graphNodes.map((node): FieldNodeCatalogItem => {
    const attributes = asRecord(node.attributes);
    return {
      nodeKey: String(node.nodeId || attributes.node_key || attributes.key || node.label || 'unknown'),
      label: String(node.label || attributes.label || node.nodeId || 'Unknown node'),
      nodeType: nodeTypeFrom(attributes.nodeType || attributes.node_type || node.ontologyType),
      variables: asStringArray(attributes.variables),
      patterns: asStringArray(attributes.patterns),
      linkedSfNodes: asStringArray(attributes.linkedSfNodes || attributes.linked_sf_nodes),
      linkedDocuments: asStringArray(attributes.linkedDocuments || attributes.linked_documents),
      activationConditions: asStringArray(attributes.activationConditions || attributes.activation_conditions),
      runtimeState: 'observed',
    };
  });

  const observedKeys = new Set(observed.map((node) => node.nodeKey));
  const datasetNodes = staticDatasetNodes()
    .filter((node) => !observedKeys.has(node.nodeKey))
    .map((node) => ({ ...node, runtimeState }));
  const knownKeys = new Set([...observedKeys, ...datasetNodes.map((node) => node.nodeKey)]);
  const ontologyNodes = getDefaultFieldNodes()
    .filter((node) => !knownKeys.has(node.id))
    .map((node): FieldNodeCatalogItem => ({
      nodeKey: node.id,
      label: node.labelVisible || node.label,
      nodeType: node.type,
      variables: node.variables ?? [],
      patterns: node.patterns ?? [],
      linkedSfNodes: node.linkedSfNodes ?? [],
      linkedDocuments: [],
      activationConditions: node.activationConditions ?? [],
      runtimeState,
    }));

  return [...observed, ...datasetNodes, ...ontologyNodes].map((node) => ({
    ...node,
    variables: [...new Set(node.variables)],
    patterns: [...new Set(node.patterns)],
    linkedSfNodes: [...new Set(node.linkedSfNodes)],
    linkedDocuments: [...new Set(node.linkedDocuments)],
    activationConditions: [...new Set(node.activationConditions)],
  })).sort((a, b) => {
    const stateOrder = { observed: 0, static: 1, degraded: 2, missing: 3 } as const;
    return stateOrder[a.runtimeState] - stateOrder[b.runtimeState] || a.label.localeCompare(b.label);
  });
}

export function summarizeNodeCatalog(nodes: FieldNodeCatalogItem[]) {
  const observed = nodes.filter((node) => node.runtimeState === 'observed').length;
  const degraded = nodes.filter((node) => node.runtimeState === 'degraded').length;
  const density = clamp01(nodes.length / Math.max(1, Number(sfStaticDataset.metadata.total_nodes || 40)), 0);
  return { count: nodes.length, observed, degraded, density };
}
