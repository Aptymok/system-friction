import 'server-only';

export type NoKeyFeedResult = {
  url: string;
  title?: string;
  snippet?: string;
  publishedAt?: string | null;
};

export type NoKeyFeedResponse = {
  results: NoKeyFeedResult[];
  warnings: string[];
};

type CachedFeed = {
  expiresAt: number;
  body: string;
};

const CACHE_TTL_MS = 15 * 60 * 1000;
const feedCache = new Map<string, CachedFeed>();

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tag(block: string, name: string) {
  const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return match ? decodeXml(match[1]) : '';
}

function rawTag(block: string, name: string) {
  const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return match?.[1]?.trim() ?? '';
}

function sourceUrl(block: string) {
  const match = block.match(/<source\s+[^>]*url=["']([^"']+)["'][^>]*>/i);
  return match?.[1]?.trim() ?? '';
}

function atomLink(block: string) {
  const match = block.match(/<link\s+[^>]*href=["']([^"']+)["'][^>]*\/?\s*>/i);
  return match?.[1]?.trim() ?? '';
}

function validHttpUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function parseRss(xml: string, provider: string): NoKeyFeedResult[] {
  const itemBlocks = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((match) => match[0]);
  const entryBlocks = [...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)].map((match) => match[0]);
  const blocks = itemBlocks.length ? itemBlocks : entryBlocks;

  return blocks.map((block) => {
    const title = tag(block, 'title');
    const directLink = decodeXml(rawTag(block, 'link')) || atomLink(block);
    const publisherUrl = sourceUrl(block);
    const link = validHttpUrl(directLink) ? directLink : publisherUrl;
    const description = tag(block, 'description') || tag(block, 'summary') || tag(block, 'content');
    const publisher = tag(block, 'source');
    const publishedAt = tag(block, 'pubDate') || tag(block, 'published') || tag(block, 'updated') || null;

    return {
      url: link,
      title,
      snippet: [description, publisher ? `Fuente RSS: ${publisher}` : '', `Índice gratuito: ${provider}`]
        .filter(Boolean)
        .join('\n'),
      publishedAt,
    };
  }).filter((item) => validHttpUrl(item.url) && Boolean(item.title));
}

async function fetchFeed(url: string) {
  const cached = feedCache.get(url);
  if (cached && cached.expiresAt > Date.now()) return cached.body;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18_000);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.5',
        'User-Agent': 'Mozilla/5.0 (compatible; SystemFrictionInstitute/1.0; +https://systemfriction.org)',
      },
      signal: controller.signal,
      cache: 'no-store',
      redirect: 'follow',
    });
    if (!response.ok) throw new Error(`http_${response.status}`);
    const body = await response.text();
    if (!body.trim()) throw new Error('empty_feed');
    feedCache.set(url, { expiresAt: Date.now() + CACHE_TTL_MS, body });
    return body;
  } finally {
    clearTimeout(timeout);
  }
}

function googleNewsUrl(query: string) {
  const url = new URL('https://news.google.com/rss/search');
  url.searchParams.set('q', query.slice(0, 380));
  url.searchParams.set('hl', 'es-419');
  url.searchParams.set('gl', 'MX');
  url.searchParams.set('ceid', 'MX:es-419');
  return url.toString();
}

function bingNewsUrl(query: string) {
  const url = new URL('https://www.bing.com/news/search');
  url.searchParams.set('q', query.slice(0, 380));
  url.searchParams.set('format', 'rss');
  url.searchParams.set('setlang', 'es-mx');
  return url.toString();
}

async function queryProvider(provider: 'bing_news_rss' | 'google_news_rss', query: string) {
  const url = provider === 'bing_news_rss' ? bingNewsUrl(query) : googleNewsUrl(query);
  const xml = await fetchFeed(url);
  return parseRss(xml, provider);
}

function dedupe(results: NoKeyFeedResult[]) {
  const seen = new Set<string>();
  const output: NoKeyFeedResult[] = [];
  for (const result of results) {
    const key = `${result.url}|${result.title ?? ''}`.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      output.push(result);
    }
  }
  return output;
}

export async function runNoKeyNewsFeeds(queries: string[]): Promise<NoKeyFeedResponse> {
  const warnings: string[] = [];
  const results: NoKeyFeedResult[] = [];
  const queryBudget = queries.filter(Boolean).slice(0, 3);

  for (let index = 0; index < queryBudget.length; index += 1) {
    const query = queryBudget[index];

    for (const provider of ['bing_news_rss', 'google_news_rss'] as const) {
      try {
        const items = await queryProvider(provider, query);
        results.push(...items.slice(0, 12));
        if (!items.length) warnings.push(`${provider}_query_${index + 1}_no_results`);
      } catch (error) {
        warnings.push(`${provider}_query_${index + 1}_failed:${error instanceof Error ? error.message : 'unknown'}`);
      }
      await delay(250);
    }
  }

  return {
    results: dedupe(results).slice(0, 48),
    warnings,
  };
}
