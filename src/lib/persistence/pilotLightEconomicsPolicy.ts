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
export type MeasuredUsageRow={kind:string;amount:number|string;unit:string;created_at:string};
export function summarizeMeasuredUsage(rows:readonly MeasuredUsageRow[]|null){
  if(!rows)return {status:'READ_UNAVAILABLE',eventCount:null,units:[]};
  const totals=new Map<string,{kind:string;unit:string;amount:number;events:number}>();
  for(const row of rows){
    const amount=typeof row.amount==='number'?row.amount:Number(row.amount);
    if(!Number.isFinite(amount)||amount<0||!row.kind||!row.unit)continue;
    const key=row.kind+'\\u0000'+row.unit;
    const prev=totals.get(key)??{kind:row.kind,unit:row.unit,amount:0,events:0};
    prev.amount+=amount;prev.events++;
    totals.set(key,prev);
  }
  return {status:'OBSERVED',eventCount:rows.length,units:[...totals.values()]
    .sort((a,b)=>a.kind.localeCompare(b.kind)||a.unit.localeCompare(b.unit)).slice(0,40)};
}

export function interpretPilotLightEconomics(input:{
  neon:PilotStorageSnapshot|null;
  primaryOutbox:{pending:number;conflicts:number}|null;
  neonError?:string|null;primaryError?:string|null;
  usageLedger?:readonly MeasuredUsageRow[]|null;
  usageError?:string|null;
}) {
  const {neon,primaryOutbox}=input;
  const storage=neon&&neon.dbBytes!==null&&neon.dbBytes>0
    ? {databaseBytes:neon.dbBytes,journalBytes:neon.journalBytes,
       observationTableBytes:neon.observationTableBytes,
       journalShare:neon.journalBytes===null?null:Number((neon.journalBytes/neon.dbBytes).toFixed(4))}
    : {databaseBytes:null,journalBytes:null,observationTableBytes:null,journalShare:null};
  return {
    contract:SFI_PILOT_LIGHT_ECONOMICS_CONTRACT,
    economicPolicy:'INDEPENDENT_PROVIDERS_NO_REPLICATION',
    activeReplicationPolicy:'RETIRED_BY_FOUNDER',
    financialCostUSD:null,
    financialCostStatus:'NOT_OBSERVED_NO_BILLING_API',
    remainingQuotaStatus:'NOT_OBSERVED_NO_PROVIDER_QUOTA_FEED',
    primaryStorageBytes:null,
    primaryStorageStatus:'NOT_MEASURED_BY_THIS_READ_PATH',
    neonMode:neon?.mode??'UNKNOWN',
    neonStorage:storage,
    primaryOutbox:primaryOutbox??null,
    measuredUsage:summarizeMeasuredUsage(input.usageLedger??null),
    monetaryRatesObserved:false,
    primaryOutboxStatus:primaryOutbox?'OBSERVED':'READ_UNAVAILABLE',
    neonReadStatus:neon?'OBSERVED':'READ_UNAVAILABLE',
    errors:{neon:input.neonError??null,primary:input.primaryError??null,usage:input.usageError??null},
    classification:{
      protected:['IDENTITY_AND_TENANT','AUTHORITY_AND_METHODS','ACTIVE_CASE_CHECKPOINTS','EXECUTION_RECEIPTS','RECOVERY_POINTERS'],
      reviewForSelectiveReplication:['RAW_WORLD_OBSERVATIONS','BULK_WORLD_HISTORY','OLD_TELEMETRY','REPLAY_JOURNAL_HISTORY'],
      action:'NO_REPLICATION_MONITOR_REAL_USAGE',
    },
    prerequisitesForAdoption:[
      'MEASURE_PROVIDER_BILLING_AND_FREE_TIER_USAGE_WITH_AUTHORITATIVE_FEED',
      'MAP_ALL_TABLE_DEPENDENCIES_AND_RECOVERY_REQUIREMENTS',
      'TEST_PROTECTED_RECOVERY_POINT_AND_REPLAY_ON_DISPOSABLE_ENVIRONMENT',
      'AUTHORIZE_FINANCIAL_THRESHOLDS_BEFORE_LIMITING_REAL_CASE_EXECUTION',
    ],
    boundary:'Independent databases with replication retired. This diagnostic reads actual resource observations only. Monetary charges and remaining quotas are UNKNOWN without provider billing data; never infer dollars from storage or event counts.',
  };
}
