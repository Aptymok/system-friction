import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import {
  CONTINUITY_CAPABILITIES,
  type CapabilityHealth,
  type ContinuityCapability,
  type ContinuityMode,
} from './contracts';

function siteOrigin() {
  const explicit = process.env.SFI_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return 'http://localhost:3000';
}

async function probeCapability(capability: ContinuityCapability, mode: ContinuityMode) {
  if (mode === 'EMERGENCY_HALT') {
    return { capability, status: 'BLOCKED' as CapabilityHealth, latencyMs: 0, errorCode: 'continuity_emergency_halt' };
  }
  if (mode === 'FOUNDER_ABSENT_ACTIVE' && !capability.allowedInFounderAbsence) {
    return { capability, status: 'BLOCKED' as CapabilityHealth, latencyMs: 0, errorCode: 'founder_authority_required' };
  }

  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), capability.timeoutMs);
  try {
    const response = await fetch(`${siteOrigin()}${capability.probePath}`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
      headers: { 'x-sfi-continuity-probe': '1' },
    });
    const latencyMs = Date.now() - started;
    if (response.ok) return { capability, status: 'OPERATIONAL' as CapabilityHealth, latencyMs };
    if (response.status === 401 || response.status === 403) {
      return {
        capability,
        status: capability.allowedInFounderAbsence ? 'DEGRADED' as CapabilityHealth : 'BLOCKED' as CapabilityHealth,
        latencyMs,
        errorCode: `http_${response.status}_gated`,
      };
    }
    return { capability, status: 'FAILED' as CapabilityHealth, latencyMs, errorCode: `http_${response.status}` };
  } catch (error) {
    return {
      capability,
      status: 'FAILED' as CapabilityHealth,
      latencyMs: Date.now() - started,
      errorCode: error instanceof Error && error.name === 'AbortError' ? 'probe_timeout' : 'probe_transport_error',
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function runContinuityHeartbeat(trigger = 'scheduled') {
  const db = createServiceSupabaseClient();
  const { data: stateRow, error: stateError } = await db
    .from('sfi_continuity_state')
    .select('*')
    .eq('id', 'institution')
    .single();
  if (stateError) throw new Error(`continuity_state_unavailable:${stateError.message}`);

  const mode = stateRow.mode as ContinuityMode;
  const { data: run, error: runError } = await db
    .from('sfi_continuity_runs')
    .insert({ trigger, mode, status: 'RUNNING' })
    .select('id')
    .single();
  if (runError || !run) throw new Error(`continuity_run_create_failed:${runError?.message ?? 'unknown'}`);

  const results = await Promise.all(CONTINUITY_CAPABILITIES.map((capability) => probeCapability(capability, mode)));
  const checks = results.map((result) => ({
    run_id: run.id,
    capability_id: result.capability.id,
    autonomy_level: result.capability.autonomyLevel,
    status: result.status,
    latency_ms: result.latencyMs,
    error_code: result.errorCode ?? null,
    details: {
      name: result.capability.name,
      probePath: result.capability.probePath,
      critical: result.capability.critical,
      allowedInFounderAbsence: result.capability.allowedInFounderAbsence,
    },
  }));
  const { error: checksError } = await db.from('sfi_capability_health_checks').insert(checks);
  if (checksError) throw new Error(`continuity_checks_persist_failed:${checksError.message}`);

  const healthy = results.filter((item) => item.status === 'OPERATIONAL').length;
  const degraded = results.filter((item) => item.status === 'DEGRADED' || item.status === 'BLOCKED').length;
  const failed = results.filter((item) => item.status === 'FAILED').length;
  const criticalFailures = results.filter((item) => item.status === 'FAILED' && item.capability.critical);
  const finalStatus = mode === 'EMERGENCY_HALT' ? 'HALTED' : criticalFailures.length ? 'DEGRADED' : failed ? 'DEGRADED' : 'COMPLETED';

  if (criticalFailures.length) {
    await db.from('sfi_institutional_incidents').insert(
      criticalFailures.map((item) => ({
        severity: 'P1',
        capability_id: item.capability.id,
        title: `${item.capability.name} failed its continuity probe`,
        error_code: item.errorCode ?? 'continuity_probe_failed',
        evidence: [{ runId: run.id, latencyMs: item.latencyMs, probePath: item.capability.probePath }],
        requires_founder: false,
      })),
    );
  }

  await db.from('sfi_continuity_runs').update({
    status: finalStatus,
    completed_at: new Date().toISOString(),
    capability_count: results.length,
    healthy_count: healthy,
    degraded_count: degraded,
    failed_count: failed,
    evidence: results.map((item) => ({ capabilityId: item.capability.id, status: item.status, latencyMs: item.latencyMs })),
    errors: results.filter((item) => item.errorCode).map((item) => ({ capabilityId: item.capability.id, code: item.errorCode })),
  }).eq('id', run.id);

  await db.from('sfi_continuity_state').update({
    last_heartbeat_at: new Date().toISOString(),
    last_successful_run_at: criticalFailures.length ? stateRow.last_successful_run_at : new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', 'institution');

  return { runId: run.id, mode, status: finalStatus, healthy, degraded, failed, results };
}

export async function readContinuityDashboard() {
  const db = createServiceSupabaseClient();
  const [state, runs, checks, incidents, decisions, reports] = await Promise.all([
    db.from('sfi_continuity_state').select('*').eq('id', 'institution').single(),
    db.from('sfi_continuity_runs').select('*').order('started_at', { ascending: false }).limit(20),
    db.from('sfi_capability_health_checks').select('*').order('checked_at', { ascending: false }).limit(80),
    db.from('sfi_institutional_incidents').select('*').neq('status', 'RESOLVED').order('opened_at', { ascending: false }).limit(50),
    db.from('sfi_founder_decision_queue').select('*').in('status', ['PENDING', 'DEFERRED']).order('created_at', { ascending: false }).limit(50),
    db.from('sfi_continuity_reports').select('*').order('created_at', { ascending: false }).limit(7),
  ]);
  return {
    state: state.data,
    runs: runs.data ?? [],
    checks: checks.data ?? [],
    incidents: incidents.data ?? [],
    decisions: decisions.data ?? [],
    reports: reports.data ?? [],
    errors: [state.error, runs.error, checks.error, incidents.error, decisions.error, reports.error].filter(Boolean).map((error) => error?.message),
  };
}

export async function createDailyContinuityReport() {
  const db = createServiceSupabaseClient();
  const dashboard = await readContinuityDashboard();
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - 24 * 60 * 60 * 1000);
  const recentRuns = dashboard.runs.filter((run: any) => new Date(run.started_at) >= periodStart);
  const summary = {
    mode: dashboard.state?.mode ?? 'UNKNOWN',
    runs: recentRuns.length,
    successfulRuns: recentRuns.filter((run: any) => run.status === 'COMPLETED').length,
    degradedRuns: recentRuns.filter((run: any) => run.status === 'DEGRADED').length,
    openIncidents: dashboard.incidents.length,
    pendingFounderDecisions: dashboard.decisions.length,
  };
  const content = [
    `SFI CONTINUITY DAILY REPORT`,
    `Period: ${periodStart.toISOString()} — ${periodEnd.toISOString()}`,
    `Mode: ${summary.mode}`,
    `Runs: ${summary.runs}; completed: ${summary.successfulRuns}; degraded: ${summary.degradedRuns}`,
    `Open incidents: ${summary.openIncidents}`,
    `Founder decisions pending: ${summary.pendingFounderDecisions}`,
  ].join('\n');
  const { data, error } = await db.from('sfi_continuity_reports').insert({
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
    mode: summary.mode,
    summary,
    content,
  }).select('*').single();
  if (error) throw new Error(`continuity_report_failed:${error.message}`);
  await db.from('sfi_continuity_state').update({ last_report_at: periodEnd.toISOString(), updated_at: periodEnd.toISOString() }).eq('id', 'institution');
  return data;
}
