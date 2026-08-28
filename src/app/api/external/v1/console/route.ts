import { NextResponse } from 'next/server';
import { authorizeExternalRequest, externalActor, externalAuthError } from '@/lib/sfi/externalAuth';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { readMethodLabState } from '@/lib/method-lab/readModel';
import { readRootReportHealth, readRootReportInbox } from '@/lib/reports/rootReportInbox';
import { SFI_AGENTIC_CAPABILITIES } from '@/lib/sfi/agenticCapabilityRegistry';
import { SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY } from '@/lib/sfi/cognitive-runtime/convergedRegistry';
import { readUniversalOpenCycles } from '@/lib/sfi/universalSignalCycle';
import { readUniversalLearningQuarantine } from '@/lib/sfi/universalLearningQuarantine';
import { getLatestWorldSpectSnapshot } from '@/lib/worldspect/snapshotStore';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

type Row = Record<string, unknown>;
const rows = (value: unknown): Row[] => Array.isArray(value)
  ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
  : [];

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

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

function studioScopeHint(item: Row) {
  const metadata = record(item.metadata);
  const transfer = record(metadata.operationalOwnershipTransfer);
  if (typeof transfer.scope === 'string' && transfer.scope.trim()) {
    return { value: transfer.scope.trim(), source: 'declared_ownership_transfer' };
  }

  const title = String(item.title ?? '');
  if (/REM\s*618/i.test(title)) return { value: 'REM618', source: 'title_hint' };
  if (/(^|\D)111(\D|$)/i.test(title)) return { value: '111', source: 'title_hint' };
  return { value: null, source: null };
}

export async function GET(req: Request) {
  const auth = authorizeExternalRequest(req, 'observe');
  const credential = auth.credential;
  if (!credential) return NextResponse.json(externalAuthError(auth, 'observe'), { status: 401 });
  const actorId = externalActor(credential);
  const db = createServiceSupabaseClient();

  const ownedStudioQuery = credential.subjectId
    ? db.from('studio_objects')
      .select('id,title,object_type,status,metadata,updated_at')
      .eq('owner_id', credential.subjectId)
      .order('updated_at', { ascending: false })
      .limit(25)
    : Promise.resolve({ data: [], error: null });

  const [lab, reportInbox, proposals, evidence, twinRuns, twinEvaluations, labRuns, openCycles, learningQuarantine, worldSnapshot, ownedStudio] = await Promise.all([
    readMethodLabState(),
    readRootReportInbox(12),
    db.from('action_proposals').select('id,title,status,risk_level,approval_required,created_at,approved_at,executed_at').order('created_at', { ascending: false }).limit(8),
    db.from('root_evidence_entries').select('id,title,evidence_type,epistemic_event_id,created_at').order('created_at', { ascending: false }).limit(8),
    db.from('sfi_cognitive_twin_runs').select('id,task_id,role,status,objective,provider,model,started_at,finished_at,created_at').order('created_at', { ascending: false }).limit(5),
    db.from('sfi_cognitive_twin_evaluations').select('id,provider,model,test_key,outcome,executed_at,executor').order('executed_at', { ascending: false }).limit(5),
    db.from('sfi_lab_analyses').select('id,mode,data_mode,created_at,raw_analysis').order('created_at', { ascending: false }).limit(5),
    readUniversalOpenCycles(12),
    readUniversalLearningQuarantine(80),
    getLatestWorldSpectSnapshot(),
    ownedStudioQuery,
  ]);

  const reportHealth = await readRootReportHealth(reportInbox);
  const warnings = [
    proposals.error ? `action_proposals:${proposals.error.message}` : null,
    evidence.error ? `root_evidence_entries:${evidence.error.message}` : null,
    twinRuns.error ? `sfi_cognitive_twin_runs:${twinRuns.error.message}` : null,
    twinEvaluations.error ? `sfi_cognitive_twin_evaluations:${twinEvaluations.error.message}` : null,
    labRuns.error ? `sfi_lab_analyses:${labRuns.error.message}` : null,
    ownedStudio.error ? `studio_objects:${ownedStudio.error.message}` : null,
    ...lab.warnings,
    ...reportInbox.warnings,
    ...openCycles.warnings,
    ...(!learningQuarantine.ok ? learningQuarantine.warnings.map((warning) => `learning_quarantine:${warning}`) : []),
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
  const ownedStudioObjects = rows(ownedStudio.data).map((item) => {
    const scope = studioScopeHint(item);
    return {
      objectId: item.id ?? null,
      title: item.title ?? null,
      objectType: item.object_type ?? null,
      status: item.status ?? null,
      scopeHint: scope.value,
      scopeHintSource: scope.source,
      updatedAt: item.updated_at ?? null,
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
      purpose: 'Compact governed machine console. Detailed state is retrieved through the dedicated external surfaces.',
      world: worldSummary(worldSnapshot as unknown as Row | null),
      openCycles: {
        universalCount: openCycles.universal.length,
        universal: openCycles.universal.slice(0, 8),
        worldHypothesisCount: Array.isArray(openCycles.worldHypotheses) ? openCycles.worldHypotheses.length : 0,
        pendingGovernanceCount: openCycles.pendingProposals.length,
      },
      learning: {
        quarantine: learningQuarantine.ok ? learningQuarantine.summary : null,
        admissionEvent: 'SFI_UNIVERSAL_LEARNING_PROMOTED',
        rule: 'Closed/completed cycles remain outside institutional learning until calibrated return and ROOT-governed promotion.',
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
      ownedStudio: {
        ownershipBoundary: 'studio_objects.owner_id == OAuth subjectId',
        count: ownedStudioObjects.length,
        objects: ownedStudioObjects,
      },
      agenticCapabilities: SFI_AGENTIC_CAPABILITIES.map((capability) => ({ id: capability.id, layer: capability.layer, route: capability.route, approvalRequired: capability.approvalRequired })),
      detailSurfaces: {
        bootstrap: '/api/external/v1/bootstrap',
        signal: '/api/external/v1/signal',
        observe: '/api/external/v1/observe',
        lab: '/api/external/v1/lab',
        manifest: '/api/external/v1/manifest',
      },
    },
    warnings,
    epistemicBoundary: 'This console reports compact persisted operational state. Learning counts are lifecycle state, not truth claims. OAuth principals receive only the Studio object index whose owner_id equals their authenticated subjectId; raw media is not exposed here.',
  });
}
