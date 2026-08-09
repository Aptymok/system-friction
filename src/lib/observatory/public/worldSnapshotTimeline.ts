import 'server-only';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

type Row = Record<string, unknown>;
type DomainDefinition = { id: string; label: string; domains: string[] };

const HORIZON_DAYS = 90;
const PAGE_SIZE = 250;

const VECTOR_DEFINITIONS: DomainDefinition[] = [
  { id: 'cultural', label: 'Cultural', domains: ['CULTURAL'] },
  { id: 'memetic', label: 'Memético', domains: ['MEMETIC'] },
  { id: 'affective', label: 'Afectivo', domains: ['AFFECTIVE'] },
  { id: 'tech', label: 'Tecnológico', domains: ['TECH'] },
  { id: 'geo-digital', label: 'Geodigital', domains: ['GEO_DIGITAL'] },
  { id: 'economy', label: 'Económico', domains: ['ECONOMY'] },
  { id: 'geopolitical', label: 'Geopolítico', domains: ['GEOPOLITICAL'] },
  { id: 'institutional', label: 'Institucional', domains: ['INSTITUTIONAL'] },
  { id: 'climate', label: 'Climático', domains: ['CLIMATE'] },
  { id: 'bio', label: 'Biológico', domains: ['BIO'] },
];

const KNOWN_DOMAINS = new Set(VECTOR_DEFINITIONS.flatMap((item) => item.domains));

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function numeric(value: unknown): number | null {
  if (value === null || typeof value === 'undefined' || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalize(value: unknown): number | null {
  const parsed = numeric(value);
  if (parsed === null) return null;
  return Math.max(0, Math.min(1, parsed > 1 ? parsed / 100 : parsed));
}

function sourceDomain(source: Row) {
  const explicit = text(source.domain ?? source.mihm_var).toUpperCase().replace(/[\s-]+/g, '_');
  if (KNOWN_DOMAINS.has(explicit)) return explicit;
  const key = text(source.key).toLowerCase();
  if (key.startsWith('cultural_')) return 'CULTURAL';
  if (key.startsWith('memetic_')) return 'MEMETIC';
  if (key.startsWith('affective_')) return 'AFFECTIVE';
  if (key.startsWith('tech_')) return 'TECH';
  if (key.startsWith('geo_digital_')) return 'GEO_DIGITAL';
  if (key.startsWith('economy_')) return 'ECONOMY';
  if (key.startsWith('geopolitical_')) return 'GEOPOLITICAL';
  if (key.startsWith('institutional_')) return 'INSTITUTIONAL';
  if (key.startsWith('climate_')) return 'CLIMATE';
  if (key.startsWith('bio_')) return 'BIO';
  return null;
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function vectorAt(snapshotSources: Row[], definition: DomainDefinition) {
  const matching = snapshotSources.filter((source) => {
    const domain = sourceDomain(source);
    return domain !== null && definition.domains.includes(domain) && source.simulated !== true && !text(source.error);
  });
  const values = matching.map((source) => normalize(source.value)).filter((value): value is number => value !== null);
  const trusts = matching.map((source) => normalize(source.trust ?? source.confidence)).filter((value): value is number => value !== null);
  return {
    id: definition.id,
    label: definition.label,
    value: average(values),
    sourceCount: values.length,
    trust: average(trusts),
  };
}

export type PublicWorldTemporalFrame = {
  observedAt: string;
  wsi: number | null;
  nti: number | null;
  confidence: number | null;
  sourceState: string;
  ingestMode: string;
  vectors: Array<{ id: string; label: string; value: number | null; sourceCount: number; trust: number | null }>;
};

export async function readPublicWorldSnapshotTimeline() {
  const db = createServiceSupabaseClient();
  const since = new Date(Date.now() - HORIZON_DAYS * 86400000).toISOString();
  const snapshots: Row[] = [];
  let from = 0;

  for (;;) {
    const result = await db.from('worldspect_snapshots')
      .select('observed_at,created_at,source_state,confidence,wsi,nti,ingest_mode,sources')
      .gte('observed_at', since)
      .order('observed_at', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (result.error) throw new Error(`worldspect_public_timeline_failed:${result.error.message}`);
    const page = rows(result.data);
    snapshots.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  const frames: PublicWorldTemporalFrame[] = snapshots.map((snapshot) => {
    const snapshotSources = rows(snapshot.sources);
    return {
      observedAt: text(snapshot.observed_at ?? snapshot.created_at),
      wsi: normalize(snapshot.wsi),
      nti: normalize(snapshot.nti),
      confidence: normalize(snapshot.confidence),
      sourceState: text(snapshot.source_state, 'unknown'),
      ingestMode: text(snapshot.ingest_mode, 'unknown'),
      vectors: VECTOR_DEFINITIONS.map((definition) => vectorAt(snapshotSources, definition)),
    };
  }).filter((frame) => frame.observedAt);

  return {
    horizonDays: HORIZON_DAYS,
    generatedAt: new Date().toISOString(),
    frames,
    limits: [
      'Historical frames are reconstructed only from persisted WorldSpect snapshots.',
      'Vector values are aggregate readings of sources present in that snapshot; missing domains remain null.',
      'Moving the timeline changes the historical frame only; it does not rewrite the current Observatory state.',
    ],
  };
}