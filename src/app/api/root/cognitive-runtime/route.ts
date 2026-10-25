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
import { canonicalQueuedRequestDigest } from '@/lib/sfi/cognitive-runtime/queuedMissionWorker';
import { readOperationalCase } from '@/lib/sfi/case-platform/repository';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
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
    if (process.env.SFI_C07_MISSION_QUEUE_ENABLED !== 'true') {
      return NextResponse.json({ok:false,error:'queue_not_released'},{status:409});
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(jobId)) {
      return NextResponse.json({ok:false,error:'job_id_invalid'},{status:400});
    }
    const status = await createServiceSupabaseClient().from('sfi_c07_mission_jobs')
      .select('id,mission_id,execution_id,status,attempts,max_attempts,receipt_event_id,last_error_code,updated_at,return_observation')
      .eq('id',jobId).eq('actor_id',gate.ctx.user.id).maybeSingle();
    if (status.error) return NextResponse.json({ok:false,error:'queue_status_unavailable'},{status:503});
    if (!status.data) return NextResponse.json({ok:false,error:'queue_job_not_found'},{status:404});
    return NextResponse.json({ok:true,job:status.data,boundary:'QUEUED is not EXECUTED. A verified agent receipt is not external RETURN or approved learning.'},{headers:{'Cache-Control':'private, no-store'}});
  }
  return NextResponse.json({
    ok: true,
    runtime: await readObservedSfiCognitiveRuntime(),
    agents: SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.map(compactAgent),
    executionContracts: listExecutionContracts().map(compactExecutionContract),
    missionDefinitions: listBoundedCognitiveMissions(),
    missionStatus: 'DEFINED_NOT_DISPATCHED',
    queuedMissionEnabled: process.env.SFI_C07_MISSION_QUEUE_ENABLED === 'true',
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

  if (operation === 'queue_mission') {
    // A ROOT operation is not a permission to enqueue across tenants.
    // At this stage restrict queue use to exactly one existing, readable CASE.
    if (process.env.SFI_C07_MISSION_QUEUE_ENABLED !== 'true') {
      return NextResponse.json({ ok:false, error:'queue_not_released', instructions:'La cola aún no tiene migración y despliegue autorizados.' }, { status:409 });
    }
    const mission = validateMissionDispatchRequest(body);
    if (!mission.ok) return NextResponse.json({ok:false,error:mission.error},{status:mission.status});
    const targets = Array.isArray(body.targets) ? body.targets as Row[] : [];
    const anchors = Array.isArray(body.anchors) ? body.anchors as Row[] : [];
    if (targets.length !== 1 || targets[0].kind !== 'CASE' || !text(targets[0].id)
      || !anchors.length || anchors.some(a => a.kind !== 'CASE' || a.id !== targets[0].id)
      || !text(body.idempotencyKey,160) || text(body.idempotencyKey,160)!.length < 8
      || (Array.isArray(body.sourceUrls) && body.sourceUrls.length)
      || (Array.isArray(body.evidenceIds) && body.evidenceIds.length)) {
      return NextResponse.json({ok:false,error:'queue_requires_single_case_read_only_request'},{status:400});
    }
    const caseRef = await readOperationalCase(String(targets[0].id), gate.ctx.user.id).catch(() => null);
    if (!caseRef || caseRef.caseRecord.status === 'CLOSED') {
      return NextResponse.json({ok:false,error:'case_not_authorized_or_closed'},{status:403});
    }
    const permittedKeys = ['agentId','missionId','purpose','anchors','targets','timeRange','direction','parameters','requestedOutputs','governanceContext'];
    const payload = Object.fromEntries(permittedKeys.filter(key => body[key] !== undefined).map(key => [key,body[key]]));
    const db = createServiceSupabaseClient();
    const receipt = await db.rpc('sfi_c07_enqueue_mission_v1',{
      p_tenant_id:caseRef.caseRecord.tenantId,
      p_actor_id:gate.ctx.user.id,
      p_mission_id:mission.mission.missionId,
      p_agent_id:mission.mission.agentId,
      p_idempotency_key:String(body.idempotencyKey),
      p_request_digest:canonicalQueuedRequestDigest(payload),
      p_request_payload:payload,
      p_max_attempts:2,
    });
    if (receipt.error || !receipt.data) return NextResponse.json({
      ok:false,error:'queue_write_not_confirmed',code:receipt.error?.code??null,
    },{status:503});
    const queued = Array.isArray(receipt.data) ? receipt.data[0] : receipt.data;
    return NextResponse.json({
      ok:true,operation:'queue_mission',state:queued.status,
      jobId:queued.id,executionId:queued.execution_id,missionId:queued.mission_id,
      boundary:'Queued does not mean executed; execution requires lease, authority recheck and independent persisted receipt. External RETURN remains NOT_OBSERVED.',
    },{status:202});
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
