import { NextResponse } from 'next/server';
import { requireRootActor, auditRootAction } from '@/lib/root/server';
import { runLlmTask } from '@/lib/ai/providerRouter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

type Row = Record<string, unknown>;
type Suggestion = {
  primaryHypothesis: string;
  rivalHypotheses: string[];
  unknowns: string[];
  discriminatingObservations: string[];
  stoppingCondition: string;
  confidence: number | null;
};

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}
function list(value: unknown, max = 10) {
  return Array.isArray(value) ? value.map(text).filter(Boolean).slice(0, max) : [];
}
function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}
function stripFence(value: string) {
  const trimmed = value.trim();
  if (!trimmed.startsWith('```')) return trimmed;
  return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
}
function parseSuggestion(raw: string): Suggestion | null {
  try {
    const parsed = record(JSON.parse(stripFence(raw)));
    const primaryHypothesis = text(parsed.primaryHypothesis);
    const rivalHypotheses = list(parsed.rivalHypotheses, 6).filter((item) => item !== primaryHypothesis);
    const discriminatingObservations = list(parsed.discriminatingObservations, 8);
    const unknowns = list(parsed.unknowns, 8);
    const stoppingCondition = text(parsed.stoppingCondition);
    const confidenceRaw = Number(parsed.confidence);
    const confidence = Number.isFinite(confidenceRaw) ? Math.max(0, Math.min(1, confidenceRaw > 1 ? confidenceRaw / 100 : confidenceRaw)) : null;
    if (primaryHypothesis.length < 5 || !rivalHypotheses.length || !discriminatingObservations.length) return null;
    return { primaryHypothesis, rivalHypotheses, unknowns, discriminatingObservations, stoppingCondition, confidence };
  } catch {
    return null;
  }
}
function compactEvidence(row: Row) {
  const payload = record(row.payload);
  return {
    id: text(row.id),
    title: text(row.title),
    content: text(row.content).slice(0, 2400),
    evidenceType: text(row.evidence_type),
    createdAt: text(row.created_at),
    source: text(payload.source),
    metadata: record(payload.metadata),
  };
}

export async function POST(request: Request) {
  const gate = await requireRootActor('root.operate.inference.write');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const body = await request.json().catch(() => ({})) as Row;
  const operatingCycleId = text(body.operatingCycleId);
  if (!operatingCycleId) return NextResponse.json({ ok: false, error: 'operating_cycle_id_required' }, { status: 400 });

  const cycle = await gate.ctx.service
    .from('sfi_operating_cycles')
    .select('id,cycle_code,title,question,subject,temporal_scope,evidence_refs,inference_refs,method_resolution,status')
    .eq('id', operatingCycleId)
    .eq('owner_id', gate.ctx.user.id)
    .maybeSingle();
  if (cycle.error || !cycle.data) {
    return NextResponse.json({ ok: false, error: 'operating_cycle_not_found', details: cycle.error?.message }, { status: 404 });
  }

  const evidenceRefs = list(cycle.data.evidence_refs, 20);
  if (!evidenceRefs.length) {
    return NextResponse.json({ ok: false, error: 'observed_evidence_required_before_inference' }, { status: 409 });
  }

  const evidence = await gate.ctx.service.from('root_evidence_entries').select('*').in('id', evidenceRefs).limit(20);
  if (evidence.error) {
    return NextResponse.json({ ok: false, error: 'operating_cycle_evidence_read_failed', details: evidence.error.message }, { status: 503 });
  }
  if (!(evidence.data ?? []).length) {
    return NextResponse.json({ ok: false, error: 'referenced_evidence_not_found' }, { status: 409 });
  }

  const system = [
    'You are the evidence-bound rival-hypothesis generator inside System Friction Institute.',
    'Use only the supplied operating-cycle question and observed evidence records.',
    'Do not invent facts, measurements, history, causal relations or outcomes.',
    'A hypothesis is INFERRED, never OBSERVED. Missing information must remain unknown.',
    'Generate one currently plausible primary hypothesis and at least one materially different rival explanation.',
    'Generate observations that could discriminate among the explanations and an explicit stopping/rejection condition.',
    'Do not ask the human to supply the mandatory rival. The system must propose it from the bounded evidence.',
    'Return ONLY valid JSON with schema: {"primaryHypothesis":string,"rivalHypotheses":string[],"unknowns":string[],"discriminatingObservations":string[],"stoppingCondition":string,"confidence":number}.',
  ].join('\n');

  const prompt = JSON.stringify({
    cycle: {
      id: cycle.data.id,
      code: cycle.data.cycle_code,
      title: cycle.data.title,
      question: cycle.data.question,
      subject: cycle.data.subject,
      temporalScope: cycle.data.temporal_scope,
      methodResolution: cycle.data.method_resolution,
      status: cycle.data.status,
    },
    observedEvidence: (evidence.data ?? []).map((item) => compactEvidence(item as Row)),
    boundary: {
      evidenceRefs,
      currentInferenceCount: list(cycle.data.inference_refs).length,
      instruction: 'Reduce explanatory space without converting interpretation into fact.',
    },
  });

  const result = await runLlmTask({
    task: 'graph_interpretation',
    system,
    prompt,
    fallbackResult: '{"status":"LLM_UNAVAILABLE"}',
    maxTokens: 900,
  });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: 'inference_provider_unavailable', warnings: result.warnings }, { status: 503 });
  }

  const suggestion = parseSuggestion(result.result);
  if (!suggestion) {
    return NextResponse.json({ ok: false, error: 'inference_suggestion_schema_invalid', provider: result.provider, model: result.model, warnings: result.warnings }, { status: 502 });
  }

  const audit = await auditRootAction({
    actorId: gate.ctx.user.id,
    action: 'operating_cycle.inference_suggested',
    target: operatingCycleId,
    payload: {
      evidenceRefs,
      provider: result.provider,
      model: result.model,
      rivalCount: suggestion.rivalHypotheses.length,
      discriminatorCount: suggestion.discriminatingObservations.length,
      epistemicClass: 'INFERRED',
      persistedAsInferenceTrace: false,
    },
    request,
  });

  return NextResponse.json({
    ok: true,
    suggestion: {
      ...suggestion,
      epistemicClass: 'INFERRED',
      evidenceRefs,
      persisted: false,
    },
    provider: result.provider,
    model: result.model,
    warnings: result.warnings,
    audit,
  });
}
