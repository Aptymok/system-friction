/** Choose where a scheduled continuity heartbeat may execute.
 *
 * The retired Neon replication journal is not the authority for current
 * primary writes. But a healthy primary alone never overrides the explicit
 * scheduled egress/cost restriction. Fail closed when primary authorization
 * and live state cannot both be read.
 */
export function selectContinuityDataPlane(input: {
  scheduledEgressEnabled: boolean;
  continuityConfigured: boolean;
  primaryPhysicalOk: boolean;
  primaryContinuityStateReadable: boolean;
  legacyNeonMode: 'PRIMARY' | 'CONTINUITY' | 'RECOVERY' | null;
}): 'SUPABASE' | 'NEON' {
  if (!input.scheduledEgressEnabled && input.continuityConfigured) return 'NEON';
  if (input.primaryPhysicalOk && input.primaryContinuityStateReadable) return 'SUPABASE';
  if (input.continuityConfigured && input.legacyNeonMode !== 'PRIMARY') return 'NEON';
  // Preserve the existing runtime's explicit failure path when no viable
  // continuity fallback is configured. This result does not authorize writes.
  return 'SUPABASE';
}
