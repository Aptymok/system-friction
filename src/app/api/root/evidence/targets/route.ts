import { NextResponse } from 'next/server';
import { requireRootViewer } from '@/lib/root/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const gate = await requireRootViewer('root.evidence.targets.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const db = gate.ctx.service;
  const [entries, nodes] = await Promise.all([
    db.from('root_evidence_entries')
      .select('id,evidence_hash,title,evidence_type,target_node_id,payload,epistemic_event_id,created_at')
      .order('created_at', { ascending: false })
      .limit(100),
    db.from('graph_nodes')
      .select('id,node_id,node_key,label,node_type,ontology_type,origin,epistemic_class,confidence,created_at,updated_at')
      .order('updated_at', { ascending: false })
      .limit(120),
  ]);

  const warnings = [
    entries.error ? `root_evidence_entries:${entries.error.message}` : null,
    nodes.error ? `graph_nodes:${nodes.error.message}` : null,
  ].filter(Boolean);

  if (entries.error && nodes.error) {
    return NextResponse.json({
      ok: false,
      error: 'SFI_EVIDENCE_TARGET_INDEX_UNAVAILABLE',
      warnings,
    }, { status: 503, headers: { 'Retry-After': '3', 'Cache-Control': 'no-store' } });
  }

  return NextResponse.json({
    ok: true,
    evidence: {
      entries: entries.data ?? [],
      nodes: nodes.data ?? [],
      exhaustive: false,
      readLimits: { entries: 100, nodes: 120 },
    },
    warnings,
    boundary: 'This endpoint is a bounded selector index for interactive governance. It does not load the full evidence ledger or graph edges and absence outside the read window is not proof of non-existence.',
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}
