import { NextResponse } from 'next/server';
import { requireRootViewer } from '@/lib/root/server';
import { readInteractiveOperationalNext } from '@/lib/root/interactiveOperationalNext';
import { readInteractiveReportApprovals } from '@/lib/root/interactiveReportApprovals';
import { projectActionableHumanQueue } from '@/lib/root/actionableHumanQueue';
import {
  readInteractiveCaseIndex,
  readInteractiveEvidenceTargetIndex,
} from '@/lib/root/interactiveReadModel';
import { readInteractiveCaseDossier, readInteractiveCycleDossier } from '@/lib/root/interactiveDossiers';
import { readRootCognitiveSpineStatus } from '@/lib/root/cognitiveSpineStatus';
import { readVisibleLogbookEntries } from '@/lib/logbook/query';
import { readUniversalLearningQuarantine } from '@/lib/sfi/universalLearningQuarantine';
import { readObservedSfiCognitiveRuntime } from '@/lib/sfi/cognitive-runtime/observedRuntime';
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
    const [evidence, caseIndex, rawOperationalNext] = await Promise.all([
      readInteractiveEvidenceTargetIndex(),
      readInteractiveCaseIndex(gate.ctx.user.id),
      readInteractiveOperationalNext(),
    ]);
    const operationalNext = projectActionableHumanQueue(rawOperationalNext as Record<string, any>);
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
    const authority = gate.ctx.isRoot ? 'root' as const : 'observer' as const;
    const [rawOperationalNext, learning, spineStatus, observedRuntime, logbook] = await Promise.all([
      readInteractiveOperationalNext(),
      readUniversalLearningQuarantine(),
      readRootCognitiveSpineStatus(),
      readObservedSfiCognitiveRuntime(),
      gate.ctx.isRoot
        ? readVisibleLogbookEntries({ user_id: gate.ctx.user.id, role: 'root', email: gate.ctx.user.email ?? null }, { scope: 'all' })
        : Promise.resolve([]),
    ]);
    const operationalNext = projectActionableHumanQueue(rawOperationalNext as Record<string, any>);
    return NextResponse.json({
      ok: true,
      surface,
      authority,
      operationalNext,
      learning,
      twinProjection: {
        spine: { ok: true, status: spineStatus },
        runtime: { ok: true, runtime: observedRuntime },
        logbook: { ok: true, entries: logbook },
      },
      readPlan: {
        authGates: 1,
        duplicateBaseHttpReads: 0,
        operationalNPlusOneReads: 0,
        nestedTwinHttpReads: 0,
        nestedTwinPollingLoops: 0,
        spineStatusReads: 1,
        observedRuntimeReads: 1,
        logbookReads: gate.ctx.isRoot ? 1 : 0,
      },
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  }

  if (surface === 'root') {
    const [rawOperationalNext, caseIndex, reportApprovals] = await Promise.all([
      readInteractiveOperationalNext(),
      readInteractiveCaseIndex(gate.ctx.user.id),
      readInteractiveReportApprovals(),
    ]);
    const raw = rawOperationalNext as Record<string, any>;
    const operationalNext = projectActionableHumanQueue({
      ...raw,
      reports: reportApprovals.items,
      warnings: [
        ...(Array.isArray(raw.warnings) ? raw.warnings : []),
        reportApprovals.warning,
      ].filter(Boolean),
    });
    return NextResponse.json({
      ok: true,
      surface,
      operationalNext,
      caseIndex,
      readPlan: {
        authGates: 1,
        duplicateBaseHttpReads: 0,
        operationalNPlusOneReads: 0,
        actionableHumanProjection: true,
        reportApprovalReads: 1,
        reportApprovalNPlusOneReads: 0,
        reportApprovalSource: 'sfi_cognitive_twin_runs.report_agent',
      },
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  }

  const [rawOperationalNext, caseIndex] = await Promise.all([
    readInteractiveOperationalNext(),
    readInteractiveCaseIndex(gate.ctx.user.id),
  ]);
  const operationalNext = projectActionableHumanQueue(rawOperationalNext as Record<string, any>);
  return NextResponse.json({
    ok: true,
    surface,
    operationalNext,
    caseIndex,
    readPlan: { authGates: 1, duplicateBaseHttpReads: 0, operationalNPlusOneReads: 0, actionableHumanProjection: true },
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}
