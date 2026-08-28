import { NextResponse } from 'next/server';
import { auditRootAction, requireRootActor, requireRootViewer } from '@/lib/root/server';
import { readUniversalCycleHistory } from '@/lib/sfi/universalSignalCycle';
import {
  promoteUniversalLearningCandidate,
  readUniversalLearningCycleState,
  readUniversalLearningQuarantine,
  recordUniversalLearningCandidate,
  rejectUniversalLearningCandidate,
} from '@/lib/sfi/universalLearningQuarantine';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Row = Record<string, unknown>;
function row(value: unknown): Row { return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}; }
function text(value: unknown) { return typeof value === 'string' && value.trim() ? value.trim() : null; }
function payload(value: unknown) { return row(row(value).payload); }

export async function GET() {
  const gate = await requireRootViewer('learning_quarantine.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  const quarantine = await readUniversalLearningQuarantine();
  return NextResponse.json({
    ...quarantine,
    contract: 'SFI-UNIVERSAL-LEARNING-QUARANTINE-1.0',
    authorityBoundary: 'ROOT may promote eligible calibrated learning for institutional use, but cannot turn inference into observation, erase rival hypotheses, or upgrade evidence by decree.',
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as Row;
  const action = text(body.action) ?? 'capture_closed_cycle';
  const gate = await requireRootActor(`learning_quarantine.${action}`);
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  const actorId = gate.ctx.user.id;

  if (action === 'capture_closed_cycle') {
    const cycleId = text(body.cycleId);
    if (!cycleId) return NextResponse.json({ ok: false, error: 'cycleId_required' }, { status: 400 });
    const history = await readUniversalCycleHistory(cycleId);
    if (!history.ok) return NextResponse.json({ ok: false, error: 'cycle_history_unavailable', history }, { status: 503 });
    if (!Array.isArray(history.closures) || history.closures.length === 0) {
      return NextResponse.json({ ok: false, error: 'cycle_must_be_closed_before_learning_capture', cycleId }, { status: 409 });
    }
    const closureEvent = history.closures[history.closures.length - 1];
    const closureEventId = String(row(closureEvent).event_id ?? '') || null;

    const existing = await readUniversalLearningCycleState(cycleId);
    if (!existing.ok) {
      return NextResponse.json({ ok: false, error: 'learning_cycle_state_unavailable', warning: existing.warning }, { status: 503 });
    }
    if (existing.events.length) {
      const terminal = existing.events.find((event) => ['SFI_UNIVERSAL_LEARNING_PROMOTED', 'SFI_UNIVERSAL_LEARNING_REJECTED'].includes(String(event.event_name ?? '')));
      const candidate = existing.events.find((event) => event.event_name === 'SFI_UNIVERSAL_LEARNING_CANDIDATE_RECORDED');
      const reused = terminal ?? candidate ?? existing.events[0];
      return NextResponse.json({
        ok: true,
        action,
        idempotent: true,
        cycleId,
        closureEventId,
        existingEventId: String(row(reused).event_id ?? ''),
        existingEventName: row(reused).event_name ?? null,
        candidateEventId: terminal ? text(payload(terminal).candidateEventId) : candidate ? text(candidate.event_id) : null,
        instruction: 'This closed cycle already has a learning-quarantine lineage. A rejection or promotion is terminal; do not recapture the same cycle.',
      });
    }

    const candidate = await recordUniversalLearningCandidate({
      history,
      requested: body.learning,
      actorId,
      tenantId: 'sfi',
      closureEventId,
    });
    if (!candidate.ok) return NextResponse.json(candidate, { status: 409 });
    const audit = await auditRootAction({
      actorId,
      action: 'learning_quarantine.capture',
      target: candidate.eventId,
      payload: { cycleId, classification: candidate.candidate.classification, promotionState: candidate.candidate.promotionState },
      request,
    });
    return NextResponse.json({ ok: audit.ok, action, candidate, audit }, { status: audit.ok ? 201 : 500 });
  }

  if (action === 'promote') {
    const candidateEventId = text(body.candidateEventId);
    if (!candidateEventId) return NextResponse.json({ ok: false, error: 'candidateEventId_required' }, { status: 400 });
    const promoted = await promoteUniversalLearningCandidate({
      candidateEventId,
      actorId,
      reviewNote: text(body.reviewNote),
    });
    if (!promoted.ok) return NextResponse.json(promoted, { status: 409 });
    if (promoted.idempotent) {
      return NextResponse.json({
        ok: true,
        action,
        idempotent: true,
        candidateEventId,
        promotedEventId: promoted.eventId,
        instruction: 'Candidate was already promoted. No duplicate promotion or audit mutation was created.',
      });
    }
    const audit = await auditRootAction({
      actorId,
      action: 'learning_quarantine.promote',
      target: candidateEventId,
      payload: { promotedEventId: promoted.eventId, reviewNote: text(body.reviewNote) },
      request,
    });
    return NextResponse.json({ ok: audit.ok, action, promoted, audit }, { status: audit.ok ? 201 : 500 });
  }

  if (action === 'reject') {
    const candidateEventId = text(body.candidateEventId);
    const reason = text(body.reason);
    if (!candidateEventId || !reason) return NextResponse.json({ ok: false, error: 'candidateEventId_and_reason_required' }, { status: 400 });
    const rejected = await rejectUniversalLearningCandidate({ candidateEventId, actorId, reason });
    if (!rejected.ok) return NextResponse.json(rejected, { status: 409 });
    if (rejected.idempotent) {
      return NextResponse.json({
        ok: true,
        action,
        idempotent: true,
        candidateEventId,
        rejectedEventId: rejected.eventId,
        instruction: 'Candidate was already rejected. No duplicate rejection or audit mutation was created.',
      });
    }
    const audit = await auditRootAction({
      actorId,
      action: 'learning_quarantine.reject',
      target: candidateEventId,
      payload: { rejectedEventId: rejected.eventId, reason },
      request,
    });
    return NextResponse.json({ ok: audit.ok, action, rejected, audit }, { status: audit.ok ? 201 : 500 });
  }

  return NextResponse.json({ ok: false, error: 'unsupported_learning_quarantine_action', allowed: ['capture_closed_cycle', 'promote', 'reject'] }, { status: 400 });
}
