import { buildWorldInterpretation } from '@/lib/sfi/observatory/worldInterpretation';
import { buildSfiWorldInterfaceState } from '@/lib/sfi/worldInterfaceState';
import { getRecentWorldSpectSnapshots } from '@/lib/worldspect/snapshotStore';
import { buildWorldSpectState } from '@/lib/worldspect/worldspectStateBuilder';
import { readWorldSpectVectorSnapshot } from '@/lib/worldspect/vector-store';
import type { ObservatoryGoldState, ObservatoryGoldTrend } from './observatoryGoldState';
import { buildObservatoryGoldDegradedState } from './observatoryGoldDegradedState';
import { clamp01 } from '@/components/observatory/gold/visual/worldMapProjection';

type Row = Record<string, unknown>;

type VectorDefinition = {
  id: string;
  label: string;
  domains: string[];
};

const PUBLIC_HORIZON_DAYS = 90;

const VECTOR_DEFINITIONS: VectorDefinition[] = [
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

const DOMAIN_LABELS: Record<string, string> = {
  CULTURAL: 'Cultural',
  MEMETIC: 'Memético',
  AFFECTIVE: 'Afectivo',
  TECH: 'Tecnológico',
  GEO_DIGITAL: 'Geodigital',
  ECONOMY: 'Económico',
  GEOPOLITICAL: 'Geopolítico',
  INSTITUTIONAL: 'Institucional',
  CLIMATE: 'Climático',
  BIO: 'Biológico',
};

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function rows(value: unknown): Row[] {
  return Array.isArray(value)
    ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    : [];
}

function str(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function numeric(value: unknown): number | null {
  if (value === null || typeof value === 'undefined' || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeNullable(value: unknown): number | null {
  const parsed = numeric(value);
  if (parsed === null) return null;
  return clamp01(parsed > 1 ? parsed / 100 : parsed);
}

function normalize(value: unknown, fallback = 0) {
  return normalizeNullable(value) ?? clamp01(fallback);
}

function average(values: number[]) {
  const valid = values.filter((value) => Number.isFinite(value));
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : 0;
}

function averageNullable(values: Array<number | null>) {
  const valid = values.filter((value): value is number => value !== null && Number.isFinite(value));
  return valid.length ? average(valid) : null;
}

function round(value: number, digits = 3) {
  return Number(clamp01(value).toFixed(digits));
}

function roundSigned(value: number, digits = 4) {
  return Number(value.toFixed(digits));
}

function deltaBetween(first: number | null, last: number | null) {
  return first === null || last === null ? null : roundSigned(last - first);
}

function trendFromDelta(delta: number | null): ObservatoryGoldTrend | 'unavailable' {
  if (delta === null) return 'unavailable';
  if (delta > 0.025) return 'up';
  if (delta < -0.025) return 'down';
  return 'stable';
}

async function withSourceTimeout<T>(source: string, promise: Promise<T>, ms = 4200): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${source}_timeout_${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function sourceDomain(source: Row) {
  const explicit = str(source.mihm_var).toUpperCase().replace(/[\s-]+/g, '_');
  if (DOMAIN_LABELS[explicit]) return explicit;

  const key = str(source.key).toLowerCase();
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

  const text = `${key} ${str(source.label)}`.toLowerCase();
  if (/meme|viral|attention|narrative/.test(text)) return 'MEMETIC';
  if (/affect|sentiment|emotion|mood/.test(text)) return 'AFFECTIVE';
  if (/music|culture|artist|media/.test(text)) return 'CULTURAL';
  if (/geo.?digital|platform|network|traffic|search/.test(text)) return 'GEO_DIGITAL';
  if (/tech|ai|model|compute|software|code/.test(text)) return 'TECH';
  if (/market|econom|price|inflation|finance|gdp/.test(text)) return 'ECONOMY';
  if (/war|geopolit|border|election/.test(text)) return 'GEOPOLITICAL';
  if (/institution|governance|law|regulat/.test(text)) return 'INSTITUTIONAL';
  if (/climate|weather|carbon|temperature|water/.test(text)) return 'CLIMATE';
  if (/bio|health|medical|organism|species/.test(text)) return 'BIO';
  return 'INSTITUTIONAL';
}

function usableSources(value: unknown) {
  return rows(value).filter((source) => (
    normalizeNullable(source.value) !== null
    && source.simulated !== true
    && !str(source.error)
  ));
}

function snapshotDomainValue(snapshot: Row, domains: string[]) {
  const values = usableSources(snapshot.sources)
    .filter((source) => domains.includes(sourceDomain(source)))
    .map((source) => normalizeNullable(source.value))
    .filter((value): value is number => value !== null);
  return values.length ? round(average(values), 4) : null;
}

function currentVectorRows(vectors: Row[], domains: string[]) {
  return vectors.filter((vector) => domains.includes(str(vector.domain).toUpperCase()) && (numeric(vector.source_count) ?? 0) > 0);
}

function aggregateCurrentVector(vectors: Row[], domains: string[]) {
  const active = currentVectorRows(vectors, domains);
  const sourceCount = active.reduce((sum, vector) => sum + (numeric(vector.source_count) ?? 0), 0);
  return {
    value: active.length ? round(average(active.map((vector) => normalize(vector.value))), 4) : 0,
    persistence: averageNullable(active.map((vector) => normalizeNullable(vector.persistence))),
    volatility: averageNullable(active.map((vector) => normalizeNullable(vector.volatility))),
    trust: averageNullable(active.map((vector) => normalizeNullable(vector.trust))),
    confidence: averageNullable(active.map((vector) => normalizeNullable(vector.trust))),
    sourceCount,
    observedAt: active.map((vector) => str(vector.observed_at)).filter(Boolean).sort().at(-1) ?? null,
    sourceState: active.length ? 'observed' : 'missing',
  };
}

function stabilityFromTension(tension: number): ObservatoryGoldState['dailyReading']['stability'] {
  if (tension >= 0.78) return 'crítica';
  if (tension >= 0.56) return 'baja';
  if (tension >= 0.32) return 'media';
  return 'alta';
}

function titleFromPressure(value: string) {
  const clean = value.split(':').slice(0, 2).join(' / ').replace(/_/g, ' ').trim();
  return clean || 'Lectura WorldSpect';
}

function signalLabel(value: string) {
  return value
    .replace(/value=[0-9.]+/g, '')
    .replace(/trust=[0-9.]+/g, '')
    .replace(/active=[0-9/]+/g, '')
    .replace(/sources=/g, 'fuentes ')
    .replace(/:/g, ' · ')
    .trim();
}

function goldDomain(value: string): ObservatoryGoldState['highlightedSignals'][number]['domain'] {
  const domain = value.toUpperCase();
  if (/TECH|DIGITAL/.test(domain)) return 'tec';
  if (/GEO/.test(domain)) return 'geo';
  if (/ECON/.test(domain)) return 'eco';
  if (/AFFECT|MEMETIC/.test(domain)) return 'soc';
  if (/INSTITUTION/.test(domain)) return 'pol';
  if (/BIO/.test(domain)) return 'bio';
  if (/CLIMATE/.test(domain)) return 'clima';
  return 'cultural';
}

function buildLongitudinalPoints(snapshots: Row[]): ObservatoryGoldState['longitudinal']['points'] {
  return snapshots
    .map((snapshot) => ({
      observedAt: str(snapshot.observed_at ?? snapshot.created_at),
      wsi: normalizeNullable(snapshot.wsi),
      nti: normalizeNullable(snapshot.nti),
      confidence: normalizeNullable(snapshot.confidence),
      sourceState: str(snapshot.source_state, 'unknown'),
      ingestMode: str(snapshot.ingest_mode, 'unknown'),
    }))
    .filter((point) => point.observedAt)
    .sort((a, b) => a.observedAt.localeCompare(b.observedAt));
}

function buildTimeline(points: ObservatoryGoldState['longitudinal']['points']) {
  return points.slice(-8).map((point, index, list) => ({
    time: point.observedAt.slice(5, 10),
    title: point.sourceState.toUpperCase(),
    description: `WSV ${point.wsi === null ? 'n/d' : point.wsi.toFixed(2)} · NTI ${point.nti === null ? 'n/d' : point.nti.toFixed(2)} · confianza ${point.confidence === null ? 'n/d' : point.confidence.toFixed(2)}`,
    active: index === list.length - 1,
  }));
}

export async function readObservatoryGoldState(): Promise<ObservatoryGoldState> {
  const generatedAt = new Date().toISOString();
  const degradedSources: string[] = [];
  const limits: string[] = [];

  try {
    const [worldInterface, worldSpect, vectorResult, recentSnapshots] = await Promise.all([
      withSourceTimeout('buildSfiWorldInterfaceState', buildSfiWorldInterfaceState()).catch((error) => {
        degradedSources.push('buildSfiWorldInterfaceState');
        limits.push(error instanceof Error ? error.message : 'buildSfiWorldInterfaceState_failed');
        return null;
      }),
      withSourceTimeout('buildWorldSpectState', buildWorldSpectState()).catch((error) => {
        degradedSources.push('buildWorldSpectState');
        limits.push(error instanceof Error ? error.message : 'buildWorldSpectState_failed');
        return null;
      }),
      withSourceTimeout('readWorldSpectVectorSnapshot', readWorldSpectVectorSnapshot()).catch((error) => {
        degradedSources.push('readWorldSpectVectorSnapshot');
        limits.push(error instanceof Error ? error.message : 'readWorldSpectVectorSnapshot_failed');
        return null;
      }),
      withSourceTimeout('getRecentWorldSpectSnapshots', getRecentWorldSpectSnapshots({ days: PUBLIC_HORIZON_DAYS, limit: 120 })).catch((error) => {
        degradedSources.push('getRecentWorldSpectSnapshots');
        limits.push(error instanceof Error ? error.message : 'getRecentWorldSpectSnapshots_failed');
        return [];
      }),
    ]);

    const interpretation = worldInterface
      ? await withSourceTimeout('buildWorldInterpretation', buildWorldInterpretation(worldInterface), 4800).catch((error) => {
          degradedSources.push('buildWorldInterpretation');
          limits.push(error instanceof Error ? error.message : 'buildWorldInterpretation_failed');
          return null;
        })
      : null;

    const snapshot = record(vectorResult?.snapshot);
    const vectorsRaw = rows(snapshot.vectors);
    const activeVectorsRaw = vectorsRaw.filter((vector) => (numeric(vector.source_count) ?? 0) > 0);
    const snapshots = recentSnapshots.map((item) => record(item));
    const longitudinalPoints = buildLongitudinalPoints(snapshots);
    const firstPoint = longitudinalPoints[0] ?? null;
    const lastPoint = longitudinalPoints.at(-1) ?? null;

    const globalIndex = round(normalize(worldInterface?.coreIndicators.wsv.value ?? snapshot.wsi), 3);
    const coherence = round(normalize(worldInterface?.coreIndicators.ihg.value ?? worldSpect?.confidence), 3);
    const resilience = round(average([
      normalize(snapshot.sourceCoverage),
      normalize(worldSpect?.confidence),
      1 - normalize(snapshot.nti),
    ]), 3);
    const alignment = round(average([globalIndex, coherence, resilience]), 3);
    const tension = round(normalize(worldInterface?.coreIndicators.nti.value ?? snapshot.nti), 3);
    const regime = str(snapshot.regime, tension >= 0.7 ? 'CRITICAL' : tension >= 0.42 ? 'TENSION' : 'LOW');

    if (!worldInterface) degradedSources.push('sfi_world_interface_state');
    if (!worldSpect || worldSpect.source_state !== 'observed') degradedSources.push('worldspect_state');
    if (!vectorResult || vectorResult.status !== 'ACTIVE') {
      degradedSources.push('worldspect_vector_snapshot');
      limits.push('worldspect vector snapshot inactive or bootstrapped');
    }
    if (!longitudinalPoints.length) limits.push('worldspect_recent_snapshots_unavailable');

    limits.push('regional or geographic claims are not displayed without source-level regional metadata');
    limits.push('the daily reading is an institutional interpretation of observed signals, not a forecast');

    const vectors: ObservatoryGoldState['vectors'] = VECTOR_DEFINITIONS.map((definition) => {
      const current = aggregateCurrentVector(vectorsRaw, definition.domains);
      const history = snapshots
        .map((item) => ({ observedAt: str(item.observed_at ?? item.created_at), value: snapshotDomainValue(item, definition.domains) }))
        .filter((item): item is { observedAt: string; value: number } => Boolean(item.observedAt) && item.value !== null);
      const delta = history.length > 1 ? deltaBetween(history[0].value, history.at(-1)?.value ?? null) : null;
      return {
        id: definition.id,
        label: definition.label,
        domainKeys: definition.domains,
        active: current.sourceCount > 0,
        value: current.value,
        persistence: current.persistence === null ? null : round(current.persistence, 4),
        volatility: current.volatility === null ? null : round(current.volatility, 4),
        trust: current.trust === null ? null : round(current.trust, 4),
        confidence: current.confidence === null ? null : round(current.confidence, 4),
        sourceCount: current.sourceCount,
        observedAt: current.observedAt,
        sourceState: current.sourceState,
        delta,
        trend: trendFromDelta(delta),
      };
    });

    const pressures = worldSpect?.dominant_external_pressures ?? [];
    const pressureSignals = pressures.slice(0, 5).map((pressure, index) => {
      const domain = pressure.split(':')[0] ?? 'WORLD';
      const match = pressure.match(/value=([0-9.]+)/);
      return {
        time: generatedAt.slice(11, 16),
        label: signalLabel(pressure) || titleFromPressure(pressure),
        domain: goldDomain(domain),
        intensity: round(normalize(match?.[1] ?? activeVectorsRaw[index]?.value), 3),
      };
    });

    const fallbackSignals = vectors
      .filter((vector) => vector.active)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map((vector) => ({
        time: generatedAt.slice(11, 16),
        label: `${vector.label} · ${vector.sourceCount} fuentes observadas`,
        domain: goldDomain(vector.domainKeys[0]),
        intensity: vector.value,
      }));

    const worldTensions = activeVectorsRaw
      .map((vector) => {
        const domain = str(vector.domain).toUpperCase();
        const value = round(average([
          normalize(vector.value),
          normalize(vector.volatility),
          normalize(vector.persistence),
          1 - normalize(vector.trust),
        ]), 3);
        return { label: DOMAIN_LABELS[domain] ?? domain.replace(/_/g, ' '), value, domain };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 7)
      .map((item, index) => ({ rank: index + 1, ...item }));

    const sourceCount = vectors.reduce((sum, vector) => sum + vector.sourceCount, 0);
    const activeCount = vectors.filter((vector) => vector.active).length;
    const observedAt = str(worldSpect?.observed_at ?? snapshot.observed_at, '') || null;
    const sourceState = str(worldSpect?.source_state, vectorResult?.status === 'ACTIVE' ? 'observed' : 'degraded');
    const dailyConfidence = normalizeNullable(worldSpect?.confidence ?? snapshot.sourceCoverage);
    const dominantVector = vectors.filter((vector) => vector.active).sort((a, b) => b.value - a.value)[0] ?? null;
    const readingTitle = pressures[0]
      ? titleFromPressure(pressures[0])
      : dominantVector
        ? `${dominantVector.label} concentra la mayor presión observable`
        : 'Lectura WorldSpect';

    const evidence = [
      `${activeCount} de ${vectors.length} vectores con fuentes activas`,
      `${sourceCount} fuentes utilizables en el snapshot actual`,
      `${longitudinalPoints.length} observaciones persistidas dentro de ${PUBLIC_HORIZON_DAYS} días`,
      ...worldTensions.slice(0, 3).map((item) => `${item.label}: tensión ${item.value.toFixed(3)}`),
    ];

    const state: ObservatoryGoldState = {
      generatedAt,
      systemState: !worldInterface && !vectorResult
        ? 'offline'
        : degradedSources.length
          ? 'degraded'
          : tension >= 0.78
            ? 'critical'
            : 'nominal',
      publicContract: {
        scope: 'PUBLIC',
        institution: 'SYSTEM FRICTION INSTITUTE',
        horizonDays: PUBLIC_HORIZON_DAYS,
        sourceState,
        observedAt,
      },
      wsv: {
        globalIndex,
        coherence,
        resilience,
        alignment,
        tension,
        regime,
      },
      longitudinal: {
        horizonDays: PUBLIC_HORIZON_DAYS,
        sampleCount: longitudinalPoints.length,
        firstObservedAt: firstPoint?.observedAt ?? null,
        lastObservedAt: lastPoint?.observedAt ?? null,
        points: longitudinalPoints,
        deltas: {
          wsi: deltaBetween(firstPoint?.wsi ?? null, lastPoint?.wsi ?? null),
          nti: deltaBetween(firstPoint?.nti ?? null, lastPoint?.nti ?? null),
          confidence: deltaBetween(firstPoint?.confidence ?? null, lastPoint?.confidence ?? null),
        },
      },
      explanation: {
        title: 'QUÉ MIDE EL WORLD VECTOR',
        body: worldSpect?.relevance_to_sfi
          || 'El World Vector condensa presión, coherencia, resiliencia, alineación y tensión a partir de señales observables. La ausencia de fuente se conserva como ausencia.',
        methodologyAvailable: Boolean(observedAt || worldInterface),
      },
      highlightedSignals: pressureSignals.length ? pressureSignals : fallbackSignals,
      globalMap: {
        tensionIntensityMin: 0,
        tensionIntensityMax: 0,
        nodes: [],
        flows: [],
      },
      dailyReading: {
        date: observedAt ?? generatedAt,
        title: readingTitle,
        summary: interpretation?.text ?? worldSpect?.relevance_to_sfi ?? 'No existe una interpretación diaria con fuente suficiente.',
        tensionIndex: tension,
        stability: stabilityFromTension(tension),
        fullReadingUrl: '/world-vector',
        institution: 'SYSTEM FRICTION INSTITUTE',
        byline: 'Lectura del día · System Friction Institute',
        confidence: dailyConfidence,
        sourceState,
        evidenceCount: sourceCount + longitudinalPoints.length,
        evidence,
        limits: Array.from(new Set(limits)),
      },
      vectors,
      worldTensions,
      regionalTensions: [],
      mapFilters: {
        minimumIntensity: 0,
        tensionType: 'todas',
        region: 'todas',
      },
      timeline: buildTimeline(longitudinalPoints),
      provenance: {
        basedOn: [
          'worldspect_snapshots',
          'buildSfiWorldInterfaceState',
          'buildWorldInterpretation',
          'buildWorldSpectState',
          'readWorldSpectVectorSnapshot',
          'getRecentWorldSpectSnapshots',
        ],
        degradedSources: Array.from(new Set(degradedSources)),
        limits: Array.from(new Set(limits)),
      },
    };

    if (activeCount === 0) {
      state.provenance.limits.push('World Vector unavailable: no canonical domain has active usable sources');
    }

    return state;
  } catch (error) {
    return buildObservatoryGoldDegradedState({
      generatedAt,
      degradedSources: ['observatory_gold_adapter'],
      limits: [error instanceof Error ? error.message : 'observatory_gold_state_failed'],
    });
  }
}
