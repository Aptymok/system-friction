import { NextResponse } from 'next/server';
import { requireRootViewer } from '@/lib/root/server';
import { evaluateSfi } from '@/lib/sfi/math';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Row = Record<string, unknown>;
function num(value: unknown) { const parsed = typeof value === 'number' ? value : Number(value); return Number.isFinite(parsed) ? parsed : null; }
function text(value: unknown, fallback = '') { return typeof value === 'string' && value.trim() ? value.trim() : fallback; }
function dateKey(value: unknown) { const raw = text(value); const date = new Date(raw); return Number.isFinite(date.valueOf()) ? date.toISOString().slice(0, 10) : null; }
function endOfDay(date: string) { const value = new Date(`${date}T00:00:00.000Z`); value.setUTCDate(value.getUTCDate() + 1); return value.toISOString(); }

function institutionalPoint(row: Row) {
  const ihg = num(row.ihg), nti = num(row.nti), ldi = num(row.ldi);
  const metrics = ihg === null || nti === null || ldi === null ? null : evaluateSfi({ ihg, nti, ldi, xi: 0.03 });
  return {
    id: text(row.captured_at),
    at: row.captured_at ?? null,
    date: dateKey(row.captured_at),
    ihg, nti, ldi,
    wsv: num(row.wsv),
    phi: metrics?.phi ?? null,
    fs: metrics?.fs ?? null,
    regime: metrics?.regime ?? null,
    sourceStatus: row.source_status ?? null,
    warnings: Array.isArray(row.warnings) ? row.warnings : [],
    formulaBoundary: 'ΦSFI reconstructed with xi=0.03, matching the current institutional snapshot reader; this does not retroactively validate the snapshot.',
  };
}

function worldPoint(row: Row) {
  return {
    id: text(row.id, text(row.observed_at)),
    at: row.observed_at ?? null,
    date: dateKey(row.observed_at),
    wsi: num(row.wsi),
    nti: num(row.nti),
    confidence: num(row.confidence),
    sourceState: row.source_state ?? null,
    adapterStatus: row.adapter_status ?? null,
    degradedSources: Array.isArray(row.degraded_sources) ? row.degraded_sources : [],
    fieldStateSignal: row.field_state_signal ?? null,
  };
}

export async function GET(request: Request) {
  const gate = await requireRootViewer('root.longitudinal.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  const url = new URL(request.url);
  const selectedDate = text(url.searchParams.get('date')) || null;

  const [institutional, world] = await Promise.all([
    gate.ctx.service.from('sfi_indicator_snapshots').select('captured_at,ihg,nti,ldi,wsv,source_status,warnings').order('captured_at', { ascending: true }).limit(240),
    gate.ctx.service.from('worldspect_snapshots').select('id,observed_at,wsi,nti,confidence,source_state,adapter_status,degraded_sources,field_state_signal,ingest_mode').order('observed_at', { ascending: true }).limit(240),
  ]);

  const warnings = [institutional.error?.message, world.error?.message].filter((item): item is string => Boolean(item));
  const sfiLane = (institutional.data ?? []).map((row: Row) => institutionalPoint(row));
  const worldLane = (world.data ?? []).map((row: Row) => worldPoint(row));
  const availableDates = Array.from(new Set([...sfiLane.map((item) => item.date), ...worldLane.map((item) => item.date)].filter((item): item is string => Boolean(item)))).sort();
  const date = selectedDate && availableDates.includes(selectedDate) ? selectedDate : availableDates.at(-1) ?? null;

  let detail: Row | null = null;
  if (date) {
    const start = `${date}T00:00:00.000Z`;
    const end = endOfDay(date);
    const [predictions, outcomes, events, evidence] = await Promise.all([
      gate.ctx.service.from('sfi_predictive_runs').select('id,status,prediction,confidence,subject_type,subject_id,target_key,target_kind,evidence_refs,missing_evidence,interpretation,verification_rule,due_at,created_at').gte('created_at', start).lt('created_at', end).order('created_at', { ascending: true }),
      gate.ctx.service.from('sfi_predictive_outcomes').select('id,run_id,actual_value,outcome_payload,source_type,source_ref,source_quality,observed_at,evaluation_state,created_at').gte('observed_at', start).lt('observed_at', end).order('observed_at', { ascending: true }),
      gate.ctx.service.from('epistemic_events').select('id,event_id,event_name,epistemic_class,confidence,source,payload,lineage,occurred_at').gte('occurred_at', start).lt('occurred_at', end).order('occurred_at', { ascending: true }).limit(120),
      gate.ctx.service.from('root_evidence_entries').select('id,evidence_hash,title,content,evidence_type,target_node_id,payload,created_at').gte('created_at', start).lt('created_at', end).order('created_at', { ascending: true }).limit(80),
    ]);
    detail = {
      date,
      sfi: sfiLane.filter((item) => item.date === date),
      world: worldLane.filter((item) => item.date === date),
      predictions: predictions.data ?? [],
      outcomes: outcomes.data ?? [],
      epistemicEvents: events.data ?? [],
      evidence: evidence.data ?? [],
      warnings: [predictions.error?.message, outcomes.error?.message, events.error?.message, evidence.error?.message].filter(Boolean),
    };
  }

  return NextResponse.json({ ok: true, lanes: { sfi: sfiLane, world: worldLane }, availableDates, selectedDate: date, detail, warnings }, { headers: { 'Cache-Control': 'no-store' } });
}
