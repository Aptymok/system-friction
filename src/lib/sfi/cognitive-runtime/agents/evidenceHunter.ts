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

function materiallyRelated(hypothesis: { id: string; statement: string }, evidence: KernelEvidence) {
  const payload = row(evidence.payload);
  const klass = typeof payload.epistemicClass === 'string' ? payload.epistemicClass.toLowerCase() : '';
  if (!['observed', 'derived'].includes(klass)) return false;
  const refs = [payload.refs, payload.supportRefs, payload.hypothesisRefs]
    .flatMap((value) => Array.isArray(value) ? value : [])
    .filter((value): value is string => typeof value === 'string');
  if (refs.includes(hypothesis.id)) return true;
  const hypothesisTokens = tokens(hypothesis.statement);
  if (!hypothesisTokens.length) return false;
  const evidenceTokens = new Set(tokens(JSON.stringify(payload)));
  const overlap = hypothesisTokens.filter((token) => evidenceTokens.has(token)).length;
  return overlap >= Math.min(3, Math.max(1, Math.ceil(hypothesisTokens.length * 0.35)));
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
    if (relatedEvidence.length === 0) {
      requirements.push({
        question: `¿Qué observación o medición discriminante sostiene la hipótesis: ${hypothesis.statement}?`,
        missing: true,
        reason: 'No hay una observación/medición estructurada asociada de forma suficiente dentro del contexto actual.',
        confidence: hypothesis.confidence,
        basis: 'HYPOTHESIS_WITHOUT_MATERIAL_SUPPORT',
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
      executedAt: new Date().toISOString(),
      epistemicRule: 'MISSING_EVIDENCE_REQUIREMENTS_ARE_NOT_SUPPORTING_EVIDENCE',
    },
  };

  return context;
}
