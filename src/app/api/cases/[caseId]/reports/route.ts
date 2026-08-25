import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedUser } from '@/lib/system/access/server';
import { generateOperationalReport, listOperationalReports } from '@/lib/sfi/case-platform/repository';
import { assertReportClaimsIntegrity } from '@/lib/sfi/case-platform/integrity';
import { sfiCaseApiFailure } from '@/lib/sfi/case-platform/http';
import type { SfiReportClaimV1 } from '@/core/contracts/sfi';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const refSchema = z.object({ id: z.string().trim().min(1).max(500), version: z.string().trim().max(120).nullable().optional(), hash: z.string().trim().max(256).nullable().optional() }).strict();
const claimSchema = z.object({
  id: z.string().trim().min(1).max(240),
  statement: z.string().trim().min(1).max(8000),
  assessmentRef: refSchema,
  evidenceRefs: z.array(refSchema).max(500),
  recordRefs: z.array(refSchema).max(500),
  sourceRefs: z.array(refSchema).max(500),
  determinability: z.enum(['DETERMINED','PARTIALLY_DETERMINED','UNDETERMINED']),
  confidence: z.number().min(0).max(1).nullable(),
}).strict();
const reportSchema = z.object({ claims: z.array(claimSchema).max(500).optional(), deliveryFormats: z.array(z.enum(['JSON','WEB','PDF','DASHBOARD'])).min(1).max(4).optional(), limitations: z.array(z.string().trim().min(1).max(2000)).max(100).optional() }).strict();
type RouteContext = { params: Promise<{ caseId: string }> };

export async function GET(_: Request, context: RouteContext) {
  try {
    const { user } = await requireAuthenticatedUser();
    const { caseId } = await context.params;
    return NextResponse.json({ ok: true, reports: await listOperationalReports(caseId, user.id), executionAuthority: false });
  } catch (error) {
    return sfiCaseApiFailure(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { user } = await requireAuthenticatedUser();
    const { caseId } = await context.params;
    const body = reportSchema.parse(await request.json());
    const claims = (body.claims ?? []) as SfiReportClaimV1[];
    await assertReportClaimsIntegrity({ caseId, userId: user.id, claims });
    const report = await generateOperationalReport({ caseId, userId: user.id, claims, deliveryFormats: body.deliveryFormats, limitations: body.limitations });
    return NextResponse.json({
      ok: true,
      report,
      executionAuthority: false,
      boundary: 'Tenant-authorized report generation assembles a case snapshot. REPORT ≠ ACTION, does not admit case data into institutional memory, and grants no execution or canon authority.',
    }, { status: 201 });
  } catch (error) {
    return sfiCaseApiFailure(error);
  }
}
