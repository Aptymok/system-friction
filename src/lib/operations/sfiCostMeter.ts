import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const SFI_COST_METER_CONTRACT = 'SFI-COST-METER-PRIMARY-ONLY-1.0' as const;

// Limits count admitted work as a conservative consumption proxy; they are
// NOT billing limits and never assert that cloud resources cost zero.
function limitedInteger(name: string, fallback: number, hardMaximum: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  // Misconfiguration fails CLOSED. A budget cannot be disabled by a typo.
  if (!Number.isSafeInteger(value) || value < 1 || value > hardMaximum) return 0;
  return value;
}

export function sfiMissionQuotaLimits() {
  return {
    perDay: limitedInteger('SFI_COST_MAX_C07_MISSIONS_PER_DAY', 6, 24),
    perMonth: limitedInteger('SFI_COST_MAX_C07_MISSIONS_PER_MONTH', 60, 240),
  };
}

function utcStart(now: Date) {
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return { day: day.toISOString(), month: month.toISOString() };
}

type JobRow = { id: string; created_at: string; updated_at: string; status: string; attempts: number };

export async function readSfiMissionQuota(now = new Date()) {
  const limits = sfiMissionQuotaLimits();
  const start = utcStart(now);
  if (!limits.perDay || !limits.perMonth) {
    return { ok: false as const, reason: 'COST_BUDGET_CONFIG_INVALID', limits,
      admittedToday: null, admittedMonth: null, completedToday: null };
  }
  // A single bounded Supabase read, only for C07 queue admissions/executions
  // or an explicit operator inspection; no cron, Neon, storage or billing API.
  const rows = await createServiceSupabaseClient().from('sfi_c07_mission_jobs')
    .select('id,created_at,updated_at,status,attempts')
    .gte('created_at', start.month)
    .order('created_at', { ascending: false })
    .limit(241);
  if (rows.error || !rows.data) {
    return { ok: false as const, reason: 'PRIMARY_C07_USAGE_UNAVAILABLE', limits,
      admittedToday: null, admittedMonth: null, completedToday: null };
  }
  const jobs = rows.data as JobRow[];
  const active = jobs.filter(job => job.status !== 'CANCELLED');
  const admittedToday = active.filter(job => job.created_at >= start.day).length;
  const admittedMonth = active.length;
  const completedToday = jobs.filter(job => job.status === 'COMPLETED' && job.updated_at >= start.day).length;
  // 241 records => the bounded read is incomplete. Never infer that budget
  // remains available when the complete cardinality is unknown.
  if (jobs.length === 241) return {
    ok: false as const, reason: 'C07_USAGE_TRUNCATED_BUDGET_CLOSED',
    limits, admittedToday, admittedMonth, completedToday,
  };
  return {
    ok: true as const, reason: 'BOUNDED_PRIMARY_C07_SNAPSHOT',
    limits, admittedToday, admittedMonth, completedToday,
    remainingToday: Math.max(0, limits.perDay - admittedToday),
    remainingMonth: Math.max(0, limits.perMonth - admittedMonth),
    admissionAllowed: admittedToday < limits.perDay && admittedMonth < limits.perMonth,
    scheduledExecutionAllowed: completedToday < limits.perDay,
    period: start, snapshotAt: now.toISOString(),
  };
}

function number(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}
function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function readSfiCostMeter(now = new Date()) {
  const quota = await readSfiMissionQuota(now);
  if (!quota.ok) return {
    ok: false as const, contract: SFI_COST_METER_CONTRACT, quota,
    providerSpending: { status: 'NOT_VERIFIED', observedUsd: null },
    vendorBilling: 'NOT_CONNECTED', reason: quota.reason,
    boundary: 'UNAVAILABLE_IS_NOT_ZERO;NO_NEON_NO_AUTOMATIC_REFRESH',
  };
  const records = await createServiceSupabaseClient().from('epistemic_events')
    .select('occurred_at,payload')
    .eq('event_name', 'SFI_AGENT_EXECUTED')
    .gte('occurred_at', quota.period.month)
    .order('occurred_at', { ascending: false })
    .limit(241);
  if (records.error || !records.data || records.data.length === 241) {
    return { ok: true as const, contract: SFI_COST_METER_CONTRACT, quota,
      providerSpending: { status: 'INCOMPLETE', observedUsd: null, modelCalls: null },
      vendorBilling: 'NOT_CONNECTED', snapshotAt: now.toISOString(),
      boundary: 'USAGE_TELEMETRY_INCOMPLETE_IS_NOT_ZERO;NO_NEON_NO_AUTOMATIC_REFRESH' };
  }
  let modelCalls = 0, observedUsd = 0, unpricedModelCalls = 0;
  let inputTokens = 0, outputTokens = 0, unobservedTokenCalls = 0;
  for (const item of records.data) {
    const payload = record(item.payload);
    if (payload.llmAugmentationRequested !== true) continue;
    modelCalls++;
    const llm = record(record(payload.metadata).llmRuntime);
    const cost = number(llm.observedProviderCost);
    const currency = llm.observedProviderCostCurrency;
    if (cost === null || currency !== 'USD') unpricedModelCalls++;
    else observedUsd += cost;
    const input = number(llm.observedInputTokens);
    const output = number(llm.observedOutputTokens);
    if (input === null || output === null) unobservedTokenCalls++;
    else { inputTokens += input; outputTokens += output; }
  }
  return {
    ok: true as const, contract: SFI_COST_METER_CONTRACT, quota,
    providerSpending: {
      status: unpricedModelCalls === 0 ? 'PROVIDER_REPORTED_COMPONENTS' : 'INCOMPLETE',
      observedUsd: unpricedModelCalls === 0 ? Number(observedUsd.toFixed(6)) : null,
      modelCalls, unpricedModelCalls,
      inputTokens: unobservedTokenCalls === 0 ? inputTokens : null,
      outputTokens: unobservedTokenCalls === 0 ? outputTokens : null,
    },
    vendorBilling: 'NOT_CONNECTED' as const,
    snapshotAt: now.toISOString(),
    boundary: 'USD_PROVIDER_USAGE_IS_NOT_A_VERCEL_OR_SUPABASE_INVOICE;NO_NEON_NO_AUTOMATIC_REFRESH',
  };
}
