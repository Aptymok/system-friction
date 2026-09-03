import { NextResponse } from 'next/server';
import { requireRootViewer } from '@/lib/root/server';
import { SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY } from '@/lib/sfi/cognitive-runtime/convergedRegistry';
import {
  compactExecutionContract,
  executionContractForAgent,
} from '@/lib/sfi/cognitive-runtime/executionContracts';
import {
  readAgentExecutionStates,
  readExecutionRecords,
} from '@/lib/sfi/cognitive-runtime/executionRecords';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Row = Record<string, unknown>;

function text(value: unknown, max = 500) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
}

function number(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function compactPassport(agent: (typeof SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY)[number]) {
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
    writes: agent.writesMemory,
    emits: agent.emits,
  };
}

export async function GET(request: Request) {
  const gate = await requireRootViewer('root.cognitive-runtime.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const url = new URL(request.url);
  const agentId = text(url.searchParams.get('agentId'), 120);
  const executionId = text(url.searchParams.get('executionId'), 500);
  const limit = Math.max(1, Math.min(200, number(url.searchParams.get('limit'), 80)));

  if (!agentId) return NextResponse.json({ ok: false, error: 'agent_required' }, { status: 400 });

  const agent = SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.find((item) => item.id === agentId);
  if (!agent) return NextResponse.json({ ok: false, error: 'agent_not_found' }, { status: 404 });

  const contract = executionContractForAgent(agentId);
  if (!contract) return NextResponse.json({ ok: false, error: 'execution_contract_not_found' }, { status: 409 });

  const [stateRead, history] = await Promise.all([
    readAgentExecutionStates(),
    readExecutionRecords({ agentId, executionId: executionId ?? undefined, limit }),
  ]);
  const state = stateRead.states.find((item) => item.agentId === agentId) ?? null;

  return NextResponse.json({
    ok: true,
    passport: compactPassport(agent),
    contract: compactExecutionContract(contract),
    state,
    history: history.records,
    historyRead: {
      generatedAt: history.generatedAt,
      source: history.source,
      readLimit: history.readLimit,
      exhaustive: history.exhaustive,
      warnings: history.warnings,
    },
    boundary: {
      auditUnit: 'EXECUTION',
      contextIsEvidence: false,
      inferenceIsObservation: false,
      authorityExpandedByModel: false,
      historyAbsenceMeansNonExistence: false,
    } satisfies Row,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
