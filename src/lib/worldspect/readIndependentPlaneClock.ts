import 'server-only';

import {createServiceSupabaseClient} from '@/runtime/supabase/server';
import {executeAbortableQuery} from '@/lib/supabase/abortableQuery';
import {continuityDatabase, isSfiContinuityConfigured} from '@/lib/sfi/continuityPostgres';
import {compareIndependentWorldSpectClocks, type PlaneClockRead} from './independentPlaneClock';

const unavailable: PlaneClockRead = {observedAt:null,receiptId:null,readStatus:'READ_UNAVAILABLE'};

function formatTimestamp(value:unknown):string|null {
  if(value instanceof Date) return Number.isFinite(value.valueOf())?value.toISOString():null;
  if(typeof value!=='string'||!Number.isFinite(Date.parse(value)))return null;
  return new Date(value).toISOString();
}

export async function readIndependentWorldSpectPlaneClock() {
  // ROOT-authorized, operator-initiated only. No cron, recursive fallback,
  // automatic replica comparison, entitlement expansion or data mutation.
  const [primaryResult,neonResult]=await Promise.allSettled([
    (async ():Promise<PlaneClockRead>=>{
      const db=createServiceSupabaseClient();
      const {data,error}=await executeAbortableQuery(
        db.from('worldspect_snapshots')
          .select('id,observed_at')
          .order('observed_at',{ascending:false})
          .limit(1).maybeSingle(),3500
      );
      if(error)throw new Error('PRIMARY_READ_UNAVAILABLE');
      return data
        ? {observedAt:formatTimestamp(data.observed_at),receiptId:String(data.id||''),readStatus:'OBSERVED'}
        : {observedAt:null,receiptId:null,readStatus:'EMPTY'};
    })(),
    (async ():Promise<PlaneClockRead>=>{
      if(!isSfiContinuityConfigured())return unavailable;
      const sql=continuityDatabase();
      const rows=await sql`
        select id::text as id, observed_at
          from public.worldspect_snapshots
         order by observed_at desc
         limit 1
      `;
      const row=rows[0];
      return row
        ? {observedAt:formatTimestamp(row.observed_at),receiptId:String(row.id||''),readStatus:'OBSERVED'}
        : {observedAt:null,receiptId:null,readStatus:'EMPTY'};
    })(),
  ]);

  return {
    observedAt:new Date().toISOString(),
    ...compareIndependentWorldSpectClocks({
      primary:primaryResult.status==='fulfilled'?primaryResult.value:unavailable,
      neon:neonResult.status==='fulfilled'?neonResult.value:unavailable,
    }),
    readWarnings:{
      primary:primaryResult.status==='rejected'?'PRIMARY_READ_UNAVAILABLE':null,
      neon:neonResult.status==='rejected'?'NEON_READ_UNAVAILABLE':null,
    },
  };
}
