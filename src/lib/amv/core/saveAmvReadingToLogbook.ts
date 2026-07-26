import { routeAmvReadingToLogbook } from './logbookRoutingPolicy';
import type { AmvEvidenceTrust } from './evidenceTypes';
import type { AMVReading } from './amvReading';

export function createAmvReading(input: {
  scope: string;
  trust: AmvEvidenceTrust;
  summary: string;
  operator?: string;
  observedAt?: string;
  payload?: unknown;
  closesLoop?: boolean;
  changesRoute?: boolean;
}) {
  const route = routeAmvReadingToLogbook({
    trust: input.trust,
    hasOperator: Boolean(input.operator),
    hasTimestamp: Boolean(input.observedAt),
    closesLoop: input.closesLoop,
    changesRoute: input.changesRoute,
  });

  if (route.layer === 'not_promoted') {
    return {
      ok: false as const,
      error: 'amv_reading_not_promoted',
      route,
    };
  }

  const reading = {
    scope: input.scope,
    trust: input.trust,
    summary: input.summary,
    operator: input.operator ?? null,
    observedAt: input.observedAt ?? null,
    payload: input.payload ?? null,
    closesLoop: Boolean(input.closesLoop),
    changesRoute: Boolean(input.changesRoute),
  };

  return {
    ok: true as const,
    reading,
    route,
  };
}