import type { StudioProductionState } from './studioProductionTypes';

const PRIVATE_INSTITUTIONAL_METRIC_KEYS = new Set([
  'mihm_activation',
]);

function memberMetric(metric: StudioProductionState['metricValues'][number]) {
  if (!PRIVATE_INSTITUTIONAL_METRIC_KEYS.has(metric.key)) return metric;
  return {
    ...metric,
    value: null,
    status: 'MISSING' as const,
    source: 'member_object_scope',
    evidenceIds: [],
    confidence: 0,
    observedAt: null,
    formulaVersion: null,
    warnings: ['INSTITUTIONAL_PRIVATE_CONTEXT_HIDDEN'],
    explanation: 'La cuenta miembro sólo puede leer mediciones derivadas de sus propios objetos.',
  };
}

export function scopeStudioStateForMember(state: StudioProductionState): StudioProductionState {
  const metricValues = state.metricValues.map(memberMetric);
  const objectGraphNodes = state.objectFeatures.graph.nodes.filter((node) => node.id !== 'mihm');
  const objectNodeIds = new Set(objectGraphNodes.map((node) => node.id));
  const objectGraphEdges = state.objectFeatures.graph.edges.filter(
    (edge) => objectNodeIds.has(edge.from) && objectNodeIds.has(edge.to),
  );

  const fieldNodes = state.fieldGraph.nodes.filter(
    (node) => node.id !== 'mihm_activation' && node.source !== 'studioGold.mihmModel',
  );
  const fieldNodeIds = new Set(fieldNodes.map((node) => node.id));
  const fieldEdges = state.fieldGraph.edges.filter(
    (edge) => fieldNodeIds.has(edge.from) && fieldNodeIds.has(edge.to),
  );

  const hasOwnedObject = Boolean(state.activeObject.id);
  const hasOwnedFeatures = state.objectFeatures.metrics.some((metric) => metric.value !== null);

  return {
    ...state,
    systemState: hasOwnedObject && hasOwnedFeatures ? 'nominal' : 'degraded',
    objectFeatures: {
      ...state.objectFeatures,
      graph: {
        nodes: objectGraphNodes,
        edges: objectGraphEdges,
      },
    },
    metricValues,
    fieldGraph: {
      nodes: fieldNodes,
      edges: fieldEdges,
    },
    mihmReport: {
      score: null,
      individual: null,
      group: null,
      institutional: null,
      systemic: null,
      civilizational: null,
      source: 'member_object_scope_only',
    },
    provenance: {
      ...state.provenance,
      basedOn: state.provenance.basedOn.filter((source) => source !== 'readStudioGoldState'),
      derivedFrom: [...state.provenance.derivedFrom, 'member tenant scope'],
      limits: [...state.provenance.limits, 'institutional_private_context_hidden_for_member'],
    },
    degradedSources: [
      ...state.degradedSources.filter((source) => !source.startsWith('scorefriction_')),
      'institutional_private_context_hidden_for_member',
    ],
  };
}
