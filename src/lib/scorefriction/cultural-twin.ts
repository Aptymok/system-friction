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

export async function generateScoreFrictionCulturalHypotheses(caseId: string) {
  const cleanCaseId = str(caseId);
  if (!cleanCaseId) return { ok: false as const, error: 'case_id_required' };

  const service = createServiceSupabaseClient();
  const protoResult = await service
    .from('scorefriction_proto_attractors')
    .select('*')
    .eq('case_id', cleanCaseId)
    .gte('evidence_count', 1)
    .order('confidence', { ascending: false })
    .limit(3);

  if (protoResult.error) return { ok: false as const, error: 'proto_attractor_read_failed', details: protoResult.error.message };
  const protos = rows(protoResult.data).filter((proto) => num(proto.confidence) >= 0.25);
  if (!protos.length) return { ok: true as const, case_id: cleanCaseId, data: [], message: 'sin protoatractor con evidencia suficiente' };

  const hypotheses = protos.map((proto) => {
    const name = str(proto.name, 'protoatractor');
    const status = str(proto.status, 'latent');
    return {
      case_id: cleanCaseId,
      proto_attractor_id: proto.id,
      title: `Hipotesis cultural ${name}`,
      statement: `Si el protoatractor ${name} permanece en estado ${status}, deberia aparecer una senal cultural verificable en la ventana declarada.`,
      confidence: Math.min(0.92, num(proto.confidence) * 0.86),
      status: 'tracking',
      verification_window_days: 21,
      expected_signal: `incremento de evidencia o persistencia alrededor de ${name}`,
      actual_signal: null,
      result: null,
      created_from: { proto_attractor: proto, generated_by: 'scorefriction_cultural_twin_v1' },
    };
  });

  const inserted = await service
    .from('scorefriction_cultural_hypotheses')
    .upsert(hypotheses, { onConflict: 'case_id,proto_attractor_id,title' })
    .select('*');

  if (inserted.error) return { ok: false as const, error: 'cultural_hypotheses_upsert_failed', details: inserted.error.message };

  await appendEpistemicEvent({
    eventName: 'scorefriction.cultural_hypotheses.generated',
    epistemicClass: 'derived',
    confidence: 0.68,
    payload: { caseId: cleanCaseId, count: rows(inserted.data).length },
    source: { sourceId: 'SCOREFRICTION', sourceType: 'cultural_twin' },
    logbookId: 'SCOREFRICTION',
    lineage: protos.map((proto) => str(proto.id)).filter(Boolean),
  });

  return { ok: true as const, case_id: cleanCaseId, data: inserted.data ?? [] };
}

export async function listScoreFrictionCulturalHypotheses(caseId: string) {
  const cleanCaseId = str(caseId);
  if (!cleanCaseId) return { ok: false as const, error: 'case_id_required' };

  const service = createServiceSupabaseClient();
  const result = await service
    .from('scorefriction_cultural_hypotheses')
    .select('*')
    .eq('case_id', cleanCaseId)
    .order('updated_at', { ascending: false });

  if (result.error) return { ok: false as const, error: 'cultural_hypotheses_read_failed', details: result.error.message };
  const data = rows(result.data);
  return { ok: true as const, case_id: cleanCaseId, data, message: data.length ? undefined : 'sin hipotesis culturales' };
}
