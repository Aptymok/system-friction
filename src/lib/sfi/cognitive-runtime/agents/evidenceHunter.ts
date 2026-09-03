import type { KernelContext, KernelEvidence } from '../kernelContext';
import { materialEvidenceCoverage, materialEvidenceView } from '../materialEvidence';

export interface EvidenceRequirement {
  question: string;
  missing: boolean;
  reason: string;
  confidence: number;
  basis?: string;
}

type Row = Record<string, unknown>;

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function statement(value: unknown) {
  if (typeof value === 'string') return value.trim();
  const item = row(value);
  for (const key of ['statement', 'description', 'claim', 'question', 'reason']) {
    const candidate = item[key];
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  return '';
}

function tokens(value: string) {
  return [...new Set(value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().match(/[a-z0-9]{4,}/g) ?? [])];
}

function overlapText(left: string, right: string) {
  const leftTokens = tokens(left);
  if (!leftTokens.length) return 0;
  const rightTokens = new Set(tokens(right));
  return leftTokens.filter((token) => rightTokens.has(token)).length / leftTokens.length;
}

function overlapScore(hypothesis: { statement: string }, evidence: KernelEvidence) {
  return overlapText(hypothesis.statement, JSON.stringify(evidence.payload));
}

function materiallyRelated(hypothesis: { id: string; statement: string }, evidence: KernelEvidence) {
  const payload = row(evidence.payload);
  const refs = [payload.refs, payload.supportRefs, payload.hypothesisRefs]
    .flatMap((value) => Array.isArray(value) ? value : [])
    .filter((value): value is string => typeof value === 'string');
  if (refs.includes(hypothesis.id)) return true;
  return overlapScore(hypothesis, evidence) >= 0.35;
}

function externallyRelated(hypothesis: { statement: string }, evidence: KernelEvidence) {
  const payload = row(evidence.payload);
  const klass = typeof payload.epistemicClass === 'string' ? payload.epistemicClass.toLowerCase() : '';
  if (klass !== 'source_claim') return false;
  return overlapScore(hypothesis, evidence) >= 0.25;
}

function materialSupportsStatement(value: string, evidence: KernelEvidence[]) {
  return evidence.some((item) => overlapText(value, JSON.stringify(item.payload)) >= 0.35);
}

export function EvidenceHunterAgent(context: KernelContext): KernelContext {
  const requirements: EvidenceRequirement[] = [];
  const hypotheses = context.hypotheses ?? [];
  const materialEvidence = materialEvidenceView(context);
  const coverage = materialEvidenceCoverage(context);
  const partition = row(context.metadata?.materialEpistemicPartition);
  const unresolved = [partition.missing, partition.unresolved, context.metadata?.materialUnresolved]
    .flatMap((value) => Array.isArray(value) ? value : value ? [value] : [])
    .map(statement)
    .filter(Boolean);
  const sourceClaims = (context.evidence ?? []).filter((item) => String(row(item.payload).epistemicClass ?? '').toLowerCase() === 'source_claim');
  const externalCorroboration: Array<{ hypothesisId: string; sourceClaimRefs: string[] }> = [];
  const reusedForUnresolved: string[] = [];
  const reusedForHypotheses: Array<{ hypothesisId: string; evidenceRefs: string[] }> = [];

  for (const unresolvedStatement of [...new Set(unresolved)].slice(0, 20)) {
    if (materialSupportsStatement(unresolvedStatement, materialEvidence)) {
      reusedForUnresolved.push(unresolvedStatement);
      continue;
    }
    requirements.push({
      question: unresolvedStatement,
      missing: true,
      reason: 'La observación material sigue registrándolo como faltante o no resuelto después de reutilizar la evidencia persistida disponible.',
      confidence: 1,
      basis: 'STRUCTURED_MATERIAL_MISSING_AFTER_EXISTING_EVIDENCE_REUSE',
    });
  }

  for (const hypothesis of hypotheses) {
    const relatedEvidence = materialEvidence.filter((item) => materiallyRelated(hypothesis, item));
    const relatedExternal = sourceClaims.filter((item) => externallyRelated(hypothesis, item));
    if (relatedExternal.length) {
      externalCorroboration.push({ hypothesisId: hypothesis.id, sourceClaimRefs: relatedExternal.map((item) => item.id).slice(0, 8) });
    }
    if (relatedEvidence.length) {
      reusedForHypotheses.push({ hypothesisId: hypothesis.id, evidenceRefs: relatedEvidence.map((item) => item.id).slice(0, 12) });
      continue;
    }
    requirements.push({
      question: `¿Qué observación o medición discriminante sostiene la hipótesis: ${hypothesis.statement}?`,
      missing: true,
      reason: relatedExternal.length
        ? 'Existen fuentes externas relacionadas, pero SOURCE_CLAIM no sustituye la observación/medición material requerida.'
        : 'Después de resolver evidencia persistida en targets, ciclos y referencias canónicas, no hay soporte material suficiente para esta hipótesis.',
      confidence: hypothesis.confidence,
      basis: relatedExternal.length ? 'EXTERNAL_CORROBORATION_WITHOUT_MATERIAL_SUPPORT' : 'HYPOTHESIS_WITHOUT_MATERIAL_SUPPORT_AFTER_CANONICAL_REUSE',
    });
  }

  const deduplicated = new Map<string, EvidenceRequirement>();
  for (const requirement of requirements) {
    const key = requirement.question.toLowerCase();
    if (!deduplicated.has(key)) deduplicated.set(key, requirement);
  }

  const generatedEvidence: KernelEvidence[] = [...deduplicated.values()].map((requirement) => ({
    id: crypto.randomUUID(),
    source: 'EvidenceHunterAgent',
    confidence: requirement.confidence,
    payload: {
      epistemicClass: 'missing',
      ...requirement,
    },
  }));

  context.evidence.push(...generatedEvidence);
  context.metadata = {
    ...context.metadata,
    materialEvidenceResolution: coverage,
    evidenceHunter: {
      missingEvidenceDetected: generatedEvidence.length,
      structuredMissingDetected: unresolved.length,
      hypothesesChecked: hypotheses.length,
      materialEvidenceResolved: materialEvidence.length,
      reusedForUnresolved,
      reusedForHypotheses,
      externalSourceClaimsAvailable: sourceClaims.length,
      externalCorroboration,
      reuseStatus: generatedEvidence.length === 0 && materialEvidence.length > 0
        ? 'EXISTING_SUPPORT_REUSED'
        : materialEvidence.length > 0
          ? 'EXISTING_SUPPORT_REUSED_WITH_RESIDUAL_GAPS'
          : 'MATERIAL_SUPPORT_MISSING',
      executedAt: new Date().toISOString(),
      epistemicRule: 'REUSE_EXISTING_MATERIAL_EVIDENCE_BEFORE_REQUESTING_NEW_EVIDENCE; SOURCE_CLAIM_MAY_CORROBORATE_OR_CONTRADICT_BUT_NEVER_REPLACE_MATERIAL_SUPPORT',
    },
  };

  return context;
}
