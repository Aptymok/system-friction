import type { ObservationSourceDescriptor } from './sourceStateTypes';

export type ObservationClaimScope =
  | 'local_context'
  | 'world'
  | 'external'
  | 'social'
  | 'platform'
  | 'trend'
  | 'metric';

export type ObservationClaimAssertion = {
  claim: string;
  claimScope: ObservationClaimScope;
  visibleNotice?: string;
  sourceDescriptor: ObservationSourceDescriptor;
};

const externalScopes = new Set<ObservationClaimScope>([
  'world',
  'external',
  'social',
  'platform',
  'trend',
  'metric',
]);

export function assertObservationClaim(input: {
  claim: string;
  sourceDescriptor: ObservationSourceDescriptor;
  requestedScope?: ObservationClaimScope | ObservationClaimScope[];
}): ObservationClaimAssertion {
  const requestedScopes = Array.isArray(input.requestedScope)
    ? input.requestedScope
    : input.requestedScope
      ? [input.requestedScope]
      : ['local_context' as ObservationClaimScope];
  const requiresExternal = requestedScopes.some((scope) => externalScopes.has(scope));

  if (requiresExternal && !input.sourceDescriptor.isExternal) {
    return {
      claim: input.claim,
      claimScope: 'local_context',
      visibleNotice: 'Lectura local. Fuente externa no conectada.',
      sourceDescriptor: input.sourceDescriptor,
    };
  }

  if (input.sourceDescriptor.sourceState === 'MISSING_SOURCE') {
    return {
      claim: input.claim,
      claimScope: 'local_context',
      visibleNotice: 'Origen faltante.',
      sourceDescriptor: input.sourceDescriptor,
    };
  }

  if (input.sourceDescriptor.sourceState === 'STALE_SOURCE') {
    return {
      claim: input.claim,
      claimScope: 'local_context',
      visibleNotice: 'Dato vencido.',
      sourceDescriptor: input.sourceDescriptor,
    };
  }

  return {
    claim: input.claim,
    claimScope: requestedScopes[0] || 'local_context',
    visibleNotice: input.sourceDescriptor.isSimulated ? 'Simulacion.' : undefined,
    sourceDescriptor: input.sourceDescriptor,
  };
}
