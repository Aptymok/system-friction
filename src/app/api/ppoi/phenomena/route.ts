import { NextResponse } from 'next/server';

import {
  listPhenomena,
  openPhenomenon,
} from '@/lib/ppoi/ppoiService';

import {
  AccessDeniedError,
  requireAuthenticatedUser,
} from '@/lib/system/access/server';

import {
  resolvePhenomenonIdentityGlobal,
} from '@/lib/phenomena/identity/phenomenonIdentityResolver';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';



function record(
  value: unknown,
): Record<string, unknown> {

  return value &&
    typeof value === 'object' &&
    !Array.isArray(value)

    ? value as Record<string, unknown>

    : {};

}



function failure(
  error: unknown,
) {

  if (
    error instanceof AccessDeniedError
  ) {

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



  const status =
    details.includes('_REQUIRED') ||
    details.includes('_INVALID')

      ? 400

      : details.includes('NOT_FOUND')

        ? 404

        : 500;



  return NextResponse.json(
    {
      ok:false,
      error:'PPOI_PHENOMENON_FAILED',
      details,
    },
    {
      status,
    },
  );

}





export async function GET(){

  try {

    const {
      user,
    } =
      await requireAuthenticatedUser();



    const phenomena =
      await listPhenomena(
        user.id,
      );



    return NextResponse.json(
      {
        ok:true,
        phenomena,
      },
      {
        status:200,
      },
    );


  } catch(error){

    return failure(error);

  }

}






export async function POST(
  request:Request,
){

  try {

    const {
      user,
    } =
      await requireAuthenticatedUser();



    const body =
      record(
        await request
          .json()
          .catch(
            ()=>null,
          ),
      );



    const name =
      typeof body.name === 'string'
        ? body.name.trim()
        : '';



    if(!name){

      throw new Error(
        'PHENOMENON_NAME_REQUIRED',
      );

    }



    const forceCreate =
      Boolean(
        body.forceCreate,
      );



    const isCalibrationCase =
      Boolean(
        body.isCalibrationCase,
      );



    const relatedStudioObjectId =
      typeof body.relatedStudioObjectId === 'string'
        ? body.relatedStudioObjectId
        : null;



    if(!forceCreate){

      const resolution =
        await resolvePhenomenonIdentityGlobal(
          user.id,
          name,
        );



      if(
        resolution.status === 'MATCH'
      ){

        return NextResponse.json(
          {
            ok:true,
            action:'OPEN_EXISTING',
            phenomenon:
              resolution.phenomenon,
          },
          {
            status:200,
          },
        );

      }



      if(
        resolution.status === 'AMBIGUOUS'
      ){

        return NextResponse.json(
          {
            ok:true,
            action:'SELECT_EXISTING',
            candidates:
              resolution.candidates,
          },
          {
            status:200,
          },
        );

      }

    }





    const phenomenon =
      await openPhenomenon(
        user.id,
        {
          name,

          isCalibrationCase,

          relatedStudioObjectId,

        },
      );





    return NextResponse.json(
      {
        ok:true,

        action:'CREATED',

        phenomenon,

      },
      {
        status:201,
      },
    );



  } catch(error){

    return failure(error);

  }

}