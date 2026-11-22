import { NextRequest, NextResponse } from 'next/server';
import { requireRootViewer } from '@/lib/root/server';
import { readAmvThoughts } from '@/lib/amv/learning';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const gate = await requireRootViewer('root.amv.thoughts.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const caseId = request.nextUrl.searchParams.get('case_id');
  if (caseId && caseId.length > 128) {
    return NextResponse.json({ ok: false, error: 'invalid_case_id' }, { status: 400 });
  }
  return NextResponse.json({ ok: true, thoughts: await readAmvThoughts(caseId) }, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
