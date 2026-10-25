/**
 * SFI independent-provider freshness diagnostic.
 * This is NOT a replication contract, a failover vote, or proof of payload
 * equality. Clock timestamps are evidence about each provider independently.
 */
export type PlaneClockRead = {
  observedAt: string | null;
  receiptId: string | null;
  readStatus: 'OBSERVED' | 'EMPTY' | 'READ_UNAVAILABLE';
};

function parsedMs(value: string | null): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

export function compareIndependentWorldSpectClocks(input: {
  primary: PlaneClockRead;
  neon: PlaneClockRead;
}) {
  const a = parsedMs(input.primary.observedAt);
  const b = parsedMs(input.neon.observedAt);
  const bothRead = input.primary.readStatus !== 'READ_UNAVAILABLE'
    && input.neon.readStatus !== 'READ_UNAVAILABLE';

  const status = !bothRead ? 'INCOMPLETE_READ'
    : a === null && b === null ? 'NO_OBSERVATIONS'
    : a === null ? 'NEON_ONLY'
    : b === null ? 'PRIMARY_ONLY'
    : a > b ? 'PRIMARY_NEWER'
    : b > a ? 'NEON_NEWER'
    : 'SAME_OBSERVED_TIME_UNVERIFIED';

  return {
    contract: 'SFI-WORLDSPECT-INDEPENDENT-PLANE-CLOCK-1.0',
    status,
    primary: input.primary,
    neon: input.neon,
    differenceMinutes: a !== null && b !== null ? Number(((b - a) / 60_000).toFixed(2)) : null,
    requiresRecovery: false,
    mirrorCertified: false,
    costsMeasured: false,
    action: 'READ_ONLY_COMPARE_NO_SYNC_NO_AUTOMATED_FAILOVER',
    limitation: 'The latest observed_at values alone cannot establish data equivalence, execution integrity or source accuracy.',
  };
}
