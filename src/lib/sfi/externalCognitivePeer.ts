export const SFI_EXTERNAL_COGNITIVE_PEER_CONTRACT = 'SFI-EXTERNAL-COGNITIVE-PEER-1.0' as const;

export const SFI_EXTERNAL_COGNITIVE_PEER_POLICY = Object.freeze({
  role: 'GOVERNED_EXTERNAL_COGNITIVE_PEER',
  purpose: 'Allow an authorized external LLM to receive bounded institutional context and return structured reasoning without inheriting institutional sovereignty.',
  contextScope: 'observe',
  submitScope: 'lab:write',
  persistedEpistemicClass: 'INFERRED',
  allowedOutputs: [
    'summary',
    'claims',
    'hypotheses',
    'rivalHypotheses',
    'proposedActions',
    'missingEvidence',
    'limitations',
  ],
  prohibitedEffects: [
    'MINT_ACCEPTED_EVIDENCE',
    'MINT_OBSERVED_RETURN',
    'MINT_TRUTH_CLAIM',
    'MAKE_GOVERNANCE_DECISION',
    'EXPAND_AUTHORITY',
    'ISSUE_CAPABILITY_GRANT',
    'EXECUTE_MATERIAL_ACTION',
    'PROMOTE_LEARNING',
    'PROMOTE_CANON',
  ],
  nextActionRule: 'A peer response may inform governed work. Any proposal, execution, RETURN, learning promotion or canonical admission must traverse its existing SFI owner and authority surface separately.',
} as const);

type Row = Record<string, unknown>;

const FORBIDDEN_KEYS = new Set([
  'return',
  'observedreturn',
  'truth',
  'truthclaim',
  'canon',
  'canonicalclaim',
  'governancedecision',
  'authoritygrant',
  'capabilitygrant',
  'executionreceipt',
  'observedoutcome',
  'learningpromotion',
  'canonicalpromotion',
]);

function normalizedKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function findForbiddenCognitivePeerKey(value: unknown, depth = 0): string | null {
  if (depth > 8 || value == null || typeof value !== 'object') return null;
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 500)) {
      const found = findForbiddenCognitivePeerKey(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  for (const [key, item] of Object.entries(value as Row)) {
    if (FORBIDDEN_KEYS.has(normalizedKey(key))) return key;
    const found = findForbiddenCognitivePeerKey(item, depth + 1);
    if (found) return found;
  }
  return null;
}

function text(value: unknown, max = 12_000) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
}
function confidence(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : null;
}
function strings(value: unknown, limit = 100) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, limit).map((item) => item.trim().slice(0, 2_000))
    : [];
}
function evidenceRefs(value: unknown) {
  return strings(value, 100);
}
function structuredItems(value: unknown, mode: 'claim'|'hypothesis'|'action') {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 100).flatMap((item) => {
    const source = item && typeof item === 'object' && !Array.isArray(item) ? item as Row : {};
    const statement = text(source.statement ?? source.action, 6_000);
    if (!statement) return [];
    if (mode === 'action') {
      return [{
        action: statement,
        rationale: text(source.rationale, 6_000),
        authorityRequired: source.authorityRequired === true,
        reversible: source.reversible === true ? true : source.reversible === false ? false : null,
        evidenceRefs: evidenceRefs(source.evidenceRefs),
      }];
    }
    return [{
      statement,
      confidence: confidence(source.confidence),
      evidenceRefs: evidenceRefs(source.evidenceRefs),
      uncertainty: text(source.uncertainty, 2_000),
      ...(mode === 'hypothesis' ? {
        falsification: text(source.falsification, 4_000),
        expectedSignals: strings(source.expectedSignals, 40),
        contradictionSignals: strings(source.contradictionSignals, 40),
      } : {}),
    }];
  });
}

export function projectExternalCognitivePeerResponse(value: unknown) {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
  return {
    summary: text(input.summary, 20_000),
    claims: structuredItems(input.claims, 'claim'),
    hypotheses: structuredItems(input.hypotheses, 'hypothesis'),
    rivalHypotheses: structuredItems(input.rivalHypotheses, 'hypothesis'),
    proposedActions: structuredItems(input.proposedActions, 'action'),
    missingEvidence: strings(input.missingEvidence, 100),
    limitations: strings(input.limitations, 100),
  };
}

export function projectExternalCognitivePeerModel(value: unknown) {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
  return {
    provider: text(input.provider, 200),
    model: text(input.model, 300),
    sessionRef: text(input.sessionRef, 500),
    responseRef: text(input.responseRef, 500),
    declaredByClient: true,
  };
}
