/**
 * Umbrales MIHM para evaluación de audio en /studio.
 *
 * Regla operativa (instrucción explícita de Juan): NO siempre debe haber
 * una recomendación de cambio. Un umbral solo dispara una hipótesis si el
 * valor observado realmente lo cruza. Si nada cruza, la respuesta correcta
 * es "sin cambios estructurales requeridos" — eso también es información,
 * no un vacío.
 *
 * Cada umbral documenta: qué mide, por qué ese valor, y qué acción sugiere.
 * Esto es DERIVED (fórmula fija sobre datos reales), nunca una opinión
 * generada sin trazabilidad.
 */

export type ThresholdSeverity = 'info' | 'watch' | 'action';

export type ThresholdDefinition = {
  id: string;
  metric: string;
  rationale: string;
  test: (value: number) => boolean;
  severity: ThresholdSeverity;
  recommendedChange: string;
};

export const MIHM_AUDIO_THRESHOLDS: ThresholdDefinition[] = [
  {
    id: 'clipping_risk_high',
    metric: 'clippingRisk',
    rationale: 'Fracción de muestras >= 0.98 de amplitud. Por encima de 0.15% del total, el riesgo de distorsión audible en export/master es significativo.',
    test: (value) => value > 0.0015,
    severity: 'action',
    recommendedChange: 'Reducir ganancia de entrada 1–2 dB antes del bounce final; no requiere reestructurar la pieza.',
  },
  {
    id: 'dynamic_range_flat',
    metric: 'dynamicRange',
    rationale: 'Diferencia entre el segmento de mayor y menor energía RMS (8 segmentos). Por debajo de 0.05 la pieza no tiene contraste seccional perceptible.',
    test: (value) => value < 0.05,
    severity: 'watch',
    recommendedChange: 'Introducir contraste dinámico entre secciones (ej. reducir densidad en un verso) antes de considerar la pieza cerrada estructuralmente.',
  },
  {
    id: 'long_lead_silence',
    metric: 'silenceStartSeconds',
    rationale: 'Segundos antes del primer sonido detectado (umbral de amplitud 0.015). Más de 3s de silencio inicial suele ser no intencional en un demo de referencia.',
    test: (value) => value > 3,
    severity: 'info',
    recommendedChange: 'Verificar si el silencio inicial es intencional; si no, recortar antes de distribuir.',
  },
  {
    id: 'excess_tail_silence',
    metric: 'silenceEndSeconds',
    rationale: 'Segundos de silencio al final del archivo tras el último sonido detectado. Más de 4s suele indicar cola de exportación sin recortar.',
    test: (value) => value > 4,
    severity: 'info',
    recommendedChange: 'Recortar la cola de silencio en el bounce final.',
  },
];

export const LAYER_CORRELATION_THRESHOLDS = {
  /** Correlación de energía entre capas por encima de esto: redundancia potencial. */
  redundancyAbove: 0.92,
  /** Correlación por debajo de esto con ambas capas de energía alta: posible choque rítmico. */
  clashBelow: 0.15,
  /** Energía media mínima para considerar una capa "activa" al evaluar choque. */
  activeEnergyFloor: 0.08,
} as const;

export function evaluateMihmThresholds(metrics: Record<string, number | null>): Array<{ threshold: ThresholdDefinition; observedValue: number }> {
  const triggered: Array<{ threshold: ThresholdDefinition; observedValue: number }> = [];
  for (const threshold of MIHM_AUDIO_THRESHOLDS) {
    const value = metrics[threshold.metric];
    if (value === null || value === undefined || !Number.isFinite(value)) continue;
    if (threshold.test(value)) triggered.push({ threshold, observedValue: value });
  }
  return triggered;
}