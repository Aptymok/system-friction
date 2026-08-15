import { NextResponse } from 'next/server';
import { runLlmTask } from '@/lib/ai/providerRouter';
import { canonicalizeEvidenceRows } from '@/lib/evidence/canonicalEvidence';
import { requireRootActor } from '@/lib/root/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

function strings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim())
    : [];
}

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function compact(value: unknown, max = 2400) {
  const raw = typeof value === 'string' ? value : JSON.stringify(value ?? null);
  return raw.length > max ? `${raw.slice(0, max)}…` : raw;
}

function parseSuggestion(raw: string): Suggestion | null {
  const fenced = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const start = fenced.indexOf('{');
  const end = fenced.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  let value: Row;
  try { value = JSON.parse(fenced.slice(start, end + 1)) as Row; } catch { return null; }
  const primaryHypothesis = text(value.primaryHypothesis);
  if (primaryHypothesis.length < 5) return null;
  const confidenceRaw = typeof value.confidence === 'number' && Number.isFinite(value.confidence) ? value.confidence : null;
  return {
    primaryHypothesis,
    rivalHypotheses: strings(value.rivalHypotheses).filter((item) => item !== primaryHypothesis).slice(0, 6),
    unknowns: strings(value.unknowns).slice(0, 8),
    discriminatingObservations: strings(value.discriminatingObservations).slice(0, 8),
    stoppingCondition: text(value.stoppingCondition),
    confidence: confidenceRaw === null ? null : Math.max(0, Math.min(1, confidenceRaw)),
  };
}

function evidenceMatches(refs: Set<string>, object: ReturnType<typeof canonicalizeEvidenceRows>[number]) {
  const candidates = [
    object.key,
    object.nodeId,
    object.evidenceHash,
    ...object.rootEvidenceIds,
    ...object.ledgerEvidenceIds,
    ...object.epistemicEventIds,
  ].filter((item): item is string => Boolean(item));
  return candidates.some((item) => refs.has(item));
}

export async function POST(request: Request) {
  const gate = await requireRootActor('root.operate.inference.suggest');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const body = await request.json().catch(() => ({})) as Row;
  const operatingCycleId = text(body.operatingCycleId);
  if (!operatingCycleId) return NextResponse.json({ ok: false, error: 'operating_cycle_id_required' }, { status: 400 });

  const cycleResult = await gate.ctx.service
    .from('sfi_operating_cycles')
    .select('id,title,question,evidence_refs,inference_refs,subject,temporal_scope,method_resolution,metadata')
    .eq('id', operatingCycleId)
    .eq('owner_id', gate.ctx.user.id)
    .maybeSingle();
  if (cycleResult.error || !cycleResult.data) {
    return NextResponse.json({ ok: false, error: 'operating_cycle_not_found', details: cycleResult.error?.message }, { status: 404 });
  }

  const evidenceRefs = strings(cycleResult.data.evidence_refs);
  if (!evidenceRefs.length) return NextResponse.json({ ok: false, error: 'cycle_evidence_required' }, { status: 409 });

  const [rootEvidence, ledgerEvidence] = await Promise.all([
    gate.ctx.service
      .from('root_evidence_entries')
      .select('id,evidence_hash,title,content,evidence_type,target_node_id,payload,epistemic_event_id,created_at')
      .order('created_at', { ascending: false })
      .limit(500),
    gate.ctx.service
      .from('sfi_evidence_ledger')
      .select('id,case_id,module,evidence_kind,source_name,source_url,private_ref,public_summary,evidence_hash,trust_level,trust_score,observed_at,created_at')
      .order('observed_at', { ascending: false })
      .limit(500),
  ]);
  if (rootEvidence.error || ledgerEvidence.error) {
    return NextResponse.json({
      ok: false,
      error: 'canonical_evidence_read_failed',
      details: [rootEvidence.error?.message, ledgerEvidence.error?.message].filter(Boolean).join(' · '),
    }, { status: 503 });
  }

  const rootRows = (rootEvidence.data ?? []) as Row[];
  const ledgerRows = (ledgerEvidence.data ?? []) as Row[];
  const refs = new Set(evidenceRefs);
  const objects = canonicalizeEvidenceRows(rootRows, ledgerRows).filter((object) => evidenceMatches(refs, object));
  if (!objects.length) {
    return NextResponse.json({ ok: false, error: 'cycle_evidence_refs_unresolved' }, { status: 409 });
  }

  const selectedRootIds = new Set(objects.flatMap((object) => object.rootEvidenceIds));
  const selectedLedgerIds = new Set(objects.flatMap((object) => object.ledgerEvidenceIds));
  const evidenceContext = objects.slice(0, 12).map((object, index) => {
    const root = rootRows.find((row) => selectedRootIds.has(String(row.id ?? '')) && object.rootEvidenceIds.includes(String(row.id ?? '')));
    const ledger = ledgerRows.find((row) => selectedLedgerIds.has(String(row.id ?? '')) && object.ledgerEvidenceIds.includes(String(row.id ?? '')));
    return {
      index: index + 1,
      ref: object.key,
      title: object.label,
      epistemicClass: object.epistemicClass,
      confidence: object.confidence,
      observedAt: object.observedAt,
      evidenceKind: object.evidenceKind ?? object.evidenceType,
      content: root ? compact(root.content) : null,
      publicSummary: ledger ? compact(ledger.public_summary) : null,
      sourceUrls: object.sourceUrls,
      provenance: object.provenance,
    };
  });

  const prompt = [
    `OPERATING CYCLE: ${text(cycleResult.data.title)}`,
    `QUESTION: ${text(cycleResult.data.question)}`,
    `SUBJECT: ${text(cycleResult.data.subject) || 'UNKNOWN'}`,
    `TEMPORAL SCOPE: ${text(cycleResult.data.temporal_scope) || 'UNKNOWN'}`,
    `METHOD RESOLUTION: ${compact(cycleResult.data.method_resolution, 1800)}`,
    'PERSISTED EVIDENCE:',
    JSON.stringify(evidenceContext, null, 2),
    '',
    'Return ONLY a JSON object with this exact shape:',
    '{"primaryHypothesis":"...","rivalHypotheses":["..."],"unknowns":["..."],"discriminatingObservations":["..."],"stoppingCondition":"...","confidence":0.0}',
    'Every hypothesis must be inferential, not observational. Unknowns must stay explicit. Discriminating observations must describe future/independent observations that could separate rivals. Do not add facts absent from the evidence above.',
  ].join('\n');

  const llm = await runLlmTask({
    task: 'deep_report',
    system: 'You are the SFI evidence-bound inference proposer. Evidence before inference. Never convert a model output into evidence. Never invent external facts. Produce rival hypotheses and falsifiable discriminators. Return JSON only.',
    prompt,
    fallbackResult: '{"primaryHypothesis":"","rivalHypotheses":[],"unknowns":[],"discriminatingObservations":[],"stoppingCondition":"","confidence":null}',
    maxTokens: 900,
  });
  if (!llm.ok) {
    return NextResponse.json({ ok: false, error: 'llm_provider_unavailable', details: llm.warnings.join(' · ') }, { status: 503 });
  }

  const suggestion = parseSuggestion(llm.result);
  if (!suggestion) {
    return NextResponse.json({ ok: false, error: 'invalid_inference_suggestion_shape', provider: llm.provider, model: llm.model }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    provider: llm.provider,
    model: llm.model,
    suggestion,
    evidenceRefs,
    epistemicClass: 'INFERRED',
    persisted: false,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
