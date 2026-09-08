import { createHash } from 'node:crypto';
import { SFI_CANONICAL_IDENTITY_FINGERPRINT } from '@/lib/public/institutionProfile';
import {
  publicSemanticProjectionsForCanonicalObjects,
  type SfiPublicSemanticProjection,
} from './publicSemanticProjection';

export const SFI_DISCOVERY_MESH_CONTRACT = 'SFI-DISCOVERY-MESH-1.0' as const;
export const SFI_DISCOVERY_OBSERVATION_CONTRACT = 'SFI-DISCOVERY-OBSERVATION-1.0' as const;
export const SFI_DISCOVERY_CITATION_PACKET_CONTRACT = 'SFI-CITATION-PACKET-1.0' as const;
export const SFI_DISCOVERY_METADATA_PACKET_CONTRACT = 'SFI-DISCOVERY-METADATA-PACKET-1.0' as const;

export const SFI_DISCOVERY_MODES = ['query', 'distinct_intent', 'open_source'] as const;
export type SfiDiscoveryMode = (typeof SFI_DISCOVERY_MODES)[number];
export const SFI_DISCOVERY_AVAILABILITY = ['AVAILABLE', 'DEGRADED', 'UNAVAILABLE', 'MISSING', 'NOT_OBSERVED'] as const;
export type SfiDiscoveryAvailability = (typeof SFI_DISCOVERY_AVAILABILITY)[number];
export type SfiDiscoveryProviderClass = 'SEARCH' | 'AI' | 'ACADEMIC' | 'FEED' | 'OTHER';
export type SfiCollisionDimension = 'NAME' | 'DOMAIN' | 'METHOD' | 'ENTITY';

export interface SfiDiscoverySourceIdentity {
  sourceId: string;
  sourceUrl: string | null;
  publisher: string | null;
  platform: string;
  providerClass: SfiDiscoveryProviderClass;
  independent: boolean;
}

export interface SfiDiscoveryRetrievalObservation {
  observationId: string;
  source: SfiDiscoverySourceIdentity;
  observedAt: string;
  query: string;
  unbranded: boolean;
  retrieved: boolean | null;
  attributedEntityName?: string | null;
  attributedDomain?: string | null;
  citedCanonicalUrl?: string | null;
  reconstructedFields?: Partial<{
    name: string;
    domain: string;
    entityId: string;
    descriptor: string;
  }>;
  references?: Array<{ url: string; independent: boolean }>;
  collisions?: Array<{ dimension: SfiCollisionDimension; observed: boolean; value: string | null }>;
  propagationPlatforms?: string[];
  status?: SfiDiscoveryAvailability;
}

export interface SfiOpenSourceFeedItem {
  id?: string | null;
  url?: string | null;
  title?: string | null;
  summary?: string | null;
  publisher?: string | null;
  publishedAt?: string | null;
  platform: string;
}

export interface SfiDiscoveryMetricValue {
  availability: SfiDiscoveryAvailability;
  value: number | null;
  numerator: number | null;
  denominator: number | null;
  basis: string;
  missing: string[];
}

export interface SfiDiscoveryMetrics {
  UDR: SfiDiscoveryMetricValue;
  EIC: SfiDiscoveryMetricValue;
  IRD: SfiDiscoveryMetricValue;
  ACR: {
    R: SfiDiscoveryMetricValue;
    A: SfiDiscoveryMetricValue;
    C: SfiDiscoveryMetricValue;
  };
  ECR: Record<SfiCollisionDimension, SfiDiscoveryMetricValue>;
  MPD: SfiDiscoveryMetricValue;
  ERR: SfiDiscoveryMetricValue;
}

export interface SfiDiscoveryCandidate {
  candidateId: string;
  candidateClass: 'CANONICAL_PUBLIC_OBJECT' | 'OPEN_SOURCE_CANDIDATE';
  canonical: false;
  score: number;
  title: string;
  summary: string;
  canonicalObjectKey: string | null;
  canonicalUrl: string | null;
  source: SfiDiscoverySourceIdentity;
  provenance: string[];
  availability: SfiDiscoveryAvailability;
  degradationReasons: string[];
}

export interface SfiDiscoveryExternalRepresentation {
  representationClass: 'EXTERNAL_REPRESENTATION';
  canonicalObjectKey: string;
  canonicalUrl: string;
  metadataPacket: {
    contract: typeof SFI_DISCOVERY_METADATA_PACKET_CONTRACT;
    title: string;
    description: string;
    canonical: string;
    entityId: string;
    objectType: string;
    version: string;
    language: string;
  };
  jsonLd: SfiPublicSemanticProjection['jsonLd'];
  citationPacket: {
    contract: typeof SFI_DISCOVERY_CITATION_PACKET_CONTRACT;
    title: string;
    canonicalUrl: string;
    entityId: string;
    authors: string[];
    version: string;
    sourceRefs: string[];
    epistemicState: string;
    limitations: string[];
  };
}

export interface SfiDiscoveryObservationInput {
  mode: SfiDiscoveryMode;
  query: string;
  intent?: string | null;
  retrievalObservations?: SfiDiscoveryRetrievalObservation[];
  feedItems?: SfiOpenSourceFeedItem[];
}

function clean(value: string | null | undefined) { return typeof value === 'string' ? value.trim() : ''; }
function normalizedText(value: string) { return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim(); }
function tokens(value: string) { return [...new Set(normalizedText(value).split(' ').filter((item) => item.length >= 3))]; }
function sha(value: unknown) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
function ratio(numerator: number, denominator: number, basis: string): SfiDiscoveryMetricValue {
  return denominator > 0
    ? { availability: 'AVAILABLE', value: numerator / denominator, numerator, denominator, basis, missing: [] }
    : { availability: 'NOT_OBSERVED', value: null, numerator: null, denominator: null, basis, missing: ['NO_ELIGIBLE_OBSERVATIONS'] };
}
function unavailable(basis: string, reason: string, availability: SfiDiscoveryAvailability = 'NOT_OBSERVED'): SfiDiscoveryMetricValue {
  return { availability, value: null, numerator: null, denominator: null, basis, missing: [reason] };
}
function eligible(observation: SfiDiscoveryRetrievalObservation) {
  return (observation.status ?? 'AVAILABLE') === 'AVAILABLE';
}
function validHttpUrl(value: string | null | undefined) {
  try { const url = new URL(clean(value)); return ['http:', 'https:'].includes(url.protocol); } catch { return false; }
}
function sameDomain(value: string | null | undefined) {
  try { return new URL(clean(value)).hostname.replace(/^www\./, '') === new URL(SFI_CANONICAL_IDENTITY_FINGERPRINT.canonicalUrl).hostname; }
  catch { return false; }
}

export function normalizeOpenSourceFeedItem(item: SfiOpenSourceFeedItem): SfiDiscoveryCandidate {
  const degradationReasons: string[] = [];
  if (!clean(item.title)) degradationReasons.push('TITLE_MISSING');
  if (!clean(item.summary)) degradationReasons.push('SUMMARY_MISSING');
  if (!clean(item.publisher)) degradationReasons.push('PUBLISHER_MISSING');
  if (!validHttpUrl(item.url)) degradationReasons.push('SOURCE_URL_MISSING_OR_INVALID');
  if (item.publishedAt && !Number.isFinite(Date.parse(item.publishedAt))) degradationReasons.push('PUBLISHED_AT_INVALID');
  const id = clean(item.id) || sha({ platform: item.platform, url: item.url, title: item.title }).slice(0, 24);
  return {
    candidateId: `open-source:${id}`,
    candidateClass: 'OPEN_SOURCE_CANDIDATE',
    canonical: false,
    score: 0,
    title: clean(item.title) || 'MISSING',
    summary: clean(item.summary) || 'MISSING',
    canonicalObjectKey: null,
    canonicalUrl: null,
    source: {
      sourceId: id,
      sourceUrl: validHttpUrl(item.url) ? clean(item.url) : null,
      publisher: clean(item.publisher) || null,
      platform: clean(item.platform) || 'UNKNOWN',
      providerClass: 'FEED',
      independent: true,
    },
    provenance: [validHttpUrl(item.url) ? clean(item.url) : `feed:${clean(item.platform) || 'unknown'}:${id}`],
    availability: degradationReasons.length ? 'DEGRADED' : 'AVAILABLE',
    degradationReasons,
  };
}

function scoreProjection(query: string, intent: string, projection: SfiPublicSemanticProjection) {
  const haystack = normalizedText([
    projection.object.title,
    projection.object.summary,
    projection.object.objectType,
    projection.object.methods.join(' '),
    projection.object.relatedObjects.join(' '),
  ].join(' '));
  const queryTokens = tokens(`${query} ${intent}`);
  const matches = queryTokens.filter((token) => haystack.includes(token)).length;
  return queryTokens.length ? matches / queryTokens.length : 0;
}

export function canonicalDiscoveryCandidates(query: string, intent = ''): SfiDiscoveryCandidate[] {
  const projections = publicSemanticProjectionsForCanonicalObjects();
  return projections
    .map((projection) => ({ projection, score: scoreProjection(query, intent, projection) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.projection.object.canonicalUrl.localeCompare(b.projection.object.canonicalUrl))
    .map(({ projection, score }) => ({
      candidateId: `canonical-candidate:${projection.object.objectKey}`,
      candidateClass: 'CANONICAL_PUBLIC_OBJECT' as const,
      canonical: false as const,
      score,
      title: projection.object.title,
      summary: projection.object.summary,
      canonicalObjectKey: projection.object.objectKey,
      canonicalUrl: projection.object.canonicalUrl,
      source: {
        sourceId: projection.object.id,
        sourceUrl: projection.object.canonicalUrl,
        publisher: SFI_CANONICAL_IDENTITY_FINGERPRINT.name,
        platform: 'systemfriction.org',
        providerClass: 'OTHER' as const,
        independent: false,
      },
      provenance: [projection.object.canonicalUrl, ...projection.object.sourceRefs],
      availability: 'AVAILABLE' as const,
      degradationReasons: [],
    }));
}

export function externalRepresentationsForCandidates(candidates: readonly SfiDiscoveryCandidate[]): SfiDiscoveryExternalRepresentation[] {
  const byKey = new Map(publicSemanticProjectionsForCanonicalObjects().map((projection) => [projection.object.objectKey, projection]));
  return candidates.flatMap((candidate) => {
    if (!candidate.canonicalObjectKey) return [];
    const projection = byKey.get(candidate.canonicalObjectKey);
    if (!projection) return [];
    return [{
      representationClass: 'EXTERNAL_REPRESENTATION' as const,
      canonicalObjectKey: projection.object.objectKey,
      canonicalUrl: projection.object.canonicalUrl,
      metadataPacket: {
        contract: SFI_DISCOVERY_METADATA_PACKET_CONTRACT,
        title: projection.object.title,
        description: projection.object.summary,
        canonical: projection.object.canonicalUrl,
        entityId: projection.object.entityId,
        objectType: projection.object.objectType,
        version: projection.object.version,
        language: projection.object.language,
      },
      jsonLd: projection.jsonLd,
      citationPacket: {
        contract: SFI_DISCOVERY_CITATION_PACKET_CONTRACT,
        title: projection.object.title,
        canonicalUrl: projection.object.canonicalUrl,
        entityId: projection.object.entityId,
        authors: [...projection.object.authors],
        version: projection.object.version,
        sourceRefs: [...projection.object.sourceRefs],
        epistemicState: projection.object.epistemicState,
        limitations: [...projection.object.limitations],
      },
    }];
  });
}

export function discoveryMetrics(observations: readonly SfiDiscoveryRetrievalObservation[]): SfiDiscoveryMetrics {
  const available = observations.filter(eligible);
  const unbranded = available.filter((item) => item.unbranded && item.retrieved !== null);
  const ai = available.filter((item) => item.source.providerClass === 'AI' && item.retrieved !== null);
  const identity = available.filter((item) => item.reconstructedFields && Object.keys(item.reconstructedFields).length > 0);
  const referenceObservations = available.filter((item) => Array.isArray(item.references));
  const propagation = available.filter((item) => Array.isArray(item.propagationPlatforms));

  const identityChecks: boolean[] = [];
  for (const item of identity) {
    const fields = item.reconstructedFields ?? {};
    if (typeof fields.name === 'string') identityChecks.push(normalizedText(fields.name) === normalizedText(SFI_CANONICAL_IDENTITY_FINGERPRINT.name));
    if (typeof fields.domain === 'string') identityChecks.push(sameDomain(fields.domain));
    if (typeof fields.entityId === 'string') identityChecks.push(clean(fields.entityId) === SFI_CANONICAL_IDENTITY_FINGERPRINT.entityId);
  }

  const independentRefs = referenceObservations.flatMap((item) => item.references ?? []).filter((ref) => ref.independent && validHttpUrl(ref.url));
  const allRefs = referenceObservations.flatMap((item) => item.references ?? []).filter((ref) => validHttpUrl(ref.url));

  const collisionMetric = (dimension: SfiCollisionDimension): SfiDiscoveryMetricValue => {
    const rows = available.flatMap((item) => item.collisions ?? []).filter((item) => item.dimension === dimension);
    return rows.length ? ratio(rows.filter((row) => row.observed).length, rows.length, `Observed ${dimension.toLowerCase()} collision rate`) : unavailable(`Observed ${dimension.toLowerCase()} collision rate`, 'NO_COLLISION_TESTS');
  };

  const reconstructedRequired = identity.length * 3;
  let reconstructedCorrect = 0;
  for (const item of identity) {
    const fields = item.reconstructedFields ?? {};
    if (normalizedText(fields.name ?? '') === normalizedText(SFI_CANONICAL_IDENTITY_FINGERPRINT.name)) reconstructedCorrect += 1;
    if (sameDomain(fields.domain)) reconstructedCorrect += 1;
    if (clean(fields.entityId) === SFI_CANONICAL_IDENTITY_FINGERPRINT.entityId) reconstructedCorrect += 1;
  }

  const platformSet = new Set(propagation.flatMap((item) => item.propagationPlatforms ?? []).map(clean).filter(Boolean));
  const mpd = propagation.length
    ? { availability: 'AVAILABLE' as const, value: platformSet.size, numerator: platformSet.size, denominator: propagation.length, basis: 'Unique observed propagation platforms across eligible observations', missing: [] }
    : unavailable('Unique observed propagation platforms across eligible observations', 'NO_PROPAGATION_OBSERVATIONS');

  return {
    UDR: unbranded.length ? ratio(unbranded.filter((item) => item.retrieved === true).length, unbranded.length, 'Unbranded Discovery Rate') : unavailable('Unbranded Discovery Rate', 'NO_UNBRANDED_RETRIEVAL_OBSERVATIONS'),
    EIC: identityChecks.length ? ratio(identityChecks.filter(Boolean).length, identityChecks.length, 'External Identity Coherence across observed identity fields') : unavailable('External Identity Coherence across observed identity fields', 'NO_IDENTITY_OBSERVATIONS'),
    IRD: allRefs.length ? ratio(independentRefs.length, allRefs.length, 'Independent Reference Density') : unavailable('Independent Reference Density', 'NO_REFERENCE_OBSERVATIONS'),
    ACR: {
      R: ai.length ? ratio(ai.filter((item) => item.retrieved === true).length, ai.length, 'AI retrieval rate') : unavailable('AI retrieval rate', 'NO_AI_RETRIEVAL_OBSERVATIONS'),
      A: ai.length ? ratio(ai.filter((item) => normalizedText(item.attributedEntityName ?? '') === normalizedText(SFI_CANONICAL_IDENTITY_FINGERPRINT.name)).length, ai.length, 'AI correct attribution rate') : unavailable('AI correct attribution rate', 'NO_AI_RETRIEVAL_OBSERVATIONS'),
      C: ai.length ? ratio(ai.filter((item) => sameDomain(item.citedCanonicalUrl)).length, ai.length, 'AI canonical citation rate') : unavailable('AI canonical citation rate', 'NO_AI_RETRIEVAL_OBSERVATIONS'),
    },
    ECR: {
      NAME: collisionMetric('NAME'),
      DOMAIN: collisionMetric('DOMAIN'),
      METHOD: collisionMetric('METHOD'),
      ENTITY: collisionMetric('ENTITY'),
    },
    MPD: mpd,
    ERR: reconstructedRequired ? ratio(reconstructedCorrect, reconstructedRequired, 'Entity Reconstruction Rate across canonical name/domain/entityId') : unavailable('Entity Reconstruction Rate across canonical name/domain/entityId', 'NO_RECONSTRUCTION_OBSERVATIONS'),
  };
}

export function observeDiscovery(input: SfiDiscoveryObservationInput) {
  const query = clean(input.query);
  if (!query) throw new Error('SFI_DISCOVERY_QUERY_REQUIRED');
  if (!SFI_DISCOVERY_MODES.includes(input.mode)) throw new Error('SFI_DISCOVERY_MODE_UNSUPPORTED');
  const intent = input.mode === 'distinct_intent' ? clean(input.intent) : '';
  if (input.mode === 'distinct_intent' && !intent) throw new Error('SFI_DISCOVERY_DISTINCT_INTENT_REQUIRED');
  const canonical = canonicalDiscoveryCandidates(query, intent);
  const openSource = input.mode === 'open_source' ? (input.feedItems ?? []).map(normalizeOpenSourceFeedItem) : [];
  const candidates = [...canonical, ...openSource].sort((a, b) => b.score - a.score || a.candidateId.localeCompare(b.candidateId));
  const metrics = discoveryMetrics(input.retrievalObservations ?? []);
  return {
    contract: SFI_DISCOVERY_OBSERVATION_CONTRACT,
    meshContract: SFI_DISCOVERY_MESH_CONTRACT,
    observationId: `discovery:${sha({ mode: input.mode, query, intent, observations: input.retrievalObservations ?? [], feeds: input.feedItems ?? [] }).slice(0, 32)}`,
    mode: input.mode,
    query,
    intent: intent || null,
    state: candidates.some((item) => item.availability === 'DEGRADED') ? 'DEGRADED' as const : 'AVAILABLE' as const,
    candidates,
    externalRepresentations: externalRepresentationsForCandidates(candidates),
    metrics,
    epistemicBoundary: {
      candidateClass: 'SOURCE_CANDIDATE',
      candidatesAreCanonical: false,
      automaticCanon: false,
      automaticPublication: false,
      automaticExecution: false,
      automaticAuthorityExpansion: false,
      metricMeaning: 'Observed retrieval-test measurements only; no universal ranking claim.',
      falseZero: 'Numeric zero is emitted only when an eligible observed denominator exists and the measured numerator is actually zero.',
    },
  };
}
