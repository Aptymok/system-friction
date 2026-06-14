import type { WorldSpectDomain, WorldSpectLensDomain, WorldSpectSupportLevel, WorldSpectVector } from '@/lib/worldspect/vector-contract';
import type { ScoreFrictionGenerationRequest, ScoreFrictionObjectKind } from './types';

export type ScoreFrictionObject = {
  objectId: string;
  kind: ScoreFrictionObjectKind;
  label: string;
  sourceName: string;
  sourceUrl: string | null;
  territory: string;
  semanticText: string | null;
  metadata: Record<string, unknown>;
  contentFingerprint: string;
  observedAt: string;
};

export type ScoreFrictionObjectMetrics = {
  density: number;
  semanticPressure: number;
  affectiveLoad: number;
  novelty: number;
  recurrence: number;
  evidenceWeight: number;
};

export type ScoreFrictionLens = {
  selectedDomain: WorldSpectLensDomain;
  supportLevel: WorldSpectSupportLevel;
  sourceCoverage: number;
  selectedVector: WorldSpectVector | null;
  worldWsi: number;
  worldNti: number;
  warnings: string[];
};

export type ScoreFrictionWorldContrast = {
  selectedDomain: WorldSpectLensDomain;
  frictionScore: number;
  alignment: number;
  dissonance: number;
  saturationRisk: number;
  emergencePotential: number;
  confidence: number;
  summary: string;
  warnings: string[];
};

export type ScoreFrictionGenerativeOption = {
  kind: Exclude<ScoreFrictionGenerationRequest, false>;
  label: string;
  enabled: boolean;
  requiresExplicitRequest: true;
  reason: string;
};

export type ScoreFrictionAuditResult = {
  object: ScoreFrictionObject;
  objectMetrics: ScoreFrictionObjectMetrics;
  lens: ScoreFrictionLens;
  worldContrast: ScoreFrictionWorldContrast;
  generationRequested: ScoreFrictionGenerationRequest;
  generationOptions: ScoreFrictionGenerativeOption[];
};

export const SCORE_FRICTION_WORLD_DOMAINS: WorldSpectLensDomain[] = [
  'TOTAL',
  'CULTURAL',
  'ECONOMY',
  'GEO_DIGITAL',
  'GEOPOLITICAL',
  'BIO',
  'CLIMATE',
  'INSTITUTIONAL',
  'MEMETIC',
  'TECH',
  'AFFECTIVE',
];

export function isScoreFrictionWorldDomain(value: unknown): value is WorldSpectLensDomain {
  return typeof value === 'string' && SCORE_FRICTION_WORLD_DOMAINS.includes(value as WorldSpectLensDomain);
}
