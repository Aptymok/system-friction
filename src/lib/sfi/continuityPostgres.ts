import postgres from 'postgres';

type JsonRecord = Record<string, unknown>;

let continuitySql: ReturnType<typeof postgres> | null = null;

function connectionString() {
  return (process.env.SFI_CONTINUITY_DATABASE_URL || '').trim();
}

export function isSfiContinuityConfigured() {
  return Boolean(connectionString());
}

function db() {
  const url = connectionString();
  if (!url) throw new Error('SFI_CONTINUITY_DATABASE_URL_NOT_CONFIGURED');
  if (!continuitySql) {
    continuitySql = postgres(url, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 5,
      prepare: false,
    });
  }
  return continuitySql;
}

export async function readContinuityOAuthClient(clientId: string) {
  const sql = db();
  const rows = await sql`
    select client_id, client_secret_hash, name, created_by, redirect_uris,
           allowed_scopes, audience, status
      from sfi_oauth_clients
     where client_id = ${clientId}
       and status = 'ACTIVE'
     limit 1
  `;
  return (rows[0] as JsonRecord | undefined) ?? null;
}

export async function touchContinuityOAuthClient(clientId: string) {
  const sql = db();
  await sql`
    update sfi_oauth_clients
       set last_used_at = now(),
           updated_at = now()
     where client_id = ${clientId}
       and status = 'ACTIVE'
  `;
}

export type ContinuityAuthorizationCodeInput = {
  code_hash: string;
  client_id: string;
  redirect_uri: string;
  subject_id: string;
  actor_id: string;
  label: string | null;
  role: string;
  tenant_id: string;
  scopes: string[];
  code_challenge: string | null;
  code_challenge_method: string | null;
  expires_at: string;
};

export async function insertContinuityAuthorizationCode(input: ContinuityAuthorizationCodeInput) {
  const sql = db();
  const scopesJson = JSON.stringify(input.scopes);
  await sql`
    insert into sfi_oauth_authorization_codes (
      code_hash, client_id, redirect_uri, subject_id, actor_id, label, role,
      tenant_id, scopes, code_challenge, code_challenge_method, expires_at
    ) values (
      ${input.code_hash},
      ${input.client_id},
      ${input.redirect_uri},
      ${input.subject_id}::uuid,
      ${input.actor_id},
      ${input.label},
      ${input.role},
      ${input.tenant_id},
      array(select jsonb_array_elements_text(${scopesJson}::jsonb)),
      ${input.code_challenge},
      ${input.code_challenge_method},
      ${input.expires_at}::timestamptz
    )
  `;
}

export async function findContinuityAuthorizationCode(input: {
  codeHash: string;
  clientId: string;
  redirectUri: string;
  now: string;
}) {
  const sql = db();
  const rows = await sql`
    select id, subject_id, actor_id, label, role, tenant_id, scopes,
           code_challenge, code_challenge_method
      from sfi_oauth_authorization_codes
     where code_hash = ${input.codeHash}
       and client_id = ${input.clientId}
       and redirect_uri = ${input.redirectUri}
       and consumed_at is null
       and expires_at > ${input.now}::timestamptz
     limit 1
  `;
  return (rows[0] as JsonRecord | undefined) ?? null;
}

export async function consumeContinuityAuthorizationCode(id: string, consumedAt: string) {
  const sql = db();
  const rows = await sql`
    update sfi_oauth_authorization_codes
       set consumed_at = ${consumedAt}::timestamptz
     where id = ${id}::uuid
       and consumed_at is null
    returning id
  `;
  return Boolean(rows[0]);
}

export async function readContinuityProfile(userId: string) {
  const sql = db();
  const rows = await sql`
    select user_id, alias, email, role, module_access, subscription_tier
      from profiles
     where user_id = ${userId}::uuid
     limit 1
  `;
  return (rows[0] as JsonRecord | undefined) ?? null;
}

export async function readContinuityProfileByEmail(email: string) {
  const sql = db();
  const rows = await sql`
    select user_id, alias, email, role, module_access, subscription_tier
      from profiles
     where lower(email) = lower(${email})
     limit 1
  `;
  return (rows[0] as JsonRecord | undefined) ?? null;
}

export async function readContinuityAuthCredentialStateByEmail(email: string) {
  const sql = db();
  const rows = await sql`
    select
      u.id::text as auth_user_id,
      exists (
        select 1
          from neon_auth.account a
         where a."userId" = u.id
           and a."providerId" = 'credential'
      ) as credential_account_exists,
      exists (
        select 1
          from neon_auth.account a
         where a."userId" = u.id
           and a."providerId" = 'credential'
           and nullif(a.password, '') is not null
      ) as password_initialized
      from neon_auth."user" u
     where lower(u.email) = lower(${email})
     limit 1
  `;
  const row = rows[0] as JsonRecord | undefined;
  if (!row) return null;
  return {
    authUserId: typeof row.auth_user_id === 'string' ? row.auth_user_id : null,
    credentialAccountExists: row.credential_account_exists === true,
    passwordInitialized: row.password_initialized === true,
  };
}

export async function readContinuityInstitutionalAccountGrantByEmail(email: string) {
  const sql = db();
  const rows = await sql`
    select user_id, status
      from sfi_account_access_grants
     where lower(email) = lower(${email})
     limit 1
  `;
  return (rows[0] as JsonRecord | undefined) ?? null;
}

export async function readContinuityMemberWorkspaceCounts(userId: string) {
  const sql = db();
  const rows = await sql`
    select
      (select count(*)::int from field_cases where owner_id = ${userId}::uuid and deleted_at is null) as case_count,
      (select count(*)::int from studio_objects where owner_id = ${userId}::uuid) as object_count,
      (select count(*)::int from field_returns where owner_id = ${userId}::uuid and returned_at is null) as pending_return_count
  `;
  const row = (rows[0] as JsonRecord | undefined) ?? {};
  return {
    caseCount: Number(row.case_count ?? 0),
    objectCount: Number(row.object_count ?? 0),
    pendingReturnCount: Number(row.pending_return_count ?? 0),
  };
}

export async function readContinuityInteractiveCaseIndex(userId: string) {
  const sql = db();

  const memberships = await sql`
    select tenant_id
      from sfi_tenant_members
     where user_id = ${userId}::uuid
       and status = 'ACTIVE'
  `;

  const tenantIds = [...new Set(
    memberships
      .map((row) => String((row as JsonRecord).tenant_id ?? ''))
      .filter(Boolean)
  )];

  if (!tenantIds.length) {
    return {
      projects: [],
      cases: [],
      warnings: [] as string[],
      readPlan: {
        source: 'NEON_CONTINUITY',
        membershipReads: 1,
        caseReads: 0,
        projectReads: 0,
        compactIndex: true,
      },
    };
  }

  const [caseRows, projectRows] = await Promise.all([
    sql`
      select id,tenant_id,project_id,subject,status,updated_at
        from sfi_cases
       where tenant_id = any(${tenantIds}::uuid[])
         and deleted_at is null
       order by updated_at desc
       limit 250
    `,
    sql`
      select id,tenant_id,project_key,name,attractor_ref,trajectory_ref,status,updated_at
        from sfi_projects
       where tenant_id = any(${tenantIds}::uuid[])
       order by updated_at desc
       limit 120
    `,
  ]);

  const cases = caseRows.map((raw) => {
    const row = raw as JsonRecord;
    return {
      id: String(row.id),
      tenantId: String(row.tenant_id),
      projectId: row.project_id ? String(row.project_id) : null,
      subject: String(row.subject ?? ''),
      status: String(row.status ?? ''),
      updatedAt: row.updated_at ? String(row.updated_at) : null,
    };
  });

  const caseCounts = new Map<string, number>();
  for (const item of cases) {
    if (!item.projectId) continue;
    caseCounts.set(item.projectId, (caseCounts.get(item.projectId) ?? 0) + 1);
  }

  const projects = projectRows.map((raw) => {
    const row = raw as JsonRecord;
    const id = String(row.id);
    return {
      id,
      tenantId: String(row.tenant_id),
      key: String(row.project_key ?? ''),
      name: String(row.name ?? ''),
      attractorRef: row.attractor_ref ?? null,
      trajectoryRef: row.trajectory_ref ?? null,
      status: String(row.status ?? ''),
      updatedAt: row.updated_at ? String(row.updated_at) : null,
      caseCount: caseCounts.get(id) ?? 0,
    };
  });

  return {
    projects,
    cases,
    warnings: [
      caseRows.length === 250 ? 'sfi_cases:INTERACTIVE_INDEX_LIMIT_REACHED' : null,
      projectRows.length === 120 ? 'sfi_projects:INTERACTIVE_INDEX_LIMIT_REACHED' : null,
    ].filter((value): value is string => Boolean(value)),
    readPlan: {
      source: 'NEON_CONTINUITY',
      membershipReads: 1,
      caseReads: 1,
      projectReads: 1,
      compactIndex: true,
      caseLimit: 250,
      projectLimit: 120,
      duplicateTenantMembershipReads: 0,
      duplicateCaseTableReads: 0,
    },
  };
}

export async function readContinuityEvidenceTargetIndex() {
  const sql = db();
  const [entries, nodes] = await Promise.all([
    sql`
      select id,title,evidence_type,target_node_id,created_at
        from root_evidence_entries
       order by created_at desc
       limit 60
    `,
    sql`
      select id,node_id,label,node_type,epistemic_class,updated_at
        from graph_nodes
       order by updated_at desc
       limit 80
    `,
  ]);
  return {
    entries,
    nodes,
    source: 'NEON_CONTINUITY' as const,
  };
}

export async function readContinuityEpistemicEvents(eventNames: string[], limit = 500) {
  const sql = db();
  const boundedLimit = Math.max(1, Math.min(5000, limit));
  return sql`
    select sequence,event_id,event_name,epistemic_class,confidence,payload,occurred_at,source
      from epistemic_events
     where event_name = any(${eventNames}::text[])
     order by sequence desc
     limit ${boundedLimit}
  `;
}

export async function readContinuityRootReportSources(limit = 240) {
  const sql = db();
  const boundedLimit = Math.max(1, Math.min(500, limit));
  const [agentRuns, prospectReports, prospectSources, prospectRuns, continuityReports] = await Promise.all([
    sql`
      select id,task_id,role,status,objective,input_snapshot,output_envelope,evidence_refs,limitations,
             provider,model,started_at,finished_at,created_at
        from sfi_cognitive_twin_runs
       where role = any(${['report_agent','report_scheduler']}::text[])
       order by created_at desc
       limit ${boundedLimit}
    `,
    sql`
      select id,run_id,company_name,sector,region,pain_statement,critical_window,sfi_fit,contact,
             proposal_document,confidence,epistemic_status,payload,created_at
        from prospect_opportunity_reports
       order by created_at desc
       limit 80
    `,
    sql`
      select run_id,url,title,publisher,reliability,created_at
        from prospect_research_sources
       order by created_at desc
       limit 400
    `,
    sql`
      select id,mode,status,search_provider,query_plan,warnings,created_at,completed_at
        from prospect_research_runs
       order by created_at desc
       limit 100
    `,
    sql`
      select id,period_start,period_end,mode,summary,content,created_at
        from sfi_continuity_reports
       order by created_at desc
       limit 30
    `,
  ]);
  return {
    agentRuns,
    prospectReports,
    prospectSources,
    prospectRuns,
    continuityReports,
    source: 'NEON_CONTINUITY' as const,
  };
}

export async function readContinuityFieldCaseOwner(caseId: string) {
  const sql = db();
  const rows = await sql`
    select id, owner_id
      from field_cases
     where id = ${caseId}::uuid
     limit 1
  `;
  return (rows[0] as JsonRecord | undefined) ?? null;
}

export async function readContinuityStudioObjectOwner(objectId: string) {
  const sql = db();
  const rows = await sql`
    select id, owner_id
      from studio_objects
     where id = ${objectId}::uuid
     limit 1
  `;
  return (rows[0] as JsonRecord | undefined) ?? null;
}

export async function readContinuityPublicWorldBundle(input: { since: string; limit: number }) {
  const sql = db();
  const [observations, readings, hypotheses, outcomes, learning] = await Promise.all([
    sql`
      select id,source_id,source_family,publisher,observation_kind,title,summary,observed_at,fetched_at,
             latitude,longitude,country_codes,affected_systems,actors,confidence,source_url,payload
      from world_source_observations
      where fetched_at >= ${input.since}::timestamptz
      order by fetched_at desc
      limit ${input.limit}
    `,
    sql`
      select observation_id,systemic_friction,interaction_density,friction_gradient,systemic_coherence,
             tension,pain_map,field_drivers,permissions,trajectory,minimum_viable_perturbation,created_at
      from world_friction_readings
      where created_at >= ${input.since}::timestamptz
      order by created_at desc
      limit ${input.limit}
    `,
    sql`
      select id,phenomenon_key,graph_snapshot,cutoff_at,statement,predicted_trajectory,expected_signals,
             contradiction_signals,validation_starts_at,validation_ends_at,initial_confidence,current_confidence,
             evidence_ids,status,methodology_version,created_at
      from world_hypotheses
      where cutoff_at >= ${input.since}::timestamptz
      order by cutoff_at desc
      limit ${input.limit}
    `,
    sql`
      select id,hypothesis_id,classification,observed_outcome,directional_accuracy,temporal_accuracy,
             actor_accuracy,mechanism_accuracy,source_coverage,evidence_ids,evaluator_version,evaluated_at
      from world_hypothesis_outcomes
      where evaluated_at >= ${input.since}::timestamptz
      order by evaluated_at desc
      limit ${input.limit}
    `,
    sql`
      select id,hypothesis_id,outcome_id,retained_assumptions,rejected_assumptions,missing_variables,
             graph_adjustments,confidence_before,confidence_after,created_at
      from world_learning_events
      where created_at >= ${input.since}::timestamptz
      order by created_at desc
      limit ${input.limit}
    `,
  ]);
  return { observations, readings, hypotheses, outcomes, learning };
}

export async function readContinuityWorldSnapshotTimeline(input: { since: string; ingestMode?: string; limit: number }) {
  const sql = db();
  if (input.ingestMode && input.ingestMode !== 'all') {
    return sql`
      select observed_at,created_at,source_state,confidence,wsi,nti,ingest_mode,sources,degraded_sources,adapter_error
      from worldspect_snapshots
      where observed_at >= ${input.since}::timestamptz
        and ingest_mode = ${input.ingestMode}
      order by observed_at desc
      limit ${input.limit}
    `;
  }
  return sql`
    select observed_at,created_at,source_state,confidence,wsi,nti,ingest_mode,sources,degraded_sources,adapter_error
    from worldspect_snapshots
    where observed_at >= ${input.since}::timestamptz
    order by observed_at desc
    limit ${input.limit}
  `;
}


export async function readContinuityLatestWorldSpectSnapshot() {
  const sql = db();
  const rows = await sql`
    select *
      from worldspect_snapshots
     order by observed_at desc
     limit 1
  `;
  return (rows[0] as JsonRecord | undefined) ?? null;
}

export async function readContinuityWorldSpectSnapshotAtOrBefore(observedAt: string) {
  const sql = db();
  const rows = await sql`
    select *
      from worldspect_snapshots
     where observed_at <= ${observedAt}::timestamptz
     order by observed_at desc
     limit 1
  `;
  return (rows[0] as JsonRecord | undefined) ?? null;
}

export async function readContinuityRecentWorldSpectSnapshots(input: {
  since: string;
  ingestMode?: string;
  limit: number;
}) {
  const sql = db();
  if (input.ingestMode && input.ingestMode !== 'all') {
    return sql`
      select *
        from (
          select *
            from worldspect_snapshots
           where observed_at >= ${input.since}::timestamptz
             and ingest_mode = ${input.ingestMode}
           order by observed_at desc
           limit ${input.limit}
        ) recent
       order by observed_at asc
    `;
  }

  return sql`
    select *
      from (
        select *
          from worldspect_snapshots
         where observed_at >= ${input.since}::timestamptz
         order by observed_at desc
         limit ${input.limit}
      ) recent
     order by observed_at asc
  `;
}



export async function readContinuityAmvMemory(limit = 35) {
  const sql = db();
  const boundedLimit = Math.max(1, Math.min(80, limit));
  return sql`
    select *
      from sfi_amv_memory
     order by created_at desc
     limit ${boundedLimit}
  `;
}

export async function readContinuityCanonicalCognitiveTwinMemoryRows(input: { offset: number; limit: number }) {
  const sql = db();
  const offset = Math.max(0, input.offset);
  const limit = Math.max(1, Math.min(256, input.limit));
  return sql`
    select id,module,input_summary,memory_delta,source_trust,requires_human_validation,created_at
      from sfi_amv_memory
     where module = 'institutionalEventPipeline'
       and memory_delta->'raw'->>'memoryKey' is not null
     order by created_at desc
     offset ${offset}
     limit ${limit}
  `;
}

export async function readContinuityCognitiveTwinStateSnapshot(input: {
  decisionLimit?: number;
  runLimit?: number;
  evaluationLimit?: number;
} = {}) {
  const sql = db();
  const decisionLimit = Math.max(1, Math.min(50, input.decisionLimit ?? 12));
  const runLimit = Math.max(1, Math.min(80, input.runLimit ?? 24));
  const evaluationLimit = Math.max(1, Math.min(80, input.evaluationLimit ?? 20));
  const [recentDecisions, recentRuns, recentEvaluations, approvedDecision, approvedModel] = await Promise.all([
    sql`
      select *
        from sfi_cognitive_twin_decisions
       order by created_at desc
       limit ${decisionLimit}
    `,
    sql`
      select *
        from sfi_cognitive_twin_runs
       order by created_at desc
       limit ${runLimit}
    `,
    sql`
      select *
        from sfi_cognitive_twin_evaluations
       order by executed_at desc
       limit ${evaluationLimit}
    `,
    sql`
      select id
        from sfi_cognitive_twin_decisions
       where status = 'APPROVED'
       limit 1
    `,
    sql`
      select id,status
        from sfi_cognitive_twin_model_registry
       where status in ('APPROVED', 'APPROVED_WITH_LIMITS')
       limit 1
    `,
  ]);
  return {
    recentDecisions: recentDecisions as JsonRecord[],
    recentRuns: recentRuns as JsonRecord[],
    recentEvaluations: recentEvaluations as JsonRecord[],
    approvedDecisionExists: approvedDecision.length > 0,
    approvedModelExists: approvedModel.length > 0,
    source: 'NEON_CONTINUITY' as const,
  };
}

export async function recordContinuityEvent(input: {
  eventType: string;
  entityType?: string;
  entityId?: string;
  operation: string;
  status: string;
  details?: Record<string, unknown>;
}) {
  const sql = db();
  const detailsJson = JSON.stringify(input.details ?? {});
  await sql`
    insert into sfi_continuity_ledger (
      event_type, source_store, target_store, entity_type, entity_id,
      operation, status, details
    ) values (
      ${input.eventType},
      'SUPABASE',
      'NEON',
      ${input.entityType ?? null},
      ${input.entityId ?? null},
      ${input.operation},
      ${input.status},
      ${detailsJson}::jsonb
    )
  `;
}


export async function readContinuityRootNeuralGraphRuntime() {
  const sql = db();
  const rows = await sql`
    select
      (select count(*)::int from graph_nodes) as node_count,
      (select count(*)::int from graph_edges) as edge_count,
      (select count(*)::int from scorefriction_observations) as scorefriction_observation_count,
      (select count(*)::int from scorefriction_vectors) as scorefriction_vector_count,
      (select max(observed_at)::text from worldspect_snapshots) as latest_worldspect_observed_at,
      coalesce((
        select jsonb_agg(row_to_json(a) order by a.weight desc)
          from (
            select attractor_key,label,confidence,persistence,status,updated_at,weight
              from sfi_attractors
             order by weight desc
             limit 5
          ) a
      ), '[]'::jsonb) as top_attractors,
      coalesce((
        select jsonb_agg(row_to_json(e) order by e.weight desc)
          from (
            select ejector_key,label,contradiction,decay,status,updated_at,weight
              from sfi_ejectors
             order by weight desc
             limit 5
          ) e
      ), '[]'::jsonb) as top_ejectors
  `;
  return (rows[0] as JsonRecord | undefined) ?? null;
}

export async function readContinuityCanonicalGraphRows() {
  const sql = db();
  const rows = await sql`
    select
      coalesce((
        select jsonb_agg(
          (
            (to_jsonb(n) - 'payload' - 'q_n' - 'd_n' - 'co_n' - 'u_n' - 'epistemic_class' - 'confidence')
            || jsonb_build_object(
              'attributes',
              coalesce(
                nullif(nullif(to_jsonb(n)->'attributes', 'null'::jsonb), '{}'::jsonb),
                nullif(to_jsonb(n)->'payload', 'null'::jsonb),
                '{}'::jsonb
              )
            )
          )
          order by n.created_at asc
        )
          from graph_nodes n
      ), '[]'::jsonb) as nodes,
      coalesce((
        select jsonb_agg(
          (
            (to_jsonb(e) - 'payload' - 'evidence_ids' - 'confidence')
            || jsonb_build_object(
              'attributes',
              coalesce(
                nullif(nullif(to_jsonb(e)->'attributes', 'null'::jsonb), '{}'::jsonb),
                nullif(to_jsonb(e)->'payload', 'null'::jsonb),
                '{}'::jsonb
              ),
              'lineage',
              coalesce(
                nullif(nullif(to_jsonb(e)->'lineage', 'null'::jsonb), '[]'::jsonb),
                nullif(nullif(to_jsonb(e)->'evidence_ids', 'null'::jsonb), '[]'::jsonb),
                '[]'::jsonb
              )
            )
          )
          order by e.created_at asc
        )
          from graph_edges e
      ), '[]'::jsonb) as edges
  `;
  const row = (rows[0] as JsonRecord | undefined) ?? null;
  return row
    ? {
        nodes: Array.isArray(row.nodes) ? row.nodes as JsonRecord[] : [],
        edges: Array.isArray(row.edges) ? row.edges as JsonRecord[] : [],
      }
    : null;
}

export function continuityDatabase() {
  return db();
}
