import { NextRequest, NextResponse } from 'next/server';
import { readAmvThoughts } from '@/lib/amv/learning';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const caseId = request.nextUrl.searchParams.get('case_id');
  return NextResponse.json({ ok: true, thoughts: await readAmvThoughts(caseId) });
}

