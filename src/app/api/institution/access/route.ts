import { NextResponse } from 'next/server';
import {
  inviteInstitutionalAccount,
  listInstitutionalAccounts,
  updateInstitutionalAccount,
} from '@/lib/system/access/accountAdmin';
import { AccessDeniedError, requireInstitutionalAccountAdmin } from '@/lib/system/access/server';

export const dynamic = 'force-dynamic';

function errorResponse(error: unknown) {
  if (error instanceof AccessDeniedError) {
    return NextResponse.json({ ok: false, error: error.code, message: error.message }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : 'Institutional account operation failed.';
  return NextResponse.json({ ok: false, error: 'ACCOUNT_OPERATION_FAILED', message }, { status: 400 });
}

export async function GET() {
  try {
    const context = await requireInstitutionalAccountAdmin();
    const state = await listInstitutionalAccounts(context);
    return NextResponse.json({ ok: true, ...state });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireInstitutionalAccountAdmin();
    const body = await request.json();
    const result = await inviteInstitutionalAccount(context, body);
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await requireInstitutionalAccountAdmin();
    const body = await request.json();
    const result = await updateInstitutionalAccount(context, body);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return errorResponse(error);
  }
}
