import { evaluateMihmThresholds, LAYER_CORRELATION_THRESHOLDS } from './mihmThresholds';

export type StudioLayerInput = {
  id: string;
  name: string;
  peak: number | null;
  rms: number | null;
  clippingRisk: number | null;
  dynamicRange: number | null;
  silenceStartSeconds: number | null;
  silenceEndSeconds: number | null;
  energySegments: number[];
  structureNote: string | null;
};

export type StudioCulturalDomain = { domain: string; value: number; confidence: number | null; sourceCount: number };
export type StudioCulturalTrend = { domain: string; direction: 'rising' | 'falling' | 'stable'; slope: number; sampleCount: number };

export type StudioCulturalLens = {
  dataClass: 'real' | 'derived' | 'gated' | 'mixed';
  observedAt: string | null;
  status: 'observed' | 'thin' | 'degraded' | 'failed';
  confidence: number;
  dominantSignal: string | null;
  interpretation: string;
  domainValues: StudioCulturalDomain[];
  trends: StudioCulturalTrend[];
  warnings: string[];
};

export type StudioHypothesis = {
  id: string;
  origin: 'layer_metric' | 'layer_interaction' | 'cultural_context';
  severity: 'info' | 'watch' | 'action';
  dataClass: 'real' | 'derived' | 'mixed';
  metric: string;
  observedValue: number | null;
  rationale: string;
  statement: string;
  recommendedChange: string | null;
  route: 'hold' | 'inspect' | 'revise' | 'prepare' | 'publish';
  sources: string[];
};

export type StudioLayerCorrelation = { layerA: string; layerB: string; correlation: number; interpretation: 'redundant' | 'clashing' | 'complementary' | 'neutral' };

export type StudioHypothesisReport = {
  generatedAt: string;
  changesRequired: boolean;
  hypotheses: StudioHypothesis[];
  correlations: StudioLayerCorrelation[];
  summary: string;
};

function pearsonCorrelation(a: number[], b: number[]): number | null {
  if (a.length !== b.length || a.length < 2) return null;
  const meanA = a.reduce((sum, v) => sum + v, 0) / a.length;
  const meanB = b.reduce((sum, v) => sum + v, 0) / b.length;
  let numerator = 0;
  let denomA = 0;
  let denomB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    numerator += da * db;
    denomA += da * da;
    denomB += db * db;
  }
  const denominator = Math.sqrt(denomA * denomB);
  if (denominator === 0) return null;
  return Number((numerator / denominator).toFixed(4));
}

function meanEnergy(segments: number[]): number {
  if (!segments.length) return 0;
  return segments.reduce((sum, v) => sum + v, 0) / segments.length;
}

function buildLayerCorrelations(layers: StudioLayerInput[]): StudioLayerCorrelation[] {
  const correlations: StudioLayerCorrelation[] = [];
  for (let i = 0; i < layers.length; i += 1) {
    for (let j = i + 1; j < layers.length; j += 1) {
      const a = layers[i];
      const b = layers[j];
      const correlation = pearsonCorrelation(a.energySegments, b.energySegments);
      if (correlation === null) continue;
      const bothActive = meanEnergy(a.energySegments) > LAYER_CORRELATION_THRESHOLDS.activeEnergyFloor && meanEnergy(b.energySegments) > LAYER_CORRELATION_THRESHOLDS.activeEnergyFloor;
      let interpretation: StudioLayerCorrelation['interpretation'] = 'neutral';
      if (correlation > LAYER_CORRELATION_THRESHOLDS.redundancyAbove) interpretation = 'redundant';
      else if (correlation < LAYER_CORRELATION_THRESHOLDS.clashBelow && bothActive) interpretation = 'clashing';
      else if (correlation > 0.3 && correlation <= LAYER_CORRELATION_THRESHOLDS.redundancyAbove) interpretation = 'complementary';
      correlations.push({ layerA: a.name, layerB: b.name, correlation, interpretation });
    }
  }
  return correlations;
}

function hypothesesFromLayer(layer: StudioLayerInput): StudioHypothesis[] {
  const metrics: Record<string, number | null> = {
    clippingRisk: layer.clippingRisk,
    dynamicRange: layer.dynamicRange,
    silenceStartSeconds: layer.silenceStartSeconds,
    silenceEndSeconds: layer.silenceEndSeconds,
  };
  return evaluateMihmThresholds(metrics).map(({ threshold, observedValue }) => ({
    id: `${layer.id}:${threshold.id}`,
    origin: 'layer_metric' as const,
    severity: threshold.severity,
    dataClass: 'derived' as const,
    metric: `${layer.name}.${threshold.metric}`,
    observedValue,
    rationale: threshold.rationale,
    statement: `[${layer.name}] ${threshold.metric} = ${observedValue} cruza el umbral MIHM (${threshold.id}).`,
    recommendedChange: threshold.recommendedChange,
    route: threshold.severity === 'action' ? 'revise' : threshold.severity === 'watch' ? 'inspect' : 'hold',
    sources: [`layer:${layer.id}.${threshold.metric}`, `mihmThresholds.${threshold.id}`],
  }));
}

function hypothesesFromCorrelations(correlations: StudioLayerCorrelation[]): StudioHypothesis[] {
  return correlations
    .filter((item) => item.interpretation === 'redundant' || item.interpretation === 'clashing')
    .map((item) => ({
      id: `corr:${item.layerA}:${item.layerB}`,
      origin: 'layer_interaction' as const,
      severity: 'watch' as const,
      dataClass: 'derived' as const,
      metric: `correlation(${item.layerA}, ${item.layerB})`,
      observedValue: item.correlation,
      rationale: item.interpretation === 'redundant'
        ? `Correlación de energía ${item.correlation} entre ${item.layerA} y ${item.layerB} supera ${LAYER_CORRELATION_THRESHOLDS.redundancyAbove}: las capas se mueven casi idénticas.`
        : `Correlación de energía ${item.correlation} entre ${item.layerA} y ${item.layerB} está por debajo de ${LAYER_CORRELATION_THRESHOLDS.clashBelow} con ambas capas activas: posible choque rítmico/espacial.`,
      statement: item.interpretation === 'redundant'
        ? `${item.layerA} y ${item.layerB} son redundantes en su curva de energía (r=${item.correlation}).`
        : `${item.layerA} y ${item.layerB} chocan en el tiempo (r=${item.correlation}) mientras ambas están activas.`,
      recommendedChange: item.interpretation === 'redundant'
        ? `Diferenciar ${item.layerA} y ${item.layerB} (arreglo, EQ o automatización) o considerar fusionarlas.`
        : `Revisar sidechain/ducking o distribución de espacio entre ${item.layerA} y ${item.layerB}.`,
      route: 'inspect' as const,
      sources: [`correlation:${item.layerA}:${item.layerB}`, 'mihmThresholds.LAYER_CORRELATION_THRESHOLDS'],
    }));
}

function hypothesisFromCulturalLens(lens: StudioCulturalLens | null): StudioHypothesis[] {
  if (!lens || lens.dataClass === 'gated') return [];
  const relevantTrend = lens.trends.find((trend) => trend.sampleCount >= 3 && trend.direction !== 'stable' && ['CULTURAL', 'MEMETIC', 'AFFECTIVE'].includes(trend.domain));
  if (!relevantTrend) return [];
  return [{
    id: `cultural:${relevantTrend.domain}`,
    origin: 'cultural_context',
    severity: 'info',
    dataClass: 'mixed',
    metric: `worldVector.domain.${relevantTrend.domain}`,
    observedValue: relevantTrend.slope,
    rationale: `Tendencia real de ${relevantTrend.sampleCount} observaciones WorldSpect recientes en el dominio ${relevantTrend.domain}: dirección ${relevantTrend.direction}, pendiente ${relevantTrend.slope}.`,
    statement: `El vector ${relevantTrend.domain} muestra tendencia ${relevantTrend.direction} en el ciclo reciente (confianza global ${lens.confidence}). Esto es contexto para decisión de posicionamiento, no una instrucción de cambio de la pieza.`,
    recommendedChange: null,
    route: 'inspect',
    sources: [`worldVector.today.observation.domain_values(${relevantTrend.domain})`, 'worldspect_snapshots(recent=90d)'],
  }];
}

export function buildStudioHypotheses(input: { layers: StudioLayerInput[]; culturalLens: StudioCulturalLens | null }): StudioHypothesisReport {
  const layerHypotheses = input.layers.flatMap(hypothesesFromLayer);
  const correlations = buildLayerCorrelations(input.layers);
  const interactionHypotheses = hypothesesFromCorrelations(correlations);
  const culturalHypotheses = hypothesisFromCulturalLens(input.culturalLens);
  const hypotheses = [...layerHypotheses, ...interactionHypotheses, ...culturalHypotheses];
  const changesRequired = hypotheses.some((item) => item.severity === 'action' || item.severity === 'watch');
  const summary = hypotheses.length === 0
    ? 'Sin cambios estructurales requeridos: ninguna métrica cruzó un umbral MIHM.'
    : changesRequired
      ? `${hypotheses.filter((h) => h.severity !== 'info').length} punto(s) cruzan umbral MIHM y sugieren cambio mínimo.`
      : 'Solo hay observaciones informativas; ningún umbral de acción o vigilancia fue cruzado.';

  return { generatedAt: new Date().toISOString(), changesRequired, hypotheses, correlations, summary };
}