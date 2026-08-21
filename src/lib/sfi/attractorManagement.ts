import { readInstitutionalAttractor } from '@/lib/institution/institutionalAttractor';

export type AttractorScorecard = {
  knowledgeVelocity: number | null;
  authorityScore: number | null;
  memoryGrowth: number | null;
  predictionAccuracy: number | null;
  attractorDistance: number | null;
  evidenceCoverage: number | null;
  supportedDimensions: string[];
  contradictedDimensions: string[];
  missingDimensions: string[];
  observedAt: string | null;
  summary: string;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function numberOrNull(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function strings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export async function buildAttractorScorecard(): Promise<AttractorScorecard> {
  const state = await readInstitutionalAttractor();
  const latest = record(state.latestTrajectory);
  const evidenceCoverage = numberOrNull(latest.evidence_coverage);
  const supportedDimensions = strings(latest.supported_dimensions);
  const contradictedDimensions = strings(latest.contradicted_dimensions);
  const missingDimensions = strings(latest.missing_dimensions);
  const observedAt = typeof latest.observed_at === 'string' ? latest.observed_at : null;

  return {
    knowledgeVelocity: null,
    authorityScore: null,
    memoryGrowth: null,
    predictionAccuracy: null,
    attractorDistance: null,
    evidenceCoverage,
    supportedDimensions,
    contradictedDimensions,
    missingDimensions,
    observedAt,
    summary: latest.observed_at
      ? 'Estado del atractor derivado de evidencia persistida. Cobertura de evidencia no equivale a cumplimiento, distancia, autoridad, velocidad de conocimiento ni precisión predictiva.'
      : 'No existe todavía un snapshot canónico del atractor. No se fabrican métricas sustitutas.',
  };
}
