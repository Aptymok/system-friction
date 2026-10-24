import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { hasActiveInstitutionalAccountGrant } from '@/lib/system/access/server';
import type { TimelineItem } from '@/components/sfi/OperationalTimeline';

type Row = Record<string, unknown>;
function text(value: unknown) { return typeof value === 'string' ? value.trim() : ''; }
function stamp(value: unknown) {
  const s = text(value);
  return s && Number.isFinite(Date.parse(s)) ? new Date(s).toISOString() : null;
}
function n(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

/**
 * Institutional attractor observations have NO tenant_id. Therefore grant
 * verification is mandatory before using the service client to read them.
 * Never make these rows available just because the user can open /timeline.
 */
export async function readTimelineInstitutionalAttractors(
  actor: { id: string; email?: string | null },
): Promise<{ items: TimelineItem[]; status: string }> {
  try {
    if (!await hasActiveInstitutionalAccountGrant(actor)) {
      return { items: [], status: 'INSTITUTIONAL_GRANT_REQUIRED' };
    }
  } catch {
    return { items: [], status: 'INSTITUTIONAL_GRANT_UNAVAILABLE' };
  }
  try {
    const db = createServiceSupabaseClient();
    const rows = await db.from('sfi_attractor_trajectory_snapshots')
      .select('id,attractor_key,observed_at,created_at,evidence_coverage,supported_dimensions,missing_dimensions,contradicted_dimensions,source_state')
      .order('observed_at', { ascending: false }).limit(120);
    if (rows.error) throw rows.error;
    const items: TimelineItem[] = ((rows.data ?? []) as Row[]).flatMap(row => {
      const observed = stamp(row.observed_at);
      const id = text(row.id);
      const key = text(row.attractor_key);
      if (!observed || !id || !key) return [];
      const recorded = stamp(row.created_at);
      const coverage = n(row.evidence_coverage);
      const supported = Array.isArray(row.supported_dimensions) ? row.supported_dimensions.length : null;
      const missing = Array.isArray(row.missing_dimensions) ? row.missing_dimensions.length : null;
      const contradicted = Array.isArray(row.contradicted_dimensions) ? row.contradicted_dimensions.length : null;
      return [{
        id: 'attractor-snapshot:' + id,
        at: observed,
        lane: 'ATTRACTOR' as const,
        title: key,
        subtitle: [
          'Persisted trajectory snapshot',
          coverage === null ? 'Coverage UNKNOWN' : 'Evidence coverage ' + (coverage * 100).toFixed(2) + '%',
          supported === null ? null : 'Supported ' + supported,
          missing === null ? null : 'Missing ' + missing,
          contradicted === null ? null : 'Contradicted ' + contradicted,
        ].filter(Boolean).join(' · '),
        origin: 'SFI INSTITUTIONAL ATTRACTOR SNAPSHOTS',
        state: text(row.source_state) || 'SOURCE_STATE_UNKNOWN',
        href: '/root',
        recordCreatedAt: recorded,
        clockAnchorMeaning: 'Persisted attractor trajectory observed_at: source-derived measurement, not realized institutional authority or a verified RETURN.',
        clockEvidence: {
          OBSERVATION: {
            at: observed, sourceRef: 'sfi_attractor_trajectory_snapshots:' + id,
            meaning: 'Persisted source-derived trajectory snapshot. Coverage measures recorded support, not success.',
            basis: 'OBSERVED_TIME' as const, epistemicClass: 'OBSERVED' as const,
          },
          ...(recorded ? { RECORD: {
            at: recorded, sourceRef: 'sfi_attractor_trajectory_snapshots:' + id,
            meaning: 'Snapshot persistence created_at; not automatically source event or actor knowledge time.',
            basis: 'OBSERVED_TIME' as const, epistemicClass: 'OBSERVED' as const,
          }} : {}),
        },
      }];
    });
    return { items, status: rows.data?.length === 120 ? 'BOUNDED_ATTRACTOR_HISTORY' : 'SUPABASE_INSTITUTIONAL' };
  } catch {
    return { items: [], status: 'ATTRACTOR_HISTORY_UNAVAILABLE' };
  }
}
