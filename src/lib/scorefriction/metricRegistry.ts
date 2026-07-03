import type { ScoreFrictionAnalysisCluster } from './substrateMatrix';

export type ScoreFrictionMetricId =
  | 'F_s'
  | 'D_i'
  | 'G_f'
  | 'C_s'
  | 'D_cog'
  | 'E_r'
  | 'V_i'
  | 'I_mc'
  | 'Phi'
  | 'R_sem'
  | 'C_sem'
  | 'LDI'
  | 'NTI'
  | 'WSV'
  | 'WSI'
  | 'semantic_density'
  | 'conflict_density'
  | 'contradiction_load'
  | 'referential_anchor'
  | 'closure_index'
  | 'motif_recurrence'
  | 'declarative_intent'
  | 'narrative_drift'
  | 'visual_density'
  | 'contrast_load'
  | 'anomaly_presence'
  | 'symbolic_coherence'
  | 'reciprocity'
  | 'response_latency'
  | 'repair_attempts'
  | 'asymmetry_index'
  | 'latency'
  | 'persistence'
  | 'decay_rate'
  | 'sequence_integrity'
  | 'traceability'
  | 'authorization_gap'
  | 'R18_trigger'
  | 'compliance_gap'
  | 'execution_gap'
  | 'repeatability'
  | 'throughput'
  | 'failure_rate'
  | 'operator_load'
  | 'margin'
  | 'cost_variance'
  | 'demand_signal'
  | 'runway'
  | 'waste_ratio'
  | 'platform_signal'
  | 'propagation_rate'
  | 'attention_density'
  | 'source_coverage'
  | 'symbolic_recurrence'
  | 'attention_sync'
  | 'narrative_transport'
  | 'ritual_density'
  | 'affective_load'
  | 'volatility'
  | 'stabilization_signal'
  | 'saturation_risk'
  | 'degradation_ratio'
  | 'domain_quorum'
  | 'branch_divergence'
  | 'commit_latency'
  | 'issue_drift'
  | 'review_lag'
  | 'modality_alignment'
  | 'modality_contradiction'
  | 'transport_gap';

export type ScoreFrictionIndexId =
  | 'Fs'
  | 'IHG'
  | 'NTI'
  | 'LDI'
  | 'WSV'
  | 'DTR'
  | 'TCI'
  | 'SCI'
  | 'MOPH_score'
  | 'R18'
  | 'Runway';

export type ScoreFrictionMetricDefinition = {
  id: ScoreFrictionMetricId;
  label: string;
  cluster: ScoreFrictionAnalysisCluster;
  range: 'normalized_0_1' | 'hours' | 'ratio' | 'count' | 'currency' | 'textual';
  highMeans: string;
  lowMeans: string;
  indices: ScoreFrictionIndexId[];
};

export const CLUSTER_METRIC_MATRIX: Record<ScoreFrictionAnalysisCluster, ScoreFrictionMetricId[]> = {
  semantic: ['semantic_density', 'conflict_density', 'contradiction_load', 'referential_anchor', 'R_sem', 'C_sem'],
  narrative: ['closure_index', 'motif_recurrence', 'declarative_intent', 'narrative_drift'],
  acoustic: ['F_s', 'D_i', 'G_f', 'C_s', 'D_cog', 'E_r', 'V_i', 'I_mc', 'Phi'],
  visual: ['visual_density', 'contrast_load', 'anomaly_presence', 'symbolic_coherence'],
  relational: ['reciprocity', 'response_latency', 'repair_attempts', 'asymmetry_index'],
  temporal: ['LDI', 'latency', 'persistence', 'decay_rate', 'sequence_integrity'],
  institutional: ['NTI', 'traceability', 'authorization_gap', 'R18_trigger', 'compliance_gap'],
  operational: ['execution_gap', 'repeatability', 'throughput', 'failure_rate', 'operator_load'],
  economic: ['margin', 'cost_variance', 'demand_signal', 'runway', 'waste_ratio'],
  digital: ['platform_signal', 'propagation_rate', 'attention_density', 'source_coverage'],
  cultural: ['symbolic_recurrence', 'attention_sync', 'narrative_transport', 'ritual_density'],
  affective: ['affective_load', 'volatility', 'stabilization_signal', 'saturation_risk'],
  world: ['WSV', 'WSI', 'source_coverage', 'degradation_ratio', 'domain_quorum'],
  repository: ['branch_divergence', 'commit_latency', 'issue_drift', 'review_lag'],
  multimodal_coupling: ['modality_alignment', 'modality_contradiction', 'transport_gap'],
};

export const METRIC_INDEX_MATRIX: Partial<Record<ScoreFrictionMetricId, ScoreFrictionIndexId[]>> = {
  LDI: ['Fs', 'IHG', 'Runway'],
  NTI: ['IHG', 'Fs', 'R18'],
  execution_gap: ['Fs', 'MOPH_score'],
  repeatability: ['MOPH_score', 'IHG'],
  semantic_density: ['SCI', 'TCI'],
  conflict_density: ['Fs'],
  contradiction_load: ['Fs', 'TCI'],
  F_s: ['Fs'],
  C_s: ['IHG'],
  V_i: ['NTI'],
  margin: ['MOPH_score'],
  waste_ratio: ['MOPH_score', 'Fs'],
  demand_signal: ['MOPH_score'],
  platform_signal: ['DTR', 'WSV'],
  source_coverage: ['SCI', 'WSV'],
  modality_alignment: ['TCI', 'DTR'],
  transport_gap: ['DTR', 'Fs'],
  WSV: ['WSV', 'DTR'],
  degradation_ratio: ['WSV', 'SCI'],
};

export function metricsForClusters(clusters: ScoreFrictionAnalysisCluster[]): ScoreFrictionMetricId[] {
  return [...new Set(clusters.flatMap((cluster) => CLUSTER_METRIC_MATRIX[cluster] ?? []))];
}

export function indicesForMetrics(metrics: ScoreFrictionMetricId[]): ScoreFrictionIndexId[] {
  return [...new Set(metrics.flatMap((metric) => METRIC_INDEX_MATRIX[metric] ?? []))];
}

export function describeMetric(metric: ScoreFrictionMetricId): ScoreFrictionMetricDefinition {
  const cluster = (Object.entries(CLUSTER_METRIC_MATRIX).find(([, metrics]) => metrics.includes(metric))?.[0]
    ?? 'operational') as ScoreFrictionAnalysisCluster;
  const indices = METRIC_INDEX_MATRIX[metric] ?? [];

  return {
    id: metric,
    label: metric,
    cluster,
    range: metric === 'LDI' || metric.includes('latency') ? 'hours' : 'normalized_0_1',
    highMeans: 'activacion alta, saturacion posible o friccion elevada segun contexto',
    lowMeans: 'activacion baja, ausencia de senal o cierre de variabilidad segun contexto',
    indices,
  };
}
