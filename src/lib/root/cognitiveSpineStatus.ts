import 'server-only';

import { ROOT_GOVERNANCE_CONTEXT_PROFILE } from '@/core/cognitive-spine/profiles/registry';
import {
  COGNITIVE_SPINE_INTEGRATION_STATUS_CONTRACT,
  COGNITIVE_SPINE_SURFACE_INTEGRATIONS,
  COGNITIVE_SPINE_TECHNICAL_CLAIM_BOUNDARY,
} from '@/core/cognitive-spine/surfaceIntegrationRegistry';
import { materializeInstitutionalCognitiveSpineProfile } from '@/lib/institution/cognitiveSpineProfileMaterializer';

export const ROOT_COGNITIVE_SPINE_STATUS_CONTRACT = 'SFI-ROOT-CT-STATUS-1.0' as const;

export async function readRootCognitiveSpineStatus() {
  const inspectedAt = new Date().toISOString();
  try {
    const materialized = await materializeInstitutionalCognitiveSpineProfile({
      sourceCutoff: inspectedAt,
      executionId: `root-ct-status:${crypto.randomUUID()}`,
      createdAt: inspectedAt,
      profileId: ROOT_GOVERNANCE_CONTEXT_PROFILE.profileId,
      consume: false,
    });
    const state = materialized.snapshot.semanticPayload;

    return {
      contractVersion: ROOT_COGNITIVE_SPINE_STATUS_CONTRACT,
      integrationContractVersion: COGNITIVE_SPINE_INTEGRATION_STATUS_CONTRACT,
      available: true as const,
      consumed: false as const,
      inspectedAt,
      snapshot: {
        id: materialized.snapshot.snapshotId,
        hash: materialized.snapshot.snapshotHash,
        sourceCutoff: state.sourceCutoff,
        projectorVersion: state.projectorVersion,
        policyVersion: state.policyVersion,
        projectionProfile: materialized.profile.profileId,
        profileVersion: materialized.profile.version,
      },
      state: {
        sources: state.derivedState.sourceCount,
        evidence: state.evidenceRefs.length,
        hypotheses: state.hypothesisRefs.length,
        contradictions: state.contradictionRefs.length,
        questions: state.questionRefs.length,
        freezes: state.freezeRefs.length,
        memory: state.memoryRefs.length,
        decisions: state.decisionRefs.length,
        verificationDebt: state.verificationDebt.absolute,
        verificationDebtByType: state.verificationDebt.byType,
        temporalState: state.temporalState,
        lineageRoot: state.lineageRoot,
      },
      surfaces: COGNITIVE_SPINE_SURFACE_INTEGRATIONS.map((entry) => ({
        surface: entry.surface,
        profileId: entry.profileId,
        posture: entry.posture,
        operationalCtConsumed: entry.operationalCtConsumed,
        ctRequiredMiddleware: entry.ctRequiredMiddleware,
      })),
      claimBoundary: COGNITIVE_SPINE_TECHNICAL_CLAIM_BOUNDARY,
      warnings: materialized.warnings,
      internalRefsExposed: false as const,
    };
  } catch (error) {
    return {
      contractVersion: ROOT_COGNITIVE_SPINE_STATUS_CONTRACT,
      integrationContractVersion: COGNITIVE_SPINE_INTEGRATION_STATUS_CONTRACT,
      available: false as const,
      consumed: false as const,
      inspectedAt,
      snapshot: null,
      state: null,
      surfaces: COGNITIVE_SPINE_SURFACE_INTEGRATIONS.map((entry) => ({
        surface: entry.surface,
        profileId: entry.profileId,
        posture: entry.posture,
        operationalCtConsumed: entry.operationalCtConsumed,
        ctRequiredMiddleware: entry.ctRequiredMiddleware,
      })),
      claimBoundary: COGNITIVE_SPINE_TECHNICAL_CLAIM_BOUNDARY,
      warnings: [`root_cognitive_spine_status_unavailable:${error instanceof Error ? error.message : String(error)}`],
      internalRefsExposed: false as const,
    };
  }
}
