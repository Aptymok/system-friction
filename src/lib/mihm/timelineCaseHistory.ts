import type { TimelineItem } from '@/components/sfi/OperationalTimeline';

export type TimelineCaseHistoryRow = Record<string, unknown>;
export type TimelineAuthorizedCase = { tenantId: string; subject: string };
export type TimelineCaseHistoryBatch = {
  objects: TimelineCaseHistoryRow[];
  audits: TimelineCaseHistoryRow[];
  proposals: TimelineCaseHistoryRow[];
  decisions: TimelineCaseHistoryRow[];
  reports: TimelineCaseHistoryRow[];
};
const str = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const row = (value: unknown): TimelineCaseHistoryRow =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as TimelineCaseHistoryRow : {};
const stamp = (value: unknown) => {
  const s = str(value);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(s)) return null;
  return Number.isFinite(Date.parse(s)) ? new Date(s).toISOString() : null;
};
const desc = (value: unknown, max = 140) => str(value).slice(0, max);
const ref = (value: unknown) => desc(row(value).id, 180);
const clock = (at: string, sourceRef: string, meaning: string) => ({
  at, sourceRef, meaning,
  basis: 'OBSERVED_TIME' as const, epistemicClass: 'OBSERVED' as const,
});

/**
 * Each input row must ALREADY be filtered by active tenant membership, the
 * authorized case IDs, and matching tenant_id on the SAME data provider.
 * A recorded object / audit must never imply actual execution, authority,
 * independent return, evidence admission, or actor knowledge.
 */
export function projectTimelineCaseHistory(
  batch: TimelineCaseHistoryBatch,
  authorizedCases: ReadonlyMap<string, TimelineAuthorizedCase>,
  provider: string,
): TimelineItem[] {
  const items: TimelineItem[] = [];
  // Check the real case→tenant association, not just two independent allowlists.
  // A forged row joining one allowed case to another allowed tenant must fail.
  const admit = (r: TimelineCaseHistoryRow) =>
    Boolean(str(r.tenant_id)) &&
    authorizedCases.get(str(r.case_id))?.tenantId === str(r.tenant_id);
  const caseTitle = (r: TimelineCaseHistoryRow) =>
    (authorizedCases.get(str(r.case_id))?.subject || str(r.case_id)).slice(0, 90);
  const href = (r: TimelineCaseHistoryRow, objectId?: string) =>
    '/reality-chain?caseId=' + encodeURIComponent(str(r.case_id)) +
    (objectId ? '&objectId=' + encodeURIComponent(objectId) : '');
  for (const r of batch.objects) {
    if (!admit(r)) continue;
    const at = stamp(r.created_at), id = str(r.id);
    if (!at || !id) continue;
    const kind = desc(r.object_kind, 60) || 'UNKNOWN';
    const payload = row(r.payload);
    const sourceRef = 'sfi_case_objects:' + id;
    const observed = stamp(r.observed_at);
    const detail = desc(payload.label || payload.statement || payload.title || payload.outcome || payload.description, 150);
    const label = kind === 'REPORT'
      ? 'REPORT POINTER · not a persisted report'
      : kind === 'EVIDENCE' ? 'EVIDENCE OBJECT · admission not implied'
      : kind + ' · object recorded';
    items.push({
      id: 'case-object:' + id, at, lane: 'CASE', title: caseTitle(r) + ' · ' + label,
      subtitle: [
        detail, 'Object role: ' + (desc(r.epistemic_role, 80) || 'UNKNOWN'),
        'Canonical reference: ' + (ref(r.canonical_ref) || 'UNKNOWN'),
      ].filter(Boolean).join(' · '),
      origin: 'CASE PLATFORM · ' + provider + ' · ' + sourceRef,
      state: 'OBJECT_PERSISTED_NOT_INDEPENDENTLY_VERIFIED', href: href(r, id),
      clockAnchorMeaning: 'sfi_case_objects.created_at: object persistence; not the date of its described historical event or an independently verified action.',
      clockEvidence: {
        RECORD: clock(at, sourceRef, 'Case object persisted at created_at; does not establish event, authority or actor knowledge time.'),
        ...(kind === 'OBSERVATION' && observed
          ? { OBSERVATION: clock(observed, sourceRef, 'Case observation row observed_at; source-declared observation, not independently verified external state.') }
          : {}),
      },
    });
  }
  for (const r of batch.audits) {
    if (!admit(r)) continue;
    const at = stamp(r.created_at), id = str(r.id);
    if (!at || !id) continue;
    const action = desc(r.action, 80) || 'UNKNOWN';
    const sourceRef = 'sfi_case_audit_events:' + id;
    items.push({
      id: 'case-audit:' + id, at, lane: 'CASE',
      title: caseTitle(r) + ' · AUDIT · ' + action,
      subtitle: 'Recorded by actor ID: ' + (desc(r.actor_id, 80) || 'UNKNOWN') +
        ' · Database audit, not proof of an external action or independently observed RETURN.',
      origin: 'CASE PLATFORM · ' + provider + ' · ' + sourceRef,
      state: 'AUDIT_RECORDED', href: href(r),
      clockAnchorMeaning: 'sfi_case_audit_events.created_at: persisted audit entry; actor action and external-world event time remain separately unverified.',
      clockEvidence: {
        RECORD: clock(at, sourceRef, 'Case audit record creation. This does not prove an external operation occurred.'),
      },
    });
  }
  for (const r of batch.proposals) {
    if (!admit(r)) continue;
    const at = stamp(r.created_at), id = str(r.id);
    if (!at || !id) continue;
    const sourceRef = 'sfi_case_action_proposals:' + id;
    items.push({
      id: 'case-proposal:' + id, at, lane: 'CASE',
      title: caseTitle(r) + ' · ACTION PROPOSAL REGISTERED',
      subtitle: 'Proposed by actor ID: ' + (desc(r.proposed_by, 80) || 'UNKNOWN') +
        ' · Risk: ' + (desc(r.risk_level, 35) || 'UNKNOWN') +
        ' · Current status at query time: ' + (desc(r.status, 60) || 'UNKNOWN') +
        ' (not necessarily status when registered). Proposal is neither authorization nor execution.',
      origin: 'CASE PLATFORM · ' + provider + ' · ' + sourceRef,
      state: 'PROPOSAL_RECORD', href: href(r),
      clockAnchorMeaning: 'sfi_case_action_proposals.created_at: proposal registration, not authorization or execution.',
      clockEvidence: {
        RECORD: clock(at, sourceRef, 'Time the proposal row was registered. No AUTHORITY clock from proposal state alone.'),
      },
    });
  }
  for (const r of batch.decisions) {
    if (!admit(r)) continue;
    const at = stamp(r.created_at), id = str(r.id);
    if (!at || !id) continue;
    const sourceRef = 'sfi_case_action_decisions:' + id;
    const role = desc(r.authority_role, 30);
    const actor = desc(r.decided_by, 80);
    const authorityRecorded = ['OWNER','ADMIN'].includes(role) && Boolean(actor);
    items.push({
      id: 'case-decision:' + id, at, lane: 'CASE',
      title: caseTitle(r) + ' · ACTION DECISION · ' + (desc(r.decision, 60) || 'UNKNOWN'),
      subtitle: 'Authority role: ' + (role || 'UNKNOWN') +
        ' · Decided by actor ID: ' + (actor || 'UNKNOWN') +
        ' · Proposal ID: ' + (desc(r.proposal_id, 80) || 'UNKNOWN'),
      origin: 'CASE PLATFORM · ' + provider + ' · ' + sourceRef,
      state: authorityRecorded ? 'RECORDED_AUTHORITY_DECISION' : 'AUTHORITY_UNVERIFIED',
      href: href(r),
      clockAnchorMeaning: 'sfi_case_action_decisions.created_at: recorded governed decision. The AUTHORITY clock refers only to this decision, not to an executed external action.',
      clockEvidence: {
        RECORD: clock(at, sourceRef, 'Decision row persistence timestamp.'),
        ...(authorityRecorded ? {
          AUTHORITY: clock(at, sourceRef, 'Recorded case action decision by OWNER or ADMIN; does not prove execution or external effect.'),
        } : {}),
      },
    });
  }
  for (const r of batch.reports) {
    if (!admit(r)) continue;
    const at = stamp(r.created_at), id = str(r.id);
    if (!at || !id) continue;
    const sourceRef = 'sfi_case_reports:' + id;
    const generated = stamp(r.generated_at);
    items.push({
      id: 'case-report:' + id, at, lane: 'CASE',
      title: caseTitle(r) + ' · PERSISTED REPORT · ' + (desc(r.report_contract, 65) || 'UNKNOWN'),
      subtitle: 'Report stored in canonical report table; not execution authority or admitted evidence.' +
        (generated ? ' · Report generated_at metadata: ' + generated : ' · Report generation time UNKNOWN.'),
      origin: 'CASE PLATFORM · ' + provider + ' · ' + sourceRef,
      state: 'PERSISTED_REPORT_RECORD', href: href(r),
      clockAnchorMeaning: 'sfi_case_reports.created_at: report persistence; generated_at is separately reported as metadata, not substituted for event time.',
      clockEvidence: {
        RECORD: clock(at, sourceRef, 'Report payload persisted; not proof of a model run or a verified RETURN.'),
      },
    });
  }
  return items;
}
