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

export async function generateScoreFrictionProposals(caseId: string) {
  const cleanCaseId = str(caseId);
  if (!cleanCaseId) return { ok: false as const, error: 'case_id_required' };

  const service = createServiceSupabaseClient();
  const hypotheses = await service
    .from('scorefriction_cultural_hypotheses')
    .select('*')
    .eq('case_id', cleanCaseId)
    .in('status', ['open', 'tracking'])
    .order('confidence', { ascending: false })
    .limit(3);

  if (hypotheses.error) return { ok: false as const, error: 'cultural_hypotheses_read_failed', details: hypotheses.error.message };
  const active = rows(hypotheses.data);
  if (!active.length) return { ok: true as const, case_id: cleanCaseId, data: [], message: 'sin hipotesis cultural activa' };

  const proposals = [];
  for (const hypothesis of active) {
    const title = `Intervencion observable: ${str(hypothesis.title, cleanCaseId)}`;
    const expected = `Validar ${str(hypothesis.expected_signal, 'senal esperada')} en ${num(hypothesis.verification_window_days, 21)} dias.`;
    const payload = {
      case_id: cleanCaseId,
      hypothesis_id: hypothesis.id,
      proto_attractor_id: hypothesis.proto_attractor_id,
      accion: 'producir una intervencion cultural medible y registrar su retorno',
      fundamento: hypothesis.statement,
      evidencia: record(hypothesis.created_from),
      riesgo: num(hypothesis.confidence) < 0.45 ? 'medio' : 'bajo',
      impacto_esperado: expected,
      ventana_verificacion: num(hypothesis.verification_window_days, 21),
      estado: 'proposed',
    };

    const inserted = await service
      .from('action_proposals')
      .insert({
        proposal_type: 'scorefriction',
        title,
        description: str(hypothesis.statement),
        objective: expected,
        status: 'proposed',
        risk_level: payload.riesgo,
        expected_field_delta: payload,
        proportionality_check: { proposalType: 'scorefriction', hypothesisId: hypothesis.id, approvalRequired: true },
        approval_required: true,
      })
      .select('*')
      .single();

    if (!inserted.error) proposals.push(inserted.data);
  }

  await appendEpistemicEvent({
    eventName: 'scorefriction.proposals.generated',
    epistemicClass: 'derived',
    confidence: 0.64,
    payload: { caseId: cleanCaseId, count: proposals.length },
    source: { sourceId: 'SCOREFRICTION', sourceType: 'proposal_engine' },
    logbookId: 'SCOREFRICTION',
    lineage: active.map((item) => str(item.id)).filter(Boolean),
  });

  return { ok: true as const, case_id: cleanCaseId, data: proposals };
}

export async function listScoreFrictionProposals(caseId: string) {
  const cleanCaseId = str(caseId);
  if (!cleanCaseId) return { ok: false as const, error: 'case_id_required' };

  const service = createServiceSupabaseClient();
  const result = await service
    .from('action_proposals')
    .select('*')
    .eq('proposal_type', 'scorefriction')
    .order('created_at', { ascending: false })
    .limit(50);

  if (result.error) return { ok: false as const, error: 'scorefriction_proposals_read_failed', details: result.error.message };
  const data = rows(result.data).filter((row) => str(record(row.expected_field_delta).case_id) === cleanCaseId);
  return { ok: true as const, case_id: cleanCaseId, data, message: data.length ? undefined : 'sin propuestas scorefriction' };
}
