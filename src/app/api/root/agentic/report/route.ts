import { NextResponse } from 'next/server';
import { runReportAgent, type ReportType } from '@/lib/agents/sfiAgents';
import { auditRootAction, requireRootActor, requireRootViewer } from '@/lib/root/server';

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

export async function GET() {
  const gate = await requireRootViewer('agentic.report.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const reports = await gate.ctx.service
    .from('sfi_cognitive_twin_runs')
    .select('id,task_id,status,objective,input_snapshot,output_envelope,evidence_refs,limitations,provider,model,started_at,finished_at,created_at')
    .eq('role', 'report_agent')
    .order('created_at', { ascending: false })
    .limit(100);

  if (reports.error) return NextResponse.json({ ok: false, error: reports.error.message }, { status: 400 });
  return NextResponse.json({ ok: true, reports: reports.data ?? [] }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const gate = await requireRootActor('agentic.report');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const type = typeof body.type === 'string' && REPORT_TYPES.has(body.type as ReportType)
    ? body.type as ReportType
    : null;
  if (!type) return NextResponse.json({ ok: false, error: 'invalid_report_type' }, { status: 400 });

  const startedAt = new Date().toISOString();
  const subject = typeof body.subject === 'string' && body.subject.trim() ? body.subject.trim() : undefined;
  const ifnorm = body.ifnorm && typeof body.ifnorm === 'object' && !Array.isArray(body.ifnorm)
    ? body.ifnorm as Record<string, unknown>
    : null;
  const result = await runReportAgent({ type, subject, ifnorm: ifnorm as never });
  const finishedAt = new Date().toISOString();
  const providerDegraded = result.provider.startsWith('degraded:');
  const persistedStatus = result.ok && !providerDegraded ? 'READY' : 'BLOCKED';
  const limitations = providerDegraded
    ? [...new Set([...(result.warnings ?? []), 'LLM provider degraded/manual fallback: report persisted for inspection but not declared READY.'])]
    : result.warnings ?? [];

  const persisted = await gate.ctx.service
    .from('sfi_cognitive_twin_runs')
    .insert({
      task_id: `report:${type}:${Date.now()}`,
      contract_version: 'report-agent-v1.1-truthful-provider-state',
      provider: result.provider || null,
      model: null,
      role: 'report_agent',
      status: persistedStatus,
      objective: subject ? `${type} · ${subject}` : type,
      input_snapshot: { reportType: type, subject: subject ?? null, ifnorm, requestedBy: gate.ctx.user.id },
      output_envelope: result,
      evidence_refs: result.evidence ?? [],
      limitations,
      started_at: startedAt,
      finished_at: finishedAt,
    })
    .select('id,task_id,status,objective,input_snapshot,output_envelope,evidence_refs,limitations,provider,model,started_at,finished_at,created_at')
    .single();

  if (persisted.error) {
    return NextResponse.json({ ok: false, error: 'agent_report_persistence_failed', details: persisted.error.message, report: result }, { status: 500 });
  }

  const audit = await auditRootAction({
    actorId: gate.ctx.user.id,
    action: 'agentic.report',
    target: type,
    payload: {
      subject: subject ?? null,
      ifnormEntity: typeof ifnorm?.entity_name === 'string' ? ifnorm.entity_name : null,
      agentResultOk: result.ok,
      persistedStatus,
      provider: result.provider,
      reportRunId: persisted.data.id,
    },
    request,
  });
  if (!audit.ok) return NextResponse.json(audit, { status: 500 });
  return NextResponse.json({ ...result, reportRun: persisted.data, audit, persistedStatus });
}
