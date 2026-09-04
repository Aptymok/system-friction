import { NextResponse } from 'next/server';
import { requireRootViewer } from '@/lib/root/server';
import { readInteractiveOperationalNext } from '@/lib/root/interactiveOperationalNext';
import {
  readInteractiveCaseIndex,
  readInteractiveEvidenceTargetIndex,
} from '@/lib/root/interactiveReadModel';
import { readInteractiveCaseDossier, readInteractiveCycleDossier } from '@/lib/root/interactiveDossiers';
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

  const url = new URL(request.url);
  const surface = url.searchParams.get('surface')?.trim().toLowerCase() ?? 'root';
  if (!SURFACES.has(surface)) return NextResponse.json({ ok: false, error: 'unsupported_interactive_surface' }, { status: 400 });

  const caseId = url.searchParams.get('caseId')?.trim() || null;
  const cycleId = url.searchParams.get('cycleId')?.trim() || null;
  if (caseId && cycleId) return NextResponse.json({ ok: false, error: 'one_dossier_target_only' }, { status: 400 });
  if (caseId) {
    try {
      return NextResponse.json({
        ok: true,
        surface: 'cases',
        kind: 'CASE_DOSSIER',
        dossier: await readInteractiveCaseDossier(caseId),
        readPlan: { authGates: 1, duplicateHttpReads: 0, duplicateCaseReads: 0 },
      }, { headers: { 'Cache-Control': 'private, no-store' } });
    } catch (error) {
      return NextResponse.json({ ok: false, error: 'interactive_case_dossier_unavailable', details: error instanceof Error ? error.message : String(error) }, { status: 503 });
    }
  }
  if (cycleId) {
    try {
      return NextResponse.json({
        ok: true,
        surface: 'cases',
        kind: 'CYCLE_DOSSIER',
        dossier: await readInteractiveCycleDossier(cycleId),
        readPlan: { authGates: 1, duplicateHttpReads: 0, fullWorkboardReads: 0 },
      }, { headers: { 'Cache-Control': 'private, no-store' } });
    } catch (error) {
      return NextResponse.json({ ok: false, error: 'interactive_cycle_dossier_unavailable', details: error instanceof Error ? error.message : String(error) }, { status: 503 });
    }
  }

  if (surface === 'governance') {
    const [evidence, caseIndex, operationalNext] = await Promise.all([
      readInteractiveEvidenceTargetIndex(),
      readInteractiveCaseIndex(gate.ctx.user.id),
      readInteractiveOperationalNext(),
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
        operationalNPlusOneReads: 0,
      },
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  }

  if (surface === 'twin') {
    const [operationalNext, learning] = await Promise.all([
      readInteractiveOperationalNext(),
      readUniversalLearningQuarantine(),
    ]);
    return NextResponse.json({
      ok: true,
      surface,
      operationalNext,
      learning,
      readPlan: { authGates: 1, duplicateBaseHttpReads: 0, operationalNPlusOneReads: 0 },
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  }

  const [operationalNext, caseIndex] = await Promise.all([
    readInteractiveOperationalNext(),
    readInteractiveCaseIndex(gate.ctx.user.id),
  ]);
  return NextResponse.json({
    ok: true,
    surface,
    operationalNext,
    caseIndex,
    readPlan: { authGates: 1, duplicateBaseHttpReads: 0, operationalNPlusOneReads: 0 },
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}
