import { NextResponse } from 'next/server';
import { authorizeExternalRequest, externalActor, externalAuthError } from '@/lib/sfi/externalAuth';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { readMethodLabState } from '@/lib/method-lab/readModel';
import { readRootReportHealth, readRootReportInbox } from '@/lib/reports/rootReportInbox';
import { SFI_AGENTIC_CAPABILITIES } from '@/lib/sfi/agenticCapabilityRegistry';
import { SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY } from '@/lib/sfi/cognitive-runtime/convergedRegistry';
import { readUniversalOpenCycles } from '@/lib/sfi/universalSignalCycle';
import { getLatestWorldSpectSnapshot, snapshotRowToApiData } from '@/lib/worldspect/snapshotStore';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

type Row = Record<string, unknown>;

function rows(value: unknown): Row[] {
  return Array.isArray(value)
    ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    : [];
}

export async function GET(req: Request) {
  const auth = authorizeExternalRequest(req, 'observe');
  const credential = auth.credential;
  if (!credential) return NextResponse.json(externalAuthError(auth, 'observe'), { status: 401 });
  const actorId = externalActor(credential);

  const db = createServiceSupabaseClient();
  const [
    lab,
    reportInbox,
    proposals,
    evidence,
    twinRuns,
    twinEvaluations,
    labRuns,
    openCycles,
    worldSnapshot,
  ] = await Promise.all([
    readMethodLabState(),
    readRootReportInbox(60),
    db.from('action_proposals')
      .select('id,title,status,risk_level,approval_required,created_at,approved_at,executed_at')
      .order('created_at', { ascending: false })
      .limit(30),
    db.from('root_evidence_entries')
      .select('id,title,evidence_type,epistemic_event_id,created_at')
      .order('created_at', { ascending: false })
      .limit(30),
    db.from('sfi_cognitive_twin_runs')
      .select('id,task_id,role,status,objective,provider,model,evidence_refs,started_at,finished_at,created_at')
      .order('created_at', { ascending: false })
      .limit(30),
    db.from('sfi_cognitive_twin_evaluations')
      .select('id,provider,model,test_key,test_version,outcome,evidence_refs,executed_at,executor')
      .order('executed_at', { ascending: false })
      .limit(30),
    db.from('sfi_lab_analyses')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30),
    readUniversalOpenCycles(60),
    getLatestWorldSpectSnapshot(),
  ]);

  const reportHealth = await readRootReportHealth(reportInbox);
  const warnings = [
    proposals.error ? `action_proposals:${proposals.error.message}` : null,
    evidence.error ? `root_evidence_entries:${evidence.error.message}` : null,
    twinRuns.error ? `sfi_cognitive_twin_runs:${twinRuns.error.message}` : null,
    twinEvaluations.error ? `sfi_cognitive_twin_evaluations:${twinEvaluations.error.message}` : null,
    labRuns.error ? `sfi_lab_analyses:${labRuns.error.message}` : null,
    ...lab.warnings,
    ...reportInbox.warnings,
    ...openCycles.warnings,
    worldSnapshot ? null : 'worldspect_snapshots:latest_snapshot_missing',
  ].filter((value): value is string => Boolean(value));

  const recentLabRuns = rows(labRuns.data).map((item) => {
    const raw = item.raw_analysis && typeof item.raw_analysis === 'object' && !Array.isArray(item.raw_analysis)
      ? item.raw_analysis as Row
      : {};
    return {
      id: item.id ?? null,
      protocolId: item.mode ?? null,
      epistemicClass: raw.epistemicClass ?? item.data_mode ?? null,
      validationLevel: raw.validationLevel ?? null,
      resultHash: raw.resultHash ?? raw.inputHash ?? null,
      evidenceRefs: raw.evidenceRefs ?? [],
      createdAt: item.created_at ?? null,
    };
  });

  return NextResponse.json({
    ok: warnings.length === 0,
    generatedAt: new Date().toISOString(),
    principal: {
      actorId,
      subjectId: credential.subjectId ?? null,
      label: credential.label ?? null,
      role: credential.role ?? 'agent',
      tenantId: credential.tenantId ?? 'sfi',
      scopes: credential.scopes ?? [],
      authMethod: credential.authMethod ?? 'static_token',
    },
    console: {
      purpose: 'Governed machine console for current SFI state. Read-only through this operation; writes remain separate governed operations.',
      world: worldSnapshot ? snapshotRowToApiData(worldSnapshot) : null,
      openCycles: {
        universal: openCycles.universal,
        worldHypotheses: openCycles.worldHypotheses,
        pendingGovernanceProposals: openCycles.pendingProposals,
      },
      universalSignalGateway: {
        path: '/api/external/v1/signal',
        contract: 'SFI-UNIVERSAL-SIGNAL-1.0',
        cycleContract: 'SFI-UNIVERSAL-REASONING-CYCLE-1.0',
        operations: ['status', 'intake', 'run', 'return', 'close'],
      },
      lab,
      reports: {
        health: reportHealth,
        recent: reportInbox.items.slice(0, 20),
      },
      cognitiveTwin: {
        recentRuns: twinRuns.data ?? [],
        recentEvaluations: twinEvaluations.data ?? [],
      },
      cognitiveRuntime: {
        count: SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.length,
        agents: SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.map((agent) => ({
          id: agent.id,
          name: agent.name,
          purpose: agent.purpose,
          domain: agent.domain,
          layer: agent.layer,
          authorityLevel: agent.authorityLevel,
          simulationAllowed: agent.simulationAllowed,
          humanApprovalRequired: agent.humanApprovalRequired,
          sourceTables: agent.sourceTables,
        })),
      },
      governance: {
        proposals: proposals.data ?? [],
        pendingCount: rows(proposals.data).filter((item) => !['accepted', 'rejected', 'superseded'].includes(String(item.status ?? '').toLowerCase())).length,
      },
      evidence: {
        recent: evidence.data ?? [],
      },
      methodLabRuns: recentLabRuns,
      agenticCapabilities: SFI_AGENTIC_CAPABILITIES.map((capability) => ({
        id: capability.id,
        name: capability.name,
        purpose: capability.purpose,
        layer: capability.layer,
        route: capability.route,
        approvalRequired: capability.approvalRequired,
        reads: capability.reads,
        writes: capability.writes,
        executes: capability.executes,
      })),
    },
    warnings,
    epistemicBoundary: 'This console reports persisted operational state. SIMULATED, DERIVED, INFERRED and PROJECTED objects do not become OBSERVED or canonical by being returned here.',
  });
}
