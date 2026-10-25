import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedUser, requireSfiMember } from '@/lib/system/access/server';
import { generateOperationalReport, listOperationalReports, readOperationalCase } from '@/lib/sfi/case-platform/repository';
import { assertReportClaimsIntegrity } from '@/lib/sfi/case-platform/integrity';
import { renderSfiRealityPassportHtml } from '@/core/case-platform';
import { sfiCaseApiFailure } from '@/lib/sfi/case-platform/http';
import { readDataPlaneState } from '@/lib/persistence/dataPlaneContinuityStore';
import { describePassportReadBoundary } from '@/lib/sfi/case-platform/passportReadBoundary';
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
    const format = new URL(request.url).searchParams.get('format');
    if (format === 'passport-json' || format === 'passport-html' || format === 'passport-pdf') {
      const envelope = await readOperationalCase(caseId, user.id);
      const chain = envelope.realityChain;
      // All three download formats share the same fail-closed boundary.
      // Do not render a seemingly certified PDF while JSON alone warns of lag.
      let readConsistency = describePassportReadBoundary(null);
      try {
        const plane = await readDataPlaneState();
        readConsistency = describePassportReadBoundary(plane.mode);
      } catch {
        readConsistency = describePassportReadBoundary(null);
      }
      if (format === 'passport-pdf') {
        const {buildRealityPassportPdfInput,requiredPrivateCaseBriefCodePoints,renderPrivateCaseBriefPdf} = await import('@/lib/sfi/case-platform/privateCaseBriefContract');
        const {loadUnifontGlyphs} = await import('@/lib/sfi/case-platform/unifontType3');
        const renderInput=buildRealityPassportPdfInput(chain, readConsistency);
        const glyphs=await loadUnifontGlyphs(requiredPrivateCaseBriefCodePoints(renderInput));
        const bytes=renderPrivateCaseBriefPdf(renderInput,glyphs);
        return new Response(new Uint8Array(bytes),{headers:{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="SFI-Reality-Chain-${encodeURIComponent(caseId)}.pdf"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
      }
      const content = format === 'passport-html' ? renderSfiRealityPassportHtml(chain, readConsistency) : JSON.stringify({
        ...chain, objects:envelope.objects,
        temporalProvenance:envelope.temporalProvenance,
        authorityEvidence:envelope.authorityEvidence,
        trajectoryContrast:envelope.trajectoryContrast,
        returnLearning:envelope.returnLearning,
        readConsistency,
        reports:await listOperationalReports(caseId,user.id),
      }, null, 2);
      return new Response(content, {headers:{
        'Content-Type':format==='passport-html'?'text/html; charset=utf-8':'application/json; charset=utf-8',
        'Content-Disposition':`attachment; filename="SFI-Reality-Chain-${encodeURIComponent(caseId)}.${format==='passport-html'?'html':'json'}"`,
        'Cache-Control':'private, no-store', 'X-Content-Type-Options':'nosniff',
        'Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; sandbox",
      }});
    }
    return NextResponse.json({ ok: true, reports: await listOperationalReports(caseId, user.id) },{headers:{'Cache-Control':'private, no-store'}});
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
