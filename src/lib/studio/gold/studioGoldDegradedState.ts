import type { StudioGoldState } from './studioGoldState';
import { buildCulturalWavePoints } from '@/components/studio/gold/visual/studioWaveMath';

export function buildStudioGoldDegradedState(params?: {
  generatedAt?: string;
  limits?: string[];
  degradedSources?: string[];
}): StudioGoldState {
  const generatedAt = params?.generatedAt ?? new Date().toISOString();
  const limits = params?.limits?.length
    ? params.limits
    : ['studio_gold_adapter_unavailable', 'no_active_case_or_live_signal_contract_available'];

  return {
    generatedAt,
    systemState: 'degraded',
    activeCase: {
      id: null,
      title: 'SIN CASO ACTIVO',
      phase: 'sin lectura operativa',
      progress: 0,
      signals: 0,
      activeDays: 0,
      hypothesis: 'No hay caso activo confirmado por el pipeline actual. La consola queda en modo observacion degradada.',
    },
    keyObservables: [],
    persistentSignals: [],
    culturalWave: {
      coherenceGlobal: 0,
      culturalEntropy: 0,
      symbolicDensity: 0,
      plasticity: 0,
      waveSpeed: 0,
      analyticCoverage: 0,
      points: buildCulturalWavePoints({ coherence: 0, entropy: 0, density: 0, plasticity: 0, coverage: 0 }),
      markers: [
        { x: 0.08, label: 'NARRATIVAS EMERGENTES', kind: 'narrative' },
        { x: 0.32, label: 'PUNTOS DE FRICCION SISTEMICA', kind: 'friction' },
        { x: 0.60, label: 'VENTANAS DE OPORTUNIDAD', kind: 'opportunity' },
        { x: 0.84, label: 'PROTO-SINTESIS CULTURAL', kind: 'synthesis' },
      ],
    },
    wsvLens: {
      economic: 0,
      political: 0,
      technological: 0,
      cultural: 0,
      ecological: 0,
      global: 0,
    },
    mihmModel: {
      individual: 0,
      group: 0,
      institutional: 0,
      systemic: 0,
      civilizational: 0,
    },
    observablesMatrix: {
      symbolic: 0,
      cognitive: 0,
      affective: 0,
      conductual: 0,
      institutional: 0,
      technological: 0,
      totalObservables: 0,
      activePercentage: 0,
    },
    pmv: {
      id: 'PMV-BLOQUEADA',
      intensity: 'sin objeto evaluado',
      hypothesis: 'No se disena perturbacion sin caso activo, objeto evaluado y evidencia suficiente.',
      reach: 0,
      coverage: 0,
      expectedImpact: 0,
      state: 'blocked',
      field: [],
    },
    longitudinalTracking: [],
    synthesis: {
      researchNote: 'No hay nota de investigacion activa; faltan lecturas vivas o caso conectado.',
      implication: 'La consola puede observar estructura disponible, pero no debe declarar intervencion.',
      nextAction: 'Conectar evidencia/caso activo antes de ejecutar PMV.',
      confidence: 0,
    },
    engines: [
      { id: 'observation', label: 'Motor de Observacion', description: 'Cobertura y calidad de datos', value: 0, state: 'degraded' },
      { id: 'modeling', label: 'Motor de Modelado', description: 'Precision de modelos', value: 0, state: 'blocked' },
      { id: 'simulation', label: 'Motor de Simulacion', description: 'Fiabilidad predictiva', value: 0, state: 'blocked' },
      { id: 'intervention', label: 'Motor de Intervencion', description: 'Eficacia de perturbaciones', value: 0, state: 'blocked' },
      { id: 'learning', label: 'Motor de Aprendizaje', description: 'Adaptacion y mejora continua', value: 0, state: 'standby' },
      { id: 'synthesis', label: 'Motor de Sintesis', description: 'Coherencia integradora', value: 0, state: 'blocked' },
    ],
    provenance: {
      basedOn: [],
      degradedSources: params?.degradedSources ?? ['studio_gold_adapter'],
      limits,
    },
  };
}
