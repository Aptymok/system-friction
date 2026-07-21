import { NextResponse } from 'next/server';

import {
  createPhenomenon,
  listPhenomena,
  listPhenomenonIds,
} from '@/lib/ppoi/ppoiService';

import {
  requireAuthenticatedUser,
} from '@/lib/system/access/server';

import {
  resolvePhenomenonIdentityGlobal,
} from '@/lib/phenomena/identity/phenomenonIdentityResolver';


export const dynamic = 'force-dynamic';


/**
 * GET /api/ppoi/phenomena
 *
 * Lista todos los fenómenos del usuario autenticado.
 */
export async function GET() {
  try {
    const user = await requireAuthenticatedUser();

    const result = await listPhenomena(user.id);

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json(
      { ok: true, phenomena: result.data },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'UNKNOWN_ERROR' },
      { status: 500 },
    );
  }
}


/**
 * POST /api/ppoi/phenomena
 *
 * Abre un nuevo caso fenomenológico. Si ya existe un fenómeno con el mismo nombre,
 * devuelve el existente (o lista de candidatos si hay ambigüedad).
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser();
    const body = await request.json().catch(() => ({}));

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const forceCreate = Boolean(body.forceCreate);

    if (!name) {
      return NextResponse.json(
        { ok: false, error: 'PHENOMENON_NAME_REQUIRED' },
        { status: 400 },
      );
    }

    // 1. Resolver identidad (global)
    const resolution = await resolvePhenomenonIdentityGlobal(
      user.id,
      name,
    );

    // 2. Si ya hay un match exacto y no se fuerza creación, abrir existente
    if (resolution.status === 'MATCH' && !forceCreate) {
      return NextResponse.json({
        ok: true,
        action: 'OPEN_EXISTING',
        phenomenon: resolution.phenomenon,
      }, { status: 200 });
    }

    // 3. Si hay ambigüedad y no se fuerza, pedir selección
    if (resolution.status === 'AMBIGUOUS' && !forceCreate) {
      return NextResponse.json({
        ok: true,
        action: 'SELECT_EXISTING',
        candidates: resolution.candidates,
      }, { status: 200 });
    }

    // 4. Crear nuevo fenómeno (forceCreate o NEW)
    const created = await createPhenomenon(user.id, name);

    if (!created.ok) {
      return NextResponse.json(
        { ok: false, error: created.error },
        { status: created.status ?? 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      action: 'CREATED',
      phenomenon: created.data,
    }, { status: 201 });

  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'UNKNOWN_ERROR' },
      { status: 500 },
    );
  }
}