import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { listOperationalTenants } from '@/lib/sfi/case-platform/repository';
import {
  isSfiContinuityConfigured,
  readContinuityInteractiveCaseIndex,
} from '@/lib/sfi/continuityPostgres';
import type { TimelineItem } from '@/components/sfi/OperationalTimeline';

type Row = Record<string, unknown>;
type CaseEntry = { id: string; subject: string; status: string; updatedAt: string | null; createdAt: string | null };
type ProjectEntry = { id: string; name: string; status: string; updatedAt: string | null; attractorRef: unknown; trajectoryRef: unknown; caseCount: number };

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
    projected.push({
      id: 'project:' + p.id, at, lane: 'PROJECT',
      title: p.name || 'Untitled project', subtitle: described,
      origin: 'CASE PLATFORM · ' + readPlane, state: p.status || 'UNKNOWN',
      href: '/reality-chain?projectId=' + encodeURIComponent(p.id),
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
      db.from('sfi_cases').select('id,subject,status,tenant_id,created_at,updated_at')
        .in('tenant_id', ids).is('deleted_at', null)
        .order('updated_at', { ascending: false }).limit(250),
      db.from('sfi_projects').select('id,name,status,tenant_id,attractor_ref,trajectory_ref,updated_at')
        .in('tenant_id', ids).order('updated_at', { ascending: false }).limit(120),
    ]);
    if (cases.error || projects.error) throw new Error('CANONICAL_CASE_PROJECT_READ_FAILED');
    const caseRows = ((cases.data ?? []) as Row[]).map(row => ({
      id: str(row.id), subject: str(row.subject), status: str(row.status),
      updatedAt: str(row.updated_at), createdAt: str(row.created_at),
    }));
    const projectRows = ((projects.data ?? []) as Row[]).map(row => ({
      id: str(row.id), name: str(row.name), status: str(row.status),
      updatedAt: str(row.updated_at), attractorRef: row.attractor_ref,
      trajectoryRef: row.trajectory_ref, caseCount: 0,
    }));
    return {
      items: projectCaseProjectTimeline(caseRows, projectRows, 'SUPABASE_CANONICAL'),
      readPlane: 'SUPABASE_CANONICAL',
      warning: caseRows.length >= 250 || projectRows.length >= 120
        ? 'BOUNDED_CASE_PROJECT_INDEX_MAY_BE_INCOMPLETE' : null,
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
          warning: 'RECOVERY_READ_NON_CERTIFIED_MIRROR' +
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
