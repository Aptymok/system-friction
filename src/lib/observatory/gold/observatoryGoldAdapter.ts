import { buildWorldInterpretation } from '@/lib/sfi/observatory/worldInterpretation';
import { buildSfiWorldInterfaceState } from '@/lib/sfi/worldInterfaceState';
import { getRecentWorldSpectSnapshots } from '@/lib/worldspect/snapshotStore';
import { buildWorldSpectState } from '@/lib/worldspect/worldspectStateBuilder';
import { readWorldSpectVectorSnapshot } from '@/lib/worldspect/vector-store';
import type { ObservatoryGoldDomain, ObservatoryGoldState, ObservatoryGoldTrend } from './observatoryGoldState';
import { buildObservatoryGoldDegradedState } from './observatoryGoldDegradedState';
import { clamp01 } from '@/components/observatory/gold/visual/worldMapProjection';

type Row = Record<string, unknown>;

const DOMAIN_ANCHORS: Record<string, { lat: number; lon: number; label: string; goldDomain: ObservatoryGoldDomain }> = {
  CULTURAL: { lat: 19.43, lon: -99.13, label: 'Cultural', goldDomain: 'cultural' },
  MEMETIC: { lat: 34.05, lon: -118.24, label: 'Memetico', goldDomain: 'cultural' },
  AFFECTIVE: { lat: -23.55, lon: -46.63, label: 'Afectivo', goldDomain: 'soc' },
  TECH: { lat: 37.77, lon: -122.42, label: 'Tec', goldDomain: 'tec' },
  GEO_DIGITAL: { lat: 1.35, lon: 103.82, label: 'Geo Digital', goldDomain: 'tec' },
  ECONOMY: { lat: 40.71, lon: -74.01, label: 'Economico', goldDomain: 'eco' },
  GEOPOLITICAL: { lat: 50.45, lon: 30.52, label: 'Geopolitico', goldDomain: 'geo' },
  INSTITUTIONAL: { lat: 50.85, lon: 4.35, label: 'Politico', goldDomain: 'pol' },
  CLIMATE: { lat: 64.15, lon: -21.94, label: 'Clima', goldDomain: 'clima' },
  BIO: { lat: -1.29, lon: 36.82, label: 'Bio', goldDomain: 'bio' },
};

const VECTOR_ORDER = [
  ['cultural', 'Cultural', ['CULTURAL', 'MEMETIC', 'AFFECTIVE']],
  ['tec', 'Tec', ['TECH', 'GEO_DIGITAL']],
  ['geo', 'Geopolitico', ['GEOPOLITICAL']],
  ['ambiental', 'Ambiental', ['CLIMATE', 'BIO']],
  ['eco', 'Economico', ['ECONOMY']],
  ['clima', 'Clima', ['CLIMATE']],
  ['pol', 'Politico', ['INSTITUTIONAL']],
  ['bio', 'Bio', ['BIO']],
] as const;

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}

function str(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function num(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalize(value: unknown, fallback = 0) {
  const parsed = num(value, fallback);
  return parsed > 1 ? clamp01(parsed / 100) : clamp01(parsed);
}

function average(values: number[]) {
  const valid = values.filter((value) => Number.isFinite(value));
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : 0;
}

function round(value: number, digits = 3) {
  return Number(clamp01(value).toFixed(digits));
}

function trendFromDelta(current: number, previous: number): ObservatoryGoldTrend {
  if (current - previous > 0.035) return 'up';
  if (previous - current > 0.035) return 'down';
  return 'stable';
}

async function withSourceTimeout<T>(source: string, promise: Promise<T>, ms = 3600): Promise<T> {
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

function domainValue(vectors: Row[], domains: readonly string[]) {
  const active = vectors.filter((vector) => domains.includes(str(vector.domain).toUpperCase()) && num(vector.source_count) > 0);
  return round(average(active.map((vector) => normalize(vector.value))), 3);
}

function domainVector(vectors: Row[], domain: string) {
  return vectors.find((vector) => str(vector.domain).toUpperCase() === domain) ?? null;
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

function domainToGold(value: string): ObservatoryGoldDomain {
  const domain = value.toUpperCase();
  if (/TECH|DIGITAL|AI|DATA/.test(domain)) return 'tec';
  if (/GEO/.test(domain)) return 'geo';
  if (/ECON|MARKET|CAPITAL/.test(domain)) return 'eco';
  if (/SOC|AFFECT|MEMETIC/.test(domain)) return 'soc';
  if (/POL|INSTITUTION/.test(domain)) return 'pol';
  if (/BIO/.test(domain)) return 'bio';
  if (/CLIMATE/.test(domain)) return 'clima';
  return 'cultural';
}

function activeVectorCount(vectors: ObservatoryGoldState['vectors']) {
  return vectors.filter((vector) => vector.active).length;
}

function buildNodes(vectors: Row[]) {
  return vectors
    .filter((vector) => num(vector.source_count) > 0)
    .map((vector) => {
      const domain = str(vector.domain).toUpperCase();
      const anchor = DOMAIN_ANCHORS[domain] ?? { lat: 0, lon: 0, label: domain || 'WorldSpect', goldDomain: domainToGold(domain) };
      return {
        id: domain || str(vector.observed_at) || anchor.label,
        label: anchor.label,
        lat: anchor.lat,
        lon: anchor.lon,
        intensity: round(average([normalize(vector.value), normalize(vector.persistence), normalize(vector.trust)]), 3),
        domain,
      };
    });
}

function buildFlows(nodes: ReturnType<typeof buildNodes>) {
  return nodes
    .slice()
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, 7)
    .flatMap((node, index, list) => {
      const next = list[index + 1];
      if (!next) return [];
      return {
        fromLat: node.lat,
        fromLon: node.lon,
        toLat: next.lat,
        toLon: next.lon,
        intensity: round(average([node.intensity, next.intensity]), 3),
        domain: `${node.domain}:${next.domain}`,
      };
    });
}

function buildTimeline(generatedAt: string, pressures: string[], snapshots: Row[]) {
  const observed = snapshots
    .map((snapshot) => ({
      time: str(snapshot.observed_at).slice(11, 16) || str(snapshot.created_at).slice(11, 16),
      title: str(snapshot.source_state, 'WorldSpect'),
      description: `confidence ${normalize(snapshot.confidence).toFixed(2)} · WSI ${normalize(snapshot.wsi).toFixed(2)} · NTI ${normalize(snapshot.nti).toFixed(2)}`,
    }))
    .filter((item) => item.time)
    .slice(-5);

  const current = {
    time: generatedAt.slice(11, 16),
    title: 'Tiempo',
    description: pressures[0] ? titleFromPressure(pressures[0]) : 'Sin presion dominante confirmada',
    active: true,
  };

  return observed.length ? [...observed, current].slice(-7) : [current];
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
      withSourceTimeout('getRecentWorldSpectSnapshots', getRecentWorldSpectSnapshots({ days: 7, limit: 12 })).catch((error) => {
        degradedSources.push('getRecentWorldSpectSnapshots');
        limits.push(error instanceof Error ? error.message : 'getRecentWorldSpectSnapshots_failed');
        return [];
      }),
    ]);

    const interpretation = worldInterface
      ? await withSourceTimeout('buildWorldInterpretation', buildWorldInterpretation(worldInterface), 4200).catch((error) => {
          degradedSources.push('buildWorldInterpretation');
          limits.push(error instanceof Error ? error.message : 'buildWorldInterpretation_failed');
          return null;
        })
      : null;

    const snapshot = record(vectorResult?.snapshot);
    const vectorsRaw = rows(snapshot.vectors);
    const activeVectorsRaw = vectorsRaw.filter((vector) => num(vector.source_count) > 0);
    const globalIndex = round(normalize(worldInterface?.coreIndicators.wsv.value ?? snapshot.wsi), 3);
    const coherence = round(normalize(worldInterface?.coreIndicators.ihg.value ?? worldSpect?.confidence), 3);
    const resilience = round(average([normalize(snapshot.sourceCoverage), normalize(worldSpect?.confidence), 1 - normalize(snapshot.nti)]), 3);
    const alignment = round(average([globalIndex, coherence, resilience]), 3);
    const tension = round(normalize(worldInterface?.coreIndicators.nti.value ?? snapshot.nti), 3);

    if (!worldInterface) degradedSources.push('sfi_world_interface_state');
    if (!worldSpect || worldSpect.source_state !== 'observed') degradedSources.push('worldspect_state');
    if (!vectorResult || vectorResult.status !== 'ACTIVE') {
      degradedSources.push('worldspect_vector_snapshot');
      limits.push('worldspect vector snapshot inactive or bootstrapped');
    }
    if (!recentSnapshots.length) limits.push('worldspect_recent_snapshots_unavailable');

    const pressures = worldSpect?.dominant_external_pressures ?? [];
    const signals = pressures.slice(0, 5).map((pressure, index) => {
      const domain = pressure.split(':')[0] ?? 'WORLD';
      const match = pressure.match(/value=([0-9.]+)/);
      return {
        time: generatedAt.slice(11, 16),
        label: signalLabel(pressure) || titleFromPressure(pressure),
        domain: domainToGold(domain),
        intensity: round(normalize(match?.[1] ?? activeVectorsRaw[index]?.value), 3),
      };
    });

    const nodes = buildNodes(vectorsRaw);
    const flows = buildFlows(nodes);
    const values = nodes.map((node) => node.intensity);
    if (!nodes.length) limits.push('global map has no active geolocated WorldSpect nodes; no crisis nodes synthesized');
    limits.push('map node coordinates are deterministic domain anchors, not claims about geopolitical event locations');
    limits.push('regional tension values require regionalized source metadata; unavailable regions remain zero');

    const vectors = VECTOR_ORDER.map(([id, label, domains]) => {
      const value = domainValue(vectorsRaw, domains);
      return { id, label, active: value > 0, value };
    });

    const tensions = activeVectorsRaw
      .map((vector) => {
        const domain = str(vector.domain).toUpperCase();
        const value = round(average([normalize(vector.value), normalize(vector.volatility), normalize(vector.persistence), 1 - normalize(vector.trust)]), 3);
        return { label: DOMAIN_ANCHORS[domain]?.label ?? domain.replace(/_/g, ' '), value, domain };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map((item, index) => ({ rank: index + 1, ...item }));

    const regionalTensions: ObservatoryGoldState['regionalTensions'] = [
      { region: 'America del Norte', value: 0, trend: 'stable' },
      { region: 'America Latina', value: 0, trend: 'stable' },
      { region: 'Europa', value: 0, trend: 'stable' },
      { region: 'Africa', value: 0, trend: 'stable' },
      { region: 'Medio Oriente', value: 0, trend: 'stable' },
      { region: 'Asia', value: 0, trend: 'stable' },
      { region: 'Oceania', value: 0, trend: 'stable' },
    ];

    const state: ObservatoryGoldState = {
      generatedAt,
      systemState: !worldInterface && !vectorResult
        ? 'offline'
        : degradedSources.length || limits.length
          ? 'degraded'
          : tension >= 0.78
            ? 'critical'
            : 'nominal',
      wsv: {
        globalIndex,
        coherence,
        resilience,
        alignment,
        tension,
      },
      explanation: {
        title: '¿QUE SIGNIFICA ESTO?',
        body: worldSpect?.relevance_to_sfi
          || 'WSV mide salud sistemica del mundo a traves de vectores observables. Sin fuente suficiente, la lectura queda degradada.',
        methodologyAvailable: Boolean(worldSpect?.observed_at || worldInterface),
      },
      highlightedSignals: signals,
      globalMap: {
        tensionIntensityMin: values.length ? round(Math.min(...values), 3) : 0,
        tensionIntensityMax: values.length ? round(Math.max(...values), 3) : 0,
        nodes,
        flows,
      },
      dailyReading: {
        date: worldSpect?.observed_at ?? generatedAt,
        title: pressures[0] ? titleFromPressure(pressures[0]) : 'Lectura WorldSpect',
        summary: interpretation?.text ?? worldSpect?.relevance_to_sfi ?? 'Sin lectura diaria con fuente suficiente.',
        tensionIndex: tension,
        stability: stabilityFromTension(tension),
        fullReadingUrl: '/world-vector',
      },
      vectors,
      worldTensions: tensions,
      regionalTensions,
      mapFilters: {
        minimumIntensity: 0.4,
        tensionType: 'todas',
        region: 'todas',
      },
      timeline: buildTimeline(generatedAt, pressures, recentSnapshots.map(record)),
      provenance: {
        basedOn: [
          '/api/observatory/state',
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

    if (activeVectorCount(state.vectors) === 0) {
      state.provenance.limits.push('WSV cannot be calculated from active vectors; UI shows empty numeric state');
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
