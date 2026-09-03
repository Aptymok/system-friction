import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedUser } from '@/lib/system/access/server';
import { createOperationalCase, listOperationalCases, listOperationalTenants } from '@/lib/sfi/case-platform/repository';
import { sfiCaseApiFailure } from '@/lib/sfi/case-platform/http';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import type { SfiServiceProfileId, SfiTemporalWindowV1 } from '@/core/contracts/sfi';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const refSchema = z.object({
  id: z.string().trim().min(1).max(500),
  version: z.string().trim().max(120).nullable().optional(),
  hash: z.string().trim().max(256).nullable().optional(),
}).strict();

const temporalSchema = z.object({
  mode: z.enum(['CROSS_SECTIONAL','LONGITUDINAL','RETROLONGITUDINAL','COUNTERFACTUAL','PROJECTIVE']),
  basis: z.enum(['OBSERVED_TIME','RECONSTRUCTED_TIME','SIMULATED_TIME','PROJECTED_TIME']),
  start: z.string().trim().nullable(),
  end: z.string().trim().nullable(),
  cutoff: z.string().trim().min(1).max(80),
  timezone: z.string().trim().min(1).max(120),
  reconstructionAsOf: z.string().trim().nullable().optional(),
  horizon: z.string().trim().nullable().optional(),
}).strict();

const createCaseSchema = z.object({
  resource: z.literal('CASE').optional(),
  tenantId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  clientId: z.string().trim().max(240).nullable().optional(),
  serviceProfileId: z.string().trim().min(1).max(120),
  subject: z.string().trim().min(1).max(160),
  scope: z.string().trim().min(1).max(2000),
  systemBoundaryRef: refSchema,
  temporalWindow: temporalSchema,
}).strict();

const createProjectSchema = z.object({
  resource: z.literal('PROJECT'),
  tenantId: z.string().uuid(),
  projectKey: z.string().trim().min(3).max(100),
  name: z.string().trim().min(1).max(240),
  description: z.string().trim().max(4000).optional().default(''),
  attractorRef: refSchema.nullable().optional(),
  trajectoryRef: refSchema.nullable().optional(),
}).strict();

function normalizedProjectKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9:_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);
}

function transientPoolPressure(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return [
    'Timed out acquiring connection from connection pool',
    'statement timeout',
    'request_timeout',
    'context deadline exceeded',
    'PGRST003',
  ].some((marker) => message.includes(marker));
}

async function withTransientReadRetry<T>(read: () => Promise<T>) {
  const delays = [0, 120, 300];
  let lastError: unknown = null;
  for (const delay of delays) {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    try {
      return await read();
    } catch (error) {
      lastError = error;
      if (!transientPoolPressure(error)) throw error;
    }
  }
  throw lastError;
}

async function writableTenant(userId: string, tenantId: string) {
  const db = createServiceSupabaseClient();
  const membership = await db.from('sfi_tenant_members')
    .select('role,status')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .maybeSingle();
  if (membership.error) throw new Error(`SFI_PROJECT_TENANT_READ_FAILED:${membership.error.message}`);
  if (!membership.data || membership.data.status !== 'ACTIVE' || !['OWNER','ADMIN','OPERATOR'].includes(String(membership.data.role))) {
    throw new Error('SFI_TENANT_WRITE_FORBIDDEN');
  }
}

export async function GET() {
  try {
    const { user } = await requireAuthenticatedUser();
    const cases = await withTransientReadRetry(() => listOperationalCases(user.id));
    const tenants = await withTransientReadRetry(() => listOperationalTenants(user.id));
    const db = createServiceSupabaseClient();
    const tenantIds = tenants.map((tenant) => tenant.id);
    const caseIds = cases.map((item) => item.id);
    const [projectRows, caseLinks] = await Promise.all([
      tenantIds.length
        ? db.from('sfi_projects').select('id,tenant_id,project_key,name,description,attractor_ref,trajectory_ref,status,created_at,updated_at').in('tenant_id', tenantIds).order('updated_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      caseIds.length
        ? db.from('sfi_cases').select('id,project_id').in('id', caseIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (projectRows.error) throw new Error(`SFI_PROJECT_LIST_FAILED:${projectRows.error.message}`);
    if (caseLinks.error) throw new Error(`SFI_CASE_PROJECT_LINK_READ_FAILED:${caseLinks.error.message}`);
    const projectByCase = new Map((caseLinks.data ?? []).map((row) => [String(row.id), row.project_id ? String(row.project_id) : null]));
    const enrichedCases = cases.map((item) => ({ ...item, projectId: projectByCase.get(item.id) ?? null }));
    const projects = (projectRows.data ?? []).map((row) => ({
      id: String(row.id),
      tenantId: String(row.tenant_id),
      key: String(row.project_key),
      name: String(row.name),
      description: String(row.description ?? ''),
      attractorRef: row.attractor_ref ?? null,
      trajectoryRef: row.trajectory_ref ?? null,
      status: String(row.status),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      caseCount: enrichedCases.filter((item) => item.projectId === String(row.id)).length,
    }));
    return NextResponse.json({ ok: true, contract: 'SFI-CASE-1.0', projects, cases: enrichedCases });
  } catch (error) {
    return sfiCaseApiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requireAuthenticatedUser();
    const raw = await request.json();
    if (raw && typeof raw === 'object' && raw.resource === 'PROJECT') {
      const body = createProjectSchema.parse(raw);
      await writableTenant(user.id, body.tenantId);
      const projectKey = normalizedProjectKey(body.projectKey);
      if (!projectKey) throw new Error('SFI_PROJECT_KEY_INVALID');
      const db = createServiceSupabaseClient();
      const inserted = await db.from('sfi_projects').insert({
        tenant_id: body.tenantId,
        owner_id: user.id,
        project_key: projectKey,
        name: body.name,
        description: body.description,
        attractor_ref: body.attractorRef ?? null,
        trajectory_ref: body.trajectoryRef ?? null,
      }).select('id,tenant_id,project_key,name,description,attractor_ref,trajectory_ref,status,created_at,updated_at').single();
      if (inserted.error || !inserted.data) throw new Error(`SFI_PROJECT_CREATE_FAILED:${inserted.error?.message ?? 'unknown'}`);
      return NextResponse.json({ ok: true, project: inserted.data }, { status: 201 });
    }

    const body = createCaseSchema.parse(raw);
    if (body.projectId) {
      const db = createServiceSupabaseClient();
      const project = await db.from('sfi_projects').select('id,tenant_id,status').eq('id', body.projectId).maybeSingle();
      if (project.error) throw new Error(`SFI_PROJECT_READ_FAILED:${project.error.message}`);
      if (!project.data || project.data.status !== 'ACTIVE') throw new Error('SFI_PROJECT_NOT_ACTIVE');
      await writableTenant(user.id, String(project.data.tenant_id));
      if (body.tenantId && body.tenantId !== String(project.data.tenant_id)) throw new Error('SFI_PROJECT_TENANT_MISMATCH');
    }
    const caseRecord = await createOperationalCase({
      userId: user.id,
      userEmail: user.email,
      tenantId: body.tenantId,
      clientId: body.clientId,
      serviceProfileId: body.serviceProfileId as SfiServiceProfileId,
      subject: body.subject,
      scope: body.scope,
      systemBoundaryRef: body.systemBoundaryRef,
      temporalWindow: body.temporalWindow as SfiTemporalWindowV1,
    });
    if (body.projectId) {
      const db = createServiceSupabaseClient();
      const linked = await db.from('sfi_cases').update({ project_id: body.projectId }).eq('id', caseRecord.id);
      if (linked.error) throw new Error(`SFI_CASE_PROJECT_LINK_FAILED:${linked.error.message}`);
    }
    return NextResponse.json({ ok: true, case: { ...caseRecord, projectId: body.projectId ?? null } }, { status: 201 });
  } catch (error) {
    return sfiCaseApiFailure(error);
  }
}
