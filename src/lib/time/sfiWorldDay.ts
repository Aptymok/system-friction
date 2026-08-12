import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const SFI_WORLD_DAY_ORIGIN = '2026-06-02';
export const SFI_CLEAN_GENESIS_DATE = '2026-08-12';

const DAY_MS=86_400_000;

function utcDateOnly(value:Date){
  return value.toISOString().slice(0,10);
}

export function getSfiWorldDayNumber(date:string){
  const origin=Date.parse(`${SFI_WORLD_DAY_ORIGIN}T00:00:00.000Z`);
  const target=Date.parse(`${date}T00:00:00.000Z`);
  if(!Number.isFinite(target))throw new Error(`invalid_sfi_world_date:${date}`);
  return Math.floor((target-origin)/DAY_MS)+1;
}

export async function ensureCurrentSfiWorldDay(now=new Date()){
  const worldDate=utcDateOnly(now);
  if(worldDate<SFI_WORLD_DAY_ORIGIN){
    return {ok:true,skipped:true,reason:'before_sfi_world_day_origin',worldDate,dayNumber:null};
  }
  const dayNumber=getSfiWorldDayNumber(worldDate);
  const db=createServiceSupabaseClient();
  const existing=await db.from('sfi_world_day_ledger')
    .select('id,world_date,day_number,phase,reconstruction_status,evidence_count')
    .eq('world_date',worldDate)
    .maybeSingle();
  if(existing.error){
    return {ok:false,skipped:false,worldDate,dayNumber,error:existing.error.message};
  }
  if(existing.data){
    return {ok:true,skipped:true,reason:'world_day_already_exists',worldDate,dayNumber,row:existing.data};
  }

  const phase=worldDate===SFI_CLEAN_GENESIS_DATE?'PROSPECTIVE_GENESIS':'LIVE';
  const inserted=await db.from('sfi_world_day_ledger').insert({
    world_date:worldDate,
    day_number:dayNumber,
    origin_date:SFI_WORLD_DAY_ORIGIN,
    phase,
    reconstruction_status:'LIVE_EMPTY',
    evidence_keys:[],
    evidence_count:0,
    source_summary:{
      source:'continuity-report-cron',
      rule:'Calendar continuity only. Creating a world-day does not assert that an observation, event or institutional action occurred.',
    },
  }).select('id,world_date,day_number,phase,reconstruction_status,evidence_count').single();
  if(inserted.error){
    return {ok:false,skipped:false,worldDate,dayNumber,error:inserted.error.message};
  }
  return {ok:true,skipped:false,worldDate,dayNumber,row:inserted.data};
}
