import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedUser } from '@/lib/system/access/server';
import { normalizeAndRegisterOperationalCaseSource, readOperationalCase } from '@/lib/sfi/case-platform/repository';
import { sfiCaseApiFailure } from '@/lib/sfi/case-platform/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({
  targetSourceType: z.string().trim().min(1).max(160),
  connectionType: z.enum(['API', 'DATABASE', 'RECURRENT_EXPORT', 'WEBHOOK_INBOUND']),
  baseUrl: z.string().trim().max(2000).nullable().optional(),
  requestedMode: z.enum(['READ_ONLY_OBSERVATION']).default('READ_ONLY_OBSERVATION'),
  notes: z.string().trim().max(3000).nullable().optional(),
}).strict();

type RouteContext = { params: Promise<{ caseId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { user } = await requireAuthenticatedUser();
    const { caseId } = await context.params;
    const body = schema.parse(await request.json());
    const envelope = await readOperationalCase(caseId, user.id);
    const target = body.targetSourceType.toUpperCase().replace(/[^A-Z0-9:_-]+/g, '_');
    const requestId = randomUUID();
    const source = await normalizeAndRegisterOperationalCaseSource({
      caseId,
      userId: user.id,
      source: {
        id: `connection-request:${requestId}`,
        sourceType: `CONNECTION_REQUEST:${target}`,
        label: `${body.connectionType} connection request for ${target}`,
        externalRef: body.baseUrl ?? null,
        observedAt: new Date().toISOString(),
        contentHash: null,
        metadata: {
          tenantId: envelope.caseRecord.tenantId,
          caseId,
          targetSourceType: target,
          connectionType: body.connectionType,
          requestedMode: body.requestedMode,
          state: 'REQUESTED',
          credentialsPersisted: false,
          secretsAcceptedHere: false,
          notes: body.notes ?? null,
          governanceBoundary: 'REQUEST_DOES_NOT_EQUAL_ACTIVE_SOURCE; EXTERNAL_WRITE_REQUIRES_GOVERNED_AUTHORITY',
        },
      },
    });
    return NextResponse.json({
      ok: true,
      requestId,
      source,
      state: 'REQUESTED',
      sourceActive: false,
      next: 'Provision credentials through an authorized secret channel, verify connectivity, then register the observed source under its target source type.',
    }, { status: 201 });
  } catch (error) {
    return sfiCaseApiFailure(error);
  }
}
