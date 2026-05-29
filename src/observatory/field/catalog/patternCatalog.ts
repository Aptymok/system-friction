import { fieldPatterns } from '@/observatory/field/patternModel';
import type { PatternCatalogItem } from './fieldMatrixBuilder';

function toRisk(level: number): PatternCatalogItem['riskLevel'] {
  if (level >= 4) return 'high';
  if (level >= 3) return 'medium';
  return 'low';
}

export function buildPatternCatalog(): PatternCatalogItem[] {
  return fieldPatterns.map((pattern) => ({
    patternId: pattern.id,
    label: pattern.nombre,
    triggerTerms: pattern.que_lo_activa,
    variables: [],
    linkedNodes: pattern.nodos_relacionados,
    suggestedExecutions: [pattern.accion_sugerida],
    riskLevel: toRisk(pattern.nivel_friccion),
    evidenceRequirement: pattern.capa_visible === 'TRACE_LAYER' ? 'trace_required' : 'field_observation_required',
  }));
}
