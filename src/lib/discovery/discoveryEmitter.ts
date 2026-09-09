import { createHash } from 'node:crypto';
import {
  SFI_CANONICAL_OBJECT_CONTRACT,
  SFI_CANONICAL_OBJECT_REGISTRY,
  canonicalPublicationDisposition,
  validateCanonicalObjectRegistry,
  type SfiCanonicalEpistemicState,
  type SfiCanonicalObjectRecord,
} from './canonicalObjectRegistry';
import { SFI_PUBLIC_PROFILE } from '@/lib/public/institutionProfile';
import { SFI_PUBLIC_MCP_ENDPOINT } from '@/lib/mcp/publicMcpServer';

export const SFI_DISCOVERY_EMITTER_CONTRACT = 'SFI-DISCOVERY-EMITTER-1.0' as const;
export const SFI_DISCOVERY_FEED_CONTRACT = 'SFI-DISCOVERY-FEED-1.0' as const;
export const SFI_DISCOVERY_EMISSION_RECEIPT_CONTRACT = 'SFI-DISCOVERY-EMISSION-RECEIPT-1.0' as const;
export const SFI_DISCOVERY_FEED_METADATA = Object.freeze({
  contract: 'SFI-DISCOVERY-FEED-METADATA-1.0',
  updatedAt: '2026-09-09T00:00:00.000Z',
  epistemicClass: 'DECLARED' as const,
  basis: 'WS-03 Discovery Emitter contract version timestamp; not an observed canonical-object update.',
});

const BASE = SFI_PUBLIC_PROFILE.institution.canonicalUrl.replace(/\/$/, '');
const SFI_DISCOVERY_XML_NS = 'https://systemfriction.org/ns/discovery';

export type SfiDiscoveryEmissionEntry = {
  objectKey: string;
  objectType: string;
  canonicalUrl: string;
  title: string;
  summary: string;
  epistemicState: SfiCanonicalEpistemicState;
  version: string;
  language: string;
  updatedAt: string;
  authors: string[];
  sourceRefs: string[];
};

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function sha256(value: unknown) {
  return `sha256:${createHash('sha256').update(JSON.stringify(value)).digest('hex')}`;
}

function eligibleRecords(records: readonly SfiCanonicalObjectRecord[] = SFI_CANONICAL_OBJECT_REGISTRY) {
  const registryErrors = validateCanonicalObjectRegistry(records);
  if (registryErrors.length > 0) {
    throw new Error(`SFI_DISCOVERY_REGISTRY_INVALID:${registryErrors.join('|')}`);
  }

  return records
    .filter((record) => canonicalPublicationDisposition(record).disposition === 'PUBLISH')
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt) || left.canonicalUrl.localeCompare(right.canonicalUrl));
}

export function discoveryEmissionEntries(records: readonly SfiCanonicalObjectRecord[] = SFI_CANONICAL_OBJECT_REGISTRY): SfiDiscoveryEmissionEntry[] {
  return eligibleRecords(records).map((record) => ({
    objectKey: record.objectKey,
    objectType: record.objectType,
    canonicalUrl: record.canonicalUrl,
    title: record.title,
    summary: record.summary,
    epistemicState: record.epistemicState,
    version: record.version,
    language: record.language,
    updatedAt: record.updatedAt,
    authors: [...record.authors],
    sourceRefs: [...record.sourceRefs],
  }));
}

export function discoveryMachineResources() {
  return {
    canonicalAuthority: SFI_CANONICAL_OBJECT_CONTRACT,
    sitemap: `${BASE}/sitemap.xml`,
    rss: `${BASE}/feed.xml`,
    atom: `${BASE}/feed.atom`,
    jsonFeed: `${BASE}/feed.json`,
    aiIndex: `${BASE}/ai-index.json`,
    llms: `${BASE}/llms.txt`,
    llmsFull: `${BASE}/llms-full.txt`,
    mcp: {
      endpoint: `${BASE}${SFI_PUBLIC_MCP_ENDPOINT}`,
      canonicalObjectsResource: 'sfi://canonical/objects',
      authority: 'PUBLIC_READ_ONLY',
    },
    indexNow: {
      endpoint: 'https://api.indexnow.org/indexnow',
      state: 'NOT_CONFIGURED' as const,
      automaticNotification: false,
      boundary: 'External indexing notification requires a configured key and governed execution; absence never changes canonical publication state.',
    },
  };
}

export function discoverySitemapEntries(records: readonly SfiCanonicalObjectRecord[] = SFI_CANONICAL_OBJECT_REGISTRY) {
  return discoveryEmissionEntries(records).map((entry) => ({
    url: entry.canonicalUrl,
    lastModified: new Date(entry.updatedAt),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));
}

export function discoveryJsonFeed(records: readonly SfiCanonicalObjectRecord[] = SFI_CANONICAL_OBJECT_REGISTRY) {
  const entries = discoveryEmissionEntries(records);
  return {
    version: 'https://jsonfeed.org/version/1.1',
    title: `${SFI_PUBLIC_PROFILE.institution.name} · Canonical Objects`,
    home_page_url: BASE,
    feed_url: `${BASE}/feed.json`,
    description: 'Evidence-governed public canonical objects emitted from the SFI canonical object registry.',
    _sfi: {
      contract: SFI_DISCOVERY_FEED_CONTRACT,
      canonicalAuthority: SFI_CANONICAL_OBJECT_CONTRACT,
      feedMetadata: SFI_DISCOVERY_FEED_METADATA,
      automaticCanon: false,
      automaticPublication: false,
    },
    items: entries.map((entry) => ({
      id: entry.objectKey,
      url: entry.canonicalUrl,
      title: entry.title,
      content_text: entry.summary,
      date_modified: entry.updatedAt,
      language: entry.language,
      authors: entry.authors.map((name) => ({ name })),
      _sfi: {
        objectType: entry.objectType,
        epistemicState: entry.epistemicState,
        version: entry.version,
        sourceRefs: entry.sourceRefs,
      },
    })),
  };
}

export function discoveryRssXml(records: readonly SfiCanonicalObjectRecord[] = SFI_CANONICAL_OBJECT_REGISTRY) {
  const entries = discoveryEmissionEntries(records);
  const lastBuildDate = entries[0]?.updatedAt
    ? `<lastBuildDate>${new Date(entries[0].updatedAt).toUTCString()}</lastBuildDate>`
    : '';
  const items = entries.map((entry) => [
    '<item>',
    `<title>${escapeXml(entry.title)}</title>`,
    `<link>${escapeXml(entry.canonicalUrl)}</link>`,
    `<guid isPermaLink="true">${escapeXml(entry.canonicalUrl)}</guid>`,
    `<description>${escapeXml(entry.summary)}</description>`,
    `<pubDate>${new Date(entry.updatedAt).toUTCString()}</pubDate>`,
    `<sfi:objectKey>${escapeXml(entry.objectKey)}</sfi:objectKey>`,
    `<sfi:objectType>${escapeXml(entry.objectType)}</sfi:objectType>`,
    `<sfi:epistemicState>${escapeXml(entry.epistemicState)}</sfi:epistemicState>`,
    `<sfi:version>${escapeXml(entry.version)}</sfi:version>`,
    '</item>',
  ].join('')).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:sfi="${SFI_DISCOVERY_XML_NS}"><channel><title>${escapeXml(SFI_PUBLIC_PROFILE.institution.name)} · Canonical Objects</title><link>${escapeXml(BASE)}</link><description>Evidence-governed public canonical objects emitted from the SFI canonical object registry.</description>${lastBuildDate}${items}</channel></rss>`;
}

export function discoveryAtomXml(records: readonly SfiCanonicalObjectRecord[] = SFI_CANONICAL_OBJECT_REGISTRY) {
  const entries = discoveryEmissionEntries(records);
  const updated = entries[0]?.updatedAt ?? SFI_DISCOVERY_FEED_METADATA.updatedAt;
  const feedAuthor = `<author><name>${escapeXml(SFI_PUBLIC_PROFILE.institution.name)}</name></author>`;
  const items = entries.map((entry) => {
    const authors = entry.authors.map((name) => `<author><name>${escapeXml(name)}</name></author>`).join('');
    return [
      '<entry>',
      `<id>${escapeXml(entry.canonicalUrl)}</id>`,
      `<title>${escapeXml(entry.title)}</title>`,
      `<link href="${escapeXml(entry.canonicalUrl)}"/>`,
      `<updated>${escapeXml(entry.updatedAt)}</updated>`,
      `<summary>${escapeXml(entry.summary)}</summary>`,
      `<category term="${escapeXml(entry.objectType)}"/>`,
      `<sfi:epistemicState>${escapeXml(entry.epistemicState)}</sfi:epistemicState>`,
      authors,
      '</entry>',
    ].join('');
  }).join('');
  const feedMetadata = entries.length === 0
    ? `<sfi:feedUpdatedEpistemicClass>${SFI_DISCOVERY_FEED_METADATA.epistemicClass}</sfi:feedUpdatedEpistemicClass><sfi:feedUpdatedBasis>${escapeXml(SFI_DISCOVERY_FEED_METADATA.basis)}</sfi:feedUpdatedBasis>`
    : '';
  return `<?xml version="1.0" encoding="UTF-8"?><feed xmlns="http://www.w3.org/2005/Atom" xmlns:sfi="${SFI_DISCOVERY_XML_NS}"><id>${escapeXml(`${BASE}/feed.atom`)}</id><title>${escapeXml(SFI_PUBLIC_PROFILE.institution.name)} · Canonical Objects</title><link href="${escapeXml(`${BASE}/feed.atom`)}" rel="self"/><link href="${escapeXml(BASE)}"/><updated>${escapeXml(updated)}</updated>${feedAuthor}${feedMetadata}${items}</feed>`;
}

export function discoveryEmissionReceipt(objectKey: string, records: readonly SfiCanonicalObjectRecord[] = SFI_CANONICAL_OBJECT_REGISTRY) {
  const entry = discoveryEmissionEntries(records).find((candidate) => candidate.objectKey === objectKey);
  if (!entry) throw new Error('SFI_DISCOVERY_EMISSION_OBJECT_NOT_PUBLICABLE');
  const resources = discoveryMachineResources();
  const representation = {
    entry,
    surfaces: {
      page: entry.canonicalUrl,
      sitemap: resources.sitemap,
      rss: resources.rss,
      atom: resources.atom,
      jsonFeed: resources.jsonFeed,
      aiIndex: resources.aiIndex,
      mcp: resources.mcp,
    },
  };
  return {
    contract: SFI_DISCOVERY_EMISSION_RECEIPT_CONTRACT,
    emitterContract: SFI_DISCOVERY_EMITTER_CONTRACT,
    canonicalAuthority: SFI_CANONICAL_OBJECT_CONTRACT,
    objectKey: entry.objectKey,
    canonicalUrl: entry.canonicalUrl,
    epistemicState: entry.epistemicState,
    contentHash: sha256(representation),
    state: 'READY' as const,
    representation,
    indexNow: resources.indexNow,
    lineage: [entry.objectKey, ...entry.sourceRefs],
    epistemicBoundary: {
      externalRepresentationIsNotCanon: true,
      automaticCanon: false,
      automaticPublication: false,
      indexNowFailureDoesNotUnpublish: true,
    },
  };
}
