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
import { interpretPilotLightEconomics, observedBytes, type PilotStorageSnapshot } from '@/lib/persistence/pilotLightEconomicsPolicy';

export async function readPilotLightEconomicObservation() {
  // Only called upon explicit ROOT GET ?economics=1, never by the scheduler.
  const observedAt=new Date().toISOString();
  const [neonRead,primaryRead]=await Promise.allSettled([
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
