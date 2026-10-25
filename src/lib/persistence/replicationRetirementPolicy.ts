/**
 * SFI-DB-NO-REPLICATION-2026-10-25
 * Founder decision: independent providers. No automatic, triggered or
 * manual cross-provider replication. Read-only provider cost observation
 * is permitted; an old mirror backlog is NOT actionable work.
 *
 * Removing this policy requires a separate, explicit governance decision;
 * an environment flag MUST NOT silently re-enable legacy replication.
 */
export const SFI_REPLICATION_POLICY = 'NO_CROSS_PROVIDER_REPLICATION' as const;

const retiredDataPlaneRpcNames = new Set([
  'sfi_apply_primary_mirror_batch_v1',
  'sfi_claim_primary_outbox_batch_v1',
  'sfi_ack_primary_outbox_v1',
  'sfi_set_primary_mirror_certification_v1',
  'sfi_apply_continuity_batch_v1',
  'sfi_apply_verified_source_observations_v1',
  'sfi_claim_continuity_journal_batch_v1',
  'sfi_mark_continuity_journal_replayed_v1',
  'sfi_release_continuity_journal_batch_v1',
]);

export function assertCrossProviderReplicationRetired(rpcName: string) {
  if (retiredDataPlaneRpcNames.has(rpcName)) {
    throw new Error('SFI_REPLICATION_RETIRED_BY_FOUNDER:' + rpcName);
  }
}

export function describeSfiReplicationRetirement() {
  return {
    contract:'SFI-DB-NO-REPLICATION-2026-10-25',
    replicationEnabled:false,
    mirroringEnabled:false,
    canonicalParityRequired:false,
    priorOutboxActionable:false,
    continuity:'INDEPENDENT_PROVIDER_WITH_EXPLICIT_RECOVERY',
    operatorCostObservation:'ON_DEMAND',
    boundary:'No automatic cross-provider writes, journal replay, outbox drain, or mirror certification. Existing stored data retained. Not a backup or failover certificate.',
  } as const;
}
