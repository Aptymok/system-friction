import 'server-only';

import { runLlmTask } from '@/lib/ai/providerRouter';

export type PublicResearchProvider = 'openai_web_search' | 'brave_search' | 'unavailable';

export type PublicResearchSource = {
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

export type PublicResearchResult = {
  ok: boolean;
  provider: PublicResearchProvider;
  answer: string;
  sources: PublicResearchSource[];
  queries: string[];
  warnings: string[];
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function host(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function classifySource(url: string, title: string): PublicResearchSource['sourceType'] {
  const hostname = host(url).toLowerCase();
  const value = `${hostname} ${title}`.toLowerCase();
  if (/\.gob\.mx$|\.gov\.|\.gov$|regulator|commission|secretar|ministerio|authority/.test(value)) return 'regulator';
  if (/linkedin\.com|crunchbase\.com/.test(hostname)) return 'professional';
  if (/news|noticias|reuters|bloomberg|forbes|expansion|eleconomista|elfinanciero|elceo|elpais|milenio|cnn|bbc/.test(value)) return 'news';
  if (/newsroom|news-room|investor|about|press|blog/.test(value)) return 'official';
  return 'other';
}

function reliabilityFor(type: PublicResearchSource['sourceType'], url: string) {
  if (type === 'regulator') return 0.94;
  if (type === 'official') return 0.86;
  if (type === 'news') return 0.76;
  if (type === 'professional') return 0.62;
  if (host(url)) return 0.55;
  return 0.35;
}

function sourceId(url: string, index: number) {
  const slug = host(url).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 32);
  return `WEB-${String(index + 1).padStart(2, '0')}-${slug || 'source'}`;
}

function normalizeSource(input: {
  url: string;
  title?: string;
  snippet?: string;
  publishedAt?: string | null;
}, index: number): PublicResearchSource | null {
  const url = text(input.url);
  if (!/^https?:\/\//i.test(url)) return null;
  const title = text(input.title, host(url));
  const sourceType = classifySource(url, title);
  return {
    id: sourceId(url, index),
    url,
    title,
    publisher: host(url) || null,
    snippet: text(input.snippet).slice(0, 1600),
    publishedAt: text(input.publishedAt) || null,
    retrievedAt: new Date().toISOString(),
    sourceType,
    reliability: reliabilityFor(sourceType, url),
  };
}

function parseOpenAiText(response: Record<string, unknown>) {
  const outputText = text(response.output_text);
  if (outputText) return outputText;
  const output = Array.isArray(response.output) ? response.output as unknown[] : [];
  const parts: string[] = [];
  for (const itemValue of output) {
    const item = asRecord(itemValue);
    const content = Array.isArray(item.content) ? item.content as unknown[] : [];
    for (const contentValue of content) {
      const contentItem = asRecord(contentValue);
      const value = text(contentItem.text);
      if (value) parts.push(value);
    }
  }
  return parts.join('\n').trim();
}

function parseOpenAiSources(response: Record<string, unknown>) {
  const output = Array.isArray(response.output) ? response.output as unknown[] : [];
  const candidates: Array<{ url: string; title?: string; snippet?: string }> = [];

  for (const itemValue of output) {
    const item = asRecord(itemValue);
    if (item.type === 'web_search_call') {
      const action = asRecord(item.action);
      const sources = Array.isArray(action.sources) ? action.sources as unknown[] : [];
      for (const sourceValue of sources) {
        const source = asRecord(sourceValue);
        candidates.push({ url: text(source.url), title: text(source.title), snippet: text(source.snippet) });
      }
    }

    const content = Array.isArray(item.content) ? item.content as unknown[] : [];
    for (const contentValue of content) {
      const contentItem = asRecord(contentValue);
      const annotations = Array.isArray(contentItem.annotations) ? contentItem.annotations as unknown[] : [];
      for (const annotationValue of annotations) {
        const annotation = asRecord(annotationValue);
        const citation = asRecord(annotation.url_citation);
        const url = text(citation.url) || text(annotation.url);
        if (url) candidates.push({ url, title: text(citation.title) || text(annotation.title) });
      }
    }
  }

  const deduped = new Map<string, { url: string; title?: string; snippet?: string }>();
  for (const candidate of candidates) {
    if (/^https?:\/\//i.test(candidate.url) && !deduped.has(candidate.url)) deduped.set(candidate.url, candidate);
  }

  return [...deduped.values()]
    .map((candidate, index) => normalizeSource(candidate, index))
    .filter((source): source is PublicResearchSource => Boolean(source));
}

async function openAiWebResearch(input: {
  prompt: string;
  country: string;
  city?: string;
  timezone: string;
}): Promise<PublicResearchResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_WEB_SEARCH_MODEL ?? 'gpt-5-mini';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        store: false,
        tools: [{
          type: 'web_search',
          search_context_size: 'high',
          user_location: {
            type: 'approximate',
            country: input.country,
            city: input.city,
            timezone: input.timezone,
          },
        }],
        include: ['web_search_call.action.sources'],
        input: input.prompt,
      }),
    });
    const json = await response.json().catch(() => null);
    if (!response.ok || !json || typeof json !== 'object') {
      const error = asRecord(asRecord(json).error);
      throw new Error(text(error.message, `openai_web_search_http_${response.status}`));
    }
    const record = json as Record<string, unknown>;
    const answer = parseOpenAiText(record);
    const sources = parseOpenAiSources(record);
    return {
      ok: Boolean(answer && sources.length),
      provider: 'openai_web_search',
      answer,
      sources,
      queries: [],
      warnings: [
        answer ? '' : 'openai_web_search_empty_answer',
        sources.length ? '' : 'openai_web_search_sources_missing',
      ].filter(Boolean),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function braveQuery(query: string, country: string, searchLang: string) {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY ?? process.env.BRAVE_API_KEY;
  if (!apiKey) return [];
  const url = new URL('https://api.search.brave.com/res/v1/web/search');
  url.searchParams.set('q', query.slice(0, 390));
  url.searchParams.set('country', country);
  url.searchParams.set('search_lang', searchLang);
  url.searchParams.set('count', '10');
  url.searchParams.set('extra_snippets', 'true');
  url.searchParams.set('safesearch', 'moderate');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'X-Subscription-Token': apiKey,
      },
      signal: controller.signal,
    });
    const json = await response.json().catch(() => null);
    if (!response.ok || !json || typeof json !== 'object') throw new Error(`brave_search_http_${response.status}`);
    const web = asRecord(asRecord(json).web);
    const results = Array.isArray(web.results) ? web.results as unknown[] : [];
    return results.map((resultValue) => {
      const result = asRecord(resultValue);
      const extras = Array.isArray(result.extra_snippets) ? result.extra_snippets.map((item) => text(item)).filter(Boolean) : [];
      return {
        url: text(result.url),
        title: text(result.title),
        snippet: [text(result.description), ...extras].filter(Boolean).join('\n'),
        publishedAt: text(result.page_age) || text(result.age) || null,
      };
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function braveWebResearch(input: {
  prompt: string;
  queries: string[];
  country: string;
  searchLang: string;
}): Promise<PublicResearchResult | null> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY ?? process.env.BRAVE_API_KEY;
  if (!apiKey) return null;

  const settled = await Promise.allSettled(input.queries.slice(0, 6).map((query) => braveQuery(query, input.country, input.searchLang)));
  const raw = settled.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
  const deduped = new Map<string, typeof raw[number]>();
  for (const item of raw) if (item.url && !deduped.has(item.url)) deduped.set(item.url, item);
  const sources = [...deduped.values()]
    .slice(0, 36)
    .map((source, index) => normalizeSource(source, index))
    .filter((source): source is PublicResearchSource => Boolean(source));

  if (!sources.length) {
    return { ok: false, provider: 'brave_search', answer: '', sources: [], queries: input.queries, warnings: ['brave_search_no_results'] };
  }

  const context = sources.map((source) => ({
    id: source.id,
    title: source.title,
    url: source.url,
    publishedAt: source.publishedAt,
    sourceType: source.sourceType,
    reliability: source.reliability,
    snippet: source.snippet,
  }));
  const llm = await runLlmTask({
    task: 'deep_report',
    system: 'You are the SFI Public Research Synthesizer. Use only supplied sources. Distinguish observed facts, source claims, inference and projection. Return the exact JSON requested by the prompt. Never invent contacts, dates, email addresses or sources.',
    prompt: `${input.prompt}\n\nRETRIEVED_SOURCES=${JSON.stringify(context)}`,
    fallbackResult: JSON.stringify({ error: 'llm_synthesis_unavailable', source_ids: sources.map((source) => source.id) }),
    maxTokens: 2800,
  });

  return {
    ok: llm.ok && Boolean(llm.result),
    provider: 'brave_search',
    answer: llm.result,
    sources,
    queries: input.queries,
    warnings: llm.warnings,
  };
}

export async function runPublicResearch(input: {
  prompt: string;
  queries: string[];
  country?: string;
  city?: string;
  searchLang?: string;
  timezone?: string;
}): Promise<PublicResearchResult> {
  const country = (input.country ?? 'MX').toUpperCase().slice(0, 2);
  const searchLang = input.searchLang ?? 'es';
  const timezone = input.timezone ?? 'America/Mexico_City';
  const warnings: string[] = [];

  try {
    const openai = await openAiWebResearch({ prompt: input.prompt, country, city: input.city, timezone });
    if (openai?.ok) return { ...openai, queries: input.queries };
    if (openai) warnings.push(...openai.warnings);
  } catch (error) {
    warnings.push(`openai_web_search_failed:${error instanceof Error ? error.message : 'unknown'}`);
  }

  try {
    const brave = await braveWebResearch({ prompt: input.prompt, queries: input.queries, country, searchLang });
    if (brave) return { ...brave, warnings: unique([...warnings, ...brave.warnings]) };
  } catch (error) {
    warnings.push(`brave_search_failed:${error instanceof Error ? error.message : 'unknown'}`);
  }

  return {
    ok: false,
    provider: 'unavailable',
    answer: '',
    sources: [],
    queries: input.queries,
    warnings: unique([...warnings, 'PUBLIC_SEARCH_PROVIDER_NOT_CONFIGURED: set OPENAI_API_KEY or BRAVE_SEARCH_API_KEY']),
  };
}
