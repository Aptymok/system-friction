import type { KernelContext } from '../kernelContext';

export interface FieldObservationSummary {
  evidenceCount: number;
  sources: string[];
  meanConfidence: number;
  hasEvidence: boolean;
  epistemicCounts: Record<string, number>;
  materialMeasurementKeys: string[];
  missingObservationCount: number;
}

type Row = Record<string, unknown>;

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function epistemicClass(value: unknown) {
  const candidate = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return candidate || 'unclassified';
}

/**
 * Observation is read-only with respect to the evidence collection.
 * It summarizes what is actually present, including epistemic classes and material
 * measurements, without copying evidence back into the collection or inventing facts.
 */
export function FieldObserverAgent(context: KernelContext): KernelContext {
  const evidence = context.evidence ?? [];
  const sources = [...new Set(evidence.map((item) => item.source).filter(Boolean))];
  const meanConfidence = evidence.length
    ? evidence.reduce((sum, item) => sum + Math.max(0, Math.min(1, Number(item.confidence) || 0)), 0) / evidence.length
    : 0;
  const epistemicCounts: Record<string, number> = {};
  for (const item of evidence) {
    const klass = epistemicClass(row(item.payload).epistemicClass);
    epistemicCounts[klass] = (epistemicCounts[klass] ?? 0) + 1;
  }

  const materialMeasurements = row(context.metadata?.materialMeasurements);
  const materialMeasurementKeys = Object.entries(materialMeasurements)
    .filter(([, value]) => value !== null && value !== undefined && !(Array.isArray(value) && value.length === 0))
    .map(([key]) => key)
    .slice(0, 24);
  const partition = row(context.metadata?.materialEpistemicPartition);
  const missingObservationCount = [partition.missing, partition.unresolved, context.metadata?.materialUnresolved]
    .reduce((total, value) => total + (Array.isArray(value) ? value.length : value ? 1 : 0), 0);

  const summary: FieldObservationSummary = {
    evidenceCount: evidence.length,
    sources,
    meanConfidence,
    hasEvidence: evidence.length > 0,
    epistemicCounts,
    materialMeasurementKeys,
    missingObservationCount,
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
