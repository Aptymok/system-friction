import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedUser, requireSfiMember } from '@/lib/system/access/server';
import { createOperationalTenant, listOperationalTenants } from '@/lib/sfi/case-platform/repository';
import { sfiCaseApiFailure } from '@/lib/sfi/case-platform/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const createSchema = z.object({
  tenantKey: z.string().trim().min(3).max(81),
  name: z.string().trim().min(1).max(240),
  tenantType: z.enum(['CLIENT','INTERNAL','RESEARCH']),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict();

export async function GET() {
  try {
    const { user } = await requireAuthenticatedUser();
    const tenants = await listOperationalTenants(user.id);
    return NextResponse.json({ ok: true, tenants });
  } catch (error) {
    return sfiCaseApiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = createSchema.parse(await request.json());
    const actor = body.tenantType === 'INTERNAL'
      ? await requireSfiMember()
      : await requireAuthenticatedUser();
    const tenant = await createOperationalTenant({
      userId: actor.user.id,
      tenantKey: body.tenantKey,
      name: body.name,
      tenantType: body.tenantType,
      metadata: {
        ...(body.metadata ?? {}),
        tenantBoundary: 'ISOLATED',
        rootAccess: false,
        externalEffectsRequireGovernance: true,
      },
    });
    return NextResponse.json({
      ok: true,
      tenant,
      boundary: 'Tenant memory, cases, sources and reports remain tenant-scoped. SFI institutional memory does not inherit client authority.',
    }, { status: 201 });
  } catch (error) {
    return sfiCaseApiFailure(error);
  }
}
