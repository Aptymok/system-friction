import { NextResponse } from 'next/server';

import {
  requireAuthenticatedUser,
  AccessDeniedError,
} from '@/lib/system/access/server';

import {
  getPhenomenonState,
} from '@/lib/ppoi/ppoiService';

import {
  promotePhenomenonCandidate,
  type PhenomenonCandidateInput,
} from '@/lib/phenomena/phenomenon-engine';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


type RouteContext = {
  params:
    | Promise<{ id:string }>
    | { id:string };
};


type NumericIndexMap = {
  IE?: number;
  ES?: number;
  PT?: number;
  RC?: number;

  [key:string]:
    | number
    | undefined;
};



function failure(
  error:unknown,
){

  if(
    error instanceof AccessDeniedError
  ){

    return NextResponse.json(
      {
        ok:false,
        error:error.code,
        details:error.message,
      },
      {
        status:error.status,
      },
    );

  }


  const details =
    error instanceof Error
      ? error.message
      : String(error);


  return NextResponse.json(
    {
      ok:false,
      error:'PPOI_PROMOTION_FAILED',
      details,
    },
    {
      status:500,
    },
  );

}



function numberValue(
  value:unknown,
): number {

  return typeof value === 'number'
    ? value
    : 0;

}



export async function POST(
  request:Request,
  ctx:RouteContext,
){

  try {


    const {
      user,
    } =
      await requireAuthenticatedUser();



    const params =
      await Promise.resolve(
        ctx.params,
      );



    const state =
      await getPhenomenonState(
        user.id,
        params.id,
      );



    const phenomenon =
      state.phenomenon;



    const indices =
      (
        phenomenon.current_indices ?? {}
      ) as NumericIndexMap;



    const evidenceIds:string[] =
      state.evidence.map(
        item => item.id,
      );



    const candidate:PhenomenonCandidateInput = {

      module:
        'ppoi',


      label:
        phenomenon.name,


      evidenceIds,


      attractorKeys:[

        `composite:${numberValue(
          phenomenon.current_composite,
        ).toFixed(2)}`,

        `direction:${String(
          phenomenon.status,
        )}`,

      ],



      ejectorKeys:

        numberValue(
          phenomenon.current_composite,
        ) < 1

          ? [
              'low-structural-density',
            ]

          : [],



      firstSeen:

        phenomenon.opened_at ??
        new Date().toISOString(),



      lastSeen:

        phenomenon.last_evidence_at ??
        new Date().toISOString(),



      density:

        Math.min(
          1,
          evidenceIds.length / 10,
        ),



      trust:

        Math.min(
          1,
          (
            numberValue(indices.IE) +
            numberValue(indices.ES)
          ) / 10,
        ),



      persistence:

        Math.min(
          1,
          numberValue(indices.PT) / 5,
        ),



      velocity:

        Math.min(
          1,
          numberValue(indices.RC) / 5,
        ),

    };



    const result =
      await promotePhenomenonCandidate(
        candidate,
      );



    return NextResponse.json(
      {
        ok:true,
        action:'PROMOTED',
        result,
      },
      {
        status:200,
      },
    );



  } catch(error){

    return failure(error);

  }

}