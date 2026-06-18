import { NextRequest, NextResponse } from 'next/server';
import { readVisibleLogbookEntries } from '@/lib/logbook/query';
import type { LogbookScope, LogbookViewer } from '@/lib/logbook/permissions';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const role = (request.nextUrl.searchParams.get('role') ?? 'root') as LogbookViewer['role'];
  const viewer: LogbookViewer = {
    role,
    user_id: request.nextUrl.searchParams.get('user_id'),
    email: request.nextUrl.searchParams.get('email') ?? process.env.SYSTEM_ROOT_EMAIL ?? null,
  };
  const scope = request.nextUrl.searchParams.get('scope') as LogbookScope | 'all' | null;
  const case_id = request.nextUrl.searchParams.get('case_id');
  return NextResponse.json({ ok: true, entries: await readVisibleLogbookEntries(viewer, { scope: scope ?? 'all', case_id }) });
}

