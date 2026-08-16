import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedUser } from '@/lib/system/access/server';
import { createOperationalCase, listOperationalCases } from '@/lib/sfi/case-platform/repository';
import { sfiCaseApiFailure } from '@/lib/sfi/case-platform/http';
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

const createSchema = z.object({
  tenantId: z.string().uuid().nullable().optional(),
  clientId: z.string().trim().max(240).nullable().optional(),
  serviceProfileId: z.string().trim().min(1).max(120),
  subject: z.string().trim().min(1).max(160),
  scope: z.string().trim().min(1).max(2000),
  systemBoundaryRef: refSchema,
  temporalWindow: temporalSchema,
}).strict();

export async function GET() {
  try {
    const { user } = await requireAuthenticatedUser();
    const cases = await listOperationalCases(user.id);
    return NextResponse.json({ ok: true, contract: 'SFI-CASE-1.0', cases });
  } catch (error) {
    return sfiCaseApiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requireAuthenticatedUser();
    const body = createSchema.parse(await request.json());
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
    return NextResponse.json({ ok: true, case: caseRecord }, { status: 201 });
  } catch (error) {
    return sfiCaseApiFailure(error);
  }
}
