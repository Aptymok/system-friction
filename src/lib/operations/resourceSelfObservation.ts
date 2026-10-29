/**
 * Resource self-observation for existing SFI owners. Pure decision projection:
 * no database, additional scheduler, provider invocation or new authority.
 */
export const SFI_RESOURCE_SELF_OBSERVATION_CONTRACT = 'SFI-RESOURCE-SELF-OBSERVATION-1.0' as const;

type Row = Record<string, unknown>;
const row = (value: unknown): Row =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
const finiteCount = (value: unknown): number | null =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;

export function assessSfiResourcePosture(input: {
  meter: unknown;
  cognitiveExecutionCount24h?: number | null;
  registeredCognitiveAgents?: number | null;
}) {
  const meter = row(input.meter);
  const quota = row(meter.quota);
  const spending = row(meter.providerSpending);
  const today = finiteCount(quota.remainingToday);
  const month = finiteCount(quota.remainingMonth);
  const quotaVerified = meter.ok === true && quota.ok === true &&
    today !== null && month !== null;
  const c07State = !quotaVerified ? 'UNKNOWN' :
    quota.admissionAllowed === true && quota.scheduledExecutionAllowed === true
      ? 'WITHIN_QUOTA' : 'LIMITED';
  const reportedUsd = typeof spending.observedUsd === 'number' &&
    Number.isFinite(spending.observedUsd) && spending.observedUsd >= 0
      ? spending.observedUsd : null;
  // Provider-specific recorded amounts never equal total vendor invoices.
  const providerLedger = spending.status === 'PROVIDER_REPORTED_COMPONENTS' &&
    reportedUsd !== null ? 'SCOPED_COMPONENTS_ONLY' : 'INCOMPLETE';
  const agents = finiteCount(input.registeredCognitiveAgents);
  const executed = finiteCount(input.cognitiveExecutionCount24h);
  const executionState = agents === null || executed === null ? 'NOT_OBSERVED'
    : agents > 0 && executed === 0 ? 'NO_RECENT_EXECUTION'
    : 'RECENT_EXECUTION_PRESENT';
  const warnings = [
    !quotaVerified ? 'C07_QUOTA_NOT_VERIFIED' : null,
    c07State === 'LIMITED' ? 'C07_QUOTA_LIMITED' : null,
    providerLedger === 'INCOMPLETE' ? 'PROVIDER_USAGE_INCOMPLETE' : null,
    'VENDOR_BILLING_NOT_CONNECTED',
    executionState === 'NO_RECENT_EXECUTION' ? 'COGNITIVE_EXECUTION_GAP_24H' : null,
  ].filter((value): value is string => value !== null);
  const plan = [
    {
      owner: 'world_observation',
      decision: 'CONTINUE_WITH_EXISTING_SOURCE_LIMITS',
      reason: 'C07 usage is not a World or Supabase billing limit.',
    },
    {
      owner: 'c07_mission_queue',
      decision: c07State === 'WITHIN_QUOTA' ? 'CONTINUE_ONLY_WITH_EXISTING_AUTHORITY'
        : c07State === 'LIMITED' ? 'DEFER_NEW_C07_ADMISSIONS'
        : 'DO_NOT_ADMIT_UNMETERED_C07',
      reason: c07State === 'UNKNOWN'
        ? 'A failed cost read does not establish capacity or zero usage.'
        : 'Existing C07 daily/monthly limits remain the only C07 work gate.',
    },
    {
      owner: 'reality_calibration',
      decision: 'RECONCILE_EXISTING_RETURN_WITHOUT_INVENTING_OUTCOME',
      reason: 'Pending prediction, source and observed return remain independent of C07 quota.',
    },
    {
      owner: 'external_paid_providers',
      decision: 'NO_UNBUDGETED_EXPANSION',
      reason: 'Recorded provider components do not verify total provider, Vercel or Supabase billing.',
    },
  ] as const;
  return {
    contract: SFI_RESOURCE_SELF_OBSERVATION_CONTRACT,
    epistemicClass: 'DERIVED' as const,
    c07: {
      state: c07State, remainingToday: quotaVerified ? today : null,
      remainingMonth: quotaVerified ? month : null,
      admissionAllowed: c07State === 'WITHIN_QUOTA',
    },
    provider: { status: providerLedger, reportedComponentUsd: providerLedger === 'SCOPED_COMPONENTS_ONLY' ? reportedUsd : null },
    vendorBilling: 'NOT_VERIFIED' as const,
    cognitiveExecution: { state: executionState, observed24h: executed, registered: agents },
    warnings,
    plan,
    nextObservation: executionState === 'NO_RECENT_EXECUTION'
      ? 'Inspect scheduled dispatch and durable execution receipts; do not infer agent execution from catalog entries.'
      : providerLedger === 'INCOMPLETE'
        ? 'Acquire provider usage receipts before estimating spend or expanding paid work.'
        : 'Continue observing owners and verify external return before promoting learning.',
    boundary: 'PROJECTED_POSTURE_NOT_INVOICE;C07_QUOTA_DOES_NOT_GATE_WORLD;NO_AUTOMATIC_NEW_AUTHORITY;UNKNOWN_NOT_ZERO',
  };
}
