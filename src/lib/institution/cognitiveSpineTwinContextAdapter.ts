import { COGNITIVE_TWIN_CONTRACT_VERSION } from '@/core/cognitive-twin/contract';
import type { StudioTwinContext } from '@/core/cognitive-twin/studioContext';
import type { CognitiveSpineSnapshot } from '@/core/cognitive-spine/contracts/snapshot';
import type { InstitutionalCognitiveSpineSourcePlane } from './cognitiveSpineInstitutionalSourcePlane';

/**
 * Converts only memory/decision values whose canonical refs are present in a
 * sealed Cognitive Spine snapshot into the bounded legacy Twin-context shape
 * used by existing Runtime/Studio LLM adapters.
 *
 * The function cannot add records that are absent from the snapshot and does
 * not turn contextual memory/decisions into evidence.
 */
export function buildBoundedTwinContextFromCognitiveSpine(input: {
  snapshot: CognitiveSpineSnapshot;
  sourcePlane: InstitutionalCognitiveSpineSourcePlane;
}): StudioTwinContext {
  const visibleMemoryRefs = new Set(input.snapshot.semanticPayload.memoryRefs);
  const visibleDecisionRefs = new Set(input.snapshot.semanticPayload.decisionRefs);

  return {
    contractVersion: COGNITIVE_TWIN_CONTRACT_VERSION,
    memory: input.sourcePlane.memory
      .filter((item) => visibleMemoryRefs.has(`sfi_amv_memory:${item.id}`))
      .map(({ id: _id, createdAt: _createdAt, ...item }) => item),
    decisions: input.sourcePlane.decisions
      .filter((item) => visibleDecisionRefs.has(`sfi_cognitive_twin_decisions:${item.id}`))
      .map(({ approvedAt: _approvedAt, ...item }) => item),
    warnings: input.sourcePlane.warnings,
  };
}
