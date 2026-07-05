import type { ObservatoryGoldState } from './observatoryGoldState';

export function buildObservatoryGoldDegradedState(params?: {
  generatedAt?: string;
  degradedSources?: string[];
  limits?: string[];
}): ObservatoryGoldState {
  const generatedAt = params?.generatedAt ?? new Date().toISOString();

  return {
    generatedAt,
    systemState: 'degraded',
    wsv: {
      globalIndex: 0,
      coherence: 0,
      resilience: 0,
      alignment: 0,
      tension: 0,
    },
    explanation: {
      title: 'SOURCE_UNAVAILABLE',
      body: 'WSV no puede calcularse con la evidencia disponible. El observatorio queda en modo degradado sin sustituir datos por valores simulados.',
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
      title: 'Lectura no disponible',
      summary: 'No hay lectura diaria con fuente suficiente. Se requiere snapshot WorldSpect o estado Observatory disponible.',
      tensionIndex: 0,
      stability: 'crítica',
      fullReadingUrl: null,
    },
    vectors: [
      { id: 'cultural', label: 'Cultural', active: false, value: 0 },
      { id: 'tec', label: 'Tec', active: false, value: 0 },
      { id: 'geo', label: 'Geopolitico', active: false, value: 0 },
      { id: 'ambiental', label: 'Ambiental', active: false, value: 0 },
      { id: 'eco', label: 'Economico', active: false, value: 0 },
      { id: 'clima', label: 'Clima', active: false, value: 0 },
      { id: 'pol', label: 'Politico', active: false, value: 0 },
      { id: 'bio', label: 'Bio', active: false, value: 0 },
    ],
    worldTensions: [],
    regionalTensions: [
      { region: 'America del Norte', value: 0, trend: 'stable' },
      { region: 'America Latina', value: 0, trend: 'stable' },
      { region: 'Europa', value: 0, trend: 'stable' },
      { region: 'Africa', value: 0, trend: 'stable' },
      { region: 'Medio Oriente', value: 0, trend: 'stable' },
      { region: 'Asia', value: 0, trend: 'stable' },
      { region: 'Oceania', value: 0, trend: 'stable' },
    ],
    mapFilters: {
      minimumIntensity: 0,
      tensionType: 'todas',
      region: 'todas',
    },
    timeline: [
      {
        time: generatedAt.slice(11, 16),
        title: 'SOURCE_UNAVAILABLE',
        description: 'Sin eventos WorldSpect confirmados para la linea de tiempo.',
        active: true,
      },
    ],
    provenance: {
      basedOn: [],
      degradedSources: params?.degradedSources ?? ['observatory_gold_adapter'],
      limits: params?.limits ?? ['source_unavailable'],
    },
  };
}
