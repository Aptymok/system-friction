import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { readContinuityEvidenceTargetIndex, readContinuityInteractiveCaseIndex } from '@/lib/sfi/continuityPostgres';

type Row = Record<string, unknown>;

function text(value: unknown) {
  return typeof value === 'string' ? value : value == null ? null : String(value);
}

function transientWarnings(...values: Array<string | null>) {
  return values.filter((value): value is string => Boolean(value));
}

export async function readInteractiveCaseIndex(userId: string) {
  const db = createServiceSupabaseClient();
  const memberships = await db.from('sfi_tenant_members')
    .select('tenant_id')
    .eq('user_id', userId)
    .eq('status', 'ACTIVE');
  if (memberships.error) {
    const continuity = await readContinuityInteractiveCaseIndex(userId);
    return {
      ...continuity,
      warnings: [
        `supabase:sfi_tenant_members:${memberships.error.message}`,
        ...continuity.warnings,
      ],
    };
  }
  const tenantIds = [...new Set((memberships.data ?? []).map((row) => String(row.tenant_id)).filter(Boolean))];
  if (!tenantIds.length) {
    return { projects: [], cases: [], warnings: [], readPlan: { membershipReads: 1, caseReads: 0, projectReads: 0, compactIndex: true } };
  }

  const [caseRows, projectRows] = await Promise.all([
    db.from('sfi_cases')
      .select('id,tenant_id,project_id,subject,status,updated_at')
      .in('tenant_id', tenantIds)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(250),
    db.from('sfi_projects')
      .select('id,tenant_id,project_key,name,attractor_ref,trajectory_ref,status,updated_at')
      .in('tenant_id', tenantIds)
      .order('updated_at', { ascending: false })
      .limit(120),
  ]);
  if (caseRows.error || projectRows.error) {
    const continuity = await readContinuityInteractiveCaseIndex(userId);
    return {
      ...continuity,
      warnings: [
        caseRows.error ? `supabase:sfi_cases:${caseRows.error.message}` : null,
        projectRows.error ? `supabase:sfi_projects:${projectRows.error.message}` : null,
        ...continuity.warnings,
      ].filter((value): value is string => Boolean(value)),
    };
  }

  const cases = ((caseRows.data ?? []) as Row[]).map((row) => ({
    id: String(row.id),
    tenantId: String(row.tenant_id),
    projectId: row.project_id ? String(row.project_id) : null,
    subject: String(row.subject ?? ''),
    status: String(row.status ?? ''),
    updatedAt: text(row.updated_at),
  }));

  const caseCounts = new Map<string, number>();
  for (const item of cases) {
    if (!item.projectId) continue;
    caseCounts.set(item.projectId, (caseCounts.get(item.projectId) ?? 0) + 1);
  }

  const projects = ((projectRows.data ?? []) as Row[]).map((row) => ({
    id: String(row.id),
    tenantId: String(row.tenant_id),
    key: String(row.project_key ?? ''),
    name: String(row.name ?? ''),
    attractorRef: row.attractor_ref ?? null,
    trajectoryRef: row.trajectory_ref ?? null,
    status: String(row.status ?? ''),
    updatedAt: text(row.updated_at),
    caseCount: caseCounts.get(String(row.id)) ?? 0,
  }));

  return {
    projects,
    cases,
    warnings: [
      caseRows.data?.length === 250 ? 'sfi_cases:INTERACTIVE_INDEX_LIMIT_REACHED' : null,
      projectRows.data?.length === 120 ? 'sfi_projects:INTERACTIVE_INDEX_LIMIT_REACHED' : null,
    ].filter((value): value is string => Boolean(value)),
    readPlan: {
      membershipReads: 1,
      caseReads: 1,
      projectReads: 1,
      compactIndex: true,
      caseLimit: 250,
      projectLimit: 120,
      duplicateTenantMembershipReads: 0,
      duplicateCaseTableReads: 0,
    },
  };
}

export async function readInteractiveEvidenceTargetIndex() {
  const db = createServiceSupabaseClient();
  const [entries, nodes] = await Promise.all([
    db.from('root_evidence_entries')
      .select('id,title,evidence_type,target_node_id,created_at')
      .order('created_at', { ascending: false })
      .limit(60),
    db.from('graph_nodes')
      .select('id,node_id,label,node_type,epistemic_class,updated_at')
      .order('updated_at', { ascending: false })
      .limit(80),
  ]);
  const warnings = transientWarnings(
    entries.error ? `root_evidence_entries:${entries.error.message}` : null,
    nodes.error ? `graph_nodes:${nodes.error.message}` : null,
  );
  if (entries.error || nodes.error) {
    const continuity = await readContinuityEvidenceTargetIndex();
    return {
      entries: continuity.entries,
      nodes: continuity.nodes,
      exhaustive: false,
      readLimits: { entries: 60, nodes: 80 },
      warnings: ['read_plane:NEON_CONTINUITY', ...warnings],
      readPlan: { evidenceEntryReads: 1, graphNodeReads: 1, fullRootConsoleReads: 0, compactTargetIndex: true },
    };
  }
  return {
    entries: entries.data ?? [],
    nodes: nodes.data ?? [],
    exhaustive: false,
    readLimits: { entries: 60, nodes: 80 },
    warnings,
    readPlan: { evidenceEntryReads: 1, graphNodeReads: 1, fullRootConsoleReads: 0, compactTargetIndex: true },
  };
}
