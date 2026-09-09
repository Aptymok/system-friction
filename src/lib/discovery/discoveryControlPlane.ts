import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import {
  SFI_DISAMBIGUATION_RISKS,
  SFI_EXTERNAL_IDENTITY_NODES,
  institutionalSameAsDisposition,
} from '@/lib/public/institutionProfile';
import {
  SFI_CANONICAL_OBJECT_REGISTRY,
  canonicalPublicationDisposition,
  validateCanonicalObjectRegistry,
} from './canonicalObjectRegistry';
import { discoveryEmissionEntries, discoveryMachineResources } from './discoveryEmitter';
import {
  discoveryExposurePlan,
  type SfiObservedExternalRepresentation,
} from './exposureProjection';
import { SFI_DISCOVERY_CRAWLER_POLICY } from './crawlerPolicy';

export const SFI_DISCOVERY_CONTROL_PLANE_CONTRACT = 'SFI-DISCOVERY-CONTROL-PLANE-1.1' as const;

type QueryAvailability = 'AVAILABLE' | 'DEGRADED' | 'UNAVAILABLE';

type ReadResult<T> = {
  availability: QueryAvailability;
  total: null;
  sampled: number;
  sampleLimit: number;
  sampleSaturated: boolean;
  rows: T[];
  warning: string | null;
};

const SAMPLE_LIMIT = 100;

function boundedRead<T>(rows: T[] | null | undefined, error?: { message?: string } | null): ReadResult<T> {
  if (error) {
    return {
      availability: 'UNAVAILABLE',
      total: null,
      sampled: 0,
      sampleLimit: SAMPLE_LIMIT,
      sampleSaturated: false,
      rows: [],
      warning: error.message || 'discovery_read_unavailable',
    };
  }
  const data = rows ?? [];
  return {
    availability: 'AVAILABLE',
    total: null,
    sampled: data.length,
    sampleLimit: SAMPLE_LIMIT,
    sampleSaturated: data.length >= SAMPLE_LIMIT,
    rows: data,
    warning: null,
  };
}

function stateCounts(rows: Array<{ state?: string | null }>) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const state = row.state || 'UNKNOWN';
    acc[state] = (acc[state] ?? 0) + 1;
    return acc;
  }, {});
}

function availabilityCounts(rows: Array<{ availability?: string | null }>) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const state = row.availability || 'UNKNOWN';
    acc[state] = (acc[state] ?? 0) + 1;
    return acc;
  }, {});
}

function doiRefs() {
  return [...new Set(SFI_CANONICAL_OBJECT_REGISTRY
    .flatMap((record) => record.sourceRefs)
    .filter((ref) => /^https:\/\/(?:dx\.)?doi\.org\//i.test(ref)))]
    .sort();
}

export async function readDiscoveryControlPlane() {
  const service = createServiceSupabaseClient();

  // Interactive ROOT reads are intentionally bounded samples. Exhaustive counts
  // belong to explicit diagnostics/assurance, never ordinary page refreshes.
  const [representationsQuery, runsQuery, collisionsQuery] = await Promise.all([
    service
      .from('sfi_external_representations')
      .select('canonical_object_key,representation_kind,state,external_url,content_hash,observed_at,created_at')
      .order('created_at', { ascending: false })
      .limit(SAMPLE_LIMIT),
    service
      .from('sfi_discovery_query_runs')
      .select('id,run_id,query_id,availability,metrics,provenance,observed_at,created_at,sfi_discovery_queries(query_text,mode,intent,unbranded)')
      .order('observed_at', { ascending: false })
      .limit(SAMPLE_LIMIT),
    service
      .from('sfi_entity_collisions')
      .select('id,run_id,dimension,collision_observed,observed_value,source_identity,observed_at,created_at')
      .order('observed_at', { ascending: false })
      .limit(SAMPLE_LIMIT),
  ]);

  const representationRead = boundedRead<SfiObservedExternalRepresentation>(
    (representationsQuery.data ?? []) as SfiObservedExternalRepresentation[],
    representationsQuery.error,
  );
  const runsRead = boundedRead<Record<string, unknown>>(
    (runsQuery.data ?? []) as unknown as Record<string, unknown>[],
    runsQuery.error,
  );
  const collisionsRead = boundedRead<Record<string, unknown>>(
    (collisionsQuery.data ?? []) as unknown as Record<string, unknown>[],
    collisionsQuery.error,
  );

  const registryErrors = validateCanonicalObjectRegistry(SFI_CANONICAL_OBJECT_REGISTRY);
  const emissions = discoveryEmissionEntries();
  const machineResources = discoveryMachineResources();
  const exposure = discoveryExposurePlan(representationRead.rows);
  const publishedRepresentations = representationRead.rows.filter((row) => row.state === 'PUBLISHED' && row.external_url && row.observed_at);
  const failedRepresentations = representationRead.rows.filter((row) => row.state === 'FAILED');
  const latestRun = runsRead.rows[0] ?? null;
  const discoveredDois = doiRefs();
  const readAvailability = [representationRead.availability, runsRead.availability, collisionsRead.availability];
  const overallAvailability: QueryAvailability = registryErrors.length > 0 || readAvailability.includes('UNAVAILABLE')
    ? 'DEGRADED'
    : 'AVAILABLE';

  return {
    ok: overallAvailability === 'AVAILABLE',
    contract: SFI_DISCOVERY_CONTROL_PLANE_CONTRACT,
    availability: overallAvailability,
    observedAt: new Date().toISOString(),
    entityHealth: {
      canonicalIdentity: registryErrors.length === 0 ? 'AVAILABLE' : 'DEGRADED',
      registryErrors,
      canonicalObjectCount: SFI_CANONICAL_OBJECT_REGISTRY.length,
      publicableObjectCount: emissions.length,
      blockedObjectCount: SFI_CANONICAL_OBJECT_REGISTRY.filter((record) => canonicalPublicationDisposition(record).disposition !== 'PUBLISH').length,
      externalIdentityNodes: SFI_EXTERNAL_IDENTITY_NODES.map((node) => ({
        ...node,
        sameAsDisposition: institutionalSameAsDisposition(node),
      })),
    },
    canonicalObjects: emissions,
    externalNodes: {
      nodes: SFI_EXTERNAL_IDENTITY_NODES,
      disambiguationRisks: SFI_DISAMBIGUATION_RISKS,
    },
    propagations: {
      availability: representationRead.availability,
      total: representationRead.total,
      sampled: representationRead.sampled,
      sampleLimit: representationRead.sampleLimit,
      sampleSaturated: representationRead.sampleSaturated,
      byStateInSample: stateCounts(representationRead.rows),
      observedPublishedInSample: publishedRepresentations,
      warning: representationRead.warning,
    },
    searchHealth: {
      availability: runsRead.availability,
      totalRuns: runsRead.total,
      sampledRuns: runsRead.sampled,
      sampleLimit: runsRead.sampleLimit,
      sampleSaturated: runsRead.sampleSaturated,
      byAvailabilityInSample: availabilityCounts(runsRead.rows as Array<{ availability?: string | null }>),
      latestRun,
      warning: runsRead.warning,
    },
    aiDiscovery: {
      availability: runsRead.availability,
      latestMetrics: latestRun && typeof latestRun.metrics === 'object' ? latestRun.metrics : null,
      metricContract: ['UDR', 'EIC', 'IRD', 'ACR-R', 'ACR-A', 'ACR-C', 'ECR-NAME', 'ECR-DOMAIN', 'ECR-METHOD', 'ECR-ENTITY', 'MPD', 'ERR'],
      falseZero: 'Unavailable/not-observed measurements remain null, never synthetic zero.',
    },
    academicGraph: {
      state: 'NOT_OBSERVED',
      eligibleCanonicalObjectKeys: emissions
        .filter((entry) => ['PAPER', 'DATASET', 'PUBLICATION', 'REPORT', 'SOFTWARE', 'RELEASE'].includes(entry.objectType))
        .map((entry) => entry.objectKey),
      boundary: 'Eligibility is not external indexing, citation, DOI or publication evidence.',
    },
    collisions: {
      availability: collisionsRead.availability,
      total: collisionsRead.total,
      sampled: collisionsRead.sampled,
      sampleLimit: collisionsRead.sampleLimit,
      sampleSaturated: collisionsRead.sampleSaturated,
      observedInSample: collisionsRead.rows.filter((row) => row.collision_observed === true),
      warning: collisionsRead.warning,
    },
    crawlers: SFI_DISCOVERY_CRAWLER_POLICY,
    dois: {
      state: discoveredDois.length ? 'OBSERVED_IN_CANONICAL_SOURCE_REFS' : 'NOT_OBSERVED',
      refs: discoveredDois,
      boundary: 'No DOI is inferred or invented. Only canonical sourceRefs containing doi.org are shown.',
    },
    feeds: {
      rss: machineResources.rss,
      atom: machineResources.atom,
      jsonFeed: machineResources.jsonFeed,
      sitemap: machineResources.sitemap,
      aiIndex: machineResources.aiIndex,
      llms: machineResources.llms,
      llmsFull: machineResources.llmsFull,
    },
    mcp: machineResources.mcp,
    failedPublicationsInSample: failedRepresentations,
    exposure,
    readPlan: {
      dbQueries: 3,
      exactCountProbes: 0,
      pollingLoops: 0,
      nPlusOneReads: 0,
      canonicalRegistryReads: 1,
      externalIdentityRegistryReads: 1,
      boundedRowsPerDbOwner: SAMPLE_LIMIT,
      directBrowserDataApi: false,
    },
    epistemicBoundary: {
      discoveryCandidateIsNotCanon: true,
      exposureIsNotPublication: true,
      externalRepresentationIsNotCanon: true,
      totalCountUnknownOnInteractiveRead: true,
      unavailableIsNotZero: true,
      externalActionRequiresObservedReceipt: true,
    },
  };
}
