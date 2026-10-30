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
  status: statusSchema,
  note: z.string().trim().max(2000).optional(),
}).strict();

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

async function assertUserCanWrite(userId: string, tenantId: string) {
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
      requiresUserDecision: false,
      mode: 'AUTONOMOUS_WHEN_CLOSURE_CONTRACT_IS_SATISFIED',
      legacyAwaitingUserClose: String(state.status) === 'AWAITING_USER_CLOSE',
      boundary: 'Closure records operational completion only; it does not promote learning/canon or expand authority.',
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
    await assertUserCanWrite(user.id, tenantId);

    if (body.status === 'AWAITING_USER_CLOSE') {
      return NextResponse.json({
        ok: false,
        error: 'legacy_state_not_enterable',
        message: 'AWAITING_USER_CLOSE remains readable for historical reconstruction but is no longer a routine lifecycle gate.',
      }, { status: 409 });
    }

    await transitionOperationalCase({ caseId, userId: user.id, status: body.status });
    return NextResponse.json({
      ok: true,
      note: body.note ?? null,
      ...(await envelope(caseId, user.id)),
    });
  } catch (error) {
    return sfiCaseApiFailure(error);
  }
}
