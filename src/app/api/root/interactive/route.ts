import { NextResponse } from 'next/server';
import { requireRootViewer } from '@/lib/root/server';
import { readRootOperationalNext } from '@/lib/root/operationalNext';
import {
  readInteractiveCaseIndex,
  readInteractiveEvidenceTargetIndex,
} from '@/lib/root/interactiveReadModel';
import { readUniversalLearningQuarantine } from '@/lib/sfi/universalLearningQuarantine';
import { SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY } from '@/lib/sfi/cognitive-runtime/convergedRegistry';
import {
  compactExecutionContract,
  listExecutionContracts,
} from '@/lib/sfi/cognitive-runtime/executionContracts';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SURFACES = new Set(['root', 'cases', 'twin', 'governance']);

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
  const gate = await requireRootViewer('root.interactive.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const surface = new URL(request.url).searchParams.get('surface')?.trim().toLowerCase() ?? 'root';
  if (!SURFACES.has(surface)) return NextResponse.json({ ok: false, error: 'unsupported_interactive_surface' }, { status: 400 });

  if (surface === 'governance') {
    const [evidence, caseIndex, operationalNext] = await Promise.all([
      readInteractiveEvidenceTargetIndex(),
      readInteractiveCaseIndex(gate.ctx.user.id),
      readRootOperationalNext(),
    ]);
    return NextResponse.json({
      ok: true,
      surface,
      runtime: {
        agents: SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.map(compactAgent),
        executionContracts: listExecutionContracts().map(compactExecutionContract),
      },
      evidence: { evidence },
      caseIndex,
      operationalNext,
      readPlan: {
        authGates: 1,
        duplicateBaseHttpReads: 0,
        proposalQueueSource: 'operationalNext.items',
        separateProposalListRead: false,
        fullRootConsoleRead: false,
        liveCognitiveEventRead: false,
        agentEventReadDeferredToSelectedDossier: true,
      },
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  }

  if (surface === 'twin') {
    const [operationalNext, learning] = await Promise.all([
      readRootOperationalNext(),
      readUniversalLearningQuarantine(),
    ]);
    return NextResponse.json({
      ok: true,
      surface,
      operationalNext,
      learning,
      readPlan: { authGates: 1, duplicateBaseHttpReads: 0 },
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  }

  const [operationalNext, caseIndex] = await Promise.all([
    readRootOperationalNext(),
    readInteractiveCaseIndex(gate.ctx.user.id),
  ]);
  return NextResponse.json({
    ok: true,
    surface,
    operationalNext,
    caseIndex,
    readPlan: { authGates: 1, duplicateBaseHttpReads: 0 },
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}
