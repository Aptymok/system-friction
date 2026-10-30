import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedUser, requireSfiMember } from '@/lib/system/access/server';
import { generateOperationalReport, listOperationalReports, readOperationalRealityChain } from '@/lib/sfi/case-platform/repository';
import { assertReportClaimsIntegrity } from '@/lib/sfi/case-platform/integrity';
import { renderSfiRealityPassportHtml } from '@/core/case-platform';
import { readDataPlaneState } from '@/lib/persistence/dataPlaneContinuityStore';
import { describePassportReadBoundary } from '@/lib/sfi/case-platform/passportReadBoundary';
import { sfiCaseApiFailure } from '@/lib/sfi/case-platform/http';
import {
  SFI_EPISTEMIC_OUTPUT_RELATIONS,
  type SfiReportClaimV1,
} from '@/core/contracts/sfi';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const refSchema = z.object({ id: z.string().trim().min(1).max(500), version: z.string().trim().max(120).nullable().optional(), hash: z.string().trim().max(256).nullable().optional() }).strict();
const lineageSchema = z.object({
  executionRef: refSchema.nullable(),
  outputRelation: z.enum(SFI_EPISTEMIC_OUTPUT_RELATIONS),
  support: z.enum(['SUPPORTED','PARTIALLY_SUPPORTED','CONTRADICTED','INSUFFICIENT','UNSUPPORTED']),
  contradictionRefs: z.array(refSchema).max(500),
  refutationConditions: z.array(z.string().trim().min(1).max(2000)).max(100),
}).strict();
const claimSchema = z.object({
  id: z.string().trim().min(1).max(240),
  statement: z.string().trim().min(1).max(8000),
  assessmentRef: refSchema,
  evidenceRefs: z.array(refSchema).max(500),
  recordRefs: z.array(refSchema).max(500),
  sourceRefs: z.array(refSchema).max(500),
  determinability: z.enum(['DETERMINED','PARTIALLY_DETERMINED','UNDETERMINED']),
  confidence: z.number().min(0).max(1).nullable(),
  lineage: lineageSchema.optional(),
}).strict();
const reportSchema = z.object({ claims: z.array(claimSchema).max(500).optional(), deliveryFormats: z.array(z.enum(['JSON','WEB','PDF','DASHBOARD'])).min(1).max(4).optional(), limitations: z.array(z.string().trim().min(1).max(2000)).max(100).optional() }).strict();
type RouteContext = { params: Promise<{ caseId: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { user } = await requireAuthenticatedUser();
    const { caseId } = await context.params;
    const params = new URL(request.url).searchParams;
    if (params.get('format') === 'passport') {
      const projection = await readOperationalRealityChain(caseId, user.id);
      const plane = await readDataPlaneState().then(value => value.mode).catch(() => null);
      const boundary = describePassportReadBoundary(plane);
      return new Response(renderSfiRealityPassportHtml(projection.realityChain, boundary), {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'private, no-store',
          'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }
    const reportId = params.get('reportId');
    const reports = await listOperationalReports(caseId, user.id);
    if (reportId !== null) {
      if (!z.string().uuid().safeParse(reportId).success) {
        return NextResponse.json({ ok: false, error: 'INVALID_REPORT_ID' }, { status: 400, headers: { 'Cache-Control': 'private, no-store' } });
      }
      const match = reports.find(row => row.id === reportId);
      if (!match) return NextResponse.json({ ok: false, error: 'REPORT_NOT_FOUND_IN_AUTHORIZED_CASE' }, { status: 404, headers: { 'Cache-Control': 'private, no-store' } });
      return NextResponse.json({ ok: true, report: match.report, persisted: true }, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    return NextResponse.json({ ok: true, reports }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return sfiCaseApiFailure(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { user } = await requireSfiMember();
    const { caseId } = await context.params;
    const body = reportSchema.parse(await request.json());
    const claims = (body.claims ?? []) as SfiReportClaimV1[];
    await assertReportClaimsIntegrity({ caseId, userId: user.id, claims });
    const report = await generateOperationalReport({ caseId, userId: user.id, claims, deliveryFormats: body.deliveryFormats, limitations: body.limitations });
    return NextResponse.json({ ok: true, report, executionAuthority: false }, { status: 201 });
  } catch (error) {
    return sfiCaseApiFailure(error);
  }
}
