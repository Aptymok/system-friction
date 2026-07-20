import 'server-only';

import {
  createServiceSupabaseClient,
} from '@/runtime/supabase/server';


export type PhenomenonCandidateInput = {
  module: string;
  label: string;
  evidenceIds: string[];
  attractorKeys: string[];
  ejectorKeys: string[];
  firstSeen: string;
  lastSeen: string;
  density: number;
  trust: number;
  persistence: number;
  velocity: number;
};


export type PhenomenonPromotion = {
  promote: boolean;
  score: number;
  regime:
    | 'persistent'
    | 'emerging'
    | 'latent';
  days: number;
};


export type PhenomenonRecord =
  PhenomenonCandidateInput & {
    phenomenonKey: string;
    promotion: PhenomenonPromotion;
    degradation: number;
  };


type GlobalStore = Map<
  string,
  PhenomenonRecord
>;


const GLOBAL_KEY =
  '__sfi_phenomena_store__';


function fallbackStore(): GlobalStore {

  const globalStore =
    globalThis as typeof globalThis & {
      [key:string]: unknown;
    };


  if(!globalStore[GLOBAL_KEY]) {

    globalStore[GLOBAL_KEY] =
      new Map<string, PhenomenonRecord>();

  }


  return globalStore[
    GLOBAL_KEY
  ] as GlobalStore;

}



function clamp01(value:number){

  if(!Number.isFinite(value)){
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      1,
      value,
    ),
  );

}



function cleanKey(value:string){

  return (
    value
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        '-',
      )
      .replace(
        /^-|-$/g,
        '',
      )
      .slice(
        0,
        96,
      )
    ||
    'phenomenon'
  );

}



function daysBetween(
  first:string,
  last:string,
){

  const start =
    new Date(first)
      .getTime();


  const end =
    new Date(last)
      .getTime();


  if(
    Number.isNaN(start) ||
    Number.isNaN(end)
  ){
    return 0;
  }


  return Math.max(
    0,
    (end-start) /
      86400000,
  );

}



export function shouldPromotePhenomenon(
  input:PhenomenonCandidateInput,
):PhenomenonPromotion {


  const days =
    daysBetween(
      input.firstSeen,
      input.lastSeen,
    );


  const temporalPersistence =
    Math.min(
      1,
      days / 21,
    );


  const score =
    clamp01(input.density) * .25 +
    clamp01(input.trust) * .25 +
    clamp01(input.persistence) * .20 +
    temporalPersistence * .20 +
    Math.min(
      1,
      input.evidenceIds.length / 7,
    ) * .10;



  return {

    promote:
      score >= .62 &&
      days >= 3,


    score,


    regime:
      score >= .8 &&
      days >= 21

        ? 'persistent'

        : score >= .62

          ? 'emerging'

          : 'latent',


    days,

  };

}



export function buildPhenomenonRecord(
  input:PhenomenonCandidateInput,
):PhenomenonRecord {


  const promotion =
    shouldPromotePhenomenon(
      input,
    );


  return {

    ...input,


    phenomenonKey:
      `${cleanKey(
        input.module,
      )}:${cleanKey(
        input.label,
      )}`,


    promotion,


    degradation:
      clamp01(
        1-input.trust,
      ),

  };

}



export async function promotePhenomenonCandidate(
  input:PhenomenonCandidateInput,
){

  const record =
    buildPhenomenonRecord(
      input,
    );



  if(
    !record.evidenceIds.length
  ){

    return {
      ok:false as const,
      error:
        'phenomenon_evidence_required',
      record,
    };

  }



  if(
    !record.promotion.promote
  ){

    return {
      ok:true as const,
      promoted:false,
      record,
    };

  }



  fallbackStore().set(
    record.phenomenonKey,
    record,
  );



  try {

    const service =
      createServiceSupabaseClient();


    const {
      data,
      error,
    } =
      await service
        .from(
          'sfi_phenomena',
        )
        .upsert(
          {

            phenomenon_key:
              record.phenomenonKey,


            label:
              record.label,


            module:
              record.module,


            regime:
              record.promotion.regime,


            density:
              record.density,


            persistence:
              record.persistence,


            velocity:
              record.velocity,


            trust:
              record.trust,


            degradation:
              record.degradation,


            evidence_count:
              record.evidenceIds.length,


            attractor_count:
              record.attractorKeys.length,


            ejector_count:
              record.ejectorKeys.length,


            first_seen:
              record.firstSeen,


            last_seen:
              record.lastSeen,


            vector:{
              score:
                record.promotion.score,

              days:
                record.promotion.days,

              evidenceIds:
                record.evidenceIds,

              attractorKeys:
                record.attractorKeys,

              ejectorKeys:
                record.ejectorKeys,
            },


            updated_at:
              new Date()
                .toISOString(),

          },
          {
            onConflict:
              'phenomenon_key',
          },
        )
        .select('*')
        .single();



    if(error){
      throw new Error(
        error.message,
      );
    }



    return {
      ok:true as const,
      promoted:true,
      stored:true,
      record,
      data,
    };


  } catch(error){

    return {

      ok:true as const,

      promoted:true,

      stored:false,

      record,

      warning:
        error instanceof Error
          ? error.message
          : 'sfi_phenomena_not_ready',

    };

  }

}



export async function listPhenomena(
  module?:string,
){

  try {

    const service =
      createServiceSupabaseClient();


    let query =
      service
        .from(
          'sfi_phenomena',
        )
        .select('*')
        .order(
          'density',
          {
            ascending:false,
          },
        )
        .limit(50);



    if(module){

      query =
        query.eq(
          'module',
          module,
        );

    }



    const {
      data,
      error,
    } =
      await query;



    if(error){
      throw new Error(
        error.message,
      );
    }



    return {

      ok:true as const,

      data:
        data ?? [],

      source:
        'supabase',

    };


  } catch(error){


    return {

      ok:true as const,


      data:
        Array.from(
          fallbackStore()
            .values(),
        )
        .filter(
          item =>
            !module ||
            item.module === module,
        ),


      source:
        'memory',


      warning:
        error instanceof Error
          ? error.message
          : 'sfi_phenomena_not_ready',

    };

  }

}