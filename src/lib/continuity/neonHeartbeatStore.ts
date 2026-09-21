import 'server-only';

import { continuityDatabase } from '@/lib/sfi/continuityPostgres';

type JsonRecord = Record<string, unknown>;

export async function readNeonActionableWorkSnapshot() {
  const sql = continuityDatabase();
  const rows = await sql`
    select
      (select mode from sfi_continuity_state where id = 'institution' limit 1) as continuity_mode,
      exists(
        select 1 from action_proposals
        where status in ('proposed', 'waiting_evidence', 'design_approved', 'queued', 'accepted')
        limit 1
      ) as active_proposal,
      exists(
        select 1 from sfi_cases
        where deleted_at is null
          and lower(coalesce(status, '')) not in ('closed', 'completed', 'cancelled', 'canceled', 'rejected', 'archived')
        limit 1
      ) as active_case,
      exists(
        select 1
        from (
          select distinct on (logbook_id) logbook_id, event_name
          from epistemic_events
          where logbook_id is not null
            and event_name in (
              'SFI_UNIVERSAL_CYCLE_RESUMED',
              'SFI_UNIVERSAL_COGNITIVE_CHECKPOINT',
              'SFI_UNIVERSAL_COGNITIVE_CYCLE_EXECUTED',
              'SFI_UNIVERSAL_AI_SYNTHESIS_COMPLETED',
              'SFI_UNIVERSAL_RETURN_PLAN_RECORDED',
              'SFI_UNIVERSAL_RETURN_RECORDED',
              'SFI_UNIVERSAL_CYCLE_CLOSED'
            )
          order by logbook_id, sequence desc
        ) latest
        where latest.event_name <> 'SFI_UNIVERSAL_CYCLE_CLOSED'
      ) as open_universal_cycle,
      exists(
        select 1 from studio_objects
        where title ilike '%FI-001%'
        limit 1
      ) as active_studio_experiment
  `;
  return (rows[0] as JsonRecord | undefined) ?? null;
}

export async function readNeonContinuityHeartbeatState() {
  const sql = continuityDatabase();
  const rows = await sql`
    select *
    from sfi_continuity_state
    where id = 'institution'
    limit 1
  `;
  return (rows[0] as JsonRecord | undefined) ?? null;
}


export async function readNeonContinuityObservation() {
  const sql = continuityDatabase();
  const [stateRows, runRows] = await Promise.all([
    sql`
      select *
      from sfi_continuity_state
      where id = 'institution'
      limit 1
    `,
    sql`
      select id, trigger, mode, status, started_at, completed_at,
             capability_count, healthy_count, degraded_count, failed_count,
             evidence, errors
      from sfi_continuity_runs
      order by started_at desc
      limit 1
    `,
  ]);
  return {
    state: (stateRows[0] as JsonRecord | undefined) ?? null,
    latestRun: (runRows[0] as JsonRecord | undefined) ?? null,
  };
}

export async function createNeonContinuityRun(input: { trigger: string; mode: string }) {
  const sql = continuityDatabase();
  const rows = await sql`
    insert into sfi_continuity_runs (trigger, mode, status)
    values (${input.trigger}, ${input.mode}, 'RUNNING')
    returning id
  `;
  return (rows[0] as JsonRecord | undefined) ?? null;
}

export async function insertNeonContinuityHealthChecks(checks: Array<{
  run_id: string;
  capability_id: string;
  autonomy_level: string;
  status: string;
  latency_ms: number;
  error_code: string | null;
  details: Record<string, unknown>;
}>) {
  if (!checks.length) return;
  const sql = continuityDatabase();
  await sql.begin(async (tx) => {
    for (const check of checks) {
      const details = JSON.stringify(check.details ?? {});
      await tx`
        insert into sfi_capability_health_checks (
          run_id, capability_id, autonomy_level, status, latency_ms, error_code, details
        ) values (
          ${check.run_id}::uuid,
          ${check.capability_id},
          ${check.autonomy_level},
          ${check.status},
          ${check.latency_ms},
          ${check.error_code},
          ${details}::jsonb
        )
      `;
    }
  });
}

export async function insertNeonContinuityIncidents(incidents: Array<{
  severity: string;
  capability_id: string | null;
  title: string;
  error_code: string | null;
  evidence: unknown[];
  requires_founder: boolean;
}>) {
  if (!incidents.length) return;
  const sql = continuityDatabase();
  await sql.begin(async (tx) => {
    for (const incident of incidents) {
      const evidence = JSON.stringify(incident.evidence ?? []);
      await tx`
        insert into sfi_institutional_incidents (
          severity, capability_id, title, error_code, evidence, requires_founder
        ) values (
          ${incident.severity},
          ${incident.capability_id},
          ${incident.title},
          ${incident.error_code},
          ${evidence}::jsonb,
          ${incident.requires_founder}
        )
      `;
    }
  });
}

export async function finalizeNeonContinuityRun(input: {
  runId: string;
  status: string;
  capabilityCount: number;
  healthyCount: number;
  degradedCount: number;
  failedCount: number;
  evidence: unknown[];
  errors: unknown[];
}) {
  const sql = continuityDatabase();
  const evidence = JSON.stringify(input.evidence ?? []);
  const errors = JSON.stringify(input.errors ?? []);
  await sql`
    update sfi_continuity_runs
    set status = ${input.status},
        completed_at = now(),
        capability_count = ${input.capabilityCount},
        healthy_count = ${input.healthyCount},
        degraded_count = ${input.degradedCount},
        failed_count = ${input.failedCount},
        evidence = ${evidence}::jsonb,
        errors = ${errors}::jsonb
    where id = ${input.runId}::uuid
  `;
}

export async function updateNeonContinuityState(input: {
  lastSuccessfulRunAt: string | null;
  heartbeatSucceeded: boolean;
}) {
  const sql = continuityDatabase();
  if (input.heartbeatSucceeded) {
    await sql`
      update sfi_continuity_state
      set last_heartbeat_at = now(),
          last_successful_run_at = now(),
          updated_at = now()
      where id = 'institution'
    `;
    return;
  }

  await sql`
    update sfi_continuity_state
    set last_heartbeat_at = now(),
        last_successful_run_at = ${input.lastSuccessfulRunAt}::timestamptz,
        updated_at = now()
    where id = 'institution'
  `;
}
