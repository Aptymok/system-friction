import type { ScoreFrictionAnalysisCluster, ScoreFrictionSubstrateKind } from './substrateMatrix';
import type { ScoreFrictionIndexId, ScoreFrictionMetricId } from './metricRegistry';

export type ScoreFrictionDomainId =
  | 'cultural'
  | 'economy'
  | 'geo_digital'
  | 'geopolitical'
  | 'bio'
  | 'climate'
  | 'institutional'
  | 'memetic'
  | 'tech'
  | 'affective'
  | 'operational'
  | 'repository';

export type ScoreFrictionDomainMapping = {
  domains: ScoreFrictionDomainId[];
  reason: string;
};

export const CLUSTER_DOMAIN_MATRIX: Record<ScoreFrictionAnalysisCluster, ScoreFrictionDomainId[]> = {
  semantic: ['cultural', 'affective'],
  narrative: ['cultural', 'memetic'],
  acoustic: ['cultural', 'affective'],
  visual: ['cultural', 'memetic', 'affective'],
  temporal: ['operational', 'institutional'],
  relational: ['affective', 'institutional'],
  institutional: ['institutional', 'geopolitical'],
  operational: ['operational', 'institutional'],
  economic: ['economy'],
  digital: ['tech', 'geo_digital', 'memetic'],
  cultural: ['cultural', 'memetic'],
  affective: ['affective'],
  world: ['cultural', 'economy', 'geo_digital', 'geopolitical', 'bio', 'climate', 'institutional', 'memetic', 'tech', 'affective'],
  repository: ['repository', 'tech', 'operational'],
  multimodal_coupling: ['cultural', 'memetic', 'tech'],
};

export const SUBSTRATE_DOMAIN_HINTS: Record<ScoreFrictionSubstrateKind, ScoreFrictionDomainId[]> = {
  text: ['cultural', 'affective'],
  audio: ['cultural', 'affective'],
  image: ['cultural', 'memetic', 'affective'],
  video: ['cultural', 'memetic', 'affective', 'tech'],
  conversation: ['affective', 'institutional', 'operational'],
  document: ['institutional', 'operational'],
  repository: ['repository', 'tech', 'operational'],
  operation: ['operational', 'economy', 'institutional'],
  event: ['cultural', 'institutional', 'affective'],
  world_domain: ['cultural', 'economy', 'geo_digital', 'geopolitical', 'bio', 'climate', 'institutional', 'memetic', 'tech', 'affective'],
  multimodal: ['cultural', 'memetic', 'tech', 'affective'],
};

export const METRIC_DOMAIN_HINTS: Partial<Record<ScoreFrictionMetricId, ScoreFrictionDomainId[]>> = {
  platform_signal: ['memetic', 'tech', 'cultural'],
  propagation_rate: ['memetic', 'tech'],
  attention_density: ['memetic', 'cultural'],
  source_coverage: ['tech', 'operational'],
  margin: ['economy'],
  demand_signal: ['economy', 'cultural'],
  runway: ['economy', 'operational'],
  waste_ratio: ['economy', 'operational'],
  authorization_gap: ['institutional'],
  compliance_gap: ['institutional'],
  R18_trigger: ['institutional', 'operational'],
  branch_divergence: ['repository', 'tech', 'operational'],
  commit_latency: ['repository', 'operational'],
  WSV: ['cultural', 'economy', 'geo_digital', 'geopolitical', 'bio', 'climate', 'institutional', 'memetic', 'tech', 'affective'],
  WSI: ['cultural', 'economy', 'geo_digital', 'geopolitical', 'bio', 'climate', 'institutional', 'memetic', 'tech', 'affective'],
};

export const INDEX_DOMAIN_HINTS: Partial<Record<ScoreFrictionIndexId, ScoreFrictionDomainId[]>> = {
  WSV: ['cultural', 'economy', 'geo_digital', 'geopolitical', 'bio', 'climate', 'institutional', 'memetic', 'tech', 'affective'],
  MOPH_score: ['operational', 'economy', 'institutional'],
  R18: ['institutional', 'operational'],
  Runway: ['economy', 'operational'],
  DTR: ['cultural', 'memetic', 'tech', 'institutional'],
  TCI: ['cultural', 'operational', 'institutional'],
  SCI: ['tech', 'operational'],
};

function unique<T extends string>(values: T[]): T[] {
  return [...new Set(values)];
}

export function domainsForEvaluation(input: {
  substrate: ScoreFrictionSubstrateKind;
  clusters: ScoreFrictionAnalysisCluster[];
  metrics?: ScoreFrictionMetricId[] | null;
  indices?: ScoreFrictionIndexId[] | null;
}): ScoreFrictionDomainMapping {
  const domains = unique([
    ...(SUBSTRATE_DOMAIN_HINTS[input.substrate] ?? []),
    ...input.clusters.flatMap((cluster) => CLUSTER_DOMAIN_MATRIX[cluster] ?? []),
    ...(input.metrics ?? []).flatMap((metric) => METRIC_DOMAIN_HINTS[metric] ?? []),
    ...(input.indices ?? []).flatMap((index) => INDEX_DOMAIN_HINTS[index] ?? []),
  ]);

  return {
    domains,
    reason: 'derived_from_substrate_cluster_metric_index_mapping',
  };
}
