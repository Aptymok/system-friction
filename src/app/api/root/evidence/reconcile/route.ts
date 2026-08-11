import { NextResponse } from 'next/server';
import { reconcilePersistedEvidenceGraph } from '@/lib/evidence/reconcileEvidenceGraph';
import { auditRootAction, requireRootActor } from '@/lib/root/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: Request) {
  const gate = await requireRootActor('evidence.graph.reconcile');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const result = await reconcilePersistedEvidenceGraph();
  const audit = await auditRootAction({
    actorId: gate.ctx.user.id,
    action: 'evidence.graph.reconcile',
    target: 'graph_nodes+graph_edges',
    payload: {
      projectionVersion: result.projectionVersion,
      rootEvidenceRows: result.rootEvidenceRows,
      ledgerRows: result.ledgerRows,
      canonicalEvidenceObjects: result.canonicalEvidenceObjects,
      nodesRemoved: result.nodesRemoved,
      edgesRemoved: result.edgesRemoved,
      nodesCreated: result.nodesCreated,
      nodesUpdated: result.nodesUpdated,
      edgesCreated: result.edgesCreated,
      warningCount: result.warnings.length,
    },
    request,
  });

  if (!audit.ok) return NextResponse.json(audit, { status: 500 });
  return NextResponse.json({ ok: true, reconciliation: result, audit });
}
