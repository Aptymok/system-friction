import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedUser } from '@/lib/system/access/server';
import { readOperationalCase, transitionOperationalCase } from '@/lib/sfi/case-platform/repository';
import { sfiCaseApiFailure } from '@/lib/sfi/case-platform/http';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const statusSchema = z.enum(['DRAFT','OPEN','OBSERVING','ANALYZING','AWAITING_GOVERNANCE','INTERVENING','AWAITING_RETURN','AWAITING_USER_CLOSE','CLOSED','REJECTED']);
const patchSchema = z.object({
  status: statusSchema.optional(),
  reportDecision: z.enum(['ACCEPT','DENY']).optional(),
  note: z.string().trim().max(2000).optional(),
}).strict().refine((value) => Boolean(value.status) !== Boolean(value.reportDecision), 'exactly_one_case_action_required');

type RouteContext = { params: Promise<{ caseId: string }> };

type Row = Record<string, unknown>;

async function caseState(caseId: string) {
  const db = createServiceSupabaseClient();
  const result = await db.from('sfi_cases')
    .select('id,tenant_id,project_id,status,closed_at')
    .eq('id', caseId)
    .is('deleted_at', null)
    .maybeSingle();
  if (result.error) throw new Error(`SFI_CASE_READ_FAILED:${result.error.message}`);
  if (!result.data) throw new Error('SFI_CASE_NOT_FOUND');
  return result.data as Row;
}

async function assertUserCanDecide(userId: string, tenantId: string) {
  const db = createServiceSupabaseClient();
  const membership = await db.from('sfi_tenant_members')
    .select('role,status')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .maybeSingle();
  if (membership.error) throw new Error(`SFI_TENANT_ACCESS_READ_FAILED:${membership.error.message}`);
  if (!membership.data || membership.data.status !== 'ACTIVE' || !['OWNER','ADMIN','OPERATOR'].includes(String(membership.data.role))) {
    throw new Error('SFI_TENANT_WRITE_FORBIDDEN');
  }
}

async function latestReport(caseId: string) {
  const db = createServiceSupabaseClient();
  const result = await db.from('sfi_case_reports')
    .select('id,generated_at,report_payload')
    .eq('case_id', caseId)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (result.error) throw new Error(`SFI_CASE_REPORT_READ_FAILED:${result.error.message}`);
  return result.data as Row | null;
}

async function projectFor(projectId: unknown) {
  if (!projectId) return null;
  const db = createServiceSupabaseClient();
  const result = await db.from('sfi_projects')
    .select('id,project_key,name,description,attractor_ref,trajectory_ref,status,updated_at')
    .eq('id', String(projectId))
    .maybeSingle();
  if (result.error) throw new Error(`SFI_PROJECT_READ_FAILED:${result.error.message}`);
  return result.data ?? null;
}

async function envelope(caseId: string, userId: string) {
  const [base, state] = await Promise.all([
    readOperationalCase(caseId, userId),
    caseState(caseId),
  ]);
  const project = await projectFor(state.project_id);
  return {
    ...base,
    caseRecord: { ...base.caseRecord, projectId: state.project_id ? String(state.project_id) : null },
    project,
    closure: {
      status: String(state.status),
      closedAt: state.closed_at ? String(state.closed_at) : null,
      requiresUserDecision: String(state.status) === 'AWAITING_USER_CLOSE',
    },
  };
}

export async function GET(_: Request, context: RouteContext) {
  try {
    const { user } = await requireAuthenticatedUser();
    const { caseId } = await context.params;
    return NextResponse.json({ ok: true, ...(await envelope(caseId, user.id)) });
  } catch (error) {
    return sfiCaseApiFailure(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { user } = await requireAuthenticatedUser();
    const { caseId } = await context.params;
    const body = patchSchema.parse(await request.json());
    const state = await caseState(caseId);
    const tenantId = String(state.tenant_id);
    await assertUserCanDecide(user.id, tenantId);

    if (body.reportDecision) {
      if (String(state.status) !== 'AWAITING_USER_CLOSE') {
        throw new Error('SFI_CASE_REPORT_DECISION_NOT_READY');
      }
      const report = await latestReport(caseId);
      if (!report) throw new Error('SFI_CASE_REPORT_REQUIRED_FOR_USER_CLOSE');
      const db = createServiceSupabaseClient();
      const accepted = body.reportDecision === 'ACCEPT';
      const now = new Date().toISOString();
      const nextStatus = accepted ? 'CLOSED' : 'ANALYZING';
      const updated = await db.from('sfi_cases').update({
        status: nextStatus,
        closed_at: accepted ? now : null,
      }).eq('id', caseId).select('id').single();
      if (updated.error) throw new Error(`SFI_CASE_USER_DECISION_FAILED:${updated.error.message}`);
      const audit = await db.from('sfi_case_audit_events').insert({
        case_id: caseId,
        tenant_id: tenantId,
        actor_id: user.id,
        action: accepted ? 'CASE_REPORT_ACCEPTED_AND_CLOSED' : 'CASE_REPORT_DENIED_REOPENED',
        before_state: { status: state.status },
        after_state: { status: nextStatus },
        context: {
          reportId: String(report.id),
          reportGeneratedAt: report.generated_at ?? null,
          note: body.note ?? null,
          finalClosureAuthority: 'AUTHENTICATED_USER',
        },
      });
      if (audit.error) throw new Error(`SFI_CASE_AUDIT_FAILED:${audit.error.message}`);
      return NextResponse.json({ ok: true, decision: body.reportDecision, ...(await envelope(caseId, user.id)) });
    }

    if (!body.status) throw new Error('SFI_CASE_STATUS_REQUIRED');
    if (body.status === 'CLOSED') {
      return NextResponse.json({
        ok: false,
        error: 'user_report_decision_required',
        message: 'El cierre final ocurre únicamente al aceptar el reporte desde la pantalla del caso.',
      }, { status: 409 });
    }
    if (body.status === 'AWAITING_USER_CLOSE') {
      const report = await latestReport(caseId);
      if (!report) throw new Error('SFI_CASE_REPORT_REQUIRED_BEFORE_USER_CLOSE');
    }
    await transitionOperationalCase({ caseId, userId: user.id, status: body.status });
    return NextResponse.json({ ok: true, ...(await envelope(caseId, user.id)) });
  } catch (error) {
    return sfiCaseApiFailure(error);
  }
}
