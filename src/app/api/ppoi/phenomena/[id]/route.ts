import { NextResponse } from 'next/server';

import {
  getPhenomenonState,
  recalibratePhenomenon,
} from '@/lib/ppoi/ppoiService';

import {
  AccessDeniedError,
  requireAuthenticatedUser,
} from '@/lib/system/access/server';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


type RouteContext = {
  params:
    | Promise<{ id: string }>
    | { id: string };
};


function failure(error: unknown) {

  if (error instanceof AccessDeniedError) {
    return NextResponse.json(
      {
        ok: false,
        error: error.code,
        details: error.message,
      },
      {
        status: error.status,
      },
    );
  }


  const details =
    error instanceof Error
      ? error.message
      : String(error);


  const status =
    details.includes('NOT_FOUND')
      ? 404
      :
      details.includes('_REQUIRED') ||
      details.includes('_INVALID') ||
      details.includes('_NOT_ACTIVE')
        ? 400
        : 500;


  return NextResponse.json(
    {
      ok: false,
      error: 'PPOI_PHENOMENON_FAILED',
      details,
    },
    {
      status,
    },
  );
}



export async function GET(
  request: Request,
  ctx: RouteContext,
) {

  try {

    const params =
      await Promise.resolve(
        ctx.params,
      );


    const {
      user,
    } =
      await requireAuthenticatedUser();


    const result =
      await getPhenomenonState(
        user.id,
        params.id,
      );


    return NextResponse.json(
      {
        ok: true,
        ...result,
      },
      {
        status: 200,
      },
    );


  } catch (error) {

    return failure(error);

  }

}




export async function POST(
  request: Request,
  ctx: RouteContext,
) {

  try {

    const params =
      await Promise.resolve(
        ctx.params,
      );


    const {
      user,
    } =
      await requireAuthenticatedUser();


    const result =
      await recalibratePhenomenon(
        user.id,
        params.id,
      );


    return NextResponse.json(
      {
        ok: true,
        ...result,
      },
      {
        status: 200,
      },
    );


  } catch (error) {

    return failure(error);

  }

}