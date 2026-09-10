import {
  SFI_CANONICAL_OBJECT_REGISTRY,
  canonicalNamespaceFor,
  canonicalUrlFor,
  type SfiCanonicalObjectRecord,
} from '../discovery/canonicalObjectRegistry';
import {
  researchCitationExportForNode,
  researchGraphProjectionForCanonicalObjects,
  type SfiResearchCitationExport,
  type SfiResearchGraphNode,
} from './researchGraphProjection';

export const SFI_PUBLIC_RESEARCH_LANDING_CONTRACT = 'SFI-PUBLIC-RESEARCH-LANDING-1.0' as const;

export type SfiPublicResearchLandingNamespace = 'RESEARCH' | 'PUBLICATION';

export interface SfiPublicResearchLanding {
  contract: typeof SFI_PUBLIC_RESEARCH_LANDING_CONTRACT;
  namespace: SfiPublicResearchLandingNamespace;
  canonicalNamespace: string;
  canonicalUrl: string;
  node: SfiResearchGraphNode;
  citation: SfiResearchCitationExport;
  boundary: {
    landingIsProjectionNotCanon: true;
    landingDoesNotCreatePublicationState: true;
    landingDoesNotCreateEvidence: true;
    missingObjectReturnsNotFound: true;
    invalidCanonicalRegistryFailsClosed: true;
  };
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function allowedObjectTypes(namespace: SfiPublicResearchLandingNamespace) {
  return namespace === 'PUBLICATION'
    ? ['PUBLICATION'] as const
    : ['REPORT', 'PAPER'] as const;
}

export function publicResearchLandingForSlug(
  namespace: SfiPublicResearchLandingNamespace,
  slug: string,
  records: readonly SfiCanonicalObjectRecord[] = SFI_CANONICAL_OBJECT_REGISTRY,
): SfiPublicResearchLanding | null {
  if (!SLUG_PATTERN.test(slug)) return null;

  const graph = researchGraphProjectionForCanonicalObjects(records);
  const allowed = allowedObjectTypes(namespace);
  const candidates = graph.nodes.filter((node) => {
    if (!(allowed as readonly string[]).includes(node.objectType)) return false;
    const expectedUrl = canonicalUrlFor(node.objectType, slug);
    return node.canonicalUrl === expectedUrl;
  });

  if (candidates.length !== 1) return null;

  const node = candidates[0]!;
  const canonicalNamespace = canonicalNamespaceFor(node.objectType);
  const expectedNamespace = namespace === 'PUBLICATION'
    ? canonicalNamespaceFor('PUBLICATION')
    : canonicalNamespaceFor('REPORT');

  if (canonicalNamespace !== expectedNamespace) return null;

  return {
    contract: SFI_PUBLIC_RESEARCH_LANDING_CONTRACT,
    namespace,
    canonicalNamespace,
    canonicalUrl: node.canonicalUrl,
    node,
    citation: researchCitationExportForNode(node),
    boundary: {
      landingIsProjectionNotCanon: true,
      landingDoesNotCreatePublicationState: true,
      landingDoesNotCreateEvidence: true,
      missingObjectReturnsNotFound: true,
      invalidCanonicalRegistryFailsClosed: true,
    },
  };
}
