import type { CanonicalGraphNode } from '../../../packages/graph/src';
import { buildRealityPassport } from '../graph/realityChainProjection';

/**
 * Read-only laboratory preview. This is NOT canonical graph insertion.
 * It cannot mint observed evidence, authority, execution or RETURN.
 */
export type ResearchPassportInput = {
  objectId: string;
  title: string;
  epistemicState: string;
  returnState: string;
  evidenceRefs: string[];
  lineage: string[];
  version: string;
  updatedAt: string | null;
  limitations: string[];
  findings: Array<{ id: string; state: string; evidenceRefs: string[] }>;
};

export function previewMethodLabRealityPassport(input: ResearchPassportInput) {
  const known = new Set(['OBSERVED', 'DECLARED', 'DERIVED', 'INFERRED', 'SIMULATED']);
  const epistemic = known.has(input.epistemicState) ? input.epistemicState : 'UNKNOWN';
  const traceRefs = [...new Set([...input.evidenceRefs, ...input.lineage])];
  const node: CanonicalGraphNode = {
    nodeId: `method-lab-preview:${input.objectId}`,
    label: input.title,
    ontologyType: 'HYPOTHESIS',
    profile: 'sfi',
    origin: 'METHOD_LAB_READ_ONLY_PROJECTION',
    provenance: 'METHOD_LAB_EVENT_LEDGER',
    lineage: traceRefs,
    attributes: {
      realityChainStage: 'HYPOTHESIS',
      epistemicClass: epistemic,
      sourceVersion: input.version,
      captureTime: input.updatedAt,
      verificationState: 'NOT VERIFIED',
      authority: 'NONE',
      executionState: 'NOT_APPLICABLE',
      expectedReturn: input.returnState === 'PENDING' ? 'INDEPENDENT_EMPIRICAL_CONTRAST_PENDING' : null,
      observedReturn: null,
      nextBestObservation: 'Admissible independent dataset, competent comparator and held-out outcome',
      persisted: false,
      authorityExpanded: false,
      mayMintReturn: false,
      mayPromoteCanon: false,
    },
    createdAt: input.updatedAt ?? '1970-01-01T00:00:00.000Z',
    updatedAt: input.updatedAt ?? '1970-01-01T00:00:00.000Z',
  };
  const passport = buildRealityPassport(node, []);
  return {
    representation: 'READ_ONLY_METHOD_LAB_PREVIEW' as const,
    sourceObjectId: input.objectId,
    graphPersisted: false as const,
    canonicalAuthority: false as const,
    completeness: {
      stagePresent: true,
      verificationObserved: false,
      observedReturnPresent: false,
      linkToCanonicalGraphVerified: false,
      provenanceRefs: traceRefs.length,
      findingsRegistered: input.findings.length,
    },
    sourceLimitations: [...input.limitations],
    passport,
  };
}
