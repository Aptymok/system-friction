import 'server-only';

import { readObservatoryGoldState } from '@/lib/observatory/gold/observatoryGoldAdapter';
import type { ObservatoryGoldState, ObservatoryGoldTrend } from '@/lib/observatory/gold/observatoryGoldState';
import { executeAbortableQuery } from '@/lib/supabase/abortableQuery';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

const HORIZON_DAYS = 90;
const HISTORY_LIMIT = 120;
const HISTORY_TIMEOUT_MS = 6000;

const DOMAIN_LABELS: Record<string, string> = {
  CULTURAL: 'cultural',
  MEMETIC: 'memética',
  AFFECTIVE: 'afectiva',
  TECH: 'tecnológica',
  GEO_DIGITAL: 'geodigital',
  ECONOMY: 'económica',
  GEOPOLITICAL: 'geopolítica',
  INSTITUTIONAL: 'institucional',
  CLIMATE: 'climática',
  BIO: 'biológica',
};

type Row = Record<string, unknown>;

type PublicHistoryRow = {
  observedAt: string;
  createdAt: string;
  sourceState: string;
  confidence: number | null;
  wsi: number | null;
  nti: number | null;
  ingestMode: string;
  sources: Row[];
};

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function rows(value: unknown): Row[] {
  return Array.isArray(value)
    ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    : [];
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function numeric(value: unknown): number | null {
  if (value === null || typeof value === 'undefined' || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function normalize(value: unknown): number | null {
  const parsed = numeric(value);
  if (parsed === null) return null;
  return clamp01(parsed > 1 ? parsed / 100 : parsed);
}

function sourceDomain(source: Row) {
  const explicit = text(source.domain ?? source.mihm_var).toUpperCase().replace(/[\s-]+/g, '_');
  if (DOMAIN_LABELS[explicit]) return explicit;

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

  const label = `${key} ${text(source.label)}`.toLowerCase();
  if (/meme|viral|attention|narrative/.test(label)) return 'MEMETIC';
  if (/affect|sentiment|emotion|mood/.test(label)) return 'AFFECTIVE';
  if (/music|culture|artist|media/.test(label)) return 'CULTURAL';
  if (/geo.?digital|platform|network|traffic|search/.test(label)) return 'GEO_DIGITAL';
  if (/tech|ai|model|compute|software|code/.test(label)) return 'TECH';
  if (/market|econom|price|inflation|finance|gdp/.test(label)) return 'ECONOMY';
  if (/war|geopolit|border|election/.test(label)) return 'GEOPOLITICAL';
  if (/institution|governance|law|regulat/.test(label)) return 'INSTITUTIONAL';
  if (/climate|weather|carbon|temperature|water/.test(label)) return 'CLIMATE';
  if (/bio|health|medical|organism|species/.test(label)) return 'BIO';
  return null;
}

function domainValue(snapshot: PublicHistoryRow, domains: string[]) {
  const values = snapshot.sources
    .filter((source) => source.simulated !== true && !text(source.error))
    .filter((source) => {
      const domain = sourceDomain(source);
      return domain !== null && domains.includes(domain);
    })
    .map((source) => normalize(source.value))
    .filter((value): value is number => value !== null);

  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function firstAndLast(values: Array<number | null>) {
  const observed = values.filter((value): value is number => value !== null);
  return observed.length > 1 ? { first: observed[0], last: observed.at(-1) as number } : null;
}

function delta(values: Array<number | null>) {
  const pair = firstAndLast(values);
  return pair ? Number((pair.last - pair.first).toFixed(4)) : null;
}

function trendFromDelta(value: number | null): ObservatoryGoldTrend | 'unavailable' {
  if (value === null) return 'unavailable';
  if (value > 0.025) return 'up';
  if (value < -0.025) return 'down';
  return 'stable';
}

function joinSpanish(items: string[]) {
  if (!items.length) return 'ningún dominio verificable';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} y ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} y ${items.at(-1)}`;
}

function pressureBand(value: number) {
  if (value >= 0.8) return 'muy alta';
  if (value >= 0.65) return 'alta';
  if (value >= 0.45) return 'moderada';
  return 'baja';
}

function tensionMeaning(value: number) {
  if (value >= 0.78) return 'crítica';
  if (value >= 0.56) return 'alta';
  if (value >= 0.32) return 'media';
  return 'baja';
}

function metricMovement(label: string, value: number | null) {
  if (value === null) return `${label} todavía no tiene dos puntos comparables`;
  if (Math.abs(value) < 0.01) return `${label} se mantiene prácticamente estable`;
  return `${label} ${value > 0 ? 'aumentó' : 'disminuyó'} ${Math.abs(value).toFixed(3)}`;
}

function buildPlainLanguageSummary(state: ObservatoryGoldState) {
  const active = state.vectors
    .filter((vector) => vector.active)
    .sort((a, b) => b.value - a.value);
  const leaders = active.slice(0, 3);
  const leaderText = joinSpanish(leaders.map((vector) => `${vector.label.toLowerCase()} (${vector.value.toFixed(3)})`));
  const tensionLabel = tensionMeaning(state.wsv.tension);
  const confidence = state.dailyReading.confidence;
  const confidenceText = confidence === null
    ? 'La confianza de la lectura no está disponible.'
    : `La confianza observable es ${(confidence * 100).toFixed(0)}%, por lo que la lectura debe usarse como orientación del campo y no como pronóstico.`;
  const longitudinalText = state.longitudinal.sampleCount > 1
    ? `En ${state.longitudinal.sampleCount} observaciones del horizonte, ${metricMovement('el WSV', state.longitudinal.deltas.wsi)} y ${metricMovement('la tensión NTI', state.longitudinal.deltas.nti)}.`
    : 'Existe una observación actual, pero aún no hay dos puntos accesibles para comparar su trayectoria.';

  return `En lenguaje normal: un WSV de ${state.wsv.globalIndex.toFixed(3)} indica que la configuración actual del mundo presenta una persistencia elevada; no significa ${Math.round(state.wsv.globalIndex * 100)}% de bienestar ni ${Math.round(state.wsv.globalIndex * 100)}% de probabilidad de crisis. El régimen ${state.wsv.regime} corresponde a una tensión ${tensionLabel}: varias presiones relevantes coexisten sin una resolución estable. La mayor concentración observable está en las capas ${leaderText}. ${longitudinalText} ${confidenceText}`;
}

function goldDomain(domainKey: string): ObservatoryGoldState['highlightedSignals'][number]['domain'] {
  if (/TECH|DIGITAL/.test(domainKey)) return 'tec';
  if (/GEO/.test(domainKey)) return 'geo';
  if (/ECON/.test(domainKey)) return 'eco';
  if (/AFFECT|MEMETIC/.test(domainKey)) return 'soc';
  if (/INSTITUTION/.test(domainKey)) return 'pol';
  if (/BIO/.test(domainKey)) return 'bio';
  if (/CLIMATE/.test(domainKey)) return 'clima';
  return 'cultural';
}

async function readLightweightHistory(): Promise<PublicHistoryRow[]> {
  const service = createServiceSupabaseClient();
  const observedSince = new Date(Date.now() - HORIZON_DAYS * 86400000).toISOString();
  const { data, error } = await executeAbortableQuery(
    service
      .from('worldspect_snapshots')
      .select('observed_at,created_at,source_state,confidence,wsi,nti,ingest_mode,sources')
      .gte('observed_at', observedSince)
      .order('observed_at', { ascending: true })
      .limit(HISTORY_LIMIT),
    HISTORY_TIMEOUT_MS,
  );

  if (error) throw new Error(`worldspect_public_history_failed:${error.message}`);
  if (!Array.isArray(data)) return [];

  return data
    .map((item) => record(item))
    .map((item): PublicHistoryRow => ({
      observedAt: text(item.observed_at ?? item.created_at),
      createdAt: text(item.created_at),
      sourceState: text(item.source_state, 'unknown'),
      confidence: normalize(item.confidence),
      wsi: normalize(item.wsi),
      nti: normalize(item.nti),
      ingestMode: text(item.ingest_mode, 'unknown'),
      sources: rows(item.sources),
    }))
    .filter((item) => item.observedAt)
    .sort((a, b) => a.observedAt.localeCompare(b.observedAt));
}

export async function readPublicObservatoryState(): Promise<ObservatoryGoldState> {
  const [baseState, historyResult] = await Promise.all([
    readObservatoryGoldState(),
    readLightweightHistory()
      .then((history) => ({ history, error: null as string | null }))
      .catch((error) => ({
        history: [] as PublicHistoryRow[],
        error: error instanceof Error ? error.message : 'worldspect_public_history_failed',
      })),
  ]);

  let history = historyResult.history;
  if (!history.length && baseState.publicContract.observedAt) {
    history = [{
      observedAt: baseState.publicContract.observedAt,
      createdAt: baseState.generatedAt,
      sourceState: baseState.publicContract.sourceState,
      confidence: baseState.dailyReading.confidence,
      wsi: baseState.wsv.globalIndex,
      nti: baseState.wsv.tension,
      ingestMode: 'current_state_fallback',
      sources: [],
    }];
  }

  const points: ObservatoryGoldState['longitudinal']['points'] = history.map((item) => ({
    observedAt: item.observedAt,
    wsi: item.wsi,
    nti: item.nti,
    confidence: item.confidence,
    sourceState: item.sourceState,
    ingestMode: item.ingestMode,
  }));

  const vectors: ObservatoryGoldState['vectors'] = baseState.vectors.map((vector) => {
    const values = history.map((snapshot) => domainValue(snapshot, vector.domainKeys));
    const historicalDelta = delta(values);
    return {
      ...vector,
      delta: historicalDelta,
      trend: trendFromDelta(historicalDelta),
    };
  });

  const firstObservedAt = points[0]?.observedAt ?? null;
  const lastObservedAt = points.at(-1)?.observedAt ?? null;
  const longitudinal: ObservatoryGoldState['longitudinal'] = {
    horizonDays: HORIZON_DAYS,
    sampleCount: points.length,
    firstObservedAt,
    lastObservedAt,
    points,
    deltas: {
      wsi: delta(points.map((point) => point.wsi)),
      nti: delta(points.map((point) => point.nti)),
      confidence: delta(points.map((point) => point.confidence)),
    },
  };

  const stateWithHistory: ObservatoryGoldState = {
    ...baseState,
    longitudinal,
    vectors,
    highlightedSignals: vectors
      .filter((vector) => vector.active)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map((vector) => ({
        time: (vector.observedAt ?? baseState.generatedAt).slice(11, 16),
        label: `${vector.label}: presión ${pressureBand(vector.value)} · valor ${vector.value.toFixed(3)} · confianza ${vector.confidence === null ? 'n/d' : vector.confidence.toFixed(2)}`,
        domain: goldDomain(vector.domainKeys[0] ?? ''),
        intensity: vector.value,
      })),
    timeline: points.slice(-8).map((point, index, list) => ({
      time: point.observedAt.slice(5, 10),
      title: point.sourceState.toUpperCase(),
      description: `WSV ${point.wsi === null ? 'n/d' : point.wsi.toFixed(2)} · NTI ${point.nti === null ? 'n/d' : point.nti.toFixed(2)} · confianza ${point.confidence === null ? 'n/d' : point.confidence.toFixed(2)}`,
      active: index === list.length - 1,
    })),
    provenance: {
      ...baseState.provenance,
      basedOn: Array.from(new Set([...baseState.provenance.basedOn, 'worldspect_snapshots:lightweight_public_history'])),
      degradedSources: historyResult.error
        ? Array.from(new Set([...baseState.provenance.degradedSources, 'worldspect_public_history']))
        : baseState.provenance.degradedSources.filter((item) => item !== 'getRecentWorldSpectSnapshots'),
      limits: Array.from(new Set([
        ...baseState.provenance.limits.filter((item) => item !== 'worldspect_recent_snapshots_unavailable'),
        ...(historyResult.error ? [`La serie longitudinal no pudo recuperarse en esta ejecución: ${historyResult.error}`] : []),
      ])),
    },
  };

  const plainSummary = buildPlainLanguageSummary(stateWithHistory);
  const evidence = stateWithHistory.dailyReading.evidence
    .filter((item) => !item.includes('observaciones persistidas dentro de'));

  return {
    ...stateWithHistory,
    explanation: {
      ...stateWithHistory.explanation,
      title: 'EN LENGUAJE NORMAL',
      body: plainSummary,
    },
    dailyReading: {
      ...stateWithHistory.dailyReading,
      title: stateWithHistory.vectors
        .filter((vector) => vector.active)
        .sort((a, b) => b.value - a.value)[0]
        ? `${stateWithHistory.vectors.filter((vector) => vector.active).sort((a, b) => b.value - a.value)[0].label} concentra la mayor presión observable`
        : stateWithHistory.dailyReading.title,
      summary: /Contexto externo disponible|Presiones:|value=|sources=/.test(stateWithHistory.dailyReading.summary)
        ? plainSummary
        : stateWithHistory.dailyReading.summary,
      evidenceCount: stateWithHistory.vectors.reduce((sum, vector) => sum + vector.sourceCount, 0) + longitudinal.sampleCount,
      evidence: [
        ...evidence,
        `${longitudinal.sampleCount} observaciones recuperadas mediante consulta longitudinal ligera dentro de ${HORIZON_DAYS} días`,
      ],
      limits: stateWithHistory.provenance.limits,
    },
  };
}
