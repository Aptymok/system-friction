import { appendEpistemicEvent } from '@/lib/events/eventStore';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

type Row = Record<string, unknown>;

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}

function str(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function num(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function recordScoreFrictionProposalVerification(input: {
  proposal_id?: string;
  case_id?: string;
  expected_result?: string;
  actual_result?: string;
  delta?: number;
  confidence?: number;
  evidence_payload?: Row;
}) {
  const proposalId = str(input.proposal_id);
  const caseId = str(input.case_id);
  if (!proposalId) return { ok: false as const, error: 'proposal_id_required' };
  if (!caseId) return { ok: false as const, error: 'case_id_required' };

  const service = createServiceSupabaseClient();
  const verified = num(input.delta, 0) >= 0;
  const inserted = await service
    .from('scorefriction_proposal_verifications')
    .insert({
      proposal_id: proposalId,
      case_id: caseId,
      expected_result: input.expected_result ?? null,
      actual_result: input.actual_result ?? null,
      delta: num(input.delta, 0),
      verified,
      confidence: Math.max(0, Math.min(1, num(input.confidence, 0.5))),
      evidence_payload: input.evidence_payload ?? {},
    })
    .select('*')
    .single();

  if (inserted.error) return { ok: false as const, error: 'proposal_verification_insert_failed', details: inserted.error.message };

  const proposal = await service.from('action_proposals').select('*').eq('id', proposalId).maybeSingle();
  const expectedDelta = record(record(proposal.data).expected_field_delta);
  const hypothesisId = str(expectedDelta.hypothesis_id);
  const nextHypothesisStatus = verified ? 'verified' : 'refuted';

  await service
    .from('action_proposals')
    .update({
      status: verified ? 'verified' : 'executed',
      outcome: { verification_id: inserted.data.id, verified, delta: num(input.delta, 0), actual_result: input.actual_result ?? null },
      updated_at: new Date().toISOString(),
    })
    .eq('id', proposalId);

  if (hypothesisId) {
    await service
      .from('scorefriction_cultural_hypotheses')
      .update({
        status: nextHypothesisStatus,
        actual_signal: input.actual_result ?? null,
        result: verified ? 'confirmed_by_verification' : 'contradicted_by_verification',
        updated_at: new Date().toISOString(),
      })
      .eq('id', hypothesisId);
  }

  await appendEpistemicEvent({
    eventName: 'scorefriction.proposal.verified',
    epistemicClass: 'observed',
    confidence: Math.max(0, Math.min(1, num(input.confidence, 0.5))),
    payload: { caseId, proposalId, verificationId: inserted.data.id, verified },
    source: { sourceId: 'SCOREFRICTION', sourceType: 'verification_engine' },
    logbookId: 'SCOREFRICTION',
    lineage: [proposalId, hypothesisId].filter(Boolean),
  });

  return { ok: true as const, data: inserted.data };
}

export async function listScoreFrictionVerifications(caseId: string) {
  const cleanCaseId = str(caseId);
  if (!cleanCaseId) return { ok: false as const, error: 'case_id_required' };

  const service = createServiceSupabaseClient();
  const result = await service
    .from('scorefriction_proposal_verifications')
    .select('*')
    .eq('case_id', cleanCaseId)
    .order('verified_at', { ascending: false });

  if (result.error) return { ok: false as const, error: 'proposal_verifications_read_failed', details: result.error.message };
  const data = rows(result.data);
  return { ok: true as const, case_id: cleanCaseId, data, message: data.length ? undefined : 'sin verificaciones scorefriction' };
}
