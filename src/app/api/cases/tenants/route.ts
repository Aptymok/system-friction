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
    const { user } = await requireSfiMember();
    const body = createSchema.parse(await request.json());
    const tenant = await createOperationalTenant({
      userId: user.id,
      tenantKey: body.tenantKey,
      name: body.name,
      tenantType: body.tenantType,
      metadata: body.metadata,
    });
    return NextResponse.json({ ok: true, tenant }, { status: 201 });
  } catch (error) {
    return sfiCaseApiFailure(error);
  }
}
