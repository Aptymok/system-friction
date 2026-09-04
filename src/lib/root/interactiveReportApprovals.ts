import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';

type Row = Record<string, unknown>;

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}
function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
function strings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

export async function readInteractiveReportApprovals(limit = 100) {
  const db = createServiceSupabaseClient();
  const result = await db.from('sfi_cognitive_twin_runs')
    .select('id,task_id,role,status,objective,input_snapshot,output_envelope,evidence_refs,limitations,provider,model,created_at')
    .eq('role', 'report_agent')
    .in('output_envelope->approval_queue->>status', ['queued_for_approval', 'waiting_evidence'])
    .order('created_at', { ascending: false })
    .limit(Math.max(1, Math.min(120, limit)));

  if (result.error) {
    return {
      contract: 'SFI-INTERACTIVE-REPORT-APPROVALS-1.0',
      items: [] as Row[],
      warning: `sfi_cognitive_twin_runs:${result.error.message}`,
      readPlan: { reportApprovalReads: 1, reportApprovalNPlusOneReads: 0 },
    };
  }

  const items = ((result.data ?? []) as Row[]).map((item) => {
    const envelope = row(item.output_envelope);
    const approval = row(envelope.approval_queue);
    const snapshot = row(item.input_snapshot);
    const approvalStatus = (text(approval.status) ?? 'unknown').toLowerCase();
    const evidenceRefs = strings(item.evidence_refs);
    const limitations = strings(item.limitations);
    return {
      id: text(item.id) ?? 'unknown',
      kind: 'report',
      title: text(envelope.title) ?? text(item.objective) ?? 'Reporte institucional',
      objective: text(item.objective),
      reportType: text(envelope.type) ?? text(snapshot.reportType) ?? 'report',
      taskId: text(item.task_id),
      status: text(item.status) ?? 'UNKNOWN',
      approvalStatus,
      provider: text(item.provider),
      model: text(item.model),
      createdAt: text(item.created_at),
      evidenceCount: evidenceRefs.length,
      limitationCount: limitations.length,
      evidenceRefs,
      limitations,
      owner: approvalStatus === 'queued_for_approval' ? 'ROOT' : 'REPORT_EVIDENCE_REVIEW_UNRESOLVED',
      nextExpectedEvent: approvalStatus === 'queued_for_approval'
        ? 'ROOT_ACCEPT_OR_DENY_REPORT_FOR_HUMAN_USE'
        : 'REPORT_EVIDENCE_REVIEW_OR_REGENERATION',
      blocker: approvalStatus === 'waiting_evidence' ? 'REPORT_WAITING_EVIDENCE_WITHOUT_CANONICAL_ACQUISITION_OWNER' : null,
      rootActionRequired: approvalStatus === 'queued_for_approval',
      reviewAvailable: approvalStatus === 'waiting_evidence',
      actionLabel: approvalStatus === 'queued_for_approval'
        ? 'Revisar reporte y decidir uso humano'
        : 'Revisión disponible · evidencia pendiente; no cuenta como obligación ROOT hasta existir transición verificable',
      authorityBoundary: 'APPROVED_FOR_HUMAN_USE does not publish, contact, execute, establish truth, close a case/cycle or promote canon.',
    };
  });

  return {
    contract: 'SFI-INTERACTIVE-REPORT-APPROVALS-1.0',
    items,
    warning: null as string | null,
    readPlan: { reportApprovalReads: 1, reportApprovalNPlusOneReads: 0 },
  };
}
