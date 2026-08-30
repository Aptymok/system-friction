import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { appendEpistemicEvent } from '@/lib/events/eventStore';

export const SFI_EVIDENCE_REQUIREMENT_RESOLVER_CONTRACT = 'SFI-EVIDENCE-REQUIREMENT-RESOLVER-1.1' as const;
export type SfiWebEvidencePolicy = 'WEB_REQUIRED' | 'WEB_OPTIONAL' | 'WEB_NOT_REQUIRED' | 'WEB_FORBIDDEN' | 'WEB_ALREADY_SUFFICIENT';

const MAX_DIRECT_SOURCE_BYTES = 120_000;
const MIN_VERIFIED_QUERY_COVERAGE = 0.05;

type Row = Record<string, unknown>;
export type UniversalWebSource = {
  id: string;
  url: string;
  title: string;
  publisher: string | null;
  snippet: string;
  publishedAt: string | null;
  retrievedAt: string;
  sourceType: 'official' | 'regulator' | 'news' | 'professional' | 'other';
  reliability: number;
  verification?: {
    directFetch: boolean;
    httpStatus: number | null;
    contentType: string | null;
    excerpt: string | null;
    queryCoverage: number;
    verifiedAt: string | null;
    warning: string | null;
  };
};

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function strings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim())
    : [];
}

function explicitPolicy(value: unknown): SfiWebEvidencePolicy | null {
  const candidate = text(value)?.toUpperCase();
  return candidate === 'WEB_REQUIRED' || candidate === 'WEB_OPTIONAL' || candidate === 'WEB_NOT_REQUIRED' || candidate === 'WEB_FORBIDDEN' || candidate === 'WEB_ALREADY_SUFFICIENT'
    ? candidate
    : null;
}

function normalizeHostname(value: string) {
  return value.trim().toLowerCase().replace(/^\[/, '').replace(/\]$/, '').replace(/^www\./, '');
}

function host(url: string) {
  try { return normalizeHostname(new URL(url).hostname); } catch { return ''; }
}

function ipv4FromMappedIpv6(value: string) {
  const h = value.toLowerCase();
  if (!h.startsWith('::ffff:')) return null;
  const mapped = h.slice('::ffff:'.length);
  if (isIP(mapped) === 4) return mapped;
  const parts = mapped.split(':');
  if (parts.length !== 2 || parts.some((part) => !/^[0-9a-f]{1,4}$/.test(part))) return null;
  const high = Number.parseInt(parts[0], 16);
  const low = Number.parseInt(parts[1], 16);
  if (!Number.isFinite(high) || !Number.isFinite(low) || high > 0xffff || low > 0xffff) return null;
  const value32 = high * 65_536 + low;
  return [
    Math.floor(value32 / 16_777_216) % 256,
    Math.floor(value32 / 65_536) % 256,
    Math.floor(value32 / 256) % 256,
    value32 % 256,
  ].join('.');
}

export function isNonPublicNetworkAddress(value: string) {
  const address = normalizeHostname(value).split('%')[0];
  const version = isIP(address);
  if (version === 4) {
    const parts = address.split('.').map(Number);
    if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127 || a >= 224) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 192 && b === 0) return true;
    if (a === 192 && b === 2) return true;
    if (a === 198 && (b === 18 || b === 19 || b === 51)) return true;
    if (a === 203 && b === 0) return true;
    return false;
  }
  if (version === 6) {
    const h = address.toLowerCase();
    if (h === '::' || h === '::1') return true;
    if (/^f[cd]/.test(h)) return true;
    if (/^fe[89ab]/.test(h)) return true;
    if (/^ff/.test(h)) return true;
    if (/^2001:db8(?::|$)/.test(h)) return true;
    const mappedIpv4 = ipv4FromMappedIpv6(h);
    if (mappedIpv4) return isNonPublicNetworkAddress(mappedIpv4);
    return false;
  }
  return true;
}

function safePublicUrl(value: string) {
  try {
    const parsed = new URL(value);
    const hostname = normalizeHostname(parsed.hostname);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) return false;
    if (!hostname || hostname === 'localhost' || hostname.endsWith('.local')) return false;
    return isIP(hostname) ? !isNonPublicNetworkAddress(hostname) : true;
  } catch {
    return false;
  }
}

async function resolvesOnlyToPublicAddresses(value: string) {
  if (!safePublicUrl(value)) return false;
  const parsed = new URL(value);
  const hostname = normalizeHostname(parsed.hostname);
  if (isIP(hostname)) return !isNonPublicNetworkAddress(hostname);
  try {
    const addresses = await lookup(hostname, { all: true, verbatim: true });
    return addresses.length > 0 && addresses.every((entry) => !isNonPublicNetworkAddress(entry.address));
  } catch {
    return false;
  }
}

function isRegulatorHostname(hostname: string) {
  const h = normalizeHostname(hostname);
  return /(^|\.)gob\.mx$/.test(h)
    || /(^|\.)gov$/.test(h)
    || /(^|\.)gov\.[a-z]{2,}$/.test(h)
    || /(^|\.)gov\.[a-z]{2,}\.[a-z]{2,}$/.test(h)
    || /(^|\.)go\.[a-z]{2,}$/.test(h)
    || h === 'europa.eu'
    || h.endsWith('.europa.eu');
}

function classifySource(url: string, _title: string): UniversalWebSource['sourceType'] {
  const hostname = host(url);
  if (isRegulatorHostname(hostname)) return 'regulator';
  if (/(^|\.)(linkedin\.com|crunchbase\.com)$/.test(hostname)) return 'professional';
  if (/(^|\.)(reuters\.com|bloomberg\.com|forbes\.com|expansion\.mx|eleconomista\.com\.mx|elfinanciero\.com\.mx|elceo\.com|elpais\.com|milenio\.com|cnn\.com|bbc\.com|bbc\.co\.uk)$/.test(hostname)) return 'news';
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    if (/\/(newsroom|news-room|investors?|press|about|blog)(\/|$)/.test(pathname)) return 'official';
  } catch {
    // Keep unknown source provenance as other.
  }
  return 'other';
}

function reliabilityFor(type: UniversalWebSource['sourceType'], url: string) {
  if (type === 'regulator') return 0.94;
  if (type === 'official') return 0.86;
  if (type === 'news') return 0.76;
  if (type === 'professional') return 0.62;
  return host(url) ? 0.55 : 0.35;
}

function claimStrings(context: Row) {
  return [
    ...strings(context.claimsToVerify),
    ...strings(context.declaredClaims),
    ...strings(context.externalClaims),
    ...strings(context.missingEvidence),
  ].slice(0, 8);
}

function buildQueries(input: Row) {
  const signal = row(input.signal);
  const context = row(input.context);
  const claims = claimStrings(context);
  const base = [text(input.question), text(input.objective), text(signal.name), text(input.declaredFunction), text(input.systemType)]
    .filter((value): value is string => Boolean(value));
  const explicit = strings(context.webQueries);
  const queries = [...explicit, ...claims, base.join(' ')].filter(Boolean);
  if (base.length >= 2) queries.push(`${base[0]} ${base.at(-1)}`);
  return [...new Set(queries.map((value) => value.replace(/\s+/g, ' ').trim()).filter(Boolean))].slice(0, 3);
}

export function resolveUniversalEvidenceRequirements(inputValue: unknown) {
  const input = row(inputValue);
  const signal = row(input.signal);
  const context = row(input.context);
  const kind = (text(signal.kind) ?? 'unknown').toLowerCase();
  const claims = claimStrings(context);
  const blob = [input.question, input.objective, input.declaredFunction, input.systemType, JSON.stringify(context)]
    .filter(Boolean)
    .join(' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const explicit = explicitPolicy(context.webPolicy) ?? explicitPolicy(context.externalEvidencePolicy);
  const privacyBlocksWeb = context.webForbidden === true || /confidential only|private only|sin internet|no internet|no web|offline only/.test(blob);
  const dynamicExternal = /latest|current|actual|hoy|mercad|market|law|legal|regulat|precio|price|compet|benchmark|trend|tendenc|public|social|release|lanzamiento|geopolit|world|mundo|extern|industry|sector|norma|standard|sla/.test(blob);
  const verificationRequested = context.requiresExternalVerification === true
    || context.requiresCorroboration === true
    || claims.length > 0
    || /verify|verification|corrobor|cotej|confirm|validar|contrastar.*fuente|fuente.*extern/.test(blob);
  const authoritySensitive = /law|legal|regulat|norma|standard|sla|gobierno|government|autoridad|official|oficial/.test(blob);
  const strictlyInternal = ['dataset', 'csv', 'json', 'document', 'code', 'api_response'].includes(kind)
    && /internal|interno|dataset|archivo|file|registros|tickets|mesa de ayuda|repository|repo/.test(blob)
    && !dynamicExternal
    && !verificationRequested;

  let webPolicy: SfiWebEvidencePolicy;
  if (explicit) webPolicy = explicit;
  else if (privacyBlocksWeb) webPolicy = 'WEB_FORBIDDEN';
  else if (verificationRequested || dynamicExternal) webPolicy = 'WEB_REQUIRED';
  else if (kind === 'web_page' || kind === 'url') webPolicy = 'WEB_ALREADY_SUFFICIENT';
  else if (strictlyInternal) webPolicy = 'WEB_NOT_REQUIRED';
  else webPolicy = 'WEB_OPTIONAL';

  const requiredSourceCount = webPolicy === 'WEB_REQUIRED' ? 2 : 0;
  const requiredVerifiedSourceCount = webPolicy === 'WEB_REQUIRED'
    ? (context.requiresCorroboration === true || /corrobor|cotej|dos fuentes|multiple sources/.test(blob) ? 2 : 1)
    : 0;
  const lookbackDays = /today|hoy|current|actual|latest|ultim|recent/.test(blob) ? 30 : 180;
  return {
    contract: SFI_EVIDENCE_REQUIREMENT_RESOLVER_CONTRACT,
    webPolicy,
    requiredSourceCount,
    requiredVerifiedSourceCount,
    authoritySensitive,
    queries: buildQueries(input),
    lookbackDays,
    blockingIfUnavailable: webPolicy === 'WEB_REQUIRED',
    lanes: {
      INTERNAL: true,
      USER: true,
      FILE: Boolean(text(signal.assetRef) || ['dataset', 'csv', 'json', 'document', 'image', 'audio', 'video'].includes(kind)),
      WEB: webPolicy !== 'WEB_FORBIDDEN' && webPolicy !== 'WEB_NOT_REQUIRED',
      WORLD: dynamicExternal,
    },
    runtimeBoundary: 'Bounded discovery plus bounded direct-source fetch. No LLM is required for retrieval; interpretation happens after sources are acquired.',
    epistemicBoundary: 'External retrieval produces imported SOURCE_CLAIMS. Direct fetch confirms source material was retrieved, not that a claim is true or accepted evidence.',
  };
}

function gdeltQueryText(query: string) {
  return query
    .replace(/site:([^\s]+)/gi, 'domain:$1')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 420);
}

async function gdeltQuery(query: string, lookbackDays: number): Promise<UniversalWebSource[]> {
  const url = new URL('https://api.gdeltproject.org/api/v2/doc/doc');
  url.searchParams.set('query', gdeltQueryText(query));
  url.searchParams.set('mode', 'ArtList');
  url.searchParams.set('format', 'json');
  url.searchParams.set('maxrecords', '12');
  url.searchParams.set('sort', 'HybridRel');
  url.searchParams.set('timespan', `${Math.max(1, Math.min(365, Math.round(lookbackDays)))}d`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'SystemFrictionInstitute/1.1 universal-evidence' },
      signal: controller.signal,
      cache: 'no-store',
    });
    const json = await response.json().catch(() => null);
    if (!response.ok || !json || typeof json !== 'object') throw new Error(`gdelt_doc_http_${response.status}`);
    const articles = Array.isArray(row(json).articles) ? row(json).articles as unknown[] : [];
    const retrievedAt = new Date().toISOString();
    return articles.flatMap((articleValue, index) => {
      const article = row(articleValue);
      const articleUrl = text(article.url);
      if (!articleUrl || !safePublicUrl(articleUrl)) return [];
      const title = text(article.title) ?? host(articleUrl);
      const sourceType = classifySource(articleUrl, title);
      const publisher = text(article.domain) ?? (host(articleUrl) || null);
      return [{
        id: `WEB-${index + 1}-${host(articleUrl).replace(/[^a-z0-9]+/gi, '-').slice(0, 28) || 'source'}`,
        url: articleUrl,
        title,
        publisher,
        snippet: [title, publisher ? `Indexed publisher: ${publisher}` : ''].filter(Boolean).join('\n').slice(0, 1200),
        publishedAt: text(article.seendate),
        retrievedAt,
        sourceType,
        reliability: reliabilityFor(sourceType, articleUrl),
      }];
    });
  } finally {
    clearTimeout(timeout);
  }
}

const HTML_ENTITY_TEXT: Readonly<Record<string, string>> = {
  nbsp: ' ',
  amp: '&',
  quot: '"',
  '#39': "'",
  apos: "'",
};

function decodeKnownHtmlEntitiesOnce(value: string) {
  return value.replace(/&(nbsp|amp|quot|#39|apos);/gi, (entity) => {
    const key = entity.slice(1, -1).toLowerCase();
    return HTML_ENTITY_TEXT[key] ?? entity;
  });
}

function htmlToEvidenceText(value: string) {
  const lower = value.toLowerCase();
  let output = '';
  let cursor = 0;

  while (cursor < value.length) {
    const tagStart = value.indexOf('<', cursor);
    if (tagStart < 0) {
      output += value.slice(cursor);
      break;
    }
    output += value.slice(cursor, tagStart);
    if (value.startsWith('<!--', tagStart)) {
      const commentEnd = value.indexOf('-->', tagStart + 4);
      cursor = commentEnd >= 0 ? commentEnd + 3 : value.length;
      output += ' ';
      continue;
    }
    const tagEnd = value.indexOf('>', tagStart + 1);
    if (tagEnd < 0) {
      output += value.slice(tagStart);
      break;
    }
    const tagBody = value.slice(tagStart + 1, tagEnd).trimStart();
    const closing = tagBody.startsWith('/');
    const normalizedTagBody = closing ? tagBody.slice(1).trimStart() : tagBody;
    const tagName = normalizedTagBody.match(/^([a-z0-9:-]+)/i)?.[1]?.toLowerCase() ?? '';
    if (!closing && (tagName === 'script' || tagName === 'style')) {
      const closeStart = lower.indexOf(`</${tagName}`, tagEnd + 1);
      if (closeStart < 0) {
        cursor = value.length;
        output += ' ';
        continue;
      }
      const closeEnd = value.indexOf('>', closeStart + tagName.length + 2);
      cursor = closeEnd >= 0 ? closeEnd + 1 : value.length;
      output += ' ';
      continue;
    }
    output += ' ';
    cursor = tagEnd + 1;
  }
  return decodeKnownHtmlEntitiesOnce(output).replace(/\s+/g, ' ').trim();
}

function queryTerms(queries: string[]) {
  const stop = new Set(['para','como','what','with','from','this','that','sobre','entre','desde','hacia','the','and','del','las','los','una','uno','que','por','con']);
  return [...new Set(queries.join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().split(/[^a-z0-9]+/)
    .filter((term) => term.length >= 4 && !stop.has(term)))].slice(0, 40);
}

function coverageFor(content: string, terms: string[]) {
  if (!terms.length || !content) return 0;
  const normalized = content.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const matched = terms.filter((term) => normalized.includes(term)).length;
  return matched / terms.length;
}

async function readResponseTextBounded(response: Response) {
  const declaredLength = Number(response.headers.get('content-length') ?? Number.NaN);
  let truncated = Number.isFinite(declaredLength) && declaredLength > MAX_DIRECT_SOURCE_BYTES;
  if (!response.body) return { text: '', bytesRead: 0, truncated };
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let output = '';
  while (bytesRead < MAX_DIRECT_SOURCE_BYTES) {
    const { done, value } = await reader.read();
    if (done) {
      output += decoder.decode();
      return { text: output, bytesRead, truncated };
    }
    if (!value?.byteLength) continue;
    const remaining = MAX_DIRECT_SOURCE_BYTES - bytesRead;
    if (value.byteLength > remaining) {
      output += decoder.decode(value.subarray(0, remaining), { stream: true });
      bytesRead += remaining;
      truncated = true;
      await reader.cancel('SFI_DIRECT_SOURCE_BYTE_LIMIT');
      output += decoder.decode();
      return { text: output, bytesRead, truncated };
    }
    output += decoder.decode(value, { stream: true });
    bytesRead += value.byteLength;
  }
  truncated = true;
  await reader.cancel('SFI_DIRECT_SOURCE_BYTE_LIMIT');
  output += decoder.decode();
  return { text: output, bytesRead, truncated };
}

async function fetchDirectSource(source: UniversalWebSource, terms: string[]): Promise<UniversalWebSource> {
  let currentUrl = source.url;
  for (let redirect = 0; redirect < 3; redirect += 1) {
    if (!await resolvesOnlyToPublicAddresses(currentUrl)) {
      return { ...source, verification: { directFetch: false, httpStatus: null, contentType: null, excerpt: null, queryCoverage: 0, verifiedAt: null, warning: 'UNSAFE_OR_UNRESOLVABLE_SOURCE_URL' } };
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    try {
      const response = await fetch(currentUrl, {
        headers: { Accept: 'text/html,text/plain,application/xhtml+xml', 'User-Agent': 'SystemFrictionInstitute/1.1 source-corroboration' },
        signal: controller.signal,
        cache: 'no-store',
        redirect: 'manual',
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) break;
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }
      const contentType = response.headers.get('content-type');
      if (!response.ok || !contentType || !/text\/html|text\/plain|application\/xhtml\+xml/i.test(contentType)) {
        return { ...source, verification: { directFetch: false, httpStatus: response.status, contentType, excerpt: null, queryCoverage: 0, verifiedAt: null, warning: `DIRECT_FETCH_UNUSABLE_${response.status}` } };
      }
      const boundedBody = await readResponseTextBounded(response);
      const plain = htmlToEvidenceText(boundedBody.text).slice(0, 8_000);
      const queryCoverage = coverageFor(`${source.title} ${plain}`, terms);
      const directFetch = plain.length > 80;
      const relevanceQualified = queryCoverage >= MIN_VERIFIED_QUERY_COVERAGE;
      const warning = !directFetch
        ? 'DIRECT_FETCH_EMPTY_TEXT'
        : !relevanceQualified
          ? 'DIRECT_FETCH_LOW_QUERY_RELEVANCE'
          : boundedBody.truncated
            ? 'DIRECT_FETCH_BODY_TRUNCATED'
            : null;
      return {
        ...source,
        url: currentUrl,
        snippet: plain ? plain.slice(0, 1600) : source.snippet,
        verification: {
          directFetch,
          httpStatus: response.status,
          contentType,
          excerpt: plain ? plain.slice(0, 4000) : null,
          queryCoverage,
          verifiedAt: directFetch ? new Date().toISOString() : null,
          warning,
        },
      };
    } catch (error) {
      return {
        ...source,
        verification: {
          directFetch: false,
          httpStatus: null,
          contentType: null,
          excerpt: null,
          queryCoverage: 0,
          verifiedAt: null,
          warning: `DIRECT_FETCH_FAILED:${error instanceof Error ? error.message : String(error)}`,
        },
      };
    } finally {
      clearTimeout(timeout);
    }
  }
  return { ...source, verification: { directFetch: false, httpStatus: null, contentType: null, excerpt: null, queryCoverage: 0, verifiedAt: null, warning: 'DIRECT_FETCH_REDIRECT_LIMIT' } };
}

async function boundedPublicRetrieval(queries: string[], lookbackDays: number) {
  const settled = await Promise.allSettled(queries.slice(0, 3).map((query) => gdeltQuery(query, lookbackDays)));
  const warnings = settled.flatMap((result, index) => result.status === 'rejected'
    ? [`GDELT_QUERY_${index + 1}_FAILED:${result.reason instanceof Error ? result.reason.message : String(result.reason)}`]
    : []);
  const byUrl = new Map<string, UniversalWebSource>();
  for (const result of settled) {
    if (result.status !== 'fulfilled') continue;
    for (const source of result.value) if (!byUrl.has(source.url)) byUrl.set(source.url, source);
  }
  const discovered = [...byUrl.values()].sort((a, b) => b.reliability - a.reliability).slice(0, 24);
  const terms = queryTerms(queries);
  const verificationPairs = await Promise.all(discovered.slice(0, 6).map(async (source) => ({
    discoveredUrl: source.url,
    verified: await fetchDirectSource(source, terms),
  })));
  const verifiedByDiscoveredUrl = new Map(verificationPairs.map((item) => [item.discoveredUrl, item.verified]));
  const verified = verificationPairs.map((item) => item.verified);
  const sources = discovered.map((source) => verifiedByDiscoveredUrl.get(source.url) ?? source);
  return {
    provider: 'gdelt_discovery_plus_direct_source_fetch',
    sources,
    warnings: [...warnings, ...verified.flatMap((source) => source.verification?.warning ? [`${source.id}:${source.verification.warning}`] : [])],
  };
}

function distinctSourcesByResolvedUrl(sources: UniversalWebSource[]) {
  const byResolvedUrl = new Map<string, UniversalWebSource>();
  for (const source of sources) {
    let key = source.url;
    try { key = new URL(source.url).toString(); } catch { /* retain exact value */ }
    if (!byResolvedUrl.has(key)) byResolvedUrl.set(key, source);
  }
  return [...byResolvedUrl.values()];
}

export type UniversalWebEvidenceAcquisition = {
  attempted: boolean;
  satisfied: boolean;
  policy: SfiWebEvidencePolicy;
  provider: string | null;
  sources: UniversalWebSource[];
  warnings: string[];
  queries: string[];
  eventId: string | null;
};

export async function acquireUniversalWebEvidence(inputValue: unknown, actorId: string, tenantId: string, cycleKey: string): Promise<UniversalWebEvidenceAcquisition> {
  const requirement = resolveUniversalEvidenceRequirements(inputValue);
  if (requirement.webPolicy === 'WEB_FORBIDDEN' || requirement.webPolicy === 'WEB_NOT_REQUIRED' || requirement.webPolicy === 'WEB_ALREADY_SUFFICIENT') {
    return { attempted: false, satisfied: true, policy: requirement.webPolicy, provider: null, sources: [], warnings: [], queries: requirement.queries, eventId: null };
  }
  if (!requirement.queries.length) {
    return { attempted: false, satisfied: requirement.webPolicy !== 'WEB_REQUIRED', policy: requirement.webPolicy, provider: null, sources: [], warnings: ['WEB_QUERY_PLAN_EMPTY'], queries: [], eventId: null };
  }

  const result = await boundedPublicRetrieval(requirement.queries, requirement.lookbackDays);
  const directFetchSources = distinctSourcesByResolvedUrl(result.sources.filter((source) => source.verification?.directFetch === true));
  const verifiedSources = directFetchSources.filter((source) => Number(source.verification?.queryCoverage ?? 0) >= MIN_VERIFIED_QUERY_COVERAGE);
  const authoritativeVerified = verifiedSources.filter((source) => source.sourceType === 'regulator');
  const discoverySatisfied = result.sources.length >= requirement.requiredSourceCount;
  const directVerificationSatisfied = verifiedSources.length >= requirement.requiredVerifiedSourceCount;
  const authoritySatisfied = !requirement.authoritySensitive || authoritativeVerified.length > 0;
  const satisfied = requirement.webPolicy !== 'WEB_REQUIRED'
    ? true
    : discoverySatisfied && directVerificationSatisfied && authoritySatisfied;
  const event = await appendEpistemicEvent({
    eventName: 'SFI_UNIVERSAL_WEB_EVIDENCE_ACQUIRED',
    epistemicClass: 'imported',
    confidence: satisfied ? 0.82 : 0.4,
    payload: {
      actorId,
      tenantId,
      cycleKey,
      policy: requirement.webPolicy,
      requiredSourceCount: requirement.requiredSourceCount,
      requiredVerifiedSourceCount: requirement.requiredVerifiedSourceCount,
      minimumQueryCoverage: MIN_VERIFIED_QUERY_COVERAGE,
      authoritySensitive: requirement.authoritySensitive,
      provider: result.provider,
      queries: requirement.queries,
      warnings: result.warnings,
      sources: result.sources.map((source) => ({ ...source, epistemicClass: 'SOURCE_CLAIM' })),
      sourceCount: result.sources.length,
      directFetchSourceCount: directFetchSources.length,
      verifiedSourceCount: verifiedSources.length,
      authoritativeVerifiedSourceCount: authoritativeVerified.length,
      satisfied,
      executionBoundary: 'BOUNDED_DISCOVERY_PLUS_DNS_VALIDATED_DIRECT_SOURCE_FETCH_NO_LLM',
      epistemicBoundary: 'Direct retrieval establishes that source material was fetched and records an excerpt. Verification additionally requires query relevance and distinct resolved source URLs; authority-sensitive cases require regulator provenance from the source hostname. Neither state makes the source claim accepted evidence or proves causal/factual truth by itself.',
    },
    occurredAt: new Date().toISOString(),
    source: { sourceId: 'universal_evidence_acquisition', sourceType: 'public_research' },
    logbookId: `universal-evidence:${cycleKey}`,
    lineage: result.sources.map((source) => source.url),
  });
  return {
    attempted: true,
    satisfied,
    policy: requirement.webPolicy,
    provider: result.provider,
    sources: result.sources,
    warnings: result.warnings,
    queries: requirement.queries,
    eventId: event.ok ? String(event.data.event_id ?? '') : null,
  };
}
