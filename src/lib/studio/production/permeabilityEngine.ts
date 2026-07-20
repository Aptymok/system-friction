import {
  MIHM_AUDIO_THRESHOLDS,
} from './mihmThresholds';

/**
 * Detecta si un objeto de Studio (una canción, un audio) está PERDIENDO
 * permeabilidad e impacto a través de sus ediciones sucesivas — no en un
 * solo punto en el tiempo (eso ya lo hace hypothesisEngine.ts), sino
 * comparando la versión más reciente contra las anteriores.
 *
 * No inventa causas: cada degradación reportada está anclada a una métrica
 * MIHM real que empeoró, y la recomendación es la misma `recommendedChange`
 * ya definida en mihmThresholds.ts para esa métrica (R18: no duplicar
 * gobernanza de umbrales).
 */

export type PermeabilityMetricPoint = {
  createdAt: string;
  rms: number | null;
  peak: number | null;
  clippingRisk: number | null;
  dynamicRange: number | null;
  lufs: number | null;
  spectralCentroid: number | null;
};

export type PermeabilityCause = {
  metrica: string;
  valorAnterior: number | null;
  valorActual: number | null;
  direccion: 'empeoró' | 'mejoró' | 'sin cambio relevante';
  porQue: string;
  queHacer: string;
};

export type PermeabilityReport = {
  tendencia: 'ganando_permeabilidad' | 'estable' | 'perdiendo_permeabilidad';
  resumen: string;
  edicionesAnalizadas: number;
  causas: PermeabilityCause[];
  ventanaRecomendada: string;
};

// Métricas donde "más alto" es mejor (permeabilidad/impacto) vs donde
// "más alto" es peor. Ancla directamente en lo que MIHM_AUDIO_THRESHOLDS
// ya trata como riesgo.
const HIGHER_IS_BETTER = new Set(['dynamicRange']);
const HIGHER_IS_WORSE = new Set(['clippingRisk']);

const METRIC_LABEL: Record<string, string> = {
  dynamicRange: 'Rango dinámico (contraste entre secciones)',
  clippingRisk: 'Riesgo de distorsión (clipping)',
  lufs: 'Loudness (LUFS)',
  spectralCentroid: 'Brillo espectral',
};

function significantChange(metric: string, before: number, after: number): boolean {
  // Umbral de "cambio que importa" — evita reportar ruido de redondeo.
  if (metric === 'clippingRisk') return Math.abs(after - before) > 0.0005;
  if (metric === 'dynamicRange') return Math.abs(after - before) > 0.4;
  if (metric === 'lufs') return Math.abs(after - before) > 0.6;
  if (metric === 'spectralCentroid') return Math.abs(after - before) > 200;
  return false;
}

function findRecommendedChange(metric: string): string | null {
  const threshold = MIHM_AUDIO_THRESHOLDS.find((t) => t.metric === metric);
  return threshold ? threshold.recommendedChange : null;
}

export function evaluatePermeability(
  history: PermeabilityMetricPoint[],
): PermeabilityReport {
  if (history.length < 2) {
    return {
      tendencia: 'estable',
      resumen: 'Todavía no hay suficientes versiones analizadas para medir una tendencia. Se necesita al menos una segunda edición analizada.',
      edicionesAnalizadas: history.length,
      causas: [],
      ventanaRecomendada: 'Sube o vuelve a analizar la siguiente edición cuando la tengas — con dos puntos ya se puede medir dirección.',
    };
  }

  const first = history[0];
  const last = history[history.length - 1];

  const causas: PermeabilityCause[] = [];

  const metrics: Array<'dynamicRange' | 'clippingRisk' | 'lufs' | 'spectralCentroid'> = [
    'dynamicRange',
    'clippingRisk',
    'lufs',
    'spectralCentroid',
  ];

  for (const metric of metrics) {
    const before: number | null = first[metric];
    const after: number | null = last[metric];
    if (before === null || after === null) continue;
    if (!significantChange(metric, before, after)) continue;

    let direccion: PermeabilityCause['direccion'] = 'sin cambio relevante';
    if (HIGHER_IS_BETTER.has(metric)) {
      direccion = after > before ? 'mejoró' : 'empeoró';
    } else if (HIGHER_IS_WORSE.has(metric)) {
      direccion = after > before ? 'empeoró' : 'mejoró';
    } else {
      // lufs / spectralCentroid: no son buenos o malos por sí mismos,
      // se reportan como cambio, no como degradación.
      direccion = 'sin cambio relevante';
    }

    const label = METRIC_LABEL[metric] ?? metric;
    const recomendado = findRecommendedChange(metric);

    causas.push({
      metrica: label,
      valorAnterior: before,
      valorActual: after,
      direccion,
      porQue:
        direccion === 'empeoró'
          ? `${label} pasó de ${before} a ${after} entre la primera y la última edición analizada — esto reduce el impacto percibido de la pieza.`
          : direccion === 'mejoró'
            ? `${label} pasó de ${before} a ${after} — mejora respecto a la primera versión.`
            : `${label} cambió de ${before} a ${after}, sin ser claramente mejor o peor por sí solo.`,
      queHacer:
        direccion === 'empeoró'
          ? (recomendado ?? 'Revisar qué cambió en el proceso de edición/mezcla entre estas dos versiones.')
          : 'Sin acción requerida en esta métrica.',
    });
  }

  const empeoraron = causas.filter((c) => c.direccion === 'empeoró').length;
  const mejoraron = causas.filter((c) => c.direccion === 'mejoró').length;

  let tendencia: PermeabilityReport['tendencia'] = 'estable';
  if (empeoraron > mejoraron) tendencia = 'perdiendo_permeabilidad';
  else if (mejoraron > empeoraron) tendencia = 'ganando_permeabilidad';

  const resumen =
    tendencia === 'perdiendo_permeabilidad'
      ? `Entre la primera y la última edición analizada (${history.length} versiones), esta pieza está perdiendo permeabilidad: ${empeoraron} métrica(s) empeoraron. Ver abajo cuáles y qué hacer.`
      : tendencia === 'ganando_permeabilidad'
        ? `Esta pieza está mejorando con las ediciones: ${mejoraron} métrica(s) mejoraron entre la primera y la última versión.`
        : 'No hay una tendencia clara de pérdida o ganancia de permeabilidad entre las ediciones analizadas.';

  const ventanaRecomendada =
    tendencia === 'perdiendo_permeabilidad'
      ? 'Conviene corregir antes de la siguiente publicación — cada edición adicional sin corregir profundiza la pérdida medida.'
      : 'Sin ventana de acción urgente por esta señal.';

  return {
    tendencia,
    resumen,
    edicionesAnalizadas: history.length,
    causas,
    ventanaRecomendada,
  };
}
