/**
 * SFI primary-to-Neon mirror certification / authoritative read projection.
 *
 * Neon holds the last certification RECEIPT. A new Supabase write is captured
 * by the primary outbox and cannot synchronously invalidate the Neon receipt
 * inside a local Postgres trigger. Never expose that historical boolean as
 * proof of present two-plane parity.
 *
 * This is an as-of read projection, not a new certificate, write, promotion,
 * historical repair, source of authority, or an atomic distributed snapshot.
 */
export type MirrorCertificationInput = {
  mode: string;
  recordedCertified: boolean;
  recordedBacklog: number;
  verifiedAt: string | null;
  outbox: { pending: number; conflicts: number } | null;
  journal: { pending: number; conflicts: number; protectedPending: number };
  observedAt: string;
};

export type MirrorCertificationReason =
  | 'NOT_PRIMARY'
  | 'OUTBOX_UNAVAILABLE'
  | 'JOURNAL_NOT_CLEAN'
  | 'OUTBOX_CONFLICT'
  | 'OUTBOX_PENDING'
  | 'NEON_NOT_CERTIFIED'
  | 'NEON_RECORDED_BACKLOG'
  | 'VERIFICATION_TIMESTAMP_MISSING'
  | 'VERIFICATION_STALE'
  | 'CERTIFIED_AS_OF_READ';

export function deriveLiveMirrorCertification(input: MirrorCertificationInput) {
  const observedMs = Date.parse(input.observedAt);
  const verifiedMs = input.verifiedAt ? Date.parse(input.verifiedAt) : Number.NaN;
  const maxAgeMs = 60 * 60 * 1000;
  const verifiedAgeMs = Number.isFinite(observedMs) && Number.isFinite(verifiedMs)
    ? observedMs - verifiedMs
    : null;
  const verifiedFresh = verifiedAgeMs !== null
    && verifiedAgeMs >= 0 && verifiedAgeMs <= maxAgeMs;
  let reason: MirrorCertificationReason;
  if (input.mode !== 'PRIMARY') reason = 'NOT_PRIMARY';
  else if (input.outbox === null) reason = 'OUTBOX_UNAVAILABLE';
  else if (input.journal.pending > 0 || input.journal.conflicts > 0 || input.journal.protectedPending > 0) reason = 'JOURNAL_NOT_CLEAN';
  else if (input.outbox.conflicts > 0) reason = 'OUTBOX_CONFLICT';
  else if (input.outbox.pending > 0) reason = 'OUTBOX_PENDING';
  else if (!input.recordedCertified) reason = 'NEON_NOT_CERTIFIED';
  else if (input.recordedBacklog !== 0) reason = 'NEON_RECORDED_BACKLOG';
  else if (verifiedAgeMs === null) reason = 'VERIFICATION_TIMESTAMP_MISSING';
  else if (!verifiedFresh) reason = 'VERIFICATION_STALE';
  else reason = 'CERTIFIED_AS_OF_READ';

  return {
    certified: reason === 'CERTIFIED_AS_OF_READ',
    reason,
    recordedCertified: input.recordedCertified,
    recordedBacklog: input.recordedBacklog,
    verifiedAt: input.verifiedAt,
    verificationAgeMs: verifiedAgeMs,
    observedAt: input.observedAt,
    primaryPendingAtRead: input.outbox?.pending ?? null,
    primaryConflictsAtRead: input.outbox?.conflicts ?? null,
    readConsistency: 'INDEPENDENT_NON_ATOMIC_PLANE_READS' as const,
    boundary: 'Current certificate is a bounded as-of observation. Concurrent new writes require a fresh outbox read; a historical Neon certificate alone never establishes current parity.',
  };
}
