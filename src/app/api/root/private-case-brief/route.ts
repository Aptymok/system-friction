import { NextResponse } from 'next/server';
import { requireRootActor } from '@/lib/root/server';
import { createRootPrivateCaseBrief, readRootPrivateCaseBrief } from '@/lib/sfi/case-platform/privateCaseBrief';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  // Private case assets are sovereign material. An institutional observer is
  // intentionally insufficient here because the downstream service-role read
  // bypasses RLS; ROOT authority is the tenant-isolation boundary.
  const gate = await requireRootActor('root.private_case_brief.read_private');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  const caseId = new URL(request.url).searchParams.get('caseId')?.trim() || '';
  if (!caseId) return NextResponse.json({ ok: false, error: 'case_id_required' }, { status: 400 });
  try {
    const asset = await readRootPrivateCaseBrief({ service: gate.ctx.service, caseId });
    if (!asset) return NextResponse.json({ ok: false, error: 'private_case_brief_not_found' }, { status: 404 });
    return NextResponse.json({ ok: true, asset }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const gate = await requireRootActor('root.private_case_brief.generate');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const caseId = typeof body.caseId === 'string' ? body.caseId.trim() : '';
  if (!caseId) return NextResponse.json({ ok: false, error: 'case_id_required' }, { status: 400 });
  try {
    const asset = await createRootPrivateCaseBrief({ service: gate.ctx.service, actorId: gate.ctx.user.id, caseId });
    return NextResponse.json({ ok: true, asset, boundaries: {
      private: true,
      rootOnly: true,
      autoPublication: false,
      humanApprovalRequired: true,
      fabricatedImageBytes: false,
      reportIsEvidence: false,
      reportIsDecision: false,
    } }, { status: 201, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes('NOT_FOUND') ? 404 : message.includes('WRITE_FORBIDDEN') ? 409 : 503;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
