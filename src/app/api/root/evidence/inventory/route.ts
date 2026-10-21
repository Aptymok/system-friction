import { NextResponse } from 'next/server';
import { requireRootViewer } from '@/lib/root/server';
import { readInstitutionalEvidenceInventory } from '@/lib/evidence/readInstitutionalEvidenceInventory';
import { readInteractiveCaseIndex } from '@/lib/root/interactiveReadModel';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const gate = await requireRootViewer('root.evidence.inventory.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  // Case labels are membership-scoped. Never query the global tenant case table.
  const [inventory, caseIndex] = await Promise.all([
    readInstitutionalEvidenceInventory(25),
    readInteractiveCaseIndex(gate.ctx.user.id),
  ]);

  return NextResponse.json({
    ok: inventory.warnings.length === 0 && caseIndex.warnings.length === 0,
    inventory,
    cases: (caseIndex.cases ?? []).map((item) => ({
      id: item.id, subject: item.subject, status: item.status, updatedAt: item.updatedAt,
    })),
    caseWarnings: caseIndex.warnings,
    caseBoundary: 'Membership-scoped case index; case objects are not copied or admitted as ROOT evidence.',
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}
