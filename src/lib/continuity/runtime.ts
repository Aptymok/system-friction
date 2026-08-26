import { readEvidenceReadiness, searchEvidenceCandidates } from '@/lib/evidence/evidenceCandidates';
import { classifyGovernedProposalWork } from '@/lib/execution/governedExecutionRouter';
import { appendOperationalEvent, recordValue, stringValue, updateActionProposalRisk, type ProposalRiskLevel } from '@/lib/operational/common';
import { createKernelContext } from '@/lib/sfi/cognitive-runtime/createKernelContext';
import { runCognitiveAgent } from '@/lib/sfi/cognitive-runtime/runtimeAgentExecutor';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import {
  CONTINUITY_CAPABILITIES,
  type CapabilityHealth,
  type ContinuityCapability,
  type ContinuityMode,
} from './contracts';

type Row = Record<string, unknown>;
const WATCHDOG_ACTOR = 'sfi_transition_watchdog';

function siteOrigin() {
  const explicit = process.env.SFI_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return 'http://localhost:3000';
}

function proposalType(row: Row) {
  const expected = recordValue(row.expected_field_delta);
  const payload = recordValue(expected.payload);
  const proportionality = recordValue(row.proportionality_check);
  return stringValue(row.proposal_type)
    ?? stringValue(expected.proposalType)
    ?? stringValue(expected.proposal_type)
    ?? stringValue(payload.proposalType)
    ?? stringValue(proportionality.proposalType)
    ?? 'unknown';
}

function proposalText(row: Row) {
  const expected = recordValue(row.expected_field_delta);
  const payload = recordValue(expected.payload);
  return [row.title, row.description, expected.objective, JSON.stringify(payload)].filter(Boolean).join(' ').toLowerCase();
}

function hoursSince(value: unknown) {
  const parsed = typeof value === 'string' ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed) ? Math.max(0, (Date.now() - parsed) / 3_600_000) : null;
}

function riskLevelFromAssessment(row: Row, severities: number[]): { level: ProposalRiskLevel; confidence: number | null; rationale: string } {
  const text = proposalText(row);
  const scope = classifyGovernedProposalWork(row);
  const maxSeverity = severities.length ? Math.max(...severities) : null;
  const hasSubstantiveInput = Boolean(stringValue(row.title) || stringValue(row.description) || Object.keys(recordValue(row.expected_field_delta)).length);
  if (!hasSubstantiveInput) return { level: 'unassessable', confidence: null, rationale: 'MISSING_INPUT_FOR_RISK: proposal has no substantive objective/scope to assess.' };
  if (/(credential|oauth|authentication|security|billing|payment|owner transfer|canonical promotion|canon)/i.test(text)) {
    return { level: 'high', confidence: 0.82, rationale: 'Sensitive authority/security/financial/canonical scope detected; ROOT-only risk boundary applied.' };
  }
  if (scope.executionClass === 'EXTERNAL_ACTION') {
    return { level: maxSeverity !== null && maxSeverity >= 0.75 ? 'high' : 'medium', confidence: 0.76, rationale: 'Material external side effect detected by governed execution classification.' };
  }
  if (maxSeverity !== null && maxSeverity >= 0.75) return { level: 'high', confidence: 0.78, rationale: `RiskAgent detected severity ${maxSeverity.toFixed(2)}.` };
  if (maxSeverity !== null && maxSeverity >= 0.35) return { level: 'medium', confidence: 0.7, rationale: `RiskAgent detected severity ${maxSeverity.toFixed(2)}.` };
  return { level: 'low', confidence: 0.62, rationale: 'Bounded internal scope with no material risk markers detected by RiskAgent. Reassess if scope/evidence changes.' };
}

async function assessUnknownProposalRisk(row: Row) {
  const proposalId = stringValue(row.id);
  if (!proposalId) return { ok: false as const, error: 'proposal_id_missing' };
  if (proposalType(row) === 'evidence_candidate') return { ok: true as const, skipped: 'nested_evidence_candidate' };

  const context = createKernelContext(proposalId, `proposal-risk:${proposalId}`, 'SFI_PROPOSAL_RISK_ASSESSMENT_REQUESTED');
  context.taskId = `proposal-risk:${proposalId}`;
  context.evidence.push({
    id: proposalId,
    source: 'action_proposals',
    confidence: 1,
    payload: {
      title: row.title ?? null,
      description: row.description ?? null,
      expectedFieldDelta: row.expected_field_delta ?? null,
      proportionalityCheck: row.proportionality_check ?? null,
      observedObject: 'proposal_declaration_and_scope',
    },
  });
  context.metadata = {
    proposalId,
    objective: stringValue(row.description) ?? stringValue(recordValue(row.expected_field_delta).objective),
    question: stringValue(row.title) ?? 'Assess proposal risk before governance action',
    llmAugmentation: false,
    canonicalPromotionAllowed: false,
    executionAllowed: false,
  };
  const executed = await runCognitiveAgent('risk_agent', context);
  const assessment = riskLevelFromAssessment(row, executed.context.risks.map((risk) => Number(risk.severity)).filter(Number.isFinite));
  const event = await appendOperationalEvent({
    eventName: 'sfi.proposal.risk_assessed',
    actorId: WATCHDOG_ACTOR,
    confidence: assessment.confidence ?? undefined,
    payload: {
      proposalId,
      riskLevel: assessment.level,
      rationale: assessment.rationale,
      riskAgentExecuted: executed.executed,
      riskCount: executed.context.risks.length,
      executionAllowed: false,
      canonicalPromotionAllowed: false,
      nextExpectedEvent: 'GOVERNANCE_REVIEW_OR_EVIDENCE_REQUEST',
    },
    lineage: [proposalId],
  });
  if (!event.ok) return { ok: false as const, error: 'risk_assessment_event_failed' };
  const updated = await updateActionProposalRisk({
    proposalId,
    riskLevel: assessment.level,
    actorId: WATCHDOG_ACTOR,
    confidence: assessment.confidence,
    rationale: assessment.rationale,
    sourceEventId: String(event.data.event_id ?? event.data.id ?? ''),
  });
  return { ...updated, proposalId, assessment };
}

/**
 * Reuses the existing continuity heartbeat to close the operational "last mile".
 * It may create missing evidence acquisition work and advisory risk state. It may
 * not approve a proposal, perform an unknown external action, or promote canon.
 */
export async function runOperationalTransitionWatchdog(input: { evidenceLimit?: number; riskLimit?: number; staleHours?: number } = {}) {
  const db = createServiceSupabaseClient();
  const evidenceLimit = Math.max(1, Math.min(6, input.evidenceLimit ?? 3));
  const riskLimit = Math.max(1, Math.min(20, input.riskLimit ?? 10));
  const staleHours = Math.max(1, input.staleHours ?? 24);
  const read = await db.from('action_proposals').select('*').in('status', ['proposed', 'waiting_evidence', 'design_approved', 'queued', 'accepted']).order('created_at', { ascending: true }).limit(220);
  if (read.error) return { ok: false as const, error: read.error.message, evidenceJobs: [], riskAssessments: [], stale: [] };
  const rows = (read.data ?? []) as Row[];
  const parents = rows.filter((row) => proposalType(row) !== 'evidence_candidate');

  const evidenceJobs: unknown[] = [];
  let evidenceRuns = 0;
  for (const row of parents.filter((item) => String(item.status ?? '').toLowerCase() === 'waiting_evidence')) {
    const proposalId = stringValue(row.id);
    if (!proposalId) continue;
    const before = await readEvidenceReadiness(proposalId);
    if (before.readiness?.state !== 'MISSING') {
      evidenceJobs.push({ proposalId, action: 'observe', readiness: before.readiness });
      continue;
    }
    if (evidenceRuns >= evidenceLimit) {
      evidenceJobs.push({ proposalId, action: 'deferred_to_next_heartbeat', readiness: before.readiness });
      continue;
    }
    evidenceRuns += 1;
    const acquisition = await searchEvidenceCandidates({
      parentProposalId: proposalId,
      actorId: WATCHDOG_ACTOR,
      requestNote: 'Continuity watchdog: acquire missing evidence candidates for a waiting_evidence proposal. ROOT must review candidates before persistence.',
    }).catch((error) => ({ ok: false as const, candidates: [], warnings: [error instanceof Error ? error.message : String(error)] }));
    const after = await readEvidenceReadiness(proposalId);
    evidenceJobs.push({ proposalId, action: 'acquire', acquisition, readiness: after.readiness });
  }

  const riskAssessments: unknown[] = [];
  for (const row of parents.filter((item) => String(item.risk_level ?? '').toLowerCase() === 'unknown').slice(0, riskLimit)) {
    riskAssessments.push(await assessUnknownProposalRisk(row).catch((error) => ({
      ok: false as const,
      proposalId: row.id ?? null,
      error: error instanceof Error ? error.message : String(error),
    })));
  }

  const stale = parents.flatMap((row) => {
    const status = String(row.status ?? '').toLowerCase();
    const ageHours = hoursSince(row.updated_at ?? row.approved_at ?? row.created_at);
    if (ageHours === null || ageHours < staleHours) return [];
    const outcome = recordValue(row.outcome);
    const patch = recordValue(outcome.payloadPatch);
    if (status === 'waiting_evidence') return [{ proposalId: row.id, status, ageHours, blocker: 'WAITING_EVIDENCE_STALE', owner: 'evidence_hunter', nextExpectedEvent: 'EVIDENCE_CANDIDATE_ACQUIRED' }];
    if (status === 'design_approved') return [{ proposalId: row.id, status, ageHours, blocker: 'LEGACY_APPROVED_NOT_QUEUED', owner: 'project_execution_manager', nextExpectedEvent: 'QUEUED' }];
    if (status === 'queued') return [{ proposalId: row.id, status, ageHours, blocker: 'QUEUED_WITHOUT_RETURN', owner: 'project_execution_manager', nextExpectedEvent: 'SFI_PROPOSAL_RETURN_RECORDED' }];
    if (status === 'accepted' && patch.outcomeRecorded !== true && outcome.outcomeRecorded !== true) {
      return [{ proposalId: row.id, status, ageHours, blocker: 'LEGACY_ACCEPTED_WITHOUT_OBSERVED_RETURN', owner: 'ROOT', nextExpectedEvent: 'RETURN_RECONCILIATION' }];
    }
    return [];
  });

  return {
    ok: true as const,
    generatedAt: new Date().toISOString(),
    evidenceJobs,
    riskAssessments,
    stale,
    policy: {
      automatic: ['evidence_candidate_acquisition', 'risk_assessment', 'queued_execution_retry_elsewhere_in_same_heartbeat'],
      humanGate: ['evidence_accept_reject', 'proposal_accept_reject', 'external_scope_expansion', 'canonical_promotion'],
      nextStateRule: 'Every non-terminal object should expose nextExpectedEvent, owner, blocker and rootActionRequired.',
    },
  };
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
