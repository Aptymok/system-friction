import 'server-only';

import { createHash } from 'node:crypto';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { runStudioCognitiveRuntime } from './studioCognitiveRuntime';

export const STUDIO_MASTER_ANALYSIS_MIN_PASSES = 2;
export const STUDIO_MASTER_ANALYSIS_MAX_PASSES = 3;

type CognitiveRun = Awaited<ReturnType<typeof runStudioCognitiveRuntime>>;
type SuccessfulRun = Extract<CognitiveRun, { ok: true }>;

export type StudioMasterAnalysisPass = {
  pass: number;
  startedAt: string;
  finishedAt: string;
  structuralFingerprint: string;
  productionStatus: string;
  identityStatus: string;
  blockers: string[];
  findings: number;
  inconsistencies: number;
  agents: string[];
  provider: string | null;
  model: string | null;
  evidenceId: string | null;
};

function canonicalText(value: string | null | undefined) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function structuralFingerprint(run: SuccessfulRun) {
  const basis = {
    production: run.result.production.status,
    blockers: [...run.result.production.blockers].map(canonicalText).sort(),
    identity: run.result.identity.status,
    inconsistencies: run.result.inconsistencies.map((item) => ({
      severity: item.severity,
      statement: canonicalText(item.statement),
    })).sort((a, b) => `${a.severity}:${a.statement}`.localeCompare(`${b.severity}:${b.statement}`)),
    findings: run.result.findings.map((item) => canonicalText(item.statement)).sort(),
    changes: run.result.changes.map((item) => ({
      label: canonicalText(item.label),
      before: item.before,
      after: item.after,
    })).sort((a, b) => a.label.localeCompare(b.label)),
    ejector: {
      direction: [...run.result.ejector.direction].map(canonicalText).sort(),
      horizon: canonicalText(run.result.ejector.horizon),
    },
  };
  return createHash('sha256').update(JSON.stringify(basis)).digest('hex');
}

function passSummary(pass: number, startedAt: string, finishedAt: string, run: SuccessfulRun, fingerprint: string): StudioMasterAnalysisPass {
  return {
    pass,
    startedAt,
    finishedAt,
    structuralFingerprint: fingerprint,
    productionStatus: run.result.production.status,
    identityStatus: run.result.identity.status,
    blockers: run.result.production.blockers,
    findings: run.result.findings.length,
    inconsistencies: run.result.inconsistencies.length,
    agents: run.agents.executed,
    provider: run.llm.provider,
    model: run.llm.model,
    evidenceId: run.twin.evidenceId,
  };
}

/**
 * Finite re-observation loop for a completed Studio master.
 *
 * It always performs two cognitive passes so the second pass can revisit the same
 * persisted object/session after the first analytical trace exists. A third pass is
 * permitted only when the structural result changed. The loop never sleeps, polls,
 * waits for external state, recurses, or exceeds the explicit pass budget.
 */
export async function runStudioMasterAnalysisLoop(input: { ownerId: string; objectId: string }) {
  const passes: StudioMasterAnalysisPass[] = [];
  let previousFingerprint: string | null = null;
  let finalRun: SuccessfulRun | null = null;
  let convergence: 'STRUCTURAL_STATE_STABLE' | 'MAX_PASSES_REACHED' = 'MAX_PASSES_REACHED';

  for (let pass = 1; pass <= STUDIO_MASTER_ANALYSIS_MAX_PASSES; pass += 1) {
    const startedAt = new Date().toISOString();
    const run = await runStudioCognitiveRuntime({ ownerId: input.ownerId, objectId: input.objectId, action: 'analyze' });
    const finishedAt = new Date().toISOString();
    if (!run.ok) return run;

    finalRun = run;
    const fingerprint = structuralFingerprint(run);
    passes.push(passSummary(pass, startedAt, finishedAt, run, fingerprint));

    if (pass >= STUDIO_MASTER_ANALYSIS_MIN_PASSES && previousFingerprint === fingerprint) {
      convergence = 'STRUCTURAL_STATE_STABLE';
      break;
    }
    previousFingerprint = fingerprint;
  }

  if (!finalRun) return { ok: false as const, status: 500, error: 'MASTER_ANALYSIS_DID_NOT_EXECUTE' };

  const db = createServiceSupabaseClient();
  const completedAt = new Date().toISOString();
  const summaryPayload = {
    observedAt: completedAt,
    finite: true,
    minPasses: STUDIO_MASTER_ANALYSIS_MIN_PASSES,
    maxPasses: STUDIO_MASTER_ANALYSIS_MAX_PASSES,
    passCount: passes.length,
    convergence,
    passes,
    finalEvidenceId: finalRun.twin.evidenceId,
    rule: 'Re-observe until the structural analytical state stabilizes, but never exceed the finite pass budget.',
  };

  const trace = await db.from('studio_evidence_traces').insert({
    object_id: input.objectId,
    owner_id: input.ownerId,
    source: 'studio_master_analysis_loop_v1',
    label: `Master analysis loop · ${convergence}`,
    payload: summaryPayload,
  }).select('id').single();

  await db.from('studio_archive_events').insert({
    session_id: finalRun.sessionId,
    object_id: input.objectId,
    owner_id: input.ownerId,
    event_type: 'MASTER_ANALYSIS_LOOP_COMPLETED',
    label: `Master analysis · ${passes.length} passes · ${convergence}`,
    source: 'studio_master_analysis_loop_v1',
    payload: { ...summaryPayload, evidenceId: trace.data?.id ?? null },
  });

  return {
    ok: true as const,
    status: 201,
    objectId: input.objectId,
    sessionId: finalRun.sessionId,
    finite: true as const,
    minPasses: STUDIO_MASTER_ANALYSIS_MIN_PASSES,
    maxPasses: STUDIO_MASTER_ANALYSIS_MAX_PASSES,
    passCount: passes.length,
    convergence,
    passes,
    final: finalRun,
    evidenceId: trace.data?.id ? String(trace.data.id) : null,
  };
}
