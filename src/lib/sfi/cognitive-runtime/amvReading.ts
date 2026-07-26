import type { AmvEvidenceAgentResult } from '@/lib/amv/agents/evidenceAgent';
import type { AmvGraphState } from '@/lib/amv/core/amvGraphTypes';

/**
 * AMVReading — ADR-004.
 *
 * Envelope-only contract. Does not alter, extend, or duplicate AMV's own result
 * types (AmvEvidenceAgentResult, AmvGraphState) — it wraps them as-is with common
 * fields PhenomenonRelay needs to translate a reading into a CognitiveEvent.
 *
 * Scope, per ADR-001/IMPLEMENTATION-NOTES: limited to the two Understanding Layer
 * modules confirmed live today (exported via src/lib/amv/agents/index.ts or with
 * their own route). `cluster-atlasAgent` and `signal-vaneAgent` are real files with
 * a defined conceptual role (evidence clustering / signal-gradient detection) but
 * are not exported by the barrel and have no callers — not included here. Adding
 * them is a matter of extending this union, once someone wires them into a live
 * path; it does not require reopening ADR-001/004.
 *
 * AMVReading never carries authority. Per ADR-002, nothing in this type is ever
 * written to institutional memory directly by AMV — only PhenomenonRelay, on the
 * Runtime side, decides what becomes a CognitiveEvent.
 */
export type AMVReadingKind = 'evidence_assessment' | 'graph_state';

type AMVReadingEnvelope<Kind extends AMVReadingKind> = {
  kind: Kind;
  scope: string;
  producedAt: string;
};

export type AMVEvidenceAssessmentReading = AMVReadingEnvelope<'evidence_assessment'> & {
  producedBy: 'evidenceAgent';
  result: AmvEvidenceAgentResult;
};

export type AMVGraphStateReading = AMVReadingEnvelope<'graph_state'> & {
  producedBy: 'amvGraphBuilder';
  result: AmvGraphState;
};

export type AMVReading = AMVEvidenceAssessmentReading | AMVGraphStateReading;

export function wrapEvidenceReading(scope: string, result: AmvEvidenceAgentResult): AMVEvidenceAssessmentReading {
  return { kind: 'evidence_assessment', scope, producedAt: new Date().toISOString(), producedBy: 'evidenceAgent', result };
}

export function wrapGraphReading(scope: string, result: AmvGraphState): AMVGraphStateReading {
  return { kind: 'graph_state', scope, producedAt: new Date().toISOString(), producedBy: 'amvGraphBuilder', result };
}

