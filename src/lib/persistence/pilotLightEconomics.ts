/**
 * SFI Pilot Light / Economics 1.0
 *
 * A read-only, on-demand measurement of the CURRENT two-plane implementation.
 * No provider billing credential, budget authority, parity guarantee, data
 * migration, mirroring policy switch, or scheduled request is introduced.
 */
import 'server-only';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { continuityDatabase, isSfiContinuityConfigured } from '@/lib/sfi/continuityPostgres';
import { readPrimaryOutboxStatus } from '@/lib/persistence/primaryMirror';
import { interpretPilotLightEconomics, observedBytes, type MeasuredUsageRow, type PilotStorageSnapshot } from '@/lib/persistence/pilotLightEconomicsPolicy';

export async function readPilotLightEconomicObservation() {
  // Only called upon explicit ROOT GET ?economics=1, never by the scheduler.
  const observedAt=new Date().toISOString();
  const [neonRead,primaryRead,usageRead]=await Promise.allSettled([
    (async ():Promise<PilotStorageSnapshot>=>{
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
    (async ():Promise<MeasuredUsageRow[]>=>{
      // On-demand only; no extra scheduled jobs or additional replicas.
      // Source contains measured resource units, not verified provider charges.
      const from=new Date(Date.now()-30*24*60*60*1000).toISOString();
      const result=await createServiceSupabaseClient()
        .from('usage_ledger').select('kind,amount,unit,created_at')
        .gte('created_at',from).order('created_at',{ascending:false}).limit(250);
      if(result.error)throw new Error('USAGE_LEDGER_READ_UNAVAILABLE');
      return (result.data??[]).map(x=>({
        kind:String(x.kind??''),amount:Number(x.amount),unit:String(x.unit??''),
        created_at:String(x.created_at??''),
      }));
    })(),
  ]);
  const neon=neonRead.status==='fulfilled'?neonRead.value:null;
  const outbox=primaryRead.status==='fulfilled'?{
    pending:primaryRead.value.pending,conflicts:primaryRead.value.conflicts,
  }:null;
  const errorText=(e:unknown)=>e instanceof Error?e.message.slice(0,120):'PROVIDER_READ_UNAVAILABLE';
  return {
    observedAt,
    windowDays:30,
    usageLedgerLimit:250,
    usageLedgerTruncated:usageRead.status==='fulfilled'&&usageRead.value.length===250,
    ...interpretPilotLightEconomics({
      neon,primaryOutbox:outbox,
      usageLedger:usageRead.status==='fulfilled'?usageRead.value:null,
      usageError:usageRead.status==='rejected'?'USAGE_LEDGER_READ_UNAVAILABLE':null,
      neonError:neonRead.status==='rejected'?errorText(neonRead.reason):null,
      primaryError:primaryRead.status==='rejected'?errorText(primaryRead.reason):null,
    }),
  };
}
