import { appendEpistemicEvent } from '@/lib/events/eventStore';

export const SFI_EVIDENCE_REQUIREMENT_RESOLVER_CONTRACT = 'SFI-EVIDENCE-REQUIREMENT-RESOLVER-1.0' as const;
export type SfiWebEvidencePolicy = 'WEB_REQUIRED' | 'WEB_OPTIONAL' | 'WEB_NOT_REQUIRED' | 'WEB_FORBIDDEN' | 'WEB_ALREADY_SUFFICIENT';

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
};

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function explicitPolicy(value: unknown): SfiWebEvidencePolicy | null {
  const candidate = text(value)?.toUpperCase();
  return candidate === 'WEB_REQUIRED' || candidate === 'WEB_OPTIONAL' || candidate === 'WEB_NOT_REQUIRED' || candidate === 'WEB_FORBIDDEN' || candidate === 'WEB_ALREADY_SUFFICIENT'
    ? candidate
    : null;
}

function host(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

function classifySource(url: string, title: string): UniversalWebSource['sourceType'] {
  const hostname = host(url).toLowerCase();
  const value = `${hostname} ${title}`.toLowerCase();
  if (/\.gob\.mx$|\.gov\.|\.gov$|regulator|commission|secretar|ministerio|authority|profeco|condusef|sec\.gov/.test(value)) return 'regulator';
  if (/linkedin\.com|crunchbase\.com/.test(hostname)) return 'professional';
  if (/news|noticias|reuters|bloomberg|forbes|expansion|eleconomista|elfinanciero|elceo|elpais|milenio|cnn|bbc/.test(value)) return 'news';
  if (/newsroom|news-room|investor|about|press|blog/.test(value)) return 'official';
  return 'other';
}

function reliabilityFor(type: UniversalWebSource['sourceType'], url: string) {
  if (type === 'regulator') return 0.94;
  if (type === 'official') return 0.86;
  if (type === 'news') return 0.76;
  if (type === 'professional') return 0.62;
  return host(url) ? 0.55 : 0.35;
}

function buildQueries(input: Row) {
  const signal = row(input.signal);
  const context = row(input.context);
  const base = [text(input.question), text(input.objective), text(signal.name), text(input.declaredFunction), text(input.systemType)]
    .filter((value): value is string => Boolean(value));
  const explicit = Array.isArray(context.webQueries)
    ? context.webQueries.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim())
    : [];
  const queries = [...explicit, base.join(' ')].filter(Boolean);
  if (base.length >= 2) queries.push(`${base[0]} ${base.at(-1)}`);
  return [...new Set(queries.map((value) => value.replace(/\s+/g, ' ').trim()).filter(Boolean))].slice(0, 3);
}

export function resolveUniversalEvidenceRequirements(inputValue: unknown) {
  const input = row(inputValue);
  const signal = row(input.signal);
  const context = row(input.context);
  const kind = (text(signal.kind) ?? 'unknown').toLowerCase();
  const blob = [input.question, input.objective, input.declaredFunction, input.systemType, JSON.stringify(context)]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const explicit = explicitPolicy(context.webPolicy) ?? explicitPolicy(context.externalEvidencePolicy);
  const privacyBlocksWeb = context.webForbidden === true || /confidential only|private only|sin internet|no internet|no web|offline only/.test(blob);
  const dynamicExternal = /latest|current|actual|hoy|mercad|market|law|legal|regulat|precio|price|compet|benchmark|trend|tendenc|public|social|release|lanzamiento|geopolit|world|mundo|extern|industry|sector|norma|standard|sla/.test(blob);
  const strictlyInternal = ['dataset', 'csv', 'json', 'document', 'code', 'api_response'].includes(kind)
    && /internal|interno|dataset|archivo|file|registros|tickets|mesa de ayuda|repository|repo/.test(blob)
    && !dynamicExternal;

  let webPolicy: SfiWebEvidencePolicy;
  if (explicit) webPolicy = explicit;
  else if (privacyBlocksWeb) webPolicy = 'WEB_FORBIDDEN';
  else if (kind === 'web_page' || kind === 'url') webPolicy = dynamicExternal ? 'WEB_OPTIONAL' : 'WEB_ALREADY_SUFFICIENT';
  else if (dynamicExternal) webPolicy = 'WEB_REQUIRED';
  else if (strictlyInternal) webPolicy = 'WEB_NOT_REQUIRED';
  else webPolicy = 'WEB_OPTIONAL';

  const requiredSourceCount = webPolicy === 'WEB_REQUIRED' ? 2 : 0;
  const lookbackDays = /today|hoy|current|actual|latest|últim|ultima|recent/.test(blob) ? 30 : 180;
  return {
    contract: SFI_EVIDENCE_REQUIREMENT_RESOLVER_CONTRACT,
    webPolicy,
    requiredSourceCount,
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
    runtimeBoundary: 'Bounded no-key retrieval only. No LLM is required for web acquisition; synthesis happens after retrieval.',
    epistemicBoundary: 'Retrieval produces SOURCE candidates/source claims. It does not itself create accepted evidence, truth, authorization or canonical state.',
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
      headers: { Accept: 'application/json', 'User-Agent': 'SystemFrictionInstitute/1.0 universal-evidence' },
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
      if (!articleUrl || !/^https?:\/\//i.test(articleUrl)) return [];
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
  return { provider: 'gdelt_doc_bounded', sources: [...byUrl.values()].slice(0, 24), warnings };
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
    return {
      attempted: false,
      satisfied: true,
      policy: requirement.webPolicy,
      provider: null,
      sources: [],
      warnings: [],
      queries: requirement.queries,
      eventId: null,
    };
  }

  if (!requirement.queries.length) {
    return {
      attempted: false,
      satisfied: requirement.webPolicy !== 'WEB_REQUIRED',
      policy: requirement.webPolicy,
      provider: null,
      sources: [],
      warnings: ['WEB_QUERY_PLAN_EMPTY'],
      queries: [],
      eventId: null,
    };
  }

  const result = await boundedPublicRetrieval(requirement.queries, requirement.lookbackDays);
  const satisfied = result.sources.length >= requirement.requiredSourceCount;
  const event = await appendEpistemicEvent({
    eventName: 'SFI_UNIVERSAL_WEB_EVIDENCE_ACQUIRED',
    epistemicClass: 'imported',
    confidence: satisfied ? 0.8 : 0.4,
    payload: {
      actorId,
      tenantId,
      cycleKey,
      policy: requirement.webPolicy,
      requiredSourceCount: requirement.requiredSourceCount,
      provider: result.provider,
      queries: requirement.queries,
      warnings: result.warnings,
      sources: result.sources.map((source) => ({ ...source, epistemicClass: 'SOURCE_CLAIM' })),
      sourceCount: result.sources.length,
      satisfied,
      executionBoundary: 'BOUNDED_RETRIEVAL_NO_LLM',
      epistemicBoundary: 'Search results and indexed titles are imported source claims. Original-source verification and acceptance remain separate.',
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
