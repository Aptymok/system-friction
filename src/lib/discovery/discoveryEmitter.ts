import { createHash } from 'node:crypto';
import {
  SFI_CANONICAL_OBJECT_CONTRACT,
  SFI_CANONICAL_OBJECT_REGISTRY,
  canonicalPublicationDisposition,
  type SfiCanonicalObjectRecord,
} from './canonicalObjectRegistry';
import { SFI_PUBLIC_PROFILE } from '@/lib/public/institutionProfile';
import { SFI_PUBLIC_MCP_ENDPOINT } from '@/lib/mcp/publicMcpServer';

export const SFI_DISCOVERY_EMITTER_CONTRACT = 'SFI-DISCOVERY-EMITTER-1.0' as const;
export const SFI_DISCOVERY_FEED_CONTRACT = 'SFI-DISCOVERY-FEED-1.0' as const;
export const SFI_DISCOVERY_EMISSION_RECEIPT_CONTRACT = 'SFI-DISCOVERY-EMISSION-RECEIPT-1.0' as const;

const BASE = SFI_PUBLIC_PROFILE.institution.canonicalUrl.replace(/\/$/, '');

export type SfiDiscoveryEmissionEntry = {
  objectKey: string;
  objectType: string;
  canonicalUrl: string;
  title: string;
  summary: string;
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
        version: entry.version,
        sourceRefs: entry.sourceRefs,
      },
    })),
  };
}

export function discoveryRssXml(records: readonly SfiCanonicalObjectRecord[] = SFI_CANONICAL_OBJECT_REGISTRY) {
  const entries = discoveryEmissionEntries(records);
  const updated = entries[0]?.updatedAt ?? '1970-01-01T00:00:00.000Z';
  const items = entries.map((entry) => [
    '<item>',
    `<title>${escapeXml(entry.title)}</title>`,
    `<link>${escapeXml(entry.canonicalUrl)}</link>`,
    `<guid isPermaLink="true">${escapeXml(entry.canonicalUrl)}</guid>`,
    `<description>${escapeXml(entry.summary)}</description>`,
    `<pubDate>${new Date(entry.updatedAt).toUTCString()}</pubDate>`,
    `<sfi:objectKey>${escapeXml(entry.objectKey)}</sfi:objectKey>`,
    `<sfi:objectType>${escapeXml(entry.objectType)}</sfi:objectType>`,
    `<sfi:version>${escapeXml(entry.version)}</sfi:version>`,
    '</item>',
  ].join('')).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:sfi="https://systemfriction.org/ns/discovery"><channel><title>${escapeXml(SFI_PUBLIC_PROFILE.institution.name)} · Canonical Objects</title><link>${escapeXml(BASE)}</link><description>Evidence-governed public canonical objects emitted from the SFI canonical object registry.</description><lastBuildDate>${new Date(updated).toUTCString()}</lastBuildDate>${items}</channel></rss>`;
}

export function discoveryAtomXml(records: readonly SfiCanonicalObjectRecord[] = SFI_CANONICAL_OBJECT_REGISTRY) {
  const entries = discoveryEmissionEntries(records);
  const updated = entries[0]?.updatedAt ?? '1970-01-01T00:00:00.000Z';
  const items = entries.map((entry) => [
    '<entry>',
    `<id>${escapeXml(entry.canonicalUrl)}</id>`,
    `<title>${escapeXml(entry.title)}</title>`,
    `<link href="${escapeXml(entry.canonicalUrl)}"/>`,
    `<updated>${escapeXml(entry.updatedAt)}</updated>`,
    `<summary>${escapeXml(entry.summary)}</summary>`,
    `<category term="${escapeXml(entry.objectType)}"/>`,
    '</entry>',
  ].join('')).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><feed xmlns="http://www.w3.org/2005/Atom"><id>${escapeXml(`${BASE}/feed.atom`)}</id><title>${escapeXml(SFI_PUBLIC_PROFILE.institution.name)} · Canonical Objects</title><link href="${escapeXml(`${BASE}/feed.atom`)}" rel="self"/><link href="${escapeXml(BASE)}"/><updated>${escapeXml(updated)}</updated>${items}</feed>`;
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
