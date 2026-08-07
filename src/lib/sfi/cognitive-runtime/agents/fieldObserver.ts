import type { KernelContext } from '../kernelContext';

export interface FieldObservationSummary {
  evidenceCount: number;
  sources: string[];
  meanConfidence: number;
  hasEvidence: boolean;
}

/**
 * Observation is read-only with respect to the evidence collection.
 * The previous implementation copied every evidence item back into context.evidence,
 * causing recursive evidence amplification across cycles. The observer now records a
 * bounded summary in metadata only; persisted execution remains the runtime event.
 */
export function FieldObserverAgent(context: KernelContext): KernelContext {
  const evidence = context.evidence ?? [];
  const sources = [...new Set(evidence.map((item) => item.source).filter(Boolean))];
  const meanConfidence = evidence.length
    ? evidence.reduce((sum, item) => sum + Math.max(0, Math.min(1, Number(item.confidence) || 0)), 0) / evidence.length
    : 0;

  const summary: FieldObservationSummary = {
    evidenceCount: evidence.length,
    sources,
    meanConfidence,
    hasEvidence: evidence.length > 0,
  };

  context.metadata = {
    ...context.metadata,
    fieldObserver: {
      ...summary,
      executedAt: new Date().toISOString(),
      epistemicRule: 'READ_ONLY_OBSERVATION_DOES_NOT_CREATE_NEW_EVIDENCE',
    },
  };

  return context;
}
