import type { WorldSpectLensDomain, WorldSpectVector } from '@/lib/worldspect/vector-contract';
import type { ScoreFrictionAuditResult, ScoreFrictionGenerativeOption, ScoreFrictionObject, ScoreFrictionObjectMetrics, ScoreFrictionWorldContrast } from './object-friction-contract';
import { readScoreFrictionWorldspect } from './worldspect-convergence';
import type { ScoreFrictionGenerationRequest } from './types';

function clamp01(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}

function num(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function textLength(value: string | null) {
  return value ? value.length : 0;
}

export function deriveObjectMetrics(object: ScoreFrictionObject, vectors: Record<string, unknown>): ScoreFrictionObjectMetrics {
  const semantic = (vectors.semantic_vector && typeof vectors.semantic_vector === 'object') ? vectors.semantic_vector as Record<string, unknown> : {};
  const memetic = (vectors.memetic_vector && typeof vectors.memetic_vector === 'object') ? vectors.memetic_vector as Record<string, unknown> : {};
  const platform = (vectors.platform_vector && typeof vectors.platform_vector === 'object') ? vectors.platform_vector as Record<string, unknown> : {};
  const cultural = (vectors.mihm_cultural_vector && typeof vectors.mihm_cultural_vector === 'object') ? vectors.mihm_cultural_vector as Record<string, unknown> : {};
  const lengthDensity = clamp01(textLength(object.semanticText) / 12000);

  return {
    density: clamp01(num(semantic.semantic_density, lengthDensity)),
    semanticPressure: clamp01(num(cultural.NTI_C, num(semantic.pressure, lengthDensity))),
    affectiveLoad: clamp01(num(cultural.IHG_C, num(semantic.affect, 0.5))),
    novelty: clamp01(num(memetic.novelty, num(cultural.VFE, 0.5))),
    recurrence: clamp01(num(memetic.recurrence, num(platform.source_coverage, 0.35))),
    evidenceWeight: clamp01(num(platform.reliability_score, 0.5)),
  };
}

function vectorWeight(vector: WorldSpectVector | null) {
  if (!vector) return 0.5;
  return clamp01((vector.value + vector.trust + (1 - vector.degradation)) / 3);
}

function contrastSummary(domain: WorldSpectLensDomain, friction: number, alignment: number) {
  if (friction >= 0.72) return `Friccion alta contra ${domain}: el objeto se separa del campo y exige lectura cuidadosa.`;
  if (alignment >= 0.68) return `Alineacion fuerte contra ${domain}: el objeto acompana el campo y puede operar como lectura consistente.`;
  return `Friccion media contra ${domain}: el objeto requiere contraste adicional antes de propuesta fuerte.`;
}

export function buildGenerationOptions(requested: ScoreFrictionGenerationRequest): ScoreFrictionGenerativeOption[] {
  const options: Array<Exclude<ScoreFrictionGenerationRequest, false>> = ['strategy', 'image_prompt', 'video_prompt', 'copy', 'storyboard', 'campaign'];
  return options.map((kind) => ({
    kind,
    label: kind.replace(/_/g, ' '),
    enabled: requested === kind,
    requiresExplicitRequest: true,
    reason: requested === kind ? 'Solicitado explicitamente por el usuario.' : 'Disponible despues de auditoria; no se ejecuta automaticamente.',
  }));
}

export async function scoreObjectAgainstWorld(input: {
  object: ScoreFrictionObject;
  vectors: Record<string, unknown>;
  selectedDomain: WorldSpectLensDomain;
  generationRequested: ScoreFrictionGenerationRequest;
}): Promise<ScoreFrictionAuditResult> {
  const lensResult = await readScoreFrictionWorldspect(input.selectedDomain as any);
  const lens = lensResult.ok ? lensResult.data : {
    selectedDomain: input.selectedDomain,
    supportLevel: 'weak' as const,
    sourceCoverage: 0,
    selectedVector: null,
    worldWsi: 0,
    worldNti: 0,
    warnings: ['worldspect_lens_unavailable'],
  };
  const objectMetrics = deriveObjectMetrics(input.object, input.vectors);
  const worldLoad = vectorWeight(lens.selectedVector);
  const objectLoad = clamp01((objectMetrics.semanticPressure + objectMetrics.affectiveLoad + objectMetrics.novelty) / 3);
  const dissonance = clamp01(Math.abs(objectLoad - worldLoad));
  const alignment = clamp01(1 - dissonance);
  const saturationRisk = clamp01((objectMetrics.recurrence + worldLoad + lens.worldNti) / 3);
  const emergencePotential = clamp01((objectMetrics.novelty + objectMetrics.evidenceWeight + dissonance) / 3);
  const supportPenalty = lens.supportLevel === 'strong' ? 1 : lens.supportLevel === 'partial' ? 0.82 : 0.58;
  const frictionScore = clamp01(((dissonance * 0.45) + (objectMetrics.semanticPressure * 0.25) + (lens.worldNti * 0.2) + (saturationRisk * 0.1)) * supportPenalty);
  const worldContrast: ScoreFrictionWorldContrast = {
    selectedDomain: lens.selectedDomain,
    frictionScore: Number(frictionScore.toFixed(3)),
    alignment: Number(alignment.toFixed(3)),
    dissonance: Number(dissonance.toFixed(3)),
    saturationRisk: Number(saturationRisk.toFixed(3)),
    emergencePotential: Number(emergencePotential.toFixed(3)),
    confidence: Number(clamp01(objectMetrics.evidenceWeight * lens.sourceCoverage * supportPenalty).toFixed(3)),
    summary: contrastSummary(lens.selectedDomain, frictionScore, alignment),
    warnings: lens.warnings,
  };

  return {
    object: input.object,
    objectMetrics,
    lens,
    worldContrast,
    generationRequested: input.generationRequested,
    generationOptions: buildGenerationOptions(input.generationRequested),
  };
}

