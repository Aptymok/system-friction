import {
  SFI_EXTERNAL_IDENTITY_NODES,
  SFI_PUBLIC_PROFILE,
  institutionalSameAsDisposition,
  type SfiExternalIdentityNode,
} from '@/lib/public/institutionProfile';
import { discoveryEmissionEntries, discoveryMachineResources } from './discoveryEmitter';
import { SFI_DISCOVERY_CRAWLER_POLICY } from './crawlerPolicy';

export const SFI_DISCOVERY_EXPOSURE_CONTRACT = 'SFI-DISCOVERY-EXPOSURE-1.1' as const;
export const SFI_EXPOSURE_PACKET_CONTRACT = 'SFI-EXPOSURE-PACKET-1.1' as const;

export type SfiObservedExternalRepresentation = {
  canonical_object_key: string;
  representation_kind: string;
  state: 'DRAFT' | 'READY' | 'PUBLISHED' | 'FAILED' | 'SUPERSEDED' | 'REMOVED';
  external_url: string | null;
  content_hash: string | null;
  observed_at: string | null;
  created_at: string;
};

export type SfiExposureTargetState =
  | 'READY_OWNED_SURFACE'
  | 'GOVERNED_EXTERNAL_ACTION_REQUIRED'
  | 'OBSERVED_PUBLISHED'
  | 'CONTROLLED_REFERENCE'
  | 'REFERENCE_ONLY'
  | 'NOT_ELIGIBLE';

export type SfiExposureTarget = {
  key: string;
  targetClass: 'OWNED_MACHINE_SURFACE' | 'EXTERNAL_IDENTITY_NODE';
  state: SfiExposureTargetState;
  url: string | null;
  reason: string;
  canonicalObjectKey: string | null;
  representationKind: string | null;
  contentHash: string | null;
  observedAt: string | null;
  automaticPublication: false;
  automaticCanon: false;
};

function ownedTargets(): SfiExposureTarget[] {
  const resources = discoveryMachineResources();
  const base = SFI_PUBLIC_PROFILE.institution.canonicalUrl.replace(/\/$/, '');
  return [
    ['canonical-site', base],
    ['sitemap', resources.sitemap],
    ['rss', resources.rss],
    ['atom', resources.atom],
    ['json-feed', resources.jsonFeed],
    ['ai-index', resources.aiIndex],
    ['llms', resources.llms],
    ['llms-full', resources.llmsFull],
    ['public-mcp', resources.mcp.endpoint],
    ['openapi', `${base}/openapi.json`],
    ['external-agent-manifest', `${base}/api/external/v1/manifest`],
    ['robots', `${base}/robots.txt`],
    ['ai-policy', `${base}/ai-policy`],
  ].map(([key, url]) => ({
    key,
    targetClass: 'OWNED_MACHINE_SURFACE' as const,
    state: 'READY_OWNED_SURFACE' as const,
    url,
    reason: 'Owned SFI projection of already-public canonical state.',
    canonicalObjectKey: null,
    representationKind: null,
    contentHash: null,
    observedAt: null,
    automaticPublication: false as const,
    automaticCanon: false as const,
  }));
}

function observedPublicationForNode(
  node: SfiExternalIdentityNode,
  representations: readonly SfiObservedExternalRepresentation[],
  canonicalObjectKey?: string | null,
) {
  const normalizedNode = node.url.replace(/\/$/, '');
  return representations.find((row) => row.state === 'PUBLISHED'
    && (!canonicalObjectKey || row.canonical_object_key === canonicalObjectKey)
    && Boolean(row.external_url)
    && row.external_url!.replace(/\/$/, '').startsWith(normalizedNode));
}

function externalNodeTarget(
  node: SfiExternalIdentityNode,
  representations: readonly SfiObservedExternalRepresentation[],
  canonicalObjectKey?: string | null,
): SfiExposureTarget {
  const published = observedPublicationForNode(node, representations, canonicalObjectKey);
  if (published?.external_url && published.observed_at) {
    return {
      key: node.key,
      targetClass: 'EXTERNAL_IDENTITY_NODE',
      state: 'OBSERVED_PUBLISHED',
      url: published.external_url,
      reason: `Observed PUBLISHED representation receipt for ${published.canonical_object_key} at ${published.observed_at}.`,
      canonicalObjectKey: published.canonical_object_key,
      representationKind: published.representation_kind,
      contentHash: published.content_hash,
      observedAt: published.observed_at,
      automaticPublication: false,
      automaticCanon: false,
    };
  }

  const common = {
    canonicalObjectKey: canonicalObjectKey ?? null,
    representationKind: null,
    contentHash: null,
    observedAt: null,
    automaticPublication: false as const,
    automaticCanon: false as const,
  };

  if (node.identityClass === 'RELATED_PERSON') {
    return {
      key: node.key,
      targetClass: 'EXTERNAL_IDENTITY_NODE',
      state: 'REFERENCE_ONLY',
      url: node.url,
      reason: 'Related-person reference may support lineage but is not an institutional distribution target.',
      ...common,
    };
  }

  if (node.identityClass === 'CONTROLLED_ASSET') {
    return {
      key: node.key,
      targetClass: 'EXTERNAL_IDENTITY_NODE',
      state: 'CONTROLLED_REFERENCE',
      url: node.url,
      reason: 'Verified controlled asset is a reference surface; publication state still requires an object-specific representation receipt.',
      ...common,
    };
  }

  if (node.identityClass === 'INSTITUTION_PROFILE' && ['CLAIMED', 'VERIFIED'].includes(node.state)) {
    return {
      key: node.key,
      targetClass: 'EXTERNAL_IDENTITY_NODE',
      state: 'GOVERNED_EXTERNAL_ACTION_REQUIRED',
      url: node.url,
      reason: node.state === 'VERIFIED'
        ? 'Institution profile is verified, but object-specific distribution still requires a governed external action and observed receipt.'
        : 'Institution profile is claimed but not independently verified; prepare draft only and require external verification/action.',
      ...common,
    };
  }

  return {
    key: node.key,
    targetClass: 'EXTERNAL_IDENTITY_NODE',
    state: 'NOT_ELIGIBLE',
    url: node.url,
    reason: `External node state ${node.state} is not eligible for distribution projection.`,
    ...common,
  };
}

export function discoveryExposureTargets(
  representations: readonly SfiObservedExternalRepresentation[] = [],
  canonicalObjectKey?: string | null,
): SfiExposureTarget[] {
  return [
    ...ownedTargets(),
    ...SFI_EXTERNAL_IDENTITY_NODES.map((node) => externalNodeTarget(node, representations, canonicalObjectKey)),
  ];
}

export function discoveryExposurePlan(
  representations: readonly SfiObservedExternalRepresentation[] = [],
) {
  const entries = discoveryEmissionEntries();
  const targets = discoveryExposureTargets(representations);
  const governedExternalTargets = targets.filter((target) => target.state === 'GOVERNED_EXTERNAL_ACTION_REQUIRED');

  return {
    contract: SFI_DISCOVERY_EXPOSURE_CONTRACT,
    canonicalAuthority: 'SFI-CANONICAL-OBJECT-1.0',
    identityAuthority: SFI_PUBLIC_PROFILE.contract,
    crawlerPolicy: SFI_DISCOVERY_CRAWLER_POLICY,
    canonicalObjectCount: entries.length,
    targets,
    packets: entries.map((entry) => {
      const entryTargets = discoveryExposureTargets(representations, entry.objectKey);
      const observedPublishedTargets = entryTargets.filter((target) => target.state === 'OBSERVED_PUBLISHED');
      return {
        contract: SFI_EXPOSURE_PACKET_CONTRACT,
        canonicalObjectKey: entry.objectKey,
        canonicalUrl: entry.canonicalUrl,
        epistemicState: entry.epistemicState,
        version: entry.version,
        sourceRefs: entry.sourceRefs,
        ownedMachineSurfaces: entryTargets
          .filter((target) => target.state === 'READY_OWNED_SURFACE')
          .map(({ key, url, state }) => ({ key, url, state })),
        externalDistributionDraftTargets: entryTargets
          .filter((target) => target.state === 'GOVERNED_EXTERNAL_ACTION_REQUIRED')
          .map(({ key, url, state, reason, canonicalObjectKey }) => ({ key, url, state, reason, canonicalObjectKey })),
        observedPublishedTargets: observedPublishedTargets.map(({ key, url, state, reason, canonicalObjectKey, representationKind, contentHash, observedAt }) => ({
          key,
          url,
          state,
          reason,
          canonicalObjectKey,
          representationKind,
          contentHash,
          observedAt,
        })),
        boundary: {
          exposureIsRepresentation: true,
          exposureIsNotCanon: true,
          exposureIsNotPublicationReceipt: true,
          publishedTargetsAreObjectScoped: true,
          externalActionRequiresGovernedAdapterOrHuman: true,
        },
      };
    }),
    externalIdentity: SFI_EXTERNAL_IDENTITY_NODES.map((node) => ({
      ...node,
      sameAs: institutionalSameAsDisposition(node),
    })),
    nextActions: governedExternalTargets.map((target) => ({
      target: target.key,
      action: 'PREPARE_AND_EXECUTE_GOVERNED_EXTERNAL_DISTRIBUTION',
      state: 'EXTERNAL_ACTION_REQUIRED' as const,
      requiredReceipt: 'external_url + observed_at + content_hash + canonical_object_key',
    })),
    boundary: {
      automaticCanon: false,
      automaticPublication: false,
      automaticExternalAction: false,
      fabricatedExternalReceipt: false,
      externalPublicationLineageObjectScoped: true,
      modelCapabilityDoesNotExpandAuthority: true,
    },
  };
}
