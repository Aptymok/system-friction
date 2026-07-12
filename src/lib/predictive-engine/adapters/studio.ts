import 'server-only';

import type { StudioFieldProjection } from '@/lib/studio/production/objectFieldProjection';
import { runPrediction } from '../service';
import type { PredictiveFeatureInput } from '../types';

function domainValue(projection: StudioFieldProjection, domain: string) {
  return projection.world.domains.find((item) => item.domain === domain)?.value ?? null;
}

function routeSuitability(projection: StudioFieldProjection, routeId: string) {
  return projection.strategy.routes.find((item) => item.id === routeId)?.suitability ?? null;
}

export function studioProjectionFeatures(projection: StudioFieldProjection): PredictiveFeatureInput[] {
  const worldConfidence = projection.world.confidence;
  const evidenceIds = projection.evidenceIds;
  const confidence = Math.max(0.1, Math.min(1, projection.fit.confidence));
  const technicalSuitability = routeSuitability(projection, 'TECHNICAL_OPTIMIZE');
  const technicalRisk = technicalSuitability === null ? null : Math.max(0, Math.min(1, technicalSuitability - 0.48));
  return [
    {
      key: 'field_compatibility',
      value: projection.fit.score,
      confidence,
      source: 'studio_field_projection_v2',
      evidenceIds,
      observedAt: projection.generatedAt,
    },
    {
      key: 'world_confidence',
      value: worldConfidence,
      confidence: worldConfidence,
      source: 'worldspect_cultural_lens',
      evidenceIds: projection.world.crossVectorTensions.flatMap((item) => item.evidence),
      observedAt: projection.world.observedAt,
    },
    {
      key: 'mihm_coverage',
      value: projection.object.mihmCoverage,
      confidence: projection.object.mihmCoverage,
      source: 'studio_object_context_synthesis',
      evidenceIds,
      observedAt: projection.generatedAt,
    },
    {
      key: 'mihm_core_coverage',
      value: projection.object.mihmCoreCoverage,
      confidence: projection.object.mihmCoreCoverage,
      source: 'studio_object_context_synthesis',
      evidenceIds,
      observedAt: projection.generatedAt,
    },
    {
      key: 'cultural_pressure',
      value: domainValue(projection, 'CULTURAL'),
      confidence: worldConfidence,
      source: 'worldspect_cultural_lens',
      evidenceIds: ['world.domain.CULTURAL'],
      observedAt: projection.world.observedAt,
    },
    {
      key: 'memetic_pressure',
      value: domainValue(projection, 'MEMETIC'),
      confidence: worldConfidence,
      source: 'worldspect_cultural_lens',
      evidenceIds: ['world.domain.MEMETIC'],
      observedAt: projection.world.observedAt,
    },
    {
      key: 'affective_pressure',
      value: domainValue(projection, 'AFFECTIVE'),
      confidence: worldConfidence,
      source: 'worldspect_cultural_lens',
      evidenceIds: ['world.domain.AFFECTIVE'],
      observedAt: projection.world.observedAt,
    },
    {
      key: 'counter_signal',
      value: projection.fit.band === 'COUNTER_SIGNAL' ? 1 : projection.fit.band === 'MIXED' ? 0.5 : 0,
      confidence,
      source: 'studio_field_projection_v2',
      evidenceIds,
      observedAt: projection.generatedAt,
    },
    {
      key: 'technical_risk',
      value: technicalRisk,
      confidence: projection.object.mihmCoverage,
      source: 'studio_strategy_routes',
      evidenceIds,
      observedAt: projection.generatedAt,
    },
  ];
}

export async function predictStudioFieldResponse(input: {
  objectId: string;
  projection: StudioFieldProjection;
  ownerId?: string | null;
  createdBy?: string | null;
  persist?: boolean;
}) {
  return runPrediction({
    scope: 'studio',
    subjectType: 'studio_object',
    subjectId: input.objectId,
    modelKey: 'studio_field_response_v1',
    targetKey: 'field_response_30d',
    targetKind: 'binary',
    returnWindow: '30d',
    features: studioProjectionFeatures(input.projection),
    evidence: [
      {
        id: `studio-projection:${input.objectId}:${input.projection.generatedAt}`,
        key: 'studio_field_projection',
        source: 'studio_field_projection_v2',
        trust: input.projection.status === 'PROJECTED' ? 'OBSERVED' : 'INFERRED',
        value: {
          fit: input.projection.fit,
          world: input.projection.world,
          object: input.projection.object,
          strategy: input.projection.strategy,
        },
        observedAt: input.projection.generatedAt,
      },
    ],
    context: {
      worldRegime: input.projection.world.regime,
      inferredAttractors: input.projection.world.inferredAttractors,
      selectedRoute: input.projection.strategy.selectedRouteId,
      opportunityWindow: input.projection.opportunityWindow,
      calibrationWarning: input.projection.calibration,
    },
    verificationRule: {
      observable: 'normalized_field_response_30d',
      comparator: 'gte',
      threshold: 0.5,
      returnWindow: '30d',
      sourcePriority: ['verified_platform_export', 'observed_distribution_metrics', 'declared_operator_outcome'],
      trueCondition: 'La respuesta normalizada por exposición alcanza o supera 0.5 dentro de 30 días.',
      falseCondition: 'La respuesta normalizada por exposición permanece debajo de 0.5 dentro de 30 días.',
      partialCondition: 'Existe respuesta, pero la exposición, audiencia o fidelidad de ejecución no es comparable.',
      unverifiableCondition: 'No se registraron exposición y outcome comparables dentro de la ventana.',
    },
    persist: input.persist,
    ownerId: input.ownerId,
    createdBy: input.createdBy ?? input.ownerId,
  });
}
