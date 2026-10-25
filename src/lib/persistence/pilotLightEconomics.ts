/**
 * SFI Pilot Light / Economics 1.0
 *
 * A read-only, on-demand measurement of the CURRENT two-plane implementation.
 * No provider billing credential, budget authority, parity guarantee, data
 * migration, mirroring policy switch, or scheduled request is introduced.
 */
import 'server-only';
import { continuityDatabase, isSfiContinuityConfigured } from '@/lib/sfi/continuityPostgres';
import { readPrimaryOutboxStatus } from '@/lib/persistence/primaryMirror';

export const SFI_PILOT_LIGHT_ECONOMICS_CONTRACT = 'SFI-PILOT-LIGHT-ECONOMICS-OBSERVE-1.0' as const;

type Metric = number | null;
type Snapshot = {
  dbBytes:Metric;
  journalBytes:Metric;
  observationTableBytes:Metric;
  mode:string|null;
};

function observedBytes(value:unknown):Metric {
  if (typeof value!=='number' && typeof value!=='string') return null;
  const parsed=Number(value);
  return Number.isSafeInteger(parsed)&&parsed>=0?parsed:null;
}

export function interpretPilotLightEconomics(input:{
  neon:Snapshot|null;
  primaryOutbox:{pending:number;conflicts:number}|null;
  neonError?:string|null;
  primaryError?:string|null;
}) {
  const {neon,primaryOutbox}=input;
  const storage=neon&&neon.dbBytes!==null&&neon.dbBytes>0
    ? {
      databaseBytes:neon.dbBytes,
      journalBytes:neon.journalBytes,
      observationTableBytes:neon.observationTableBytes,
      journalShare:neon.journalBytes===null?null:Number((neon.journalBytes/neon.dbBytes).toFixed(4)),
    }
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
    errors:{
      neon:input.neonError??null,
      primary:input.primaryError??null,
    },
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

export async function readPilotLightEconomicObservation() {
  // Only called upon explicit ROOT GET ?economics=1, never by the scheduler.
  const observedAt=new Date().toISOString();
  const [neonRead,primaryRead]=await Promise.allSettled([
    (async ():Promise<Snapshot>=>{
      if(!isSfiContinuityConfigured())throw new Error('NEON_CONNECTION_NOT_CONFIGURED');
      const sql=continuityDatabase();
      const rows=await sql`
        select pg_database_size(current_database())::bigint as database_bytes,
          to_regclass('public.sfi_data_plane_write_journal') as journal_relation,
          case when to_regclass('public.sfi_data_plane_write_journal') is not null
            then pg_total_relation_size('public.sfi_data_plane_write_journal'::regclass)::bigint
            else null end as journal_bytes,
          case when to_regclass('public.world_source_observations') is not null
            then pg_total_relation_size('public.world_source_observations'::regclass)::bigint
            else null end as observation_bytes,
          (select mode from public.sfi_data_plane_state where id='institution' limit 1) as plane_mode
      `;
      const r=rows[0];
      if(!r)throw new Error('NEON_METRICS_EMPTY');
      return {
        dbBytes:observedBytes(r.database_bytes),
        journalBytes:observedBytes(r.journal_bytes),
        observationTableBytes:observedBytes(r.observation_bytes),
        mode:typeof r.plane_mode==='string'?r.plane_mode:null,
      };
    })(),
    readPrimaryOutboxStatus(),
  ]);
  const neon=neonRead.status==='fulfilled'?neonRead.value:null;
  const outbox=primaryRead.status==='fulfilled'?{
    pending:primaryRead.value.pending,conflicts:primaryRead.value.conflicts,
  }:null;
  const errorText=(e:unknown)=>e instanceof Error?e.message.slice(0,120):'PROVIDER_READ_UNAVAILABLE';
  return {
    observedAt,
    ...interpretPilotLightEconomics({
      neon,primaryOutbox:outbox,
      neonError:neonRead.status==='rejected'?errorText(neonRead.reason):null,
      primaryError:primaryRead.status==='rejected'?errorText(primaryRead.reason):null,
    }),
  };
}
