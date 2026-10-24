import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { listOperationalTenants } from '@/lib/sfi/case-platform/repository';
import {
  isSfiContinuityConfigured,
  readContinuityInteractiveCaseIndex,
} from '@/lib/sfi/continuityPostgres';
import type { TimelineItem } from '@/components/sfi/OperationalTimeline';
import { projectTimelineCaseHistory, type TimelineCaseHistoryBatch } from './timelineCaseHistory';

type Row = Record<string, unknown>;
type CaseEntry = { id: string; subject: string; status: string; updatedAt: string | null; createdAt: string | null };
type ProjectEntry = { id: string; name: string; status: string; updatedAt: string | null; createdAt?: string | null; attractorRef: unknown; trajectoryRef: unknown; caseCount: number };

function str(value: unknown) { return typeof value === 'string' ? value.trim() : ''; }
function iso(value: unknown) {
  const s = str(value);
  if (!s || !Number.isFinite(Date.parse(s))) return null;
  return new Date(s).toISOString();
}
function refLabel(value: unknown) {
  const data = value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
  return str(data.id || data.ref || data.label || data.name).slice(0, 160);
}

/**
 * Present a read-model of tenant-authorized canonical Case Platform entities.
 * An updated_at row clock is explicitly not an event/decision/RETURN clock.
 * A project attractor_ref is a declared reference, not observed convergence.
 */
export function projectCaseProjectTimeline(
  cases: CaseEntry[],
  projects: ProjectEntry[],
  readPlane: string,
): TimelineItem[] {
  const projected: TimelineItem[] = [];
  for (const c of cases) {
    const at = iso(c.updatedAt);
    if (!at || !c.id) continue;
    projected.push({
      id: 'case:' + c.id, at, lane: 'CASE',
      title: c.subject || 'Untitled case',
      subtitle: 'Case status: ' + (c.status || 'UNKNOWN'),
      origin: 'CASE PLATFORM · ' + readPlane, state: c.status || 'UNKNOWN',
      href: '/reality-chain?caseId=' + encodeURIComponent(c.id),
      recordCreatedAt: iso(c.createdAt),
      clockAnchorMeaning: 'Case Platform sfi_cases.updated_at: last persisted update, not event, authority, agent execution or RETURN time.',
      clockEvidence: { RECORD: {
        at, sourceRef: 'sfi_cases:' + c.id,
        meaning: 'Persisted case row updated_at; historical event time and actor knowledge remain UNKNOWN.',
        basis: 'OBSERVED_TIME', epistemicClass: 'OBSERVED',
      } },
    });
  }
  for (const p of projects) {
    const at = iso(p.updatedAt);
    if (!at || !p.id) continue;
    const attractor = refLabel(p.attractorRef);
    const trajectory = refLabel(p.trajectoryRef);
    const described = [
      'Project status: ' + (p.status || 'UNKNOWN'),
      'Cases in bounded index: ' + p.caseCount,
      attractor ? 'Declared attractor reference: ' + attractor : 'Attractor reference not registered',
      trajectory ? 'Declared trajectory reference: ' + trajectory : null,
    ].filter(Boolean).join(' · ');
    const registered = iso(p.createdAt);
    if (registered) projected.push({
      id: 'project-created:' + p.id, at: registered, lane: 'PROJECT',
      title: (p.name || 'Untitled project') + ' · registered',
      subtitle: 'Project registration in Case Platform; declared attractor/trajectory references are not measured achievements.',
      origin: 'CASE PLATFORM · ' + readPlane, state: 'PROJECT_REGISTRATION_RECORD',
      href: '/reality-chain?projectId=' + encodeURIComponent(p.id),
      clockAnchorMeaning: 'sfi_projects.created_at: project row registration, not the start of all related work or first attractor observation.',
      clockEvidence: { RECORD: {
        at: registered, sourceRef: 'sfi_projects:' + p.id,
        meaning: 'Project registration timestamp; earlier project activity is not reconstructed from this date.',
        basis: 'OBSERVED_TIME', epistemicClass: 'OBSERVED',
      } },
    });
    projected.push({
      id: 'project:' + p.id, at, lane: 'PROJECT',
      title: p.name || 'Untitled project', subtitle: described,
      origin: 'CASE PLATFORM · ' + readPlane, state: p.status || 'UNKNOWN',
      href: '/reality-chain?projectId=' + encodeURIComponent(p.id),
      recordCreatedAt: iso(p.createdAt),
      clockAnchorMeaning: 'Case Platform sfi_projects.updated_at: last persisted project update; attractor/trajectory refs are identifiers, not measured outcomes.',
      clockEvidence: { RECORD: {
        at, sourceRef: 'sfi_projects:' + p.id,
        meaning: 'Persisted project row last updated. Not proof of attractor realization or trajectory execution.',
        basis: 'OBSERVED_TIME', epistemicClass: 'OBSERVED',
      } },
    });
  }
  return projected;
}

export type TimelineCaseProjectState = {
  items: TimelineItem[];
  readPlane: 'SUPABASE_CANONICAL' | 'NEON_CONTINUITY' | 'UNAVAILABLE';
  warning: string | null;
};

export async function readTimelineCaseProjectState(userId: string): Promise<TimelineCaseProjectState> {
  try {
    // Membership must be checked on the SAME provider as the rows returned.
    const tenants = await listOperationalTenants(userId);
    const ids = [...new Set(tenants.filter(t => t.status === 'ACTIVE').map(t => t.id))];
    if (!ids.length) return { items: [], readPlane: 'SUPABASE_CANONICAL', warning: null };
    const db = createServiceSupabaseClient();
    const [cases, projects] = await Promise.all([
      db.from('sfi_cases').select('id,subject,status,tenant_id,project_id,created_at,updated_at')
        .in('tenant_id', ids).is('deleted_at', null)
        .order('updated_at', { ascending: false }).limit(250),
      db.from('sfi_projects').select('id,name,status,tenant_id,attractor_ref,trajectory_ref,created_at,updated_at')
        .in('tenant_id', ids).order('updated_at', { ascending: false }).limit(120),
    ]);
    if (cases.error || projects.error) throw new Error('CANONICAL_CASE_PROJECT_READ_FAILED');
    const countsByProject = new Map<string, number>();
    for (const r of (cases.data ?? []) as Row[]) {
      const id = str(r.project_id);
      if (id) countsByProject.set(id, (countsByProject.get(id) ?? 0) + 1);
    }
    const caseRows = ((cases.data ?? []) as Row[]).map(row => ({
      id: str(row.id), subject: str(row.subject), status: str(row.status),
      updatedAt: str(row.updated_at), createdAt: str(row.created_at),
    }));
    const projectRows = ((projects.data ?? []) as Row[]).map(row => ({
      id: str(row.id), name: str(row.name), status: str(row.status),
      updatedAt: str(row.updated_at), createdAt: str(row.created_at), attractorRef: row.attractor_ref,
      trajectoryRef: row.trajectory_ref, caseCount: countsByProject.get(str(row.id)) ?? 0,
    }));
    // Actual historical objects, decisions and audit receipts must come from
    // the SAME canonical provider and tenant as this page's case list.
    // A degraded history read does not erase successfully read cases/projects.
    let historyItems: TimelineItem[] = [];
    const historyWarnings: string[] = [];
    if (caseRows.length) {
      const caseIds = caseRows.map(r => r.id);
      const caseFilter = <T extends string>(table: T, selection: string, limit: number) =>
        db.from(table).select(selection)
          .in('tenant_id', ids).in('case_id', caseIds)
          .order('created_at', { ascending: false }).limit(limit);
      const bounds = [500, 600, 200, 200, 120] as const;
      const [objects, audits, proposals, decisions, reports] = await Promise.all([
        caseFilter('sfi_case_objects',
          'id,case_id,tenant_id,object_kind,epistemic_role,canonical_ref,payload,observed_at,created_at', bounds[0]),
        caseFilter('sfi_case_audit_events',
          'id,case_id,tenant_id,action,actor_id,created_at', bounds[1]),
        caseFilter('sfi_case_action_proposals',
          'id,case_id,tenant_id,status,proposed_by,risk_level,created_at', bounds[2]),
        caseFilter('sfi_case_action_decisions',
          'id,case_id,tenant_id,proposal_id,decision,authority_role,decided_by,created_at', bounds[3]),
        caseFilter('sfi_case_reports',
          'id,case_id,tenant_id,report_contract,generated_at,created_at', bounds[4]),
      ]);
      const results = [objects, audits, proposals, decisions, reports];
      if (results.some(r => r.error)) {
        historyWarnings.push('CANONICAL_CASE_HISTORY_PARTIAL_OR_UNAVAILABLE');
      } else {
        const history: TimelineCaseHistoryBatch = {
          objects: (objects.data ?? []) as Row[],
          audits: (audits.data ?? []) as Row[],
          proposals: (proposals.data ?? []) as Row[],
          decisions: (decisions.data ?? []) as Row[],
          reports: (reports.data ?? []) as Row[],
        };
        historyItems = projectTimelineCaseHistory(
          history, new Set(caseIds), new Set(ids), 'SUPABASE_CANONICAL',
          new Map(caseRows.map(r => [r.id, r.subject])),
        );
        for (const [index, rows] of results.entries()) {
          if ((rows.data ?? []).length >= bounds[index]) {
            historyWarnings.push('BOUNDED_CASE_HISTORY_MAY_BE_INCOMPLETE');
            break;
          }
        }
      }
    }
    if (caseRows.length >= 250 || projectRows.length >= 120) {
      historyWarnings.push('BOUNDED_CASE_PROJECT_INDEX_MAY_BE_INCOMPLETE');
    }
    return {
      items: [
        ...projectCaseProjectTimeline(caseRows, projectRows, 'SUPABASE_CANONICAL'),
        ...historyItems,
      ],
      readPlane: 'SUPABASE_CANONICAL',
      warning: historyWarnings.join(' · ') || null,
    };
  } catch {
    // Never fall back to unscoped service-role reads or merge cross-provider
    // rows without a fresh certified mirror. Neon performs its OWN tenant
    // membership check on the same provider.
    if (isSfiContinuityConfigured()) {
      try {
        const index = await readContinuityInteractiveCaseIndex(userId);
        return {
          items: projectCaseProjectTimeline(
            index.cases.map(c => ({
              id: c.id, subject: c.subject, status: c.status,
              updatedAt: c.updatedAt, createdAt: null,
            })),
            index.projects.map(p => ({
              id: p.id, name: p.name, status: p.status,
              updatedAt: p.updatedAt, attractorRef: p.attractorRef,
              trajectoryRef: p.trajectoryRef, caseCount: p.caseCount,
            })),
            'NEON_CONTINUITY',
          ),
          readPlane: 'NEON_CONTINUITY',
          warning: 'RECOVERY_READ_NON_CERTIFIED_MIRROR · CASE_HISTORY_NOT_AVAILABLE_ON_THIS_READ_PLANE' +
            (index.warnings.length ? ':' + index.warnings.join(',') : ''),
        };
      } catch {
        // Missing authorization/data plane must surface as unavailable, not
        // a false assertion that there are no cases or projects.
      }
    }
    return { items: [], readPlane: 'UNAVAILABLE', warning: 'CASE_PROJECT_READ_UNAVAILABLE' };
  }
}
