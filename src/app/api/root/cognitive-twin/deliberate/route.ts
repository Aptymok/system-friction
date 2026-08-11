import { NextResponse } from 'next/server';
import { runLlmTask } from '@/lib/ai/providerRouter';
import { createCognitiveTwinEnvelope, evaluateCognitiveTwinAuthority } from '@/lib/cognitive-twin/contract';
import { syncSfiInstitutionalStateToCognitiveTwin } from '@/lib/cognitive-twin/institutionalIntegration';
import { auditRootAction, requireRootActor } from '@/lib/root/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Row = Record<string, unknown>;

function str(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export async function POST(request: Request) {
  const gate = await requireRootActor('cognitive_twin.deliberate');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const body = await request.json().catch(() => ({})) as Row;
  const question = str(body.question);
  if (!question) return NextResponse.json({ ok: false, error: 'question_required' }, { status: 400 });

  const startedAt = new Date().toISOString();
  const institutionalSync = await syncSfiInstitutionalStateToCognitiveTwin();
  const [decisions, memory] = await Promise.all([
    gate.ctx.service
      .from('sfi_cognitive_twin_decisions')
      .select('id,decision_id,situation,rejected_condition,correct_state,general_rule,required_evidence,evidence_refs,status,approved_by,approved_at,created_at')
      .eq('status', 'APPROVED')
      .order('approved_at', { ascending: false })
      .limit(50),
    gate.ctx.service
      .from('sfi_cognitive_twin_memory')
      .select('id,memory_key,memory_type,status,content,evidence_refs,source_kind,source_ref,created_at,updated_at')
      .in('status', ['VERIFIED', 'CANDIDATE'])
      .order('updated_at', { ascending: false })
      .limit(120),
  ]);

  const warnings = [
    decisions.error?.message,
    memory.error?.message,
    ...institutionalSync.sources.filter((item)=>item.warning).map((item)=>`${item.source}:${item.warning}`),
  ].filter((item): item is string => Boolean(item));
  const approvedDecisions = decisions.data ?? [];
  const institutionalMemory = memory.data ?? [];
  const evidencePresent = approvedDecisions.length > 0 || institutionalMemory.length > 0;
  const fallback = [
    'Cognitive Twin deliberation unavailable through an LLM provider.',
    `Question: ${question}`,
    `Approved founder decisions available: ${approvedDecisions.length}.`,
    `Institutional memory records available: ${institutionalMemory.length}.`,
    `SFI organs connected: ${institutionalSync.integration.summary.connected}/${institutionalSync.integration.summary.total}.`,
    `SFI organs exercised: ${institutionalSync.integration.summary.exercised}/${institutionalSync.integration.summary.total}.`,
    'No cognitive execution is declared. Review the underlying corpus manually.',
  ].join('\n');

  const llm = await runLlmTask({
    task: 'deep_report',
    system: [
      'You are the replaceable model execution layer of the System Friction Institute Cognitive Twin.',
      'Institutional memory, evidence, authority and the persistent subject exist outside you.',
      'Use only the supplied institutional corpus and SFI organ integration state.',
      'Treat ROOT Evidence, Observatory, Studio, Method Lab, Field and Governance as distinct organs with distinct epistemic classes.',
      'A Field observed return is experience, not automatically general causal proof.',
      'A Method Lab SIMULATED record remains SIMULATED.',
      'Separate OBSERVED, DERIVED, INFERRED, PROPOSED, SIMULATED and MISSING.',
      'Do not claim that a proposal is approved, verified, canonical, executed or published unless supplied evidence says so.',
      'When the corpus is insufficient, say exactly what organ/source is missing or unexercised.',
      'Return a concise answer with: institutional reading, organ/evidence basis, contradictions, missing evidence, one proposed next action, and what remains founder-reserved.',
    ].join(' '),
    prompt: JSON.stringify({
      question,
      sfiIntegration: institutionalSync.integration,
      syncSummary: institutionalSync.sources,
      approvedFounderDecisions: approvedDecisions,
      institutionalMemory,
      warnings,
    }),
    fallbackResult: fallback,
    maxTokens: 1600,
  });

  const authority = evaluateCognitiveTwinAuthority({
    action: 'propose',
    founderAbsent: false,
    evidencePresent,
  });
  const finishedAt = new Date().toISOString();
  const taskId = `cognitive-twin:deliberate:${Date.now()}`;
  const evidenceRefs = Array.from(new Set([
    ...approvedDecisions.flatMap((row) => Array.isArray(row.evidence_refs) ? row.evidence_refs.filter((item): item is string => typeof item === 'string') : []),
    ...institutionalMemory.flatMap((row) => Array.isArray(row.evidence_refs) ? row.evidence_refs.filter((item): item is string => typeof item === 'string') : []),
  ])).slice(0, 120);

  const envelope = createCognitiveTwinEnvelope({
    status: llm.ok ? 'PROPOSED' : 'REJECTED',
    taskId,
    modelId: `${llm.provider}:${llm.model}`,
    result: {
      question,
      answer: llm.result,
      authority,
      corpus: {
        approvedDecisions: approvedDecisions.length,
        memoryRecords: institutionalMemory.length,
        sfiOrgansConnected: institutionalSync.integration.summary.connected,
        sfiOrgansExercised: institutionalSync.integration.summary.exercised,
      },
      institutionalIntegration: institutionalSync.integration,
      provider: llm.provider,
      model: llm.model,
      providerExecutionSucceeded: llm.ok,
      latencyMs: llm.latency_ms,
    },
    limitations: [...warnings, ...llm.warnings, institutionalSync.integration.truthBoundary],
    missingEvidence: [
      ...(!evidencePresent ? ['approved_founder_decisions_or_institutional_memory'] : []),
      ...institutionalSync.integration.organs.filter((item)=>!item.connected).map((item)=>`organ_disconnected:${item.organ}`),
      ...institutionalSync.integration.organs.filter((item)=>item.connected && (item.observedRecords ?? 0) === 0).map((item)=>`organ_unexercised:${item.organ}`),
    ],
    actionsExecuted: [
      'sync_sfi_institutional_state',
      'read_approved_decisions',
      'read_institutional_memory',
      llm.ok ? 'llm_deliberation' : 'llm_deliberation_failed',
    ],
    recommendedTransition: !llm.ok ? 'BLOCKED' : evidencePresent ? 'VERIFYING' : 'EVIDENCE_PENDING',
  });

  const runStatus = !llm.ok ? 'BLOCKED' : evidencePresent ? 'READY' : 'EVIDENCE_PENDING';
  const persisted = await gate.ctx.service
    .from('sfi_cognitive_twin_runs')
    .insert({
      task_id: taskId,
      contract_version: envelope.contractVersion,
      provider: llm.provider,
      model: llm.model,
      role: 'cognitive_twin_deliberation',
      status: runStatus,
      objective: question,
      input_snapshot: {
        question,
        approvedDecisionCount: approvedDecisions.length,
        memoryCount: institutionalMemory.length,
        sfiIntegration: institutionalSync.integration.summary,
        requestedBy: gate.ctx.user.id,
        providerExecutionSucceeded: llm.ok,
      },
      output_envelope: envelope,
      evidence_refs: evidenceRefs,
      limitations: envelope.limitations,
      started_at: startedAt,
      finished_at: finishedAt,
    })
    .select('id,task_id,status,provider,model,role,objective,input_snapshot,output_envelope,evidence_refs,limitations,created_at')
    .single();

  if (persisted.error) {
    return NextResponse.json({ ok: false, error: 'cognitive_twin_run_persistence_failed', details: persisted.error.message, envelope }, { status: 500 });
  }

  const audit = await auditRootAction({
    actorId: gate.ctx.user.id,
    action: 'cognitive_twin.deliberate',
    target: taskId,
    payload: {
      runId: persisted.data.id,
      runStatus,
      provider: llm.provider,
      model: llm.model,
      providerExecutionSucceeded: llm.ok,
      authorityDecision: authority.decision,
      evidenceRefs: evidenceRefs.length,
      sfiOrgansConnected: institutionalSync.integration.summary.connected,
      sfiOrgansExercised: institutionalSync.integration.summary.exercised,
    },
    request,
  });
  if (!audit.ok) return NextResponse.json(audit, { status: 500 });

  return NextResponse.json({
    ok: llm.ok,
    cognitiveExecution: llm.ok ? 'EXECUTED' : 'DEGRADED',
    institutionalSync,
    run: persisted.data,
    envelope,
    audit,
  }, { status: llm.ok ? 200 : 503 });
}
