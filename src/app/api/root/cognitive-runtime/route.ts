import { NextResponse } from 'next/server';
import { requireRootActor } from '@/lib/root/server';
import { SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY } from '@/lib/sfi/cognitive-runtime/convergedRegistry';
import {
  compactExecutionContract,
  listExecutionContracts,
} from '@/lib/sfi/cognitive-runtime/executionContracts';
import { executeManualCognitiveAgent } from '@/lib/sfi/cognitive-runtime/manualExecution';
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

export async function GET() {
  const gate = await requireRootActor('root.cognitive-runtime.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  return NextResponse.json({
    ok: true,
    runtime: await readObservedSfiCognitiveRuntime(),
    agents: SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.map(compactAgent),
    executionContracts: listExecutionContracts().map(compactExecutionContract),
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

  if (operation !== 'execute') {
    return NextResponse.json({ ok: false, error: 'unsupported_cognitive_operation' }, { status: 400 });
  }

  const result = await executeManualCognitiveAgent(body, {
    userId: gate.ctx.user.id,
    actorId: gate.ctx.user.id,
    tenantId: 'sfi',
    requestSource: 'ROOT_MANUAL',
    allowLegacyCompatibility: true,
  });
  return NextResponse.json(result.body, { status: result.status });
}
