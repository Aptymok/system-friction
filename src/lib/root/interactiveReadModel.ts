import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';

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
    .select('tenant_id,role,status')
    .eq('user_id', userId)
    .eq('status', 'ACTIVE');
  if (memberships.error) throw new Error(`SFI_TENANT_MEMBERSHIP_READ_FAILED:${memberships.error.message}`);
  const tenantIds = [...new Set((memberships.data ?? []).map((row) => String(row.tenant_id)).filter(Boolean))];
  if (!tenantIds.length) {
    return { projects: [], cases: [], warnings: [], readPlan: { membershipReads: 1, caseReads: 0, projectReads: 0 } };
  }

  const [caseRows, projectRows] = await Promise.all([
    db.from('sfi_cases')
      .select('id,tenant_id,project_id,client_id,service_profile_id,subject,scope,system_boundary_ref,temporal_window,lineage,uncertainty,governance,status,created_at,updated_at,closed_at')
      .in('tenant_id', tenantIds)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false }),
    db.from('sfi_projects')
      .select('id,tenant_id,project_key,name,description,attractor_ref,trajectory_ref,status,created_at,updated_at')
      .in('tenant_id', tenantIds)
      .order('updated_at', { ascending: false }),
  ]);
  if (caseRows.error) throw new Error(`SFI_CASE_LIST_FAILED:${caseRows.error.message}`);
  if (projectRows.error) throw new Error(`SFI_PROJECT_LIST_FAILED:${projectRows.error.message}`);

  const cases = ((caseRows.data ?? []) as Row[]).map((row) => ({
    id: String(row.id),
    tenantId: String(row.tenant_id),
    projectId: row.project_id ? String(row.project_id) : null,
    clientId: text(row.client_id),
    serviceProfileId: String(row.service_profile_id ?? ''),
    subject: String(row.subject ?? ''),
    scope: String(row.scope ?? ''),
    systemBoundaryRef: row.system_boundary_ref ?? null,
    temporalWindow: row.temporal_window ?? null,
    lineage: Array.isArray(row.lineage) ? row.lineage : [],
    uncertainty: row.uncertainty ?? null,
    governance: row.governance ?? null,
    status: String(row.status ?? ''),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
    closedAt: text(row.closed_at),
  }));

  const projects = ((projectRows.data ?? []) as Row[]).map((row) => ({
    id: String(row.id),
    tenantId: String(row.tenant_id),
    key: String(row.project_key ?? ''),
    name: String(row.name ?? ''),
    description: String(row.description ?? ''),
    attractorRef: row.attractor_ref ?? null,
    trajectoryRef: row.trajectory_ref ?? null,
    status: String(row.status ?? ''),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
    caseCount: cases.filter((item) => item.projectId === String(row.id)).length,
  }));

  return {
    projects,
    cases,
    warnings: [],
    readPlan: {
      membershipReads: 1,
      caseReads: 1,
      projectReads: 1,
      duplicateTenantMembershipReads: 0,
      duplicateCaseTableReads: 0,
    },
  };
}

export async function readInteractiveEvidenceTargetIndex() {
  const db = createServiceSupabaseClient();
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
  const warnings = transientWarnings(
    entries.error ? `root_evidence_entries:${entries.error.message}` : null,
    nodes.error ? `graph_nodes:${nodes.error.message}` : null,
  );
  if (entries.error && nodes.error) throw new Error(`SFI_EVIDENCE_TARGET_INDEX_UNAVAILABLE:${warnings.join('|')}`);
  return {
    entries: entries.data ?? [],
    nodes: nodes.data ?? [],
    exhaustive: false,
    readLimits: { entries: 100, nodes: 120 },
    warnings,
    readPlan: { evidenceEntryReads: 1, graphNodeReads: 1, fullRootConsoleReads: 0 },
  };
}
