import 'server-only';

import { COGNITIVE_TWIN_CONTRACT_VERSION } from '@/core/cognitive-twin/contract';
import { WORLDSPECT_CONTEXT_PROFILE } from '@/core/cognitive-spine/profiles/registry';
import { canonicalSha256 } from '@/core/cognitive-spine/serialization/canonicalSerialize';
import { materializeInstitutionalCognitiveSpineProfile } from '@/lib/institution/cognitiveSpineProfileMaterializer';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const WORLDSPECT_COGNITIVE_SPINE_CONTRAST_CONTRACT = 'SFI-WORLDSPECT-CT-CONTRAST-1.0' as const;

export async function recordWorldSpectPostObservationCognitiveSpineContrast(input: {
  worldspectSnapshotId: string;
  worldspectSnapshotHash: string;
  observedAt: string;
  priorStateCutoff: string;
  sourceState: 'observed' | 'degraded';
  confidence: number;
  wsi: number | null;
  nti: number | null;
  degradedSources: string[];
}) {
  const recordedAt = new Date().toISOString();
  const executionId = `worldspect:post-observation:${input.worldspectSnapshotId}`;

  // This happens only after the external observation has already been
  // persisted. The cutoff points to the state available before observation
  // began, so prior institutional expectations cannot become observation.
  const cognitiveSpine = await materializeInstitutionalCognitiveSpineProfile({
    sourceCutoff: input.priorStateCutoff,
    executionId,
    createdAt: recordedAt,
    profileId: WORLDSPECT_CONTEXT_PROFILE.profileId,
    consume: true,
    consumptionReason: 'post-observation contrast against prior institutional state',
  });

  const prior = cognitiveSpine.snapshot.semanticPayload;
  const contrastPayload = {
    contractVersion: WORLDSPECT_COGNITIVE_SPINE_CONTRAST_CONTRACT,
    epistemicClass: 'DERIVED' as const,
    externalObservation: {
      ref: `worldspect_snapshots:${input.worldspectSnapshotId}`,
      snapshotHash: input.worldspectSnapshotHash,
      observedAt: input.observedAt,
      sourceState: input.sourceState,
      confidence: input.confidence,
      wsi: input.wsi,
      nti: input.nti,
      degradedSources: [...input.degradedSources].sort(),
    },
    priorCognitiveState: {
      snapshotId: cognitiveSpine.snapshot.snapshotId,
      snapshotHash: cognitiveSpine.snapshot.snapshotHash,
      sourceCutoff: prior.sourceCutoff,
      projectionProfile: cognitiveSpine.profile.profileId,
      profileVersion: cognitiveSpine.profile.version,
      sourceCount: prior.derivedState.sourceCount,
      evidenceRefs: prior.evidenceRefs,
      hypothesisRefs: prior.hypothesisRefs,
      contradictionRefs: prior.contradictionRefs,
      questionRefs: prior.questionRefs,
      verificationDebt: prior.verificationDebt,
      lineageRoot: prior.lineageRoot,
    },
    rule: 'WorldSpect observation is independent of Cognitive Spine context. This artifact pairs an already-persisted external observation with the prior institutional state for post-observation comparison only; association is not validation or causality.',
  };
  const contrastHash = canonicalSha256(contrastPayload);

  const db = createServiceSupabaseClient();
  const persisted = await db.from('sfi_cognitive_twin_runs').insert({
    task_id: `${executionId}:${contrastHash.slice(0, 16)}`,
    contract_version: COGNITIVE_TWIN_CONTRACT_VERSION,
    provider: null,
    model: 'deterministic:worldspect-post-observation-contrast',
    role: 'worldspect_post_observation_contrast',
    status: 'READY',
    objective: `Pair WorldSpect observation ${input.worldspectSnapshotId} with the institutional Cognitive Spine state available before observation began.`,
    input_snapshot: {
      worldspectSnapshotId: input.worldspectSnapshotId,
      worldspectSnapshotHash: input.worldspectSnapshotHash,
      observedAt: input.observedAt,
      priorStateCutoff: input.priorStateCutoff,
      cognitiveSpine: {
        snapshot: cognitiveSpine.snapshot,
        consumptionTrace: cognitiveSpine.trace,
      },
    },
    output_envelope: {
      ...contrastPayload,
      contrastHash,
    },
    evidence_refs: [`worldspect_snapshots:${input.worldspectSnapshotId}`],
    limitations: [
      'The Cognitive Spine state was not available to WorldSpect adapters during observation.',
      'The contrast is DERIVED and does not upgrade the external observation, prior hypotheses, or their independence.',
      'A matching prior expectation and later observation does not by itself establish causality or validation.',
    ],
    started_at: recordedAt,
    finished_at: recordedAt,
  }).select('id').single();
  if (persisted.error || !persisted.data?.id) {
    throw new Error(`WORLDSPECT_CT_CONTRAST_PERSIST_FAILED:${persisted.error?.message ?? 'unknown'}`);
  }

  return {
    ok: true as const,
    runId: String(persisted.data.id),
    contrastHash,
    cognitiveSpineSnapshotId: cognitiveSpine.snapshot.snapshotId,
    cognitiveSpineSnapshotHash: cognitiveSpine.snapshot.snapshotHash,
    sourceCutoff: prior.sourceCutoff,
    projectionProfile: cognitiveSpine.profile.profileId,
    profileVersion: cognitiveSpine.profile.version,
    consumed: cognitiveSpine.trace.ctSnapshotConsumed,
    epistemicClass: 'DERIVED' as const,
    rule: contrastPayload.rule,
  };
}
