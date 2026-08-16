import 'server-only';

import { LIBRARY_IMPACT_CONTEXT_PROFILE } from '@/core/cognitive-spine/profiles/registry';
import { materializeInstitutionalCognitiveSpineProfile } from '@/lib/institution/cognitiveSpineProfileMaterializer';
import { getSfiLibraryManifest } from './manifest';

export const LIBRARY_COGNITIVE_SPINE_IMPACT_CONTRACT = 'SFI-LIBRARY-CT-IMPACT-CONTEXT-1.0' as const;

/**
 * Library impact is an inspection problem, not a default cognition input.
 *
 * The static Library preserves/formalizes artifacts. Until an explicit
 * canonical record links an artifact identity to a Cognitive Spine state
 * transition, artifact -> state-change impact remains UNDEMONSTRATED.
 */
export async function inspectLibraryCognitiveSpineImpact() {
  const inspectedAt = new Date().toISOString();
  const manifest = getSfiLibraryManifest();

  const materialized = await materializeInstitutionalCognitiveSpineProfile({
    sourceCutoff: inspectedAt,
    executionId: `library-impact:${crypto.randomUUID()}`,
    createdAt: inspectedAt,
    profileId: LIBRARY_IMPACT_CONTEXT_PROFILE.profileId,
    consume: false,
  }).then((value) => ({ ok: true as const, value, warning: null }))
    .catch((error) => ({
      ok: false as const,
      value: null,
      warning: `library_cognitive_spine_unavailable:${error instanceof Error ? error.message : String(error)}`,
    }));

  const cognitiveSpine = materialized.ok
    ? {
        available: true as const,
        consumed: false as const,
        snapshotId: materialized.value.snapshot.snapshotId,
        snapshotHash: materialized.value.snapshot.snapshotHash,
        sourceCutoff: materialized.value.snapshot.semanticPayload.sourceCutoff,
        projectionProfile: materialized.value.profile.profileId,
        profileVersion: materialized.value.profile.version,
        lineageRoot: materialized.value.snapshot.semanticPayload.lineageRoot,
        sourceCount: materialized.value.snapshot.semanticPayload.derivedState.sourceCount,
        verificationDebt: materialized.value.snapshot.semanticPayload.verificationDebt,
        consumptionTrace: materialized.value.trace,
        warning: null,
      }
    : {
        available: false as const,
        consumed: false as const,
        snapshotId: null,
        snapshotHash: null,
        sourceCutoff: inspectedAt,
        projectionProfile: LIBRARY_IMPACT_CONTEXT_PROFILE.profileId,
        profileVersion: LIBRARY_IMPACT_CONTEXT_PROFILE.version,
        lineageRoot: null,
        sourceCount: null,
        verificationDebt: null,
        consumptionTrace: null,
        warning: materialized.warning,
      };

  return {
    contractVersion: LIBRARY_COGNITIVE_SPINE_IMPACT_CONTRACT,
    inspectedAt,
    library: {
      packageName: manifest.packageName,
      packageVersion: manifest.version,
      artifacts: manifest.documents.map((document) => ({
        id: document.id,
        title: document.title,
        kind: document.kind,
        status: document.status,
        publicPath: document.publicPath,
      })),
      publicSurfaceRemainsStatic: true as const,
      publicSurfaceReadsPrivateCognitiveState: false as const,
    },
    cognitiveSpine,
    impactAssessment: {
      status: 'UNDEMONSTRATED' as const,
      impactLinks: [] as Array<{
        artifactId: string;
        artifactHash: string;
        transitionId: string;
        epistemicAssessmentRef: string;
      }>,
      artifactIdentityStatus: 'PARTIAL_ID_AND_PACKAGE_VERSION_ONLY' as const,
      artifactContentHashRegistryAvailable: false as const,
      reason: 'No canonical artifact-to-Cognitive-Spine-transition relationship is currently registered, and Library artifact content hashes are not yet part of the static manifest identity contract.',
      requiredForDemonstratedAssociation: [
        'stable artifact identity including content hash and version',
        'canonical event recording the artifact use/admission',
        'explicit transition reference',
        'epistemic assessment of the artifact-to-transition relationship',
        'lineage proving the association is not inherited from the resulting snapshot itself',
      ],
    },
    invariants: {
      storageCreatesEvidence: false as const,
      artifactAssociationImpliesCausality: false as const,
      unavailableCtBlocksLibrary: false as const,
      ctContextConsumedByLibraryRead: false as const,
    },
    rule: 'Library preservation does not create evidence. Artifact association is not causality. Cognitive Spine remains available for ROOT inspection but is not consumed by ordinary Library reads.',
  };
}
