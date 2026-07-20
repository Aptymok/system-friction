import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';

type Row = Record<string, unknown>;

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Row)
    : {};
}


function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}


function similarity(a: string, b: string) {

  const x = normalize(a);
  const y = normalize(b);

  if (!x || !y) return 0;

  if (x === y) return 1;

  if (x.includes(y) || y.includes(x)) {
    return 0.85;
  }

  let matches = 0;

  const length = Math.min(
    x.length,
    y.length
  );

  for(let i = 0; i < length; i++) {
    if(x[i] === y[i]) matches++;
  }

  return matches / Math.max(
    x.length,
    y.length
  );
}



export async function resolvePhenomenonIdentity(
  ownerId:string,
  query:string
) {

  const client =
    createServiceSupabaseClient();


  const {data,error} =
    await client
      .from('ppoi_phenomena')
      .select('*')
      .eq(
        'owner_id',
        ownerId
      )
      .order(
        'opened_at',
        {
          ascending:false
        }
      );


  if(error){
    throw new Error(
      `PPOI_RESOLUTION_FAILED: ${error.message}`
    );
  }


  const candidates =
    (data ?? [])
    .map(item=>{

      const row =
        record(item);


      const score =
        similarity(
          query,
          String(
            row.name ?? ''
          )
        );


      return {
        ...row,
        similarity:score
      };

    })
    .filter(
      item =>
        Number(item.similarity) >= 0.45
    )
    .sort(
      (a,b)=>
        Number(b.similarity)
        -
        Number(a.similarity)
    )
    .slice(0,10);



  if(candidates.length === 0){

    return {
      status:'NEW',
      candidates:[]
    };

  }



  const exact =
    candidates.find(
      item =>
        Number(item.similarity) === 1
    );


  if(exact){

    return {
      status:'MATCH',
      phenomenon:exact,
      candidates
    };

  }



  return {
    status:'AMBIGUOUS',
    candidates
  };

}