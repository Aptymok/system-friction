-- SFI ChatGPT Plus Observation Plane
-- Contract: SFI-CHATGPT-PLUS-OBSERVATION-1.0
-- Purpose: one compact, read-only snapshot over existing canonical owners.
-- Execute the same query independently against Supabase and Neon when both are available.
-- Cross-plane divergence is an observation signal; do not resolve it by blindly selecting the newest database.
-- This query creates no authority, no persistence owner, no RETURN, and no canon.
-- It intentionally excludes auth/OAuth secrets, raw media, passwords, tokens, and private binary content.

with
continuity as (
  select jsonb_build_object(
    'mode', mode,
    'founderAvailable', founder_available,
    'lastHeartbeatAt', last_heartbeat_at,
    'lastSuccessfulRunAt', last_successful_run_at,
    'lastReportAt', last_report_at,
    'haltReason', halt_reason,
    'updatedAt', updated_at
  ) as value
  from public.sfi_continuity_state
  where id = 'institution'
),
latest_continuity_run as (
  select jsonb_build_object(
    'id', id,
    'trigger', trigger,
    'mode', mode,
    'status', status,
    'startedAt', started_at,
    'completedAt', completed_at,
    'capabilityCount', capability_count,
    'healthyCount', healthy_count,
    'degradedCount', degraded_count,
    'failedCount', failed_count,
    'errors', errors
  ) as value
  from public.sfi_continuity_runs
  order by started_at desc
  limit 1
),
incidents as (
  select coalesce(jsonb_agg(x order by x.opened_at desc), '[]'::jsonb) as value
  from (
    select id, severity, capability_id, status, title, error_code, opened_at, requires_founder
    from public.sfi_institutional_incidents
    where status <> 'RESOLVED'
    order by opened_at desc
    limit 20
  ) x
),
founder_decisions as (
  select coalesce(jsonb_agg(x order by x.created_at desc), '[]'::jsonb) as value
  from (
    select id, status, category, title, rationale, safe_default, due_at, created_at
    from public.sfi_founder_decision_queue
    where status in ('PENDING', 'DEFERRED')
    order by created_at desc
    limit 20
  ) x
),
active_proposals as (
  select coalesce(jsonb_agg(x order by x.updated_at desc nulls last, x.created_at desc), '[]'::jsonb) as value
  from (
    select id, status, title, objective, proposal_type, risk_level, approval_required,
           created_at, updated_at, approved_at, executed_at
    from public.action_proposals
    where lower(status) not in ('accepted', 'rejected', 'superseded')
    order by updated_at desc nulls last, created_at desc
    limit 30
  ) x
),
recent_cases as (
  select coalesce(jsonb_agg(x order by x.updated_at desc), '[]'::jsonb) as value
  from (
    select id, subject, scope, status, service_profile_id, project_id, created_at, updated_at, closed_at
    from public.sfi_cases
    where deleted_at is null
    order by updated_at desc
    limit 30
  ) x
),
recent_returns as (
  select coalesce(jsonb_agg(x order by x.sequence desc), '[]'::jsonb) as value
  from (
    select sequence, event_id, event_name, epistemic_class, confidence, source, lineage, occurred_at, payload
    from public.epistemic_events
    where event_name like '%RETURN_RECORDED%'
    order by sequence desc
    limit 20
  ) x
),
recent_events as (
  select coalesce(jsonb_agg(x order by x.sequence desc), '[]'::jsonb) as value
  from (
    select sequence, event_id, event_name, epistemic_class, confidence, source, lineage, occurred_at
    from public.epistemic_events
    order by sequence desc
    limit 50
  ) x
),
recent_agent_executions as (
  select coalesce(jsonb_agg(x order by x.sequence desc), '[]'::jsonb) as value
  from (
    select sequence, event_id, event_name, epistemic_class, confidence, source, lineage, occurred_at
    from public.epistemic_events
    where event_name in ('SFI_AGENT_EXECUTED', 'SFI_MACHINE_EXECUTION_OBSERVED')
    order by sequence desc
    limit 30
  ) x
),
twin_runs as (
  select coalesce(jsonb_agg(x order by x.created_at desc), '[]'::jsonb) as value
  from (
    select id, task_id, role, status, objective, provider, model,
           evidence_refs, limitations, started_at, finished_at, created_at, case_id
    from public.sfi_cognitive_twin_runs
    order by created_at desc
    limit 15
  ) x
),
twin_evaluations as (
  select coalesce(jsonb_agg(x order by x.executed_at desc), '[]'::jsonb) as value
  from (
    select id, provider, model, test_key, test_version, outcome,
           evidence_refs, executed_at, executor
    from public.sfi_cognitive_twin_evaluations
    order by executed_at desc
    limit 15
  ) x
),
lab as (
  select coalesce(jsonb_agg(x order by x.created_at desc), '[]'::jsonb) as value
  from (
    select id, case_id, scope, mode, source, data_mode, systems, variables,
           limitations, created_at
    from public.sfi_lab_analyses
    order by created_at desc
    limit 15
  ) x
)
select jsonb_build_object(
  'contract', 'SFI-CHATGPT-PLUS-OBSERVATION-1.0',
  'generatedAt', now(),
  'epistemicStatus', 'OBSERVED_PERSISTED_STATE',
  'authority', jsonb_build_object(
    'readOnly', true,
    'authorityExpanded', false,
    'canonicalPromotion', false,
    'returnFabrication', false
  ),
  'continuity', coalesce((select value from continuity), '{}'::jsonb),
  'latestContinuityRun', coalesce((select value from latest_continuity_run), '{}'::jsonb),
  'openIncidents', (select value from incidents),
  'pendingFounderDecisions', (select value from founder_decisions),
  'activeProposals', (select value from active_proposals),
  'recentCases', (select value from recent_cases),
  'recentReturns', (select value from recent_returns),
  'recentEvents', (select value from recent_events),
  'recentAgentExecutions', (select value from recent_agent_executions),
  'cognitiveTwinRuns', (select value from twin_runs),
  'cognitiveTwinEvaluations', (select value from twin_evaluations),
  'methodLabRecent', (select value from lab),
  'drilldownRule', 'Open original canonical rows by IDs/event refs when a decision depends on detail. Never infer missing state from absence in this compact snapshot.'
) as sfi_context;
