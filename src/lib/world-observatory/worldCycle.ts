import 'server-only';
import { createHash } from 'crypto';
import { runLlmTask } from '@/lib/ai/providerRouter';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { calculateLdiFromAge, evaluateSfi, clamp01 } from '@/lib/sfi/math';

export const WORLD_METHODOLOGY_VERSION = 'SFI-WORLD-2026.09.1';
export const WORLD_COLLECTOR_VERSION = 'world-observatory-v2';

type Row = Record<string, unknown>;
type NormalizedObservation = {
  sourceId: string;
  sourceFamily: string;
  publisher: string;
  observationKind: string;
  externalId: string;
  title: string;
  summary: string | null;
  observedAt: string | null;
  releasedAt: string | null;
  latitude: number | null;
  longitude: number | null;
  countryCodes: string[];
  actors: string[];
  affectedSystems: string[];
  payload: Row;
  sourceUrl: string | null;
  confidence: number;
};

type FrictionReading = {
  ihg: number;
  nti: number;
  ldi: number;
  phi: number;
  fs: number;
  regime: string;
  tension: Row;
  painMap: Row;
  fieldDrivers: Row;
  permissions: Row;
  trajectory: Row;
  minimumViablePerturbation: Row;
};

type WorldMonitorEndpoint = {
  path: string;
  sourceId: string;
  sourceFamily: string;
  observationKind: string;
  affectedSystems: string[];
  confidence: number;
  maxItems?: number;
};

const WORLDMONITOR_ENDPOINTS: WorldMonitorEndpoint[] = [
  { path: '/api/news/v1/list-feed-digest?variant=full', sourceId: 'worldmonitor-feed-full', sourceFamily: 'news_intelligence', observationKind: 'source_report', affectedSystems: ['culture','institutions','geopolitics','economy'], confidence: 0.66, maxItems: 120 },
  { path: '/api/news/v1/list-feed-digest?variant=tech', sourceId: 'worldmonitor-feed-tech', sourceFamily: 'technology_intelligence', observationKind: 'source_report', affectedSystems: ['technology','digital_infrastructure','organizations'], confidence: 0.66, maxItems: 100 },
  { path: '/api/news/v1/list-feed-digest?variant=finance', sourceId: 'worldmonitor-feed-finance', sourceFamily: 'economic_intelligence', observationKind: 'source_report', affectedSystems: ['economy','markets','capital'], confidence: 0.66, maxItems: 100 },
  { path: '/api/news/v1/list-feed-digest?variant=commodity', sourceId: 'worldmonitor-feed-commodity', sourceFamily: 'commodity_intelligence', observationKind: 'source_report', affectedSystems: ['economy','energy','supply_chain'], confidence: 0.66, maxItems: 100 },
  { path: '/api/intelligence/v1/list-cross-source-signals', sourceId: 'worldmonitor-cross-source', sourceFamily: 'cross_source_intelligence', observationKind: 'derived_source_signal', affectedSystems: ['institutions','geopolitics','economy','technology'], confidence: 0.64, maxItems: 100 },
  { path: '/api/intelligence/v1/list-security-advisories', sourceId: 'worldmonitor-security-advisories', sourceFamily: 'cyber_security', observationKind: 'advisory', affectedSystems: ['digital_infrastructure','technology','organizations'], confidence: 0.72, maxItems: 100 },
  { path: '/api/intelligence/v1/list-gps-interference', sourceId: 'worldmonitor-gps-interference', sourceFamily: 'geo_digital', observationKind: 'measurement', affectedSystems: ['navigation','aviation','logistics','communications'], confidence: 0.72, maxItems: 100 },
  { path: '/api/economic/v1/get-macro-signals', sourceId: 'worldmonitor-macro-signals', sourceFamily: 'macro_economy', observationKind: 'measurement', affectedSystems: ['economy','capital','labor'], confidence: 0.72, maxItems: 80 },
  { path: '/api/economic/v1/get-economic-stress', sourceId: 'worldmonitor-economic-stress', sourceFamily: 'macro_economy', observationKind: 'derived_source_signal', affectedSystems: ['economy','capital','labor'], confidence: 0.65, maxItems: 80 },
  { path: '/api/market/v1/list-market-quotes', sourceId: 'worldmonitor-market-quotes', sourceFamily: 'markets', observationKind: 'measurement', affectedSystems: ['markets','capital'], confidence: 0.70, maxItems: 100 },
  { path: '/api/market/v1/get-fear-greed-index', sourceId: 'worldmonitor-fear-greed', sourceFamily: 'market_attention', observationKind: 'index', affectedSystems: ['markets','attention'], confidence: 0.60, maxItems: 20 },
  { path: '/api/supply-chain/v1/get-shipping-stress', sourceId: 'worldmonitor-shipping-stress', sourceFamily: 'supply_chain', observationKind: 'derived_source_signal', affectedSystems: ['shipping','logistics','economy'], confidence: 0.68, maxItems: 80 },
  { path: '/api/supply-chain/v1/get-chokepoint-status', sourceId: 'worldmonitor-chokepoints', sourceFamily: 'supply_chain', observationKind: 'status', affectedSystems: ['shipping','logistics','energy','trade'], confidence: 0.70, maxItems: 100 },
  { path: '/api/trade/v1/list-comtrade-flows', sourceId: 'worldmonitor-trade-flows', sourceFamily: 'trade', observationKind: 'measurement', affectedSystems: ['trade','economy','supply_chain'], confidence: 0.72, maxItems: 100 },
  { path: '/api/climate/v1/list-climate-anomalies', sourceId: 'worldmonitor-climate-anomalies', sourceFamily: 'climate', observationKind: 'measurement', affectedSystems: ['climate','population','infrastructure','agriculture'], confidence: 0.76, maxItems: 100 },
  { path: '/api/climate/v1/list-climate-disasters', sourceId: 'worldmonitor-climate-disasters', sourceFamily: 'natural_event', observationKind: 'event', affectedSystems: ['population','infrastructure','environment','logistics'], confidence: 0.76, maxItems: 100 },
  { path: '/api/conflict/v1/list-acled-events', sourceId: 'worldmonitor-acled', sourceFamily: 'conflict', observationKind: 'event', affectedSystems: ['population','institutions','security','economy'], confidence: 0.78, maxItems: 100 },
  { path: '/api/conflict/v1/list-ucdp-events', sourceId: 'worldmonitor-ucdp', sourceFamily: 'conflict', observationKind: 'event', affectedSystems: ['population','institutions','security','economy'], confidence: 0.80, maxItems: 100 },
  { path: '/api/displacement/v1/get-displacement-summary', sourceId: 'worldmonitor-displacement', sourceFamily: 'humanitarian', observationKind: 'measurement', affectedSystems: ['population','migration','institutions'], confidence: 0.78, maxItems: 80 },
  { path: '/api/health/v1/list-disease-outbreaks', sourceId: 'worldmonitor-disease', sourceFamily: 'bio_health', observationKind: 'event', affectedSystems: ['population','health_system','economy'], confidence: 0.76, maxItems: 100 },
  { path: '/api/infrastructure/v1/list-internet-outages', sourceId: 'worldmonitor-internet-outages', sourceFamily: 'digital_infrastructure', observationKind: 'event', affectedSystems: ['communications','digital_infrastructure','organizations'], confidence: 0.72, maxItems: 100 },
  { path: '/api/infrastructure/v1/list-internet-traffic-anomalies', sourceId: 'worldmonitor-traffic-anomalies', sourceFamily: 'digital_infrastructure', observationKind: 'measurement', affectedSystems: ['communications','digital_infrastructure'], confidence: 0.70, maxItems: 100 },
  { path: '/api/cyber/v1/list-cyber-threats', sourceId: 'worldmonitor-cyber-threats', sourceFamily: 'cyber_security', observationKind: 'indicator', affectedSystems: ['digital_infrastructure','organizations','security'], confidence: 0.70, maxItems: 100 },
  { path: '/api/research/v1/list-arxiv-papers?category=cs.AI', sourceId: 'worldmonitor-arxiv-ai', sourceFamily: 'research', observationKind: 'publication', affectedSystems: ['technology','research','institutions'], confidence: 0.72, maxItems: 100 },
  { path: '/api/research/v1/list-trending-repos', sourceId: 'worldmonitor-trending-repos', sourceFamily: 'technology_intelligence', observationKind: 'activity', affectedSystems: ['technology','software','digital_infrastructure'], confidence: 0.64, maxItems: 100 },
  { path: '/api/research/v1/list-hackernews-items', sourceId: 'worldmonitor-hackernews', sourceFamily: 'technology_discourse', observationKind: 'attention', affectedSystems: ['technology','attention','organizations'], confidence: 0.58, maxItems: 100 },
  { path: '/api/military/v1/get-usni-fleet-report', sourceId: 'worldmonitor-usni-fleet', sourceFamily: 'military', observationKind: 'source_report', affectedSystems: ['security','geopolitics','shipping'], confidence: 0.74, maxItems: 80 },
  { path: '/api/aviation/v1/list-airport-delays', sourceId: 'worldmonitor-airport-delays', sourceFamily: 'aviation', observationKind: 'measurement', affectedSystems: ['aviation','logistics','passengers'], confidence: 0.72, maxItems: 100 },
  { path: '/api/wildfire/v1/list-fire-detections', sourceId: 'worldmonitor-wildfire', sourceFamily: 'natural_event', observationKind: 'measurement', affectedSystems: ['environment','population','infrastructure'], confidence: 0.76, maxItems: 100 },
  { path: '/api/seismology/v1/list-earthquakes', sourceId: 'worldmonitor-earthquakes', sourceFamily: 'natural_event', observationKind: 'measurement', affectedSystems: ['population','infrastructure','logistics'], confidence: 0.80, maxItems: 100 },
  { path: '/api/radiation/v1/list-radiation-observations', sourceId: 'worldmonitor-radiation', sourceFamily: 'environmental_risk', observationKind: 'measurement', affectedSystems: ['population','health_system','environment'], confidence: 0.76, maxItems: 100 },
  { path: '/api/positive-events/v1/list-positive-geo-events', sourceId: 'worldmonitor-positive-events', sourceFamily: 'positive_event', observationKind: 'event', affectedSystems: ['population','institutions','culture'], confidence: 0.60, maxItems: 100 },
];

function hash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}

function strings(value: unknown, max = 20): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()))].slice(0, max)
    : [];
}

function valueText(value: unknown, max = 5000): string | null {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
}

function iso(value: unknown): string | null {
  if (typeof value === 'number') {
    const millis = value > 10_000_000_000 ? value : value * 1000;
    const date = new Date(millis);
    return Number.isFinite(date.getTime()) ? date.toISOString() : null;
  }
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

function finite(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function fetchJson(url: string, headers: Record<string, string> = {}): Promise<unknown> {
  const response = await fetch(url, {
    headers: { 'user-agent': 'SystemFrictionInstitute/2.0', accept: 'application/json', ...headers },
    cache: 'no-store',
    signal: AbortSignal.timeout(18000),
  });
  if (!response.ok) throw new Error(`${response.status}:${url}`);
  return response.json();
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, { headers: { 'user-agent': 'SystemFrictionInstitute/2.0' }, cache: 'no-store', signal: AbortSignal.timeout(18000) });
  if (!response.ok) throw new Error(`${response.status}:${url}`);
  return response.text();
}

function tag(xml: string, name: string): string | null {
  const match = xml.match(new RegExp(`<${name}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${name}>`, 'i'));
  return match?.[1]?.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim() ?? null;
}

async function collectUsgs(): Promise<NormalizedObservation[]> {
  const payload = await fetchJson('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson') as { features?: Array<Row> };
  return (payload.features ?? []).slice(0, 120).flatMap((feature) => {
    const properties = row(feature.properties);
    const geometry = row(feature.geometry);
    const coordinates = Array.isArray(geometry.coordinates) ? geometry.coordinates : [];
    const lat = finite(coordinates[1]);
    const lng = finite(coordinates[0]);
    if (lat === null || lng === null) return [];
    return [{
      sourceId: 'usgs-earthquakes', sourceFamily: 'natural_event', publisher: 'USGS', observationKind: 'measurement',
      externalId: String(feature.id ?? hash(feature)), title: String(properties.title ?? 'Earthquake'), summary: valueText(properties.place),
      observedAt: iso(properties.time), releasedAt: iso(properties.updated), latitude: lat, longitude: lng, countryCodes: [], actors: [],
      affectedSystems: ['population','infrastructure','logistics'], payload: { magnitude: finite(properties.mag), depthKm: finite(coordinates[2]), tsunami: properties.tsunami },
      sourceUrl: valueText(properties.url), confidence: 0.96,
    }];
  });
}

async function collectEonet(): Promise<NormalizedObservation[]> {
  const payload = row(await fetchJson('https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=30&limit=100'));
  return rows(payload.events).flatMap((event) => {
    const geometries = rows(event.geometry);
    const latest = geometries.at(-1) ?? {};
    const coordinates = Array.isArray(latest.coordinates) ? latest.coordinates : [];
    const lng = finite(coordinates[0]);
    const lat = finite(coordinates[1]);
    if (lat === null || lng === null) return [];
    const categories = rows(event.categories);
    const category = String(categories[0]?.title ?? 'Natural event');
    if (/earthquake/i.test(category)) return [];
    return [{
      sourceId: 'nasa-eonet', sourceFamily: 'natural_event', publisher: 'NASA EONET', observationKind: 'event', externalId: String(event.id ?? hash(event)),
      title: String(event.title ?? category), summary: category, observedAt: iso(latest.date), releasedAt: null, latitude: lat, longitude: lng,
      countryCodes: [], actors: [], affectedSystems: ['population','environment','infrastructure'], payload: { category, closed: event.closed ?? null },
      sourceUrl: valueText(event.link), confidence: 0.88,
    }];
  });
}

async function collectGdacs(): Promise<NormalizedObservation[]> {
  const xml = await fetchText('https://www.gdacs.org/xml/rss.xml');
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, 100).flatMap((match) => {
    const item = match[1];
    const point = tag(item, 'georss:point')?.split(/\s+/).map(Number) ?? [];
    const lat = finite(point[0]);
    const lng = finite(point[1]);
    const alert = tag(item, 'gdacs:alertlevel') ?? 'Unknown';
    if (lat === null || lng === null || /^green$/i.test(alert)) return [];
    return [{
      sourceId: 'gdacs', sourceFamily: 'natural_event', publisher: 'GDACS', observationKind: 'event', externalId: tag(item, 'guid') ?? hash(item),
      title: tag(item, 'title') ?? 'GDACS event', summary: tag(item, 'description'), observedAt: iso(tag(item, 'pubDate')), releasedAt: iso(tag(item, 'pubDate')),
      latitude: lat, longitude: lng, countryCodes: [], actors: [], affectedSystems: ['population','infrastructure','humanitarian_response'],
      payload: { alertLevel: alert, eventType: tag(item, 'gdacs:eventtype') }, sourceUrl: tag(item, 'link'), confidence: 0.92,
    }];
  });
}

async function collectFaa(): Promise<NormalizedObservation[]> {
  const xml = await fetchText('https://nasstatus.faa.gov/api/airport-status-information');
  return [...xml.matchAll(/<(Airport|Delay|Ground_Stop|Ground_Delay|Closure)[^>]*>([\s\S]*?)<\/\1>/gi)].slice(0, 100).flatMap((match, index) => {
    const body = match[2];
    const name = tag(body, 'Name') ?? tag(body, 'ARPT') ?? tag(body, 'Airport');
    if (!name) return [];
    return [{
      sourceId: 'faa-asws', sourceFamily: 'aviation', publisher: 'FAA ASWS', observationKind: 'restriction', externalId: `${name}:${index}:${hash(body).slice(0, 12)}`,
      title: `${match[1].replaceAll('_', ' ')} · ${name}`, summary: tag(body, 'Reason') ?? tag(body, 'Status'), observedAt: new Date().toISOString(), releasedAt: null,
      latitude: finite(tag(body, 'Latitude')), longitude: finite(tag(body, 'Longitude')), countryCodes: ['US'], actors: ['airport_operator','air_navigation'],
      affectedSystems: ['aviation','logistics','passengers'], payload: { type: match[1], delay: tag(body, 'Avg') ?? tag(body, 'Delay') },
      sourceUrl: 'https://nasstatus.faa.gov/', confidence: 0.94,
    }];
  });
}

async function collectRssFeed(input: { url: string; sourceId: string; publisher: string; sourceFamily: string; affectedSystems: string[]; confidence: number }) {
  const xml = await fetchText(input.url);
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, 100).flatMap((match) => {
    const item = match[1];
    const title = tag(item, 'title');
    const link = tag(item, 'link');
    if (!title) return [];
    return [{
      sourceId: input.sourceId,
      sourceFamily: input.sourceFamily,
      publisher: input.publisher,
      observationKind: 'source_report',
      externalId: tag(item, 'guid') ?? link ?? hash(item),
      title,
      summary: tag(item, 'description'),
      observedAt: iso(tag(item, 'pubDate')),
      releasedAt: iso(tag(item, 'pubDate')),
      latitude: null,
      longitude: null,
      countryCodes: [],
      actors: [],
      affectedSystems: input.affectedSystems,
      payload: { sourceRole: 'PUBLIC_MEDIA_SOURCE', independentlyVerified: false, claimBoundary: 'Publisher report is a source claim until independently corroborated.' },
      sourceUrl: link,
      confidence: input.confidence,
    } satisfies NormalizedObservation];
  });
}

async function collectPublicMedia(): Promise<NormalizedObservation[]> {
  const feeds = await Promise.allSettled([
    collectRssFeed({ url: 'https://feeds.bbci.co.uk/news/world/rss.xml', sourceId: 'bbc-world-rss', publisher: 'BBC World', sourceFamily: 'global_news', affectedSystems: ['population','institutions','geopolitics','economy'], confidence: 0.66 }),
    collectRssFeed({ url: 'https://www.aljazeera.com/xml/rss/all.xml', sourceId: 'aljazeera-rss', publisher: 'Al Jazeera', sourceFamily: 'global_news', affectedSystems: ['population','institutions','geopolitics','economy'], confidence: 0.64 }),
  ]);
  return feeds.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
}

async function collectGdelt(): Promise<NormalizedObservation[]> {
  const queries = [
    { query: 'artificial intelligence OR technology', id: 'gdelt-tech', systems: ['technology','organizations','institutions'] },
    { query: 'economy OR inflation OR unemployment OR trade', id: 'gdelt-economy', systems: ['economy','labor','trade'] },
    { query: 'conflict OR election OR sanctions OR diplomacy', id: 'gdelt-geopolitical', systems: ['geopolitics','institutions','population'] },
    { query: 'climate OR drought OR flood OR wildfire', id: 'gdelt-climate', systems: ['climate','environment','population','infrastructure'] },
    { query: 'health OR disease OR outbreak', id: 'gdelt-health', systems: ['health_system','population','economy'] },
  ];
  const settled = await Promise.allSettled(queries.map(async (definition) => {
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(definition.query)}&mode=ArtList&maxrecords=40&format=json&sort=HybridRel`;
    const payload = row(await fetchJson(url));
    return rows(payload.articles).map((article) => ({
      sourceId: definition.id,
      sourceFamily: 'gdelt_news_index',
      publisher: valueText(article.domain) ?? 'GDELT indexed source',
      observationKind: 'indexed_source_report',
      externalId: valueText(article.url) ?? hash(article),
      title: valueText(article.title) ?? 'GDELT indexed report',
      summary: valueText(article.socialimage) ? `Indexed report · ${valueText(article.domain) ?? 'source'}` : null,
      observedAt: iso(article.seendate),
      releasedAt: null,
      latitude: null,
      longitude: null,
      countryCodes: valueText(article.sourcecountry) ? [String(article.sourcecountry)] : [],
      actors: [],
      affectedSystems: definition.systems,
      payload: { language: article.language ?? null, sourceRole: 'GDELT_INDEXED_MEDIA', independentlyVerified: false, query: definition.query },
      sourceUrl: valueText(article.url),
      confidence: 0.58,
    } satisfies NormalizedObservation));
  }));
  return settled.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
}

async function collectHackerNews(): Promise<NormalizedObservation[]> {
  const cutoff = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
  const payload = row(await fetchJson(`https://hn.algolia.com/api/v1/search_by_date?tags=story&numericFilters=created_at_i%3E${cutoff}&hitsPerPage=80`));
  return rows(payload.hits).flatMap((item) => {
    const title = valueText(item.title);
    if (!title) return [];
    return [{
      sourceId: 'hackernews-live', sourceFamily: 'technology_discourse', publisher: 'Hacker News / Algolia', observationKind: 'attention',
      externalId: String(item.objectID ?? hash(item)), title, summary: valueText(item.story_text) ?? valueText(item.url), observedAt: iso(item.created_at), releasedAt: iso(item.created_at),
      latitude: null, longitude: null, countryCodes: [], actors: valueText(item.author) ? [String(item.author)] : [], affectedSystems: ['technology','attention','organizations'],
      payload: { points: finite(item.points), comments: finite(item.num_comments), sourceRole: 'PUBLIC_DISCUSSION_INDEX', independentlyVerified: false },
      sourceUrl: valueText(item.url), confidence: 0.54,
    }];
  });
}

async function collectWorldBank(): Promise<NormalizedObservation[]> {
  const indicators = [
    ['NY.GDP.MKTP.KD.ZG','GDP growth','economy'],
    ['FP.CPI.TOTL.ZG','Inflation','economy'],
    ['SL.UEM.TOTL.ZS','Unemployment','labor'],
  ];
  const settled = await Promise.allSettled(indicators.map(async ([indicator, label, system]) => {
    const payload = await fetchJson(`https://api.worldbank.org/v2/country/WLD/indicator/${indicator}?format=json&per_page=8`);
    const blocks = Array.isArray(payload) ? payload : [];
    const observations = Array.isArray(blocks[1]) ? blocks[1] as Row[] : [];
    const latest = observations.find((item) => finite(item.value) !== null);
    if (!latest) return null;
    return {
      sourceId: `worldbank-${indicator.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`,
      sourceFamily: 'macro_economy',
      publisher: 'World Bank',
      observationKind: 'measurement',
      externalId: `${indicator}:${String(latest.date ?? 'latest')}`,
      title: `${label} · World`,
      summary: `World Bank indicator ${indicator}`,
      observedAt: iso(`${String(latest.date ?? new Date().getUTCFullYear())}-12-31`),
      releasedAt: null,
      latitude: null,
      longitude: null,
      countryCodes: [],
      actors: [],
      affectedSystems: [system,'economy'],
      payload: { indicator, value: finite(latest.value), date: latest.date, sourceRole: 'OFFICIAL_STATISTICAL_SOURCE', independentlyVerified: null },
      sourceUrl: `https://api.worldbank.org/v2/country/WLD/indicator/${indicator}`,
      confidence: 0.90,
    } satisfies NormalizedObservation;
  }));
  return settled.flatMap((result) => result.status === 'fulfilled' && result.value ? [result.value] : []);
}

function firstArray(value: unknown): Row[] {
  const data = row(value);
  for (const key of ['items','events','signals','threats','outbreaks','anomalies','disasters','papers','repos','quotes','flows','advisories','outages','attacks','restrictions','tenders','flights','observations','results','data']) {
    const candidate = rows(data[key]);
    if (candidate.length) return candidate;
  }
  for (const candidate of Object.values(data)) {
    const direct = rows(candidate);
    if (direct.length) return direct;
    const nested = row(candidate);
    for (const nestedValue of Object.values(nested)) {
      const nestedRows = rows(nestedValue);
      if (nestedRows.length) return nestedRows;
    }
  }
  return Object.keys(data).length ? [data] : [];
}

function nestedCoordinate(item: Row, names: string[]) {
  for (const name of names) {
    const direct = finite(item[name]);
    if (direct !== null) return direct;
  }
  const location = row(item.location);
  for (const name of names) {
    const nested = finite(location[name]);
    if (nested !== null) return nested;
  }
  return null;
}

function genericTitle(item: Row) {
  return valueText(item.title) ?? valueText(item.headline) ?? valueText(item.name) ?? valueText(item.eventName) ?? valueText(item.indicator) ?? valueText(item.symbol) ?? valueText(item.id) ?? null;
}

function genericSummary(item: Row) {
  return valueText(item.summary) ?? valueText(item.description) ?? valueText(item.details) ?? valueText(item.message) ?? valueText(item.status) ?? valueText(item.category) ?? null;
}

function genericDate(item: Row) {
  for (const key of ['observedAt','publishedAt','occurredAt','timestamp','date','updatedAt','firstSeenAt','lastSeenAt','createdAt','time']) {
    const parsed = iso(item[key]);
    if (parsed) return parsed;
  }
  return null;
}

async function collectWorldMonitor(): Promise<NormalizedObservation[]> {
  const apiKey = process.env.WORLDMONITOR_API_KEY;
  if (!apiKey) throw new Error('WORLDMONITOR_API_KEY_MISSING');
  const baseUrl = process.env.WORLDMONITOR_BASE_URL || 'https://api.worldmonitor.app';
  const settled = await Promise.allSettled(WORLDMONITOR_ENDPOINTS.map(async (definition) => {
    const payload = await fetchJson(`${baseUrl}${definition.path}`, { 'X-WorldMonitor-Key': apiKey });
    return firstArray(payload).slice(0, definition.maxItems ?? 100).flatMap((item, index) => {
      const title = genericTitle(item);
      if (!title) return [];
      const sourceUrl = valueText(item.url) ?? valueText(item.link) ?? valueText(item.sourceUrl) ?? valueText(item.articleUrl);
      const publisher = valueText(item.publisher) ?? valueText(item.source) ?? 'WorldMonitor aggregated source';
      const country = valueText(item.countryCode) ?? valueText(item.country);
      const actor = valueText(item.actor) ?? valueText(item.organization) ?? valueText(item.entity);
      return [{
        sourceId: definition.sourceId,
        sourceFamily: definition.sourceFamily,
        publisher,
        observationKind: definition.observationKind,
        externalId: valueText(item.id) ?? sourceUrl ?? `${definition.sourceId}:${index}:${hash(item).slice(0, 20)}`,
        title,
        summary: genericSummary(item),
        observedAt: genericDate(item) ?? new Date().toISOString(),
        releasedAt: genericDate(item),
        latitude: nestedCoordinate(item, ['latitude','lat']),
        longitude: nestedCoordinate(item, ['longitude','lng','lon']),
        countryCodes: country ? [country] : [],
        actors: actor ? [actor] : [],
        affectedSystems: definition.affectedSystems,
        payload: { endpoint: definition.path, provider: 'WorldMonitor', sourceRole: 'AGGREGATED_EXTERNAL_SOURCE', independentlyVerified: false, item },
        sourceUrl,
        confidence: definition.confidence,
      } satisfies NormalizedObservation];
    });
  }));
  const observations = settled.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
  const failures = settled.filter((result) => result.status === 'rejected').length;
  if (!observations.length && failures) throw new Error(`WORLDMONITOR_ALL_ENDPOINTS_FAILED:${failures}`);
  return observations;
}

function deriveReading(observation: NormalizedObservation): FrictionReading {
  const now = Date.now();
  const observed = observation.observedAt ? new Date(observation.observedAt).getTime() : now;
  const ageHours = Math.max(0, (now - observed) / 3_600_000);
  const interactionDensity = clamp01((observation.affectedSystems.length + observation.actors.length) / 10);
  const sourceTrust = clamp01(observation.confidence);
  const ldi = calculateLdiFromAge(ageHours, 168);
  const measuredMagnitude = finite(observation.payload.magnitude);
  const measurementContribution = measuredMagnitude === null ? 0 : clamp01(Math.abs(measuredMagnitude) / 8);
  const ihg = clamp01(0.25 + sourceTrust * 0.35 + interactionDensity * 0.25 + measurementContribution * 0.15);
  const nti = clamp01(interactionDensity * 0.7 + (1 - ldi) * 0.3);
  const metrics = evaluateSfi({ ihg, nti, ldi, xi: 0.03 });
  return {
    ...metrics,
    tension: { status: 'UNDETERMINED_PENDING_GOVERNED_AI', sourceRecordOnly: true },
    painMap: { status: 'UNDETERMINED_PENDING_GOVERNED_AI', affectedSystemsRecordedByCollector: observation.affectedSystems, actorsRecordedByCollector: observation.actors },
    fieldDrivers: { status: 'SOURCE_METADATA_ONLY', observationKind: observation.observationKind, sourceFamily: observation.sourceFamily },
    permissions: { observationAllowed: true, comparisonAllowed: true, independentVerificationAllowed: true, interventionAllowed: false },
    trajectory: { status: 'UNDETERMINED_PENDING_GOVERNED_AI' },
    minimumViablePerturbation: { status: 'NOT_PROPOSED', reason: 'Perturbation requires a traceable hypothesis and governance.' },
  };
}

export async function runWorldObservationCycle() {
  const collectors = [collectUsgs, collectEonet, collectGdacs, collectFaa, collectPublicMedia, collectGdelt, collectHackerNews, collectWorldBank, collectWorldMonitor];
  const settled = await Promise.allSettled(collectors.map((collector) => collector()));
  const observations = settled.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
  const failures = settled.flatMap((result, index) => result.status === 'rejected' ? [{ collector: collectors[index].name, error: String(result.reason) }] : []);
  const db = createServiceSupabaseClient();
  let persisted = 0;
  const sourceCounts: Record<string, number> = {};

  for (const observation of observations) {
    const rawHash = hash(observation.payload);
    const { data, error } = await db.from('world_source_observations').upsert({
      source_id: observation.sourceId,
      source_family: observation.sourceFamily,
      publisher: observation.publisher,
      observation_kind: observation.observationKind,
      external_id: observation.externalId,
      title: observation.title,
      summary: observation.summary,
      observed_at: observation.observedAt,
      released_at: observation.releasedAt,
      latitude: observation.latitude,
      longitude: observation.longitude,
      country_codes: observation.countryCodes,
      actors: observation.actors,
      affected_systems: observation.affectedSystems,
      payload: observation.payload,
      raw_hash: rawHash,
      source_url: observation.sourceUrl,
      collector_version: WORLD_COLLECTOR_VERSION,
      confidence: observation.confidence,
    }, { onConflict: 'source_id,external_id,raw_hash' }).select('id').single();
    if (error || !data) continue;
    const reading = deriveReading(observation);
    await db.from('world_friction_readings').upsert({
      observation_id: data.id,
      methodology_version: WORLD_METHODOLOGY_VERSION,
      systemic_friction: reading.fs,
      interaction_density: reading.nti,
      friction_gradient: clamp01(reading.fs * (1 - reading.ldi)),
      systemic_coherence: reading.phi,
      tension: reading.tension,
      pain_map: reading.painMap,
      field_drivers: reading.fieldDrivers,
      permissions: reading.permissions,
      trajectory: reading.trajectory,
      minimum_viable_perturbation: reading.minimumViablePerturbation,
    }, { onConflict: 'observation_id,methodology_version' });
    sourceCounts[observation.sourceId] = (sourceCounts[observation.sourceId] ?? 0) + 1;
    persisted += 1;
  }

  return {
    ok: failures.length < collectors.length,
    observed: observations.length,
    persisted,
    sourceCounts,
    activeSourceCount: Object.keys(sourceCounts).length,
    failures,
    generatedAt: new Date().toISOString(),
    epistemicBoundary: 'Collectors persist source records. Numeric SFI metrics are derived descriptors. Tension, mechanism, trajectory and consequences remain undetermined until governed AI creates a traceable hypothesis.',
  };
}

function parseCalibration(value: string) {
  try {
    const clean = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = row(JSON.parse(clean));
    const classification = valueText(parsed.classification, 80)?.toUpperCase();
    if (!['VALIDATED','PARTIALLY_VALIDATED','CONTRADICTED','INCONCLUSIVE'].includes(classification ?? '')) return null;
    const rawConfidence = Number(parsed.confidenceAfter);
    return {
      classification: classification as 'VALIDATED' | 'PARTIALLY_VALIDATED' | 'CONTRADICTED' | 'INCONCLUSIVE',
      reason: valueText(parsed.reason, 6000) ?? 'No reason supplied.',
      supportingEvidenceIds: strings(parsed.supportingEvidenceIds, 100),
      contradictingEvidenceIds: strings(parsed.contradictingEvidenceIds, 100),
      retainedAssumptions: strings(parsed.retainedAssumptions, 40),
      rejectedAssumptions: strings(parsed.rejectedAssumptions, 40),
      missingVariables: strings(parsed.missingVariables, 40),
      graphAdjustments: Array.isArray(parsed.graphAdjustments) ? parsed.graphAdjustments.slice(0, 30) : [],
      mechanismAssessment: valueText(parsed.mechanismAssessment, 5000),
      confidenceAfter: Number.isFinite(rawConfidence) ? clamp01(rawConfidence > 1 ? rawConfidence / 100 : rawConfidence) : null,
    };
  } catch {
    return null;
  }
}

export async function runWorldCalibrationCycle() {
  const db = createServiceSupabaseClient();
  const now = new Date().toISOString();
  const { data: hypotheses, error } = await db.from('world_hypotheses').select('*').in('status', ['OPEN','AWAITING_OUTCOME']).lte('validation_ends_at', now).limit(100);
  if (error) return { ok: false, calibrated: 0, error: error.message, generatedAt: now };
  let calibrated = 0;
  const warnings: string[] = [];

  for (const hypothesis of hypotheses ?? []) {
    const { data: later, error: laterError } = await db.from('world_source_observations')
      .select('id,source_id,source_family,publisher,title,summary,affected_systems,actors,observed_at,released_at,fetched_at,confidence,source_url,payload')
      .gt('fetched_at', hypothesis.cutoff_at)
      .lte('fetched_at', now)
      .order('fetched_at', { ascending: true })
      .limit(400);
    if (laterError) {
      warnings.push(`return_observation_read:${laterError.message}`);
      continue;
    }

    const evidenceRows = (later ?? []) as Row[];
    const evidenceIds = new Set(evidenceRows.map((item) => String(item.id ?? '')).filter(Boolean));
    const priorConfidence = clamp01(Number(hypothesis.current_confidence ?? hypothesis.initial_confidence ?? 0.5));
    const llm = await runLlmTask({
      task: 'deep_report',
      system: [
        'You are the governed reality-calibration engine for the System Friction Institute World Observatory.',
        'Compare a preregistered hypothesis against observations acquired AFTER its cutoff. Use only supplied material.',
        'Source reports are not automatically facts. Distinguish corroboration, contradiction, missing variables and source dependence.',
        'Do not classify VALIDATED merely because keywords repeat. Evaluate the predicted mechanism, affected nodes/systems, timing, expected signals and contradiction signals.',
        'Return INCONCLUSIVE when evidence cannot discriminate the hypothesis from rivals.',
        'Return ONLY JSON: {"classification":"VALIDATED|PARTIALLY_VALIDATED|CONTRADICTED|INCONCLUSIVE","reason":string,"supportingEvidenceIds":string[],"contradictingEvidenceIds":string[],"retainedAssumptions":string[],"rejectedAssumptions":string[],"missingVariables":string[],"graphAdjustments":array,"mechanismAssessment":string|null,"confidenceAfter":number|null}.',
      ].join('\n'),
      prompt: JSON.stringify({
        hypothesis: {
          id: hypothesis.id,
          statement: hypothesis.statement,
          graphSnapshot: hypothesis.graph_snapshot,
          predictedTrajectory: hypothesis.predicted_trajectory,
          expectedSignals: hypothesis.expected_signals,
          contradictionSignals: hypothesis.contradiction_signals,
          cutoffAt: hypothesis.cutoff_at,
          validationEndsAt: hypothesis.validation_ends_at,
          priorConfidence,
        },
        laterObservations: evidenceRows.map((item) => ({
          id: item.id,
          sourceId: item.source_id,
          sourceFamily: item.source_family,
          publisher: item.publisher,
          title: item.title,
          summary: item.summary,
          affectedSystems: item.affected_systems,
          actors: item.actors,
          observedAt: item.observed_at,
          fetchedAt: item.fetched_at,
          sourceConfidence: item.confidence,
          sourceUrl: item.source_url,
          payload: item.payload,
        })),
        epistemicBoundary: 'All laterObservations are persisted source records; the requested classification is DERIVED/INFERRED calibration, not truth.',
      }).slice(0, 50000),
      fallbackResult: '{"classification":"INCONCLUSIVE","reason":"No governed model produced a valid calibration.","supportingEvidenceIds":[],"contradictingEvidenceIds":[],"retainedAssumptions":[],"rejectedAssumptions":[],"missingVariables":["governed_model_unavailable"],"graphAdjustments":[],"mechanismAssessment":null,"confidenceAfter":null}',
      requirements: { reasoning: true, structuredOutput: true, priority: 'quality' },
      maxTokens: 2200,
    });

    const parsed = llm.ok ? parseCalibration(llm.result) : null;
    const calibration = parsed ?? {
      classification: 'INCONCLUSIVE' as const,
      reason: llm.ok ? 'AI calibration schema invalid.' : 'Governed model unavailable.',
      supportingEvidenceIds: [] as string[],
      contradictingEvidenceIds: [] as string[],
      retainedAssumptions: [] as string[],
      rejectedAssumptions: [] as string[],
      missingVariables: ['governed_calibration_unavailable'],
      graphAdjustments: [] as unknown[],
      mechanismAssessment: null as string | null,
      confidenceAfter: null as number | null,
    };
    const supporting = calibration.supportingEvidenceIds.filter((id) => evidenceIds.has(id));
    const contradicting = calibration.contradictingEvidenceIds.filter((id) => evidenceIds.has(id));
    const linked = [...new Set([...supporting, ...contradicting])];
    const after = calibration.confidenceAfter ?? priorConfidence;
    const directionalAccuracy = calibration.classification === 'VALIDATED' ? 1 : calibration.classification === 'PARTIALLY_VALIDATED' ? 0.6 : calibration.classification === 'CONTRADICTED' ? 0 : null;
    const sourceCoverage = evidenceRows.length ? linked.length / evidenceRows.length : 0;

    const { data: outcome, error: outcomeError } = await db.from('world_hypothesis_outcomes').upsert({
      hypothesis_id: hypothesis.id,
      classification: calibration.classification,
      observed_outcome: calibration.reason,
      directional_accuracy: directionalAccuracy,
      temporal_accuracy: evidenceRows.length ? 1 : null,
      actor_accuracy: null,
      mechanism_accuracy: calibration.classification === 'INCONCLUSIVE' ? null : after,
      source_coverage: sourceCoverage,
      evidence_ids: linked,
      evaluator_version: WORLD_METHODOLOGY_VERSION,
    }, { onConflict: 'hypothesis_id' }).select('id').single();
    if (outcomeError || !outcome) {
      warnings.push(`outcome_write:${outcomeError?.message ?? 'unknown'}`);
      continue;
    }

    if (calibration.classification !== 'INCONCLUSIVE' && linked.length > 0) {
      await db.from('world_learning_events').insert({
        hypothesis_id: hypothesis.id,
        outcome_id: outcome.id,
        retained_assumptions: calibration.retainedAssumptions,
        rejected_assumptions: calibration.rejectedAssumptions,
        missing_variables: calibration.missingVariables,
        graph_adjustments: calibration.graphAdjustments,
        confidence_before: priorConfidence,
        confidence_after: after,
      });
    }
    await db.from('world_hypotheses').update({ status: calibration.classification, current_confidence: after }).eq('id', hypothesis.id);
    calibrated += 1;
  }

  return {
    ok: warnings.length === 0,
    calibrated,
    warnings: [...new Set(warnings)].slice(0, 20),
    generatedAt: now,
    rule: 'Calibration is governed AI comparison against post-cutoff persisted source records. Keyword overlap alone cannot validate a hypothesis.',
  };
}
