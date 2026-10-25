/**
 * Pure interpretation of on-demand storage diagnostics. Zero is a real
 * observation only when the provider returns zero; a missing read is null.
 * This module neither decides database routing nor authorizes replication.
 */
export const SFI_PILOT_LIGHT_ECONOMICS_CONTRACT = 'SFI-PILOT-LIGHT-ECONOMICS-OBSERVE-1.0' as const;

export type Metric = number|null;
export type PilotStorageSnapshot = {
  dbBytes:Metric;
  journalBytes:Metric;
  observationTableBytes:Metric;
  mode:string|null;
};
export function observedBytes(value:unknown):Metric {
  if(typeof value!=='number'&&typeof value!=='string')return null;
  const parsed=Number(value);
  return Number.isSafeInteger(parsed)&&parsed>=0?parsed:null;
}
export function interpretPilotLightEconomics(input:{
  neon:PilotStorageSnapshot|null;
  primaryOutbox:{pending:number;conflicts:number}|null;
  neonError?:string|null;primaryError?:string|null;
}) {
  const {neon,primaryOutbox}=input;
  const storage=neon&&neon.dbBytes!==null&&neon.dbBytes>0
    ? {databaseBytes:neon.dbBytes,journalBytes:neon.journalBytes,
       observationTableBytes:neon.observationTableBytes,
       journalShare:neon.journalBytes===null?null:Number((neon.journalBytes/neon.dbBytes).toFixed(4))}
    : {databaseBytes:null,journalBytes:null,observationTableBytes:null,journalShare:null};
  return {
    contract:SFI_PILOT_LIGHT_ECONOMICS_CONTRACT,
    economicPolicy:'PILOT_LIGHT_CANDIDATE_OBSERVE_ONLY',
    activeReplicationPolicy:'UNCHANGED',
    financialCostUSD:null,
    financialCostStatus:'NOT_OBSERVED_NO_BILLING_API',
    remainingQuotaStatus:'NOT_OBSERVED_NO_PROVIDER_QUOTA_FEED',
    primaryStorageBytes:null,
    primaryStorageStatus:'NOT_MEASURED_BY_THIS_READ_PATH',
    neonMode:neon?.mode??'UNKNOWN',
    neonStorage:storage,
    primaryOutbox:primaryOutbox??null,
    primaryOutboxStatus:primaryOutbox?'OBSERVED':'READ_UNAVAILABLE',
    neonReadStatus:neon?'OBSERVED':'READ_UNAVAILABLE',
    errors:{neon:input.neonError??null,primary:input.primaryError??null},
    classification:{
      protected:['IDENTITY_AND_TENANT','AUTHORITY_AND_METHODS','ACTIVE_CASE_CHECKPOINTS','EXECUTION_RECEIPTS','RECOVERY_POINTERS'],
      reviewForSelectiveReplication:['RAW_WORLD_OBSERVATIONS','BULK_WORLD_HISTORY','OLD_TELEMETRY','REPLAY_JOURNAL_HISTORY'],
      action:'REVIEW_ONLY_NO_AUTOMATED_EXCLUSIONS',
    },
    prerequisitesForAdoption:[
      'MEASURE_PROVIDER_BILLING_AND_FREE_TIER_USAGE_WITH_AUTHORITATIVE_FEED',
      'MAP_ALL_TABLE_DEPENDENCIES_AND_RECOVERY_REQUIREMENTS',
      'TEST_PROTECTED_RECOVERY_POINT_AND_REPLAY_ON_DISPOSABLE_ENVIRONMENT',
      'APPROVE_SELECTIVE_REPLICATION_SCOPE_AND_ROLLBACK',
    ],
    boundary:'Read-only diagnostic. Does not change retention, budgets, schedule, mirroring, data plane, roles or authentication. Incomplete metrics are UNKNOWN, not zero.',
  };
}
