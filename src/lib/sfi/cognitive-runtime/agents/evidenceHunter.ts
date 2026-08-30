import type { KernelContext, KernelEvidence } from '../kernelContext';

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

function overlapScore(hypothesis: { statement: string }, evidence: KernelEvidence) {
  const hypothesisTokens = tokens(hypothesis.statement);
  if (!hypothesisTokens.length) return 0;
  const evidenceTokens = new Set(tokens(JSON.stringify(evidence.payload)));
  return hypothesisTokens.filter((token) => evidenceTokens.has(token)).length / hypothesisTokens.length;
}

function materiallyRelated(hypothesis: { id: string; statement: string }, evidence: KernelEvidence) {
  const payload = row(evidence.payload);
  const klass = typeof payload.epistemicClass === 'string' ? payload.epistemicClass.toLowerCase() : '';
  if (!['observed', 'derived'].includes(klass)) return false;
  const refs = [payload.refs, payload.supportRefs, payload.hypothesisRefs]
    .flatMap((value) => Array.isArray(value) ? value : [])
    .filter((value): value is string => typeof value === 'string');
  if (refs.includes(hypothesis.id)) return true;
  const score = overlapScore(hypothesis, evidence);
  return score >= 0.35;
}

function externallyRelated(hypothesis: { statement: string }, evidence: KernelEvidence) {
  const payload = row(evidence.payload);
  const klass = typeof payload.epistemicClass === 'string' ? payload.epistemicClass.toLowerCase() : '';
  if (klass !== 'source_claim') return false;
  return overlapScore(hypothesis, evidence) >= 0.25;
}

export function EvidenceHunterAgent(context: KernelContext): KernelContext {
  const requirements: EvidenceRequirement[] = [];
  const hypotheses = context.hypotheses ?? [];
  const evidence = context.evidence ?? [];
  const partition = row(context.metadata?.materialEpistemicPartition);
  const unresolved = [partition.missing, partition.unresolved, context.metadata?.materialUnresolved]
    .flatMap((value) => Array.isArray(value) ? value : value ? [value] : [])
    .map(statement)
    .filter(Boolean);
  const sourceClaims = evidence.filter((item) => String(row(item.payload).epistemicClass ?? '').toLowerCase() === 'source_claim');
  const externalCorroboration: Array<{ hypothesisId: string; sourceClaimRefs: string[] }> = [];

  for (const unresolvedStatement of [...new Set(unresolved)].slice(0, 20)) {
    requirements.push({
      question: unresolvedStatement,
      missing: true,
      reason: 'La observación material ya lo registra como faltante o no resuelto.',
      confidence: 1,
      basis: 'STRUCTURED_MATERIAL_MISSING_OR_UNRESOLVED',
    });
  }

  for (const hypothesis of hypotheses) {
    const relatedEvidence = evidence.filter((item) => materiallyRelated(hypothesis, item));
    const relatedExternal = sourceClaims.filter((item) => externallyRelated(hypothesis, item));
    if (relatedExternal.length) {
      externalCorroboration.push({ hypothesisId: hypothesis.id, sourceClaimRefs: relatedExternal.map((item) => item.id).slice(0, 8) });
    }
    if (relatedEvidence.length === 0) {
      requirements.push({
        question: `¿Qué observación o medición discriminante sostiene la hipótesis: ${hypothesis.statement}?`,
        missing: true,
        reason: relatedExternal.length
          ? 'Existen fuentes externas relacionadas, pero SOURCE_CLAIM no sustituye la observación/medición material requerida.'
          : 'No hay una observación/medición estructurada asociada de forma suficiente dentro del contexto actual.',
        confidence: hypothesis.confidence,
        basis: relatedExternal.length ? 'EXTERNAL_CORROBORATION_WITHOUT_MATERIAL_SUPPORT' : 'HYPOTHESIS_WITHOUT_MATERIAL_SUPPORT',
      });
    }
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
    evidenceHunter: {
      missingEvidenceDetected: generatedEvidence.length,
      structuredMissingDetected: unresolved.length,
      hypothesesChecked: hypotheses.length,
      externalSourceClaimsAvailable: sourceClaims.length,
      externalCorroboration,
      executedAt: new Date().toISOString(),
      epistemicRule: 'SOURCE_CLAIM_MAY_CORROBORATE_OR_CONTRADICT_BUT_NEVER_REPLACE_MATERIAL_SUPPORT',
    },
  };

  return context;
}
