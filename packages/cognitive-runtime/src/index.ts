export type CognitiveThoughtType =
  | 'CONTRADICTION'
  | 'CLOSURE'
  | 'FIELD_NOTE'
  | 'INHIBITION_CHECK';

export type CognitiveEvidence = {
  id?: string;
  type: string;
  content?: string;
  confidence?: number;
  polarity?: 'supports' | 'contradicts' | 'neutral';
};

export type CognitiveThoughtInput = {
  thoughtType?: string;
  claim?: string;
  evidence?: CognitiveEvidence[];
  thresholds?: {
    minEvidenceCount?: number;
    minEvidenceTypes?: number;
    minConfidence?: number;
  };
};

export type CognitiveClosureResult = {
  thoughtType: CognitiveThoughtType;
  claim: string;
  status: 'closed' | 'inhibited';
  inhibited: boolean;
  reason: string | null;
  confidence: number;
  evidenceCount: number;
  evidenceTypes: string[];
  contradiction: {
    detected: boolean;
    score: number;
    markers: string[];
  };
  thresholds: {
    minEvidenceCount: number;
    minEvidenceTypes: number;
    minConfidence: number;
  };
};

const contradictionMarkers = [
  'pero',
  'aunque',
  'sin embargo',
  'no obstante',
  'contradiccion',
  'contradicción',
  'inconsistente',
  'incompatible',
];

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function normalizeType(value: unknown): CognitiveThoughtType {
  const raw = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (raw === 'CONTRADICCION') return 'CONTRADICTION';
  if (raw === 'CONTRADICTION' || raw === 'CLOSURE' || raw === 'FIELD_NOTE' || raw === 'INHIBITION_CHECK') return raw;
  return 'FIELD_NOTE';
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function averageConfidence(evidence: CognitiveEvidence[]) {
  if (evidence.length === 0) return 0;
  const total = evidence.reduce((sum, item) => sum + clamp01(Number(item.confidence ?? 0.5)), 0);
  return clamp01(total / evidence.length);
}

function contradictionFor(claim: string, evidence: CognitiveEvidence[]) {
  const haystack = [claim, ...evidence.map((item) => item.content ?? '')].join(' ').toLowerCase();
  const markers = contradictionMarkers.filter((marker) => haystack.includes(marker));
  const supports = evidence.some((item) => item.polarity === 'supports');
  const contradicts = evidence.some((item) => item.polarity === 'contradicts');
  const polarityScore = supports && contradicts ? 0.45 : 0;
  const markerScore = Math.min(0.55, markers.length * 0.18);
  const score = clamp01(markerScore + polarityScore);

  return {
    detected: score >= 0.35,
    score: Number(score.toFixed(4)),
    markers,
  };
}

export function evaluateCognitiveClosure(input: CognitiveThoughtInput): CognitiveClosureResult {
  const thoughtType = normalizeType(input.thoughtType);
  const claim = normalizeText(input.claim);
  const evidence = Array.isArray(input.evidence)
    ? input.evidence.filter((item) => item && typeof item.type === 'string' && item.type.trim().length > 0)
    : [];
  const evidenceTypes = Array.from(new Set(evidence.map((item) => item.type.trim())));
  const contradiction = contradictionFor(claim, evidence);
  const thresholds = {
    minEvidenceCount: input.thresholds?.minEvidenceCount ?? (thoughtType === 'CONTRADICTION' || contradiction.detected ? 3 : 2),
    minEvidenceTypes: input.thresholds?.minEvidenceTypes ?? (thoughtType === 'CONTRADICTION' || contradiction.detected ? 2 : 1),
    minConfidence: input.thresholds?.minConfidence ?? 0.45,
  };
  const confidence = Number(averageConfidence(evidence).toFixed(4));
  const reason = evidence.length < thresholds.minEvidenceCount
    ? 'insufficient_evidence_count'
    : evidenceTypes.length < thresholds.minEvidenceTypes
      ? 'insufficient_evidence_types'
      : confidence < thresholds.minConfidence
        ? 'confidence_below_threshold'
        : claim.length === 0
          ? 'missing_claim'
          : null;

  return {
    thoughtType,
    claim,
    status: reason ? 'inhibited' : 'closed',
    inhibited: Boolean(reason),
    reason,
    confidence,
    evidenceCount: evidence.length,
    evidenceTypes,
    contradiction,
    thresholds,
  };
}
