import { fieldPatterns } from '@/observatory/field/patternModel';
import { sfStaticDataset } from './sfStaticDataset';
import { asStringArray, type PatternCatalogItem } from './fieldMatrixBuilder';

function toRisk(level: number): PatternCatalogItem['riskLevel'] {
  if (level >= 4) return 'high';
  if (level >= 3) return 'medium';
  return 'low';
}

export function buildPatternCatalog(): PatternCatalogItem[] {
  const fromFieldPatterns = fieldPatterns.map((pattern) => ({
    patternId: pattern.id,
    label: pattern.nombre,
    triggerTerms: pattern.que_lo_activa,
    variables: [],
    linkedNodes: pattern.nodos_relacionados,
    suggestedExecutions: [pattern.accion_sugerida],
    riskLevel: toRisk(pattern.nivel_friccion),
    evidenceRequirement: pattern.capa_visible === 'TRACE_LAYER' ? 'trace_required' : 'field_observation_required',
  } satisfies PatternCatalogItem));

  const nodeLinks = new Map<string, Set<string>>();
  for (const node of sfStaticDataset.nodes || []) {
    for (const patternId of asStringArray(node.patterns)) {
      const links = nodeLinks.get(patternId) || new Set<string>();
      links.add(String(node.id));
      nodeLinks.set(patternId, links);
    }
  }

  const datasetPatterns = (sfStaticDataset.patterns_catalog?.pattern_ids || []).map((patternId) => ({
    patternId,
    label: patternId,
    triggerTerms: [patternId],
    variables: [],
    linkedNodes: [...(nodeLinks.get(patternId) || new Set<string>())],
    suggestedExecutions: ['review_field_pattern'],
    riskLevel: 'medium',
    evidenceRequirement: 'dataset_pattern_reference',
  } satisfies PatternCatalogItem));

  const byId = new Map<string, PatternCatalogItem>();
  for (const pattern of [...datasetPatterns, ...fromFieldPatterns]) {
    const existing = byId.get(pattern.patternId);
    if (!existing) {
      byId.set(pattern.patternId, pattern);
      continue;
    }
    byId.set(pattern.patternId, {
      ...existing,
      triggerTerms: [...new Set([...existing.triggerTerms, ...pattern.triggerTerms])],
      linkedNodes: [...new Set([...existing.linkedNodes, ...pattern.linkedNodes])],
      suggestedExecutions: [...new Set([...existing.suggestedExecutions, ...pattern.suggestedExecutions])],
    });
  }
  return [...byId.values()].sort((a, b) => a.patternId.localeCompare(b.patternId));
}
