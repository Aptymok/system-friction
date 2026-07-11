import type { ObservatoryGoldState } from './observatoryGoldState';

const EMPTY_VECTORS: ObservatoryGoldState['vectors'] = [
  ['cultural', 'Cultural', ['CULTURAL']],
  ['memetic', 'Memético', ['MEMETIC']],
  ['affective', 'Afectivo', ['AFFECTIVE']],
  ['tech', 'Tecnológico', ['TECH']],
  ['geo-digital', 'Geodigital', ['GEO_DIGITAL']],
  ['economy', 'Económico', ['ECONOMY']],
  ['geopolitical', 'Geopolítico', ['GEOPOLITICAL']],
  ['institutional', 'Institucional', ['INSTITUTIONAL']],
  ['climate', 'Climático', ['CLIMATE']],
  ['bio', 'Biológico', ['BIO']],
].map(([id, label, domainKeys]) => ({
  id: String(id),
  label: String(label),
  domainKeys: domainKeys as string[],
  active: false,
  value: 0,
  persistence: null,
  volatility: null,
  trust: null,
  confidence: null,
  sourceCount: 0,
  observedAt: null,
  sourceState: 'missing',
  delta: null,
  trend: 'unavailable' as const,
}));

export function buildObservatoryGoldDegradedState(params?: {
  generatedAt?: string;
  degradedSources?: string[];
  limits?: string[];
}): ObservatoryGoldState {
  const generatedAt = params?.generatedAt ?? new Date().toISOString();
  const limits = params?.limits ?? ['source_unavailable'];

  return {
    generatedAt,
    systemState: 'degraded',
    publicContract: {
      scope: 'PUBLIC',
      institution: 'SYSTEM FRICTION INSTITUTE',
      horizonDays: 90,
      sourceState: 'missing',
      observedAt: null,
    },
    wsv: {
      globalIndex: 0,
      coherence: 0,
      resilience: 0,
      alignment: 0,
      tension: 0,
      regime: 'SOURCE_UNAVAILABLE',
    },
    longitudinal: {
      horizonDays: 90,
      sampleCount: 0,
      firstObservedAt: null,
      lastObservedAt: null,
      points: [],
      deltas: { wsi: null, nti: null, confidence: null },
    },
    explanation: {
      title: 'FUENTE NO DISPONIBLE',
      body: 'El World Vector no puede calcularse con la evidencia disponible. El observatorio permanece público en modo degradado y no sustituye observaciones por valores simulados.',
      methodologyAvailable: false,
    },
    highlightedSignals: [],
    globalMap: {
      tensionIntensityMin: 0,
      tensionIntensityMax: 0,
      nodes: [],
      flows: [],
    },
    dailyReading: {
      date: generatedAt,
      title: 'Lectura del día no disponible',
      summary: 'No existe evidencia suficiente para emitir una lectura institucional del día.',
      tensionIndex: 0,
      stability: 'crítica',
      fullReadingUrl: null,
      institution: 'SYSTEM FRICTION INSTITUTE',
      byline: 'Lectura del día · System Friction Institute',
      confidence: null,
      sourceState: 'missing',
      evidenceCount: 0,
      evidence: [],
      limits,
    },
    vectors: EMPTY_VECTORS,
    worldTensions: [],
    regionalTensions: [],
    mapFilters: {
      minimumIntensity: 0,
      tensionType: 'todas',
      region: 'todas',
    },
    timeline: [],
    provenance: {
      basedOn: [],
      degradedSources: params?.degradedSources ?? ['observatory_gold_adapter'],
      limits,
    },
  };
}
