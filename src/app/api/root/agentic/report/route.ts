import { NextResponse } from 'next/server';
import { runReportAgent, type ReportType } from '@/lib/agents/sfiAgents';
import { auditRootAction, requireRootActor } from '@/lib/root/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const REPORT_TYPES = new Set<ReportType>([
  'world_vector_internal',
  'world_vector_public',
  'ifnorm',
  'sfi_dr01',
  'neural_graph_evidence',
  'amv_recurrence',
  'calibration',
  'atlas_entry',
  'linkedin_draft',
  'contact_draft',
]);

export async function POST(request: Request) {
  const gate = await requireRootActor('agentic.report');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const type = typeof body.type === 'string' && REPORT_TYPES.has(body.type as ReportType)
    ? body.type as ReportType
    : null;
  if (!type) return NextResponse.json({ ok: false, error: 'invalid_report_type' }, { status: 400 });

  const result = await runReportAgent({
    type,
    subject: typeof body.subject === 'string' ? body.subject : undefined,
    ifnorm: body.ifnorm && typeof body.ifnorm === 'object' ? body.ifnorm as never : null,
  });
  const audit = await auditRootAction({ actorId: gate.ctx.user.id, action: 'agentic.report', target: type, payload: { subject: body.subject ?? null, ok: result.ok }, request });
  if (!audit.ok) return NextResponse.json(audit, { status: 500 });
  return NextResponse.json({ ...result, audit });
}
