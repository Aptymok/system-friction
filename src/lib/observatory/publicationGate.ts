export const OBSERVATORY_PUBLICATION_CONTRACT = 'SFI-OBSERVATORY-PUBLICATION-1.0' as const;

export type ObservatoryEpistemicClass = 'OBSERVED' | 'DERIVED' | 'INFERRED' | 'PROPOSED' | 'SIMULATED' | 'MISSING';
export type ObservatoryAuthority = 'PUBLIC' | 'ROOT_AUTHORIZED_PROJECTION' | 'PRIVATE' | 'CANDIDATE';
export type PublicationDisposition = 'PUBLISH' | 'PUBLISH_AS_PROJECTION' | 'BLOCK';

export function observatoryPublicationDisposition(input: {
  epistemicClass: ObservatoryEpistemicClass;
  authority: ObservatoryAuthority;
  sourceRefs: string[];
}): { disposition: PublicationDisposition; reason: string } {
  if (!input.sourceRefs.length) return { disposition:'BLOCK', reason:'source_refs_required' };
  if (input.authority === 'PRIVATE' || input.authority === 'CANDIDATE') return { disposition:'BLOCK', reason:'authority_not_public' };
  if (input.epistemicClass === 'OBSERVED' || input.epistemicClass === 'DERIVED') {
    return input.authority === 'PUBLIC'
      ? { disposition:'PUBLISH', reason:'evidence_backed_public_state' }
      : { disposition:'PUBLISH_AS_PROJECTION', reason:'root_authorized_contextual_projection' };
  }
  if ((input.epistemicClass === 'INFERRED' || input.epistemicClass === 'PROPOSED') && input.authority === 'ROOT_AUTHORIZED_PROJECTION') {
    return { disposition:'PUBLISH_AS_PROJECTION', reason:'explicitly_authorized_non_observed_projection' };
  }
  return { disposition:'BLOCK', reason:`${input.epistemicClass.toLowerCase()}_cannot_cross_public_boundary` };
}
