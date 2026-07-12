/**
 * Umbrales MIHM para evaluación de audio en /studio.
 *
 * Regla operativa: NO siempre debe haber una recomendación de cambio.
 * Un umbral solo dispara una hipótesis si el valor observado realmente lo cruza.
 * Si nada cruza, la respuesta correcta es "sin cambios estructurales requeridos".
 *
 * Cada umbral documenta qué mide, por qué ese valor y qué acción mínima sugiere.
 * Esto es DERIVED sobre datos observados, nunca una opinión sin trazabilidad.
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
    rationale: 'Rango dinámico expresado en dB entre el percentil 95 y el percentil 10 del RMS por ventanas. Por debajo de 5 dB existe contraste seccional reducido; no significa por sí solo que la pieza esté mal.',
    test: (value) => value < 5,
    severity: 'watch',
    recommendedChange: 'Probar una sola ventana de contraste local antes de alterar la estructura global; verificar que el rango aumente al menos 2 dB sin elevar clipping.',
  },
  {
    id: 'long_lead_silence',
    metric: 'silenceStartSeconds',
    rationale: 'Segundos antes del primer sonido detectado (umbral de amplitud 0.015). Más de 3 s de silencio inicial puede ser no intencional en un archivo de distribución.',
    test: (value) => value > 3,
    severity: 'info',
    recommendedChange: 'Verificar si el silencio inicial es intencional; si no, recortar antes de distribuir.',
  },
  {
    id: 'excess_tail_silence',
    metric: 'silenceEndSeconds',
    rationale: 'Segundos de silencio al final del archivo tras el último sonido detectado. Más de 4 s suele indicar cola de exportación sin recortar.',
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
