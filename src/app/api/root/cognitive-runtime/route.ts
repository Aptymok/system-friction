import { NextResponse } from 'next/server';
import { requireRootActor } from '@/lib/root/server';
import { SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY } from '@/lib/sfi/cognitive-runtime/convergedRegistry';
import { listBoundedCognitiveMissions } from '@/lib/sfi/cognitive-runtime/missionCatalog';
import { validateMissionDispatchRequest } from '@/lib/sfi/cognitive-runtime/missionDispatch';
import {
  compactExecutionContract,
  listExecutionContracts,
} from '@/lib/sfi/cognitive-runtime/executionContracts';
import { executeManualCognitiveAgent } from '@/lib/sfi/cognitive-runtime/manualExecution';
import { enqueueAuthorizedC07Mission, readOwnedC07Mission, readOwnedC07MissionSummary } from '@/lib/sfi/cognitive-runtime/queuedMissionIntake';
import { runBoundedC07QueuedMission } from '@/lib/sfi/cognitive-runtime/queuedMissionWorker';
import { readObservedSfiCognitiveRuntime } from '@/lib/sfi/cognitive-runtime/observedRuntime';
import { planCognitiveQuestion } from '@/lib/sfi/cognitive-runtime/planning';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

type Row = Record<string, unknown>;

function text(value: unknown, max = 4_000) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
}

function compactAgent(agent: (typeof SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY)[number]) {
  return {
    id: agent.id,
    name: agent.name,
    purpose: agent.purpose,
    domain: agent.domain,
    layer: agent.layer,
    authority: agent.authorityLevel,
    simulationAllowed: agent.simulationAllowed,
    humanApprovalRequired: agent.humanApprovalRequired,
    reads: agent.readsMemory,
    emits: agent.emits,
  };
}

export async function GET(request: Request) {
  const gate = await requireRootActor('root.cognitive-runtime.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  const jobId = new URL(request.url).searchParams.get('jobId')?.trim() ?? null;
  if (jobId) {
    const result = await readOwnedC07Mission(jobId, gate.ctx.user.id);
    return NextResponse.json(result.body, {status:result.status,headers:{'Cache-Control':'private, no-store'}});
  }

  return NextResponse.json({
    ok: true,
    runtime: await readObservedSfiCognitiveRuntime(),
    agents: SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.map(compactAgent),
    executionContracts: listExecutionContracts().map(compactExecutionContract),
    missionDefinitions: listBoundedCognitiveMissions(),
    missionStatus: 'DEFINED_NOT_DISPATCHED',
    queuedMissionEnabled: process.env.SFI_C07_MISSION_QUEUE_ENABLED === 'true',
    ownerQueue: await readOwnedC07MissionSummary(gate.ctx.user.id),
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const gate = await requireRootActor('root.cognitive-runtime.operate');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const body = await request.json().catch(() => ({})) as Row;
  const operation = text(body.operation, 30) ?? 'plan';

  if (operation === 'plan') {
    const question = text(body.question);
    if (!question) return NextResponse.json({ ok: false, error: 'question_required' }, { status: 400 });
    const result = await planCognitiveQuestion(question, gate.ctx.user.id);
    if (!result.ok) return NextResponse.json(result, { status: 503 });
    return NextResponse.json(result);
  }

  if (operation === 'run_queue_once') {
    // This is an explicit ROOT canary action, not a bypass of the job lease,
    // persisted authorization, canary-case gate, or receipt readback.
    // The worker remains disabled unless the preview queue flag is enabled.
    const result=await runBoundedC07QueuedMission('root-canary-' + gate.ctx.user.id.replace(/[^-_a-zA-Z0-9]/g,'').slice(0,48));
    return NextResponse.json({ok:result.ok, operation, result,
      boundary:'Manual preview canary does not certify autonomous scheduling or observed external RETURN.'},
      {status:result.ok?200:503,headers:{'Cache-Control':'private, no-store'}});
  }

  if (operation === 'queue_mission') {
    const result = await enqueueAuthorizedC07Mission(body, gate.ctx.user.id);
    return NextResponse.json(result.body, {status:result.status});
  }

  if (operation !== 'execute' && operation !== 'execute_mission') {
    return NextResponse.json({ ok: false, error: 'unsupported_cognitive_operation' }, { status: 400 });
  }

  // Only explicit user submission under the pre-existing ROOT operation gate.
  // Mission identity narrows the available executor/targets; it never grants
  // capability authority, queues work, or bypasses the canonical preflight.
  const mission = operation === 'execute_mission' ? validateMissionDispatchRequest(body) : null;
  if (mission && !mission.ok) {
    return NextResponse.json({ ok: false, error: mission.error }, { status: mission.status });
  }
  const executionBody = mission?.ok
    ? { ...body, agentId: mission.mission.agentId, missionId: mission.mission.missionId }
    : { ...body, missionId: null };

  const result = await executeManualCognitiveAgent(executionBody, {
    userId: gate.ctx.user.id,
    actorId: gate.ctx.user.id,
    tenantId: 'sfi',
    requestSource: 'ROOT_MANUAL',
    allowLegacyCompatibility: true,
  });
  return NextResponse.json(result.body, { status: result.status });
}
