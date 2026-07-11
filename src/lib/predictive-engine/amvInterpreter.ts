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

function parseInterpretation(value: string, fallback: PredictiveInterpretation, provider: string, model: string) {
  try {
    const parsed = record(JSON.parse(stripFence(value)));
    return {
      headline: typeof parsed.headline === 'string' ? parsed.headline : fallback.headline,
      reading: typeof parsed.reading === 'string' ? parsed.reading : fallback.reading,
      drivers: strings(parsed.drivers).length ? strings(parsed.drivers) : fallback.drivers,
      contradictions: strings(parsed.contradictions).length ? strings(parsed.contradictions) : fallback.contradictions,
      evidenceNeeded: strings(parsed.evidenceNeeded).length ? strings(parsed.evidenceNeeded) : fallback.evidenceNeeded,
      nextAction: typeof parsed.nextAction === 'string' ? parsed.nextAction : fallback.nextAction,
      nonClaims: strings(parsed.nonClaims).length ? strings(parsed.nonClaims) : fallback.nonClaims,
      provider,
      model,
      generatedByAi: provider !== 'degraded',
      warnings: fallback.warnings,
    } satisfies PredictiveInterpretation;
  } catch {
    return { ...fallback, provider, model, generatedByAi: false, warnings: [...fallback.warnings, 'LLM_JSON_PARSE_FAILED'] };
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
  const epistemicRisk = clamp01(uncertainty * 0.55 + missingPenalty * 0.45);
  const driftRisk = input.calibrationStatus === 'DRIFT_WARNING'
    ? 0.85
    : input.verifiedSampleCount < 10 ? 0.55 : input.verifiedSampleCount < 30 ? 0.32 : 0.18;
  const blockers: string[] = [];
  if (input.verifiedSampleCount < 1) blockers.push('NO_VERIFIED_OUTCOMES');
  if (input.missingEvidence.length > 0) blockers.push('MISSING_REQUIRED_EVIDENCE');
  if (input.calibrationStatus === 'FROZEN') blockers.push('MODEL_FROZEN');
  const learningAllowed = blockers.length === 0;
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
      ? 'La incertidumbre y los huecos de evidencia son demasiado altos para usar la predicción como decisión.'
      : state === 'ESCALATE'
        ? 'La predicción tiene impacto alto y confianza insuficiente; requiere validación humana.'
        : state === 'TEST'
          ? 'La predicción tiene evidencia suficiente para una prueba reversible y verificable.'
          : state === 'OBSERVE'
            ? 'El motor puede proyectar, pero debe completar evidencia antes de aprender.'
            : 'No existe señal suficiente para cambiar el curso sin una prueba adicional.',
    evidenceRequests: input.missingEvidence,
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
  const topPositive = input.contributions.filter((item) => item.contribution >= 0).slice(0, 4);
  const topNegative = input.contributions.filter((item) => item.contribution < 0).slice(0, 4);
  const fallback: PredictiveInterpretation = {
    headline: `Predicción ${Math.round(input.prediction * 100)}% · confianza ${Math.round(input.confidence * 100)}%`,
    reading: `El motor estima ${input.targetKey} entre ${Math.round(input.lowerBound * 100)}% y ${Math.round(input.upperBound * 100)}%. El estado de calibración es ${input.calibrationStatus}; el valor debe tratarse como hipótesis verificable, no como certeza.`,
    drivers: topPositive.map((item) => `${item.key}: +${item.contribution.toFixed(3)}`),
    contradictions: topNegative.map((item) => `${item.key}: ${item.contribution.toFixed(3)}`),
    evidenceNeeded: input.missingEvidence.map((item) => item.description),
    nextAction: input.missingEvidence.length
      ? 'Completar la evidencia prioritaria y recalcular antes de ejecutar una intervención irreversible.'
      : 'Ejecutar una prueba reversible, registrar exposición y cerrar el outcome en la ventana declarada.',
    nonClaims: ['No garantiza aceptación ni éxito.', 'No aprende de su propio texto.', 'Solo actualiza el modelo con outcomes verificables.'],
    provider: 'degraded',
    model: 'deterministic_fallback',
    generatedByAi: false,
    warnings: input.calibrationStatus === 'BOOTSTRAP_UNCALIBRATED' ? ['MODEL_BOOTSTRAP_UNCALIBRATED'] : [],
  };

  const prompt = JSON.stringify({
    instruction: 'Interpreta la predicción como AMV: explica factores, tensiones, evidencia faltante y siguiente prueba. No cambies los números. No inventes hechos. Devuelve JSON estricto.',
    outputSchema: {
      headline: 'string',
      reading: 'string',
      drivers: ['string'],
      contradictions: ['string'],
      evidenceNeeded: ['string'],
      nextAction: 'string',
      nonClaims: ['string'],
    },
    prediction: input,
  });

  const result = await runLlmTask({
    task: 'prediction',
    system: 'Eres AMV, meta-observador del System Friction Institute. Interpreta únicamente la evidencia suministrada. Los números son inmutables. Señala incertidumbre, contradicciones y pruebas de retorno. Devuelve solo JSON válido.',
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
    drivers: input.contributions.slice(0, 4).map((item) => `${item.key}: ${item.contribution.toFixed(3)}`),
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
    system: 'Eres AMV en modo post-mortem. Explica por qué falló o acertó una predicción usando solo el residual, calidad de evidencia, fidelidad de intervención, features y estados del modelo. No inventes causas. Devuelve JSON válido.',
    prompt: JSON.stringify({ outputSchema: { headline: 'string', reading: 'string', drivers: ['string'], contradictions: ['string'], evidenceNeeded: ['string'], nextAction: 'string', nonClaims: ['string'] }, input }),
    fallbackResult: JSON.stringify(fallback),
    maxTokens: 900,
  });
  return parseInterpretation(result.result, { ...fallback, warnings: result.warnings }, result.provider, result.model);
}
