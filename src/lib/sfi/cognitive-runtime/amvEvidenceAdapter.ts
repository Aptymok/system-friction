import type { AmvMemoryDelta } from '@/lib/amv/amv-core';
import type { AmvEvidenceRecord } from '@/lib/amv/core/evidenceTypes';


function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}


function trustFromInference(
  delta: AmvMemoryDelta
): AmvEvidenceRecord['trust'] {

  if (delta.inference.sourceTrust === 'verified') {
    return 'verified';
  }

  if (delta.inference.sourceTrust === 'declared') {
    return 'declared';
  }

  if (delta.inference.sourceTrust === 'inferred') {
    return 'inferred';
  }

  return 'unknown';
}


function buildLineage(delta: AmvMemoryDelta): string[] {
  return [
    `amv:${delta.module}`,
    `session:${delta.sessionId}`,
    `memory:${delta.id}`,
    `hash:${delta.evidenceHash}`,
  ];
}


export function adaptAmvMemoryToEvidence(
  delta: AmvMemoryDelta
): AmvEvidenceRecord {

  return {
    id: delta.id,

    trust: trustFromInference(delta),

    sourceId: delta.sessionId,

    sourceLabel: `AMV:${delta.module}`,

    observedAt: delta.createdAt,

    operator: 'SFI_AMV_RUNTIME',

    summary: delta.summary,

    lineage: buildLineage(delta),

    confidence: clamp01(
      1 - delta.inference.uncertainty
    ),

    payloadHash: delta.evidenceHash,

    changesRoute:
      delta.inference.requiredAction === 'propose_observation'
      ||
      delta.inference.requiredAction === 'ask_human',

    // changesRisk and closesLoop are decisions, not transformations -- this
    // adapter has no authority to make them (Principio de Singularidad
    // Funcional, ADR-000/002). The 0.7 impact cutoff and 0.65 uncertainty
    // cutoff that used to live here were invented on the spot, never reviewed.
    // Neutral default until risk_agent (registry.ts, currently GATED) exists
    // and can own this policy explicitly.
    changesRisk: false,

    closesLoop: false,
  };
}
