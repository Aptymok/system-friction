import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/system/access/server';
import { listTenantEnterpriseRelations } from '@/lib/sfi/case-platform/enterpriseRepository';
import { sfiCaseApiFailure } from '@/lib/sfi/case-platform/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ tenantId: string }> };

export async function GET(_: Request, context: RouteContext) {
  try {
    const { user } = await requireAuthenticatedUser();
    const { tenantId } = await context.params;
    const relations = await listTenantEnterpriseRelations(tenantId, user.id);
    return NextResponse.json({
      ok: true,
      contract: 'SFI-ENTERPRISE-ASSURANCE-DOMAIN-1.0',
      tenantId,
      relations,
      boundary: 'Tenant enterprise graph ≠ institutional SFI graph.',
    });
  } catch (error) {
    return sfiCaseApiFailure(error);
  }
}
