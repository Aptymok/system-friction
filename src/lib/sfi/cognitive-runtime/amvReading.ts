import type { AmvEvidenceAgentResult } from '@/lib/amv/agents/evidenceAgent';
import type { AmvGraphState } from '@/lib/amv/core/amvGraphTypes';

/**
 * AMVReading — ADR-004.
 *
 * Envelope-only contract. Does not alter, extend, or duplicate AMV's own result
 * types (AmvEvidenceAgentResult, AmvGraphState) — it wraps them as-is with common
 * fields PhenomenonRelay needs to translate a reading into a CognitiveEvent.
 *
 * Runtime boundary:
 * - Signal Vane and Cluster Atlas are live registered AMV scopes and can produce
 *   bounded scoped decisions through amvRuntime.
 * - Their `*-agent` files are non-executing instrument descriptors, not structured
 *   reading producers. Their standalone ContextBuilder wrappers are not the owner
 *   of the live path; createEcosystemScope/buildEcosystemContext is.
 * - Predictive Engine is a separate persisted learning subsystem with its own
 *   governed models/runs/outcomes and an AMV observational scope. It must not be
 *   collapsed into the stochastic-projection sandbox operator.
 *
 * Therefore this union contains only structured Understanding Layer outputs that
 * currently cross PhenomenonRelay. A registered scope does not automatically earn
 * a CognitiveEvent shape or write authority.
 *
 * AMVReading never carries authority. Per ADR-002, nothing in this type is ever
 * written to institutional memory directly by AMV — only the Runtime-side bridge
 * decides what becomes a CognitiveEvent.
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
