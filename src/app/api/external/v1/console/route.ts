import { NextResponse } from 'next/server';
import { authorizeExternalRequest, externalActor, externalAuthError } from '@/lib/sfi/externalAuth';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { readMethodLabState } from '@/lib/method-lab/readModel';
import { readRootReportHealth, readRootReportInbox } from '@/lib/reports/rootReportInbox';
import { SFI_AGENTIC_CAPABILITIES } from '@/lib/sfi/agenticCapabilityRegistry';
import { SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY } from '@/lib/sfi/cognitive-runtime/convergedRegistry';
import { readUniversalOpenCycles } from '@/lib/sfi/universalSignalCycle';
import { getLatestWorldSpectSnapshot } from '@/lib/worldspect/snapshotStore';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

type Row = Record<string, unknown>;
const rows = (value: unknown): Row[] => Array.isArray(value)
  ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
  : [];

function worldSummary(snapshot: Row | null) {
  if (!snapshot) return null;
  return {
    id: snapshot.id ?? null,
    observedAt: snapshot.observed_at ?? snapshot.observedAt ?? null,
    createdAt: snapshot.created_at ?? snapshot.createdAt ?? null,
    snapshotHash: snapshot.snapshot_hash ?? snapshot.snapshotHash ?? null,
    sourceState: snapshot.source_state ?? snapshot.sourceState ?? null,
    confidence: snapshot.confidence ?? null,
    wsi: snapshot.wsi ?? null,
    nti: snapshot.nti ?? null,
  };
}

export async function GET(req: Request) {
  const auth = authorizeExternalRequest(req, 'observe');
  const credential = auth.credential;
  if (!credential) return NextResponse.json(externalAuthError(auth, 'observe'), { status: 401 });
  const actorId = externalActor(credential);
  const db = createServiceSupabaseClient();

  const [lab, reportInbox, proposals, evidence, twinRuns, twinEvaluations, labRuns, openCycles, worldSnapshot] = await Promise.all([
    readMethodLabState(),
    readRootReportInbox(12),
    db.from('action_proposals').select('id,title,status,risk_level,approval_required,created_at,approved_at,executed_at').order('created_at', { ascending: false }).limit(8),
    db.from('root_evidence_entries').select('id,title,evidence_type,epistemic_event_id,created_at').order('created_at', { ascending: false }).limit(8),
    db.from('sfi_cognitive_twin_runs').select('id,task_id,role,status,objective,provider,model,started_at,finished_at,created_at').order('created_at', { ascending: false }).limit(5),
    db.from('sfi_cognitive_twin_evaluations').select('id,provider,model,test_key,outcome,executed_at,executor').order('executed_at', { ascending: false }).limit(5),
    db.from('sfi_lab_analyses').select('id,mode,data_mode,created_at,raw_analysis').order('created_at', { ascending: false }).limit(5),
    readUniversalOpenCycles(12),
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
    const raw = item.raw_analysis && typeof item.raw_analysis === 'object' && !Array.isArray(item.raw_analysis) ? item.raw_analysis as Row : {};
    return {
      id: item.id ?? null,
      protocolId: item.mode ?? null,
      epistemicClass: raw.epistemicClass ?? item.data_mode ?? null,
      validationLevel: raw.validationLevel ?? null,
      resultHash: raw.resultHash ?? raw.inputHash ?? null,
      evidenceRefs: Array.isArray(raw.evidenceRefs) ? raw.evidenceRefs.slice(0, 8) : [],
      createdAt: item.created_at ?? null,
    };
  });

  const proposalRows = rows(proposals.data);
  const pendingGovernance = proposalRows.filter((item) => !['accepted', 'rejected', 'superseded'].includes(String(item.status ?? '').toLowerCase()));

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
      purpose: 'Compact governed machine console. Detailed state is retrieved through the dedicated external surfaces.',
      world: worldSummary(worldSnapshot as unknown as Row | null),
      openCycles: {
        universalCount: openCycles.universal.length,
        universal: openCycles.universal.slice(0, 8),
        worldHypothesisCount: Array.isArray(openCycles.worldHypotheses) ? openCycles.worldHypotheses.length : 0,
        pendingGovernanceCount: openCycles.pendingProposals.length,
      },
      lab: {
        status: (lab as unknown as Row).status ?? null,
        generatedAt: (lab as unknown as Row).generatedAt ?? null,
        protocolCount: Array.isArray((lab as unknown as Row).protocols) ? ((lab as unknown as Row).protocols as unknown[]).length : null,
        warningCount: lab.warnings.length,
      },
      reports: { health: reportHealth, recent: reportInbox.items.slice(0, 5) },
      cognitiveTwin: { recentRuns: twinRuns.data ?? [], recentEvaluations: twinEvaluations.data ?? [] },
      cognitiveRuntime: {
        count: SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.length,
        agents: SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.map((agent) => ({ id: agent.id, layer: agent.layer, domain: agent.domain, authorityLevel: agent.authorityLevel })),
      },
      governance: { proposals: proposalRows.slice(0, 8), pendingCount: pendingGovernance.length },
      evidence: { recent: evidence.data ?? [] },
      methodLabRuns: recentLabRuns,
      agenticCapabilities: SFI_AGENTIC_CAPABILITIES.map((capability) => ({ id: capability.id, layer: capability.layer, route: capability.route, approvalRequired: capability.approvalRequired })),
      detailSurfaces: {
        signal: '/api/external/v1/signal',
        observe: '/api/external/v1/observe',
        lab: '/api/external/v1/lab',
        manifest: '/api/external/v1/manifest',
      },
    },
    warnings,
    epistemicBoundary: 'This console reports compact persisted operational state. Use dedicated surfaces for detailed evidence and histories.',
  });
}
