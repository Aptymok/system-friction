import 'server-only';

import { runLlmTask } from '@/lib/ai/providerRouter';
import type {
  AmvPredictiveAssessment,
  PredictiveEvidenceRequest,
  PredictiveFeatureContribution,
  PredictiveInterpretation,
} from './types';

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function stripFence(value: string) {
  return value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function strings(value: unknown, limit = 8) {
  return Array.isArray(value) ? value.map(String).map((item) => item.trim()).filter(Boolean).slice(0, limit) : [];
}

function confidenceBand(value: number) {
  if (value < 0.25) return 'VERY_LOW';
  if (value < 0.45) return 'LOW';
  if (value < 0.7) return 'MODERATE';
  return 'HIGH';
}

function sanitizeWarnings(values: string[]) {
  const normalized = values.map((value) => {
    const lower = value.toLowerCase();
    if (lower.startsWith('anthropic_failed:')) return 'ANTHROPIC_UNAVAILABLE';
    if (lower.startsWith('openai_failed:')) return 'OPENAI_UNAVAILABLE';
    if (lower.startsWith('gemini_failed:')) return 'GEMINI_UNAVAILABLE';
    if (lower.startsWith('groq_failed:')) return 'GROQ_UNAVAILABLE';
    if (lower.startsWith('ollama_failed:')) return 'OLLAMA_UNAVAILABLE';
    return value.length > 180 ? `${value.slice(0, 177)}...` : value;
  });
  return [...new Set(normalized)];
}

function contributionDrivers(contributions: PredictiveFeatureContribution[]) {
  const denominator = contributions.reduce((sum, item) => sum + Math.abs(item.contribution), 0);
  return contributions
    .filter((item) => Math.abs(item.contribution) > 0)
    .slice(0, 6)
    .map((item) => {
      const share = denominator > 0 ? Math.abs(item.contribution) / denominator : 0;
      const direction = item.contribution >= 0 ? '+' : '';
      return `${item.key}: contribución lineal ${direction}${item.contribution.toFixed(4)} al logit; cuota relativa ${Math.round(share * 1000) / 10}% de la magnitud total; confianza de feature ${Math.round(item.confidence * 1000) / 10}%.`;
    });
}

function outcomeEvidenceRequests(returnWindow = '30d'): PredictiveEvidenceRequest[] {
  return [
    {
      evidenceKey: 'normalized_exposure',
      description: 'Exposición comparable y normalizada del objeto durante la prueba.',
      reason: 'Sin exposición no puede distinguirse rechazo, ausencia de distribución o falta de oportunidad de observación.',
      sourceCandidates: ['verified_platform_export', 'observed_distribution_metrics', 'declared_operator_outcome'],
      autoCollectible: true,
      priority: 'HIGH',
    },
    {
      evidenceKey: `observed_outcome_${returnWindow}`,
      description: `Outcome observable y normalizado al cierre de la ventana ${returnWindow}.`,
      reason: 'El modelo necesita comparar la predicción con un resultado real para calcular residual, Brier, bias y calibración.',
      sourceCandidates: ['verified_platform_export', 'observed_distribution_metrics', 'declared_operator_outcome'],
      autoCollectible: true,
      priority: 'CRITICAL',
    },
    {
      evidenceKey: 'intervention_fidelity',
      description: 'Fidelidad con la que se ejecutó la versión, intervención o estrategia evaluada.',
      reason: 'Un outcome no puede atribuirse a la predicción si la intervención se ejecutó de forma parcial o distinta.',
      sourceCandidates: ['version_hash', 'release_manifest', 'operator_execution_record'],
      autoCollectible: false,
      priority: 'HIGH',
    },
  ];
}

function mergeRequests(...groups: PredictiveEvidenceRequest[][]) {
  const map = new Map<string, PredictiveEvidenceRequest>();
  for (const group of groups) {
    for (const item of group) map.set(item.evidenceKey, item);
  }
  return [...map.values()];
}

function safeNarrative(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const text = value.trim();
  if (/\b\d+(?:[.,]\d+)?\s*%/.test(text)) return null;
  return text;
}

function parseInterpretation(value: string, fallback: PredictiveInterpretation, provider: string, model: string) {
  try {
    const parsed = record(JSON.parse(stripFence(value)));
    const contradictions = strings(parsed.contradictions).map(safeNarrative).filter((item): item is string => Boolean(item));
    const nextAction = safeNarrative(parsed.nextAction);
    const contextualReading = safeNarrative(parsed.reading);
    return {
      headline: fallback.headline,
      reading: contextualReading ? `${fallback.reading} AMV: ${contextualReading}` : fallback.reading,
      drivers: fallback.drivers,
      contradictions: contradictions.length ? contradictions : fallback.contradictions,
      evidenceNeeded: fallback.evidenceNeeded,
      nextAction: nextAction ?? fallback.nextAction,
      nonClaims: fallback.nonClaims,
      provider,
      model,
      generatedByAi: provider !== 'degraded',
      warnings: sanitizeWarnings(fallback.warnings),
    } satisfies PredictiveInterpretation;
  } catch {
    return {
      ...fallback,
      provider,
      model,
      generatedByAi: false,
      warnings: sanitizeWarnings([...fallback.warnings, 'LLM_JSON_PARSE_FAILED']),
    };
  }
}

export function buildAmvAssessment(input: {
  confidence: number;
  prediction: number;
  missingEvidence: PredictiveEvidenceRequest[];
  contributions: PredictiveFeatureContribution[];
  impact?: number;
  verifiedSampleCount: number;
  calibrationStatus: string;
}) : AmvPredictiveAssessment {
  const impact = clamp01(input.impact ?? Math.max(input.prediction, 1 - input.prediction) * 0.65);
  const uncertainty = clamp01(1 - input.confidence);
  const missingPenalty = clamp01(input.missingEvidence.length / Math.max(1, input.contributions.length + input.missingEvidence.length));
  const calibrationFloor = input.verifiedSampleCount === 0 ? 0.82 : input.verifiedSampleCount < 10 ? 0.68 : input.verifiedSampleCount < 30 ? 0.42 : 0;
  const epistemicRisk = Math.max(
    calibrationFloor,
    clamp01(uncertainty * 0.55 + missingPenalty * 0.25 + (input.calibrationStatus === 'DRIFT_WARNING' ? 0.2 : 0)),
  );
  const driftRisk = input.calibrationStatus === 'DRIFT_WARNING'
    ? 0.85
    : input.verifiedSampleCount < 10 ? 0.55 : input.verifiedSampleCount < 30 ? 0.32 : 0.18;
  const blockers: string[] = [];
  if (input.verifiedSampleCount < 1) blockers.push('NO_VERIFIED_OUTCOMES');
  if (input.missingEvidence.length > 0) blockers.push('MISSING_REQUIRED_EVIDENCE');
  if (input.calibrationStatus === 'FROZEN') blockers.push('MODEL_FROZEN');
  const learningAllowed = blockers.length === 0;
  const evidenceRequests = mergeRequests(
    input.missingEvidence,
    input.verifiedSampleCount < 1 || input.calibrationStatus === 'BOOTSTRAP_UNCALIBRATED' ? outcomeEvidenceRequests() : [],
  );
  const state: AmvPredictiveAssessment['state'] =
    epistemicRisk > 0.72 ? 'REQUEST_EVIDENCE'
      : impact > 0.78 && input.confidence < 0.55 ? 'ESCALATE'
        : input.confidence >= 0.62 ? 'TEST'
          : input.missingEvidence.length ? 'OBSERVE'
            : 'HOLD';

  return {
    state,
    uncertainty,
    impact,
    driftRisk,
    epistemicRisk,
    reason: state === 'REQUEST_EVIDENCE'
      ? input.verifiedSampleCount < 1
        ? 'El modelo todavía no tiene outcomes verificados. La predicción puede registrarse, pero necesita exposición, outcome y fidelidad de ejecución antes de aprender o sostener una decisión.'
        : 'La incertidumbre y los huecos de evidencia son demasiado altos para usar la predicción como decisión.'
      : state === 'ESCALATE'
        ? 'La predicción tiene impacto alto y confianza insuficiente; requiere validación humana.'
        : state === 'TEST'
          ? 'La predicción tiene evidencia suficiente para una prueba reversible y verificable.'
          : state === 'OBSERVE'
            ? 'El motor puede proyectar, pero debe completar evidencia antes de aprender.'
            : 'No existe señal suficiente para cambiar el curso sin una prueba adicional.',
    evidenceRequests,
    learningAllowed,
    learningBlockers: blockers,
  };
}

export async function interpretPrediction(input: {
  scope: string;
  subjectType: string;
  subjectId: string;
  targetKey: string;
  prediction: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
  calibrationStatus: string;
  contributions: PredictiveFeatureContribution[];
  missingEvidence: PredictiveEvidenceRequest[];
  context?: Record<string, unknown>;
}) {
  const topNegative = input.contributions.filter((item) => item.contribution < 0).slice(0, 4);
  const pendingOutcomeEvidence = input.calibrationStatus === 'BOOTSTRAP_UNCALIBRATED' ? outcomeEvidenceRequests() : [];
  const requiredEvidence = mergeRequests(input.missingEvidence, pendingOutcomeEvidence);
  const band = confidenceBand(input.confidence);
  const fallback: PredictiveInterpretation = {
    headline: `Predicción ${Math.round(input.prediction * 100)}% · confianza ${Math.round(input.confidence * 100)}% (${band})`,
    reading: `El punto central es ${Math.round(input.prediction * 1000) / 10}% y el intervalo operativo es ${Math.round(input.lowerBound * 1000) / 10}%–${Math.round(input.upperBound * 1000) / 10}%. La confianza es ${band} (${Math.round(input.confidence * 1000) / 10}%). El estado ${input.calibrationStatus} obliga a tratar el resultado como hipótesis verificable, no como probabilidad calibrada de aceptación.`,
    drivers: contributionDrivers(input.contributions),
    contradictions: topNegative.map((item) => `${item.key}: contribución lineal ${item.contribution.toFixed(4)} al logit.`),
    evidenceNeeded: requiredEvidence.map((item) => `${item.description} Motivo: ${item.reason}`),
    nextAction: input.missingEvidence.length
      ? 'Completar las features requeridas y recalcular antes de ejecutar una intervención irreversible.'
      : 'Ejecutar una prueba reversible, registrar exposición normalizada, fidelidad de ejecución y outcome en la ventana declarada.',
    nonClaims: [
      'Una contribución lineal no es un porcentaje de la predicción.',
      'La compatibilidad de campo no equivale a aceptación.',
      'La predicción bootstrap no está calibrada con outcomes históricos.',
      'El modelo no aprende de su propio texto; solo de outcomes con calidad suficiente.',
    ],
    provider: 'degraded',
    model: 'deterministic_fallback',
    generatedByAi: false,
    warnings: input.calibrationStatus === 'BOOTSTRAP_UNCALIBRATED' ? ['MODEL_BOOTSTRAP_UNCALIBRATED'] : [],
  };

  const quantitativeSemantics = {
    confidenceBand: band,
    rules: [
      '`contribution` es un término aditivo en el logit. Nunca lo conviertas directamente a porcentaje.',
      'Los porcentajes válidos son prediction, bounds, confidence y las cuotas relativas suministradas en drivers.',
      `La confianza ${input.confidence.toFixed(4)} se clasifica exactamente como ${band}. No uses otra etiqueta.`,
      'missingEvidence describe inputs faltantes; pending outcome evidence describe datos futuros necesarios para verificar y aprender.',
      'No llames aceptación, éxito o gusto a field compatibility ni a una predicción bootstrap.',
    ],
  };
  const prompt = JSON.stringify({
    instruction: 'Interpreta la predicción como AMV. Explica tensiones y propone una prueba. No reescribas drivers, evidencia requerida, porcentajes, bandas de confianza ni non-claims. No inventes hechos. Devuelve JSON estricto.',
    outputSchema: {
      headline: 'string sin cifras nuevas',
      reading: 'string contextual sin porcentajes ni reclasificación de confianza',
      drivers: ['IGNORED_BY_RUNTIME'],
      contradictions: ['string sin porcentajes nuevos'],
      evidenceNeeded: ['IGNORED_BY_RUNTIME'],
      nextAction: 'string sin cifras nuevas',
      nonClaims: ['IGNORED_BY_RUNTIME'],
    },
    quantitativeSemantics,
    prediction: input,
    canonicalDrivers: fallback.drivers,
    canonicalEvidenceNeeded: fallback.evidenceNeeded,
  });

  const result = await runLlmTask({
    task: 'prediction',
    system: 'Eres AMV, meta-observador del System Friction Institute. Interpreta únicamente la evidencia suministrada. Los números y sus etiquetas semánticas son inmutables. Devuelve solo JSON válido.',
    prompt,
    fallbackResult: JSON.stringify(fallback),
    maxTokens: 900,
  });
  return parseInterpretation(result.result, { ...fallback, warnings: [...fallback.warnings, ...result.warnings] }, result.provider, result.model);
}

export async function reflectOnPredictionError(input: {
  predicted: number;
  actual: number | null;
  residual: number | null;
  errorClass: string;
  sourceQuality: string;
  interventionFidelity: number | null | undefined;
  missingEvidence: PredictiveEvidenceRequest[];
  contributions: PredictiveFeatureContribution[];
  modelBefore: Record<string, unknown>;
  modelAfter: Record<string, unknown>;
  learningApplied: boolean;
}) {
  const fallback: PredictiveInterpretation = {
    headline: input.actual === null ? 'Outcome no verificable' : `Error ${input.errorClass}`,
    reading: input.actual === null
      ? 'No existe un valor observable suficiente para comparar la predicción.'
      : `La predicción fue ${Math.round(input.predicted * 100)}% y el outcome observado ${Math.round(input.actual * 100)}%. Residual: ${input.residual?.toFixed(4)}.`,
    drivers: contributionDrivers(input.contributions.slice(0, 6)),
    contradictions: [
      input.sourceQuality !== 'VERIFIED' ? `Calidad de fuente: ${input.sourceQuality}` : '',
      (input.interventionFidelity ?? 1) < 0.5 ? 'La intervención no se ejecutó con fidelidad suficiente.' : '',
    ].filter(Boolean),
    evidenceNeeded: input.missingEvidence.map((item) => item.description),
    nextAction: input.learningApplied
      ? 'Conservar la actualización, observar el siguiente caso comparable y vigilar drift.'
      : 'No actualizar parámetros; mejorar la evidencia o revisar manualmente el caso.',
    nonClaims: ['Un error individual no invalida el modelo completo.', 'La explicación AMV no sustituye el cálculo del residual.'],
    provider: 'degraded',
    model: 'deterministic_fallback',
    generatedByAi: false,
    warnings: [],
  };
  const result = await runLlmTask({
    task: 'prediction',
    system: 'Eres AMV en modo post-mortem. Explica por qué falló o acertó una predicción usando solo el residual, calidad de evidencia, fidelidad de intervención, features y estados del modelo. No conviertas contribuciones lineales en porcentajes. No inventes causas. Devuelve JSON válido.',
    prompt: JSON.stringify({ outputSchema: { headline: 'string', reading: 'string sin cifras nuevas', drivers: ['IGNORED_BY_RUNTIME'], contradictions: ['string'], evidenceNeeded: ['IGNORED_BY_RUNTIME'], nextAction: 'string', nonClaims: ['IGNORED_BY_RUNTIME'] }, input, canonicalDrivers: fallback.drivers }),
    fallbackResult: JSON.stringify(fallback),
    maxTokens: 900,
  });
  return parseInterpretation(result.result, { ...fallback, warnings: result.warnings }, result.provider, result.model);
}
