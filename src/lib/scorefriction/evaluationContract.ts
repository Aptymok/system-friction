import { domainsForEvaluation, type ScoreFrictionDomainId } from './domainMapping';
import { indicesForMetrics, metricsForClusters, type ScoreFrictionIndexId, type ScoreFrictionMetricId } from './metricRegistry';
import { createSubstrateProfile, type ScoreFrictionSubstrateKind, type ScoreFrictionSubstrateProfile, type ScoreFrictionTextSubtype } from './substrateMatrix';

export type ScoreFrictionEvaluationContract = {
  substrate: ScoreFrictionSubstrateProfile;
  metrics: ScoreFrictionMetricId[];
  indices: ScoreFrictionIndexId[];
  domains: ScoreFrictionDomainId[];
  readingContract: {
    highValueRule: string;
    lowValueRule: string;
    evidenceRule: string;
    calibrationRule: string;
  };
};

export function buildScoreFrictionEvaluationContract(input: {
  substrate: ScoreFrictionSubstrateKind;
  subtype?: ScoreFrictionTextSubtype | string | null;
  modalities?: ScoreFrictionSubstrateKind[] | null;
  confidence?: number | null;
  notes?: string[] | null;
}): ScoreFrictionEvaluationContract {
  const substrate = createSubstrateProfile({
    kind: input.substrate,
    subtype: input.subtype,
    modalities: input.modalities,
    confidence: input.confidence,
    notes: input.notes,
  });
  const metrics = metricsForClusters(substrate.clusters);
  const indices = indicesForMetrics(metrics);
  const domains = domainsForEvaluation({
    substrate: substrate.kind,
    clusters: substrate.clusters,
    metrics,
    indices,
  }).domains;

  return {
    substrate,
    metrics,
    indices,
    domains,
    readingContract: {
      highValueRule: 'high values are activation or proximity signals, not automatic wellbeing',
      lowValueRule: 'low values may mean absence, silence, collapse, under-measurement or closed variability',
      evidenceRule: 'all readings require substrate evidence, metric traceability and confidence disclosure',
      calibrationRule: 'global weights and thresholds require root approval before application',
    },
  };
}
