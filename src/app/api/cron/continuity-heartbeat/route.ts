import { NextRequest, NextResponse } from 'next/server';
import { runContinuityHeartbeat, runOperationalTransitionWatchdog } from '@/lib/continuity/runtime';
import { runStudioAutonomyContinuation } from '@/lib/continuity/studioAutonomy';
import { verifyGitHubActionsOidcToken } from '@/lib/continuity/githubActionsOidc';
import { runGovernedExecutionRouter } from '@/lib/execution/governedExecutionRouter';
import { runUniversalCycleContinuation } from '@/lib/sfi/universalCycleContinuation';
import { runUniversalEmpiricalContinuation } from '@/lib/sfi/universalEmpiricalContinuation';
import { runUniversalReturnPlanUpgrade } from '@/lib/sfi/universalReturnPlanUpgrade';
import { readUniversalCycleHistory } from '@/lib/sfi/universalSignalCycle';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type AuthorizedTrigger = 'vercel_cron' | 'github_actions_oidc' | 'development';
type Row = Record<string, unknown>;

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown, max = 1200) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
}

function strings(value: unknown, max = 6) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .map((item) => item.trim().slice(0, 600))
      .slice(0, max)
    : [];
}

function latestNamed(events: unknown[], eventName: string) {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = row(events[index]);
    if (text(event.event_name) === eventName) return event;
  }
  return null;
}

function summarizeReturnPlan(event: Row | null) {
  if (!event) return null;
  const payload = row(event.payload);
  const plan = row(payload.plan);
  const capability = row(plan.capabilityResolution);
  return {
    eventId: text(event.event_id),
    occurredAt: text(event.occurred_at),
    contract: text(plan.contract),
    status: text(plan.status),
    acquisitionState: text(plan.acquisitionState),
    responsibility: text(plan.responsibility),
    humanInputRequired: plan.humanInputRequired === true,
    requiredHumanInput: strings(plan.requiredHumanInput),
    expectedSignals: strings(plan.expectedSignals),
    contradictionSignals: strings(plan.contradictionSignals),
    next: text(plan.next),
    capabilityResolution: Object.keys(capability).length ? {
      contract: text(capability.contract),
      decision: text(capability.decision) ?? text(capability.state),
      capabilityId: text(capability.capabilityId),
      sourceClass: text(capability.sourceClass),
      humanInputRequired: capability.humanInputRequired === true,
      requiredHumanInput: strings(capability.requiredHumanInput),
      reason: text(capability.reason),
      provider: text(capability.provider),
      model: text(capability.model),
    } : null,
  };
}

async function readTargetCycleProof(cycleId: string | undefined) {
  if (!cycleId) return null;
  const history = await readUniversalCycleHistory(cycleId);
  if (!history.ok) {
    return { ok: false as const, cycleId, state: history.state ?? null, error: history.error ?? 'cycle_history_unavailable' };
  }
  const events = Array.isArray(history.events) ? history.events : [];
  const latestEvent = events.length ? row(events[events.length - 1]) : null;
  const cognitive = latestNamed(events, 'SFI_UNIVERSAL_COGNITIVE_CYCLE_EXECUTED');
  const synthesis = latestNamed(events, 'SFI_UNIVERSAL_AI_SYNTHESIS_COMPLETED');
  const returnPlan = latestNamed(events, 'SFI_UNIVERSAL_RETURN_PLAN_RECORDED');
  const returnEvent = latestNamed(events, 'SFI_UNIVERSAL_RETURN_RECORDED');
  const contrast = latestNamed(events, 'SFI_UNIVERSAL_RETURN_CONTRASTED');
  const closure = latestNamed(events, 'SFI_UNIVERSAL_CYCLE_CLOSED');
  const cognitivePayload = row(cognitive?.payload);
  const synthesisPayload = row(synthesis?.payload);
  const synthesisBody = row(synthesisPayload.synthesis);

  return {
    ok: true as const,
    cycleId,
    state: history.state ?? null,
    eventCount: events.length,
    latestEvent: latestEvent ? {
      eventId: text(latestEvent.event_id),
      eventName: text(latestEvent.event_name),
      epistemicClass: text(latestEvent.epistemic_class),
      occurredAt: text(latestEvent.occurred_at),
    } : null,
    cognition: {
      completed: cognitivePayload.completed === true,
      eventId: text(cognitive?.event_id),
      occurredAt: text(cognitive?.occurred_at),
      executedAgentCount: Array.isArray(cognitivePayload.executedAgents) ? cognitivePayload.executedAgents.length : 0,
      missingAgentCount: Array.isArray(cognitivePayload.missingAgents) ? cognitivePayload.missingAgents.length : 0,
    },
    synthesis: synthesis ? {
      eventId: text(synthesis.event_id),
      occurredAt: text(synthesis.occurred_at),
      status: text(synthesisBody.status) ?? text(synthesisPayload.status),
      provider: text(synthesisBody.provider) ?? text(synthesisPayload.provider),
      model: text(synthesisBody.model) ?? text(synthesisPayload.model),
    } : null,
    returnPlan: summarizeReturnPlan(returnPlan),
    returnRecorded: Boolean(returnEvent),
    returnEventId: text(returnEvent?.event_id),
    contrastRecorded: Boolean(contrast),
    contrastEventId: text(contrast?.event_id),
    closed: Boolean(closure),
    closureEventId: text(closure?.event_id),
    boundary: 'Read-only bounded proof derived from the existing universal-cycle ledger. It exposes lifecycle state and RETURN requirements only; it does not create evidence, RETURN, CONTRAST, closure, learning, or raw material.',
  };
}

function bearer(request: NextRequest) {
  const match = (request.headers.get('authorization') ?? '').match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? '';
}

async function authorize(request: NextRequest): Promise<{ ok: true; trigger: AuthorizedTrigger } | { ok: false }> {
  const token = bearer(request);
  const secret = process.env.SFI_CONTINUITY_CRON_SECRET || process.env.CRON_SECRET || '';

  if (!token && !secret && process.env.NODE_ENV !== 'production') {
    return { ok: true, trigger: 'development' };
  }

  if (secret && token === secret) {
    return { ok: true, trigger: 'vercel_cron' };
  }

  if (token) {
    const oidc = await verifyGitHubActionsOidcToken(token);
    if (oidc.ok) return { ok: true, trigger: 'github_actions_oidc' };
  }

  return { ok: false };
}

export async function GET(request: NextRequest) {
  const authorization = await authorize(request);
  if (!authorization.ok) return NextResponse.json({ ok: false, error: 'unauthorized_continuity_cron' }, { status: 401 });

  const requestedCycleId = request.nextUrl.searchParams.get('cycleId')?.trim() || undefined;

  try {
    const result = await runContinuityHeartbeat(authorization.trigger);
    const emergencyHalt = result.mode === 'EMERGENCY_HALT';

    const returnPlanUpgradeBefore = emergencyHalt
      ? { ok: true as const, halted: true as const, processed: 0, results: [] }
      : await runUniversalReturnPlanUpgrade({ limit: 4, cycleId: requestedCycleId }).catch((error) => ({
          ok: false as const,
          processed: 0,
          requestedCycleId: requestedCycleId ?? null,
          results: [],
          error: error instanceof Error ? error.message : String(error),
        }));

    const [studioAutonomy, transitionWatchdog, governedExecution, universalCycleContinuation] = await Promise.all([
      runStudioAutonomyContinuation({
        mode: result.mode,
        continuityRunId: result.runId,
        observations: result.results.map((item) => ({
          capabilityId: item.capability.id,
          status: item.status,
          latencyMs: item.latencyMs,
          errorCode: item.errorCode ?? null,
        })),
      }).catch((error) => ({
        status: 'DEGRADED' as const,
        reason: error instanceof Error ? error.message : String(error),
        targets: 0,
        outcomes: [] as [],
      })),
      emergencyHalt
        ? Promise.resolve({ ok: true as const, halted: true as const, evidenceJobs: [], riskAssessments: [], stale: [] })
        : runOperationalTransitionWatchdog().catch((error) => ({
            ok: false as const,
            error: error instanceof Error ? error.message : String(error),
            evidenceJobs: [],
            riskAssessments: [],
            stale: [],
          })),
      emergencyHalt
        ? Promise.resolve({ ok: true as const, halted: true as const, processed: 0, results: [] })
        : runGovernedExecutionRouter({ limit: 10 }).catch((error) => ({
            ok: false as const,
            processed: 0,
            results: [],
            error: error instanceof Error ? error.message : String(error),
          })),
      emergencyHalt
        ? Promise.resolve({ ok: true as const, halted: true as const, processed: 0, results: [] })
        : runUniversalCycleContinuation({ limit: 2, cycleId: requestedCycleId }).catch((error) => ({
            ok: false as const,
            processed: 0,
            requestedCycleId: requestedCycleId ?? null,
            results: [],
            error: error instanceof Error ? error.message : String(error),
          })),
    ]);

    const returnPlanUpgradeAfter = emergencyHalt
      ? { ok: true as const, halted: true as const, processed: 0, results: [] }
      : await runUniversalReturnPlanUpgrade({ limit: 4, cycleId: requestedCycleId }).catch((error) => ({
          ok: false as const,
          processed: 0,
          requestedCycleId: requestedCycleId ?? null,
          results: [],
          error: error instanceof Error ? error.message : String(error),
        }));

    const universalEmpiricalContinuation = emergencyHalt
      ? { ok: true as const, halted: true as const, processed: 0, results: [] }
      : await runUniversalEmpiricalContinuation({ limit: 3, cycleId: requestedCycleId }).catch((error) => ({
          ok: false as const,
          processed: 0,
          requestedCycleId: requestedCycleId ?? null,
          results: [],
          error: error instanceof Error ? error.message : String(error),
        }));

    const targetCycleState = requestedCycleId
      ? await readTargetCycleProof(requestedCycleId).catch((error) => ({
          ok: false as const,
          cycleId: requestedCycleId,
          state: null,
          error: error instanceof Error ? error.message : String(error),
        }))
      : null;

    const laneFailure = transitionWatchdog.ok === false
      || governedExecution.ok === false
      || universalCycleContinuation.ok === false
      || returnPlanUpgradeBefore.ok === false
      || returnPlanUpgradeAfter.ok === false
      || universalEmpiricalContinuation.ok === false
      || targetCycleState?.ok === false
      || studioAutonomy.status === 'DEGRADED';

    return NextResponse.json({
      ok: result.status !== 'FAILED' && !laneFailure,
      trigger: authorization.trigger,
      requestedCycleId: requestedCycleId ?? null,
      ...result,
      studioAutonomy,
      transitionWatchdog,
      governedExecution,
      returnPlanUpgradeBefore,
      universalCycleContinuation,
      returnPlanUpgradeAfter,
      universalEmpiricalContinuation,
      targetCycleState,
      executionRule: emergencyHalt
        ? 'EMERGENCY_HALT suppresses transition writes, governed execution dispatch, universal cognitive continuation, empirical continuation and learning writes. Continuity probes may record the halted heartbeat only.'
        : 'One heartbeat owns the complete governed continuation path: legacy RETURN plans are upgraded to AI-governed capability routing, interrupted cognition resumes from durable checkpoints using a sealed Cognitive Twin context, real evidence-linked RETURNs advance through AI-assisted CONTRAST and existing empirical closure rules, and calibrated learning becomes adaptive non-canonical Twin context. A requested cycle also returns bounded read-only lifecycle proof even when no cognitive work is eligible. Missing evidence remains missing; no RETURN, canon mutation or irreversible external authority is fabricated.',
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'continuity_heartbeat_failed', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
