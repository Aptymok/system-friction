import { NextResponse } from 'next/server';
import { auditRootAction, requireRootActor, requireRootViewer } from '@/lib/root/server';
import {
  attachSystemMutationEvidence,
  readSystemMutationLedger,
  recordSystemMutation,
  type MutationAttachmentKind,
} from '@/lib/sfi/mutationEvidence';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

type Row = Record<string, unknown>;
function row(value: unknown): Row { return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}; }
function text(value: unknown) { return typeof value === 'string' && value.trim() ? value.trim() : null; }
function strings(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()) : []; }

export async function GET() {
  const gate = await requireRootViewer('mutations.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  return NextResponse.json(await readSystemMutationLedger(120), { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as Row;
  const action = text(body.action) ?? 'capture_commit';
  const gate = await requireRootActor(`mutations.${action}`);
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  const actorId = gate.ctx.user.id;

  if (action === 'capture_commit') {
    const commitSha = text(body.commitSha);
    const title = text(body.title);
    if (!commitSha || !title) return NextResponse.json({ ok: false, error: 'commitSha_and_title_required' }, { status: 400 });
    const mutation = await recordSystemMutation({
      commitSha,
      actorId,
      title,
      capabilityIds: strings(body.capabilityIds),
      rationale: text(body.rationale),
    });
    if (!mutation.ok) return NextResponse.json(mutation, { status: 424 });
    if (mutation.idempotent) {
      return NextResponse.json({
        ok: true,
        action,
        idempotent: true,
        mutationId: mutation.mutationId,
        eventId: mutation.eventId,
        verification: mutation.verification,
        instruction: 'This verified commit already has a mutation record. No duplicate mutation or ROOT audit entry was created.',
      });
    }
    const audit = await auditRootAction({
      actorId,
      action: 'mutations.capture_commit',
      target: mutation.mutationId,
      payload: { commitSha: mutation.verification.commitSha, eventId: mutation.eventId, capabilityIds: strings(body.capabilityIds) },
      request,
    });
    return NextResponse.json({ ok: audit.ok, action, mutation, audit }, { status: audit.ok ? 201 : 500 });
  }

  if (action === 'attach') {
    const mutationId = text(body.mutationId);
    const kind = text(body.kind)?.toUpperCase() as MutationAttachmentKind | undefined;
    const allowed = new Set<MutationAttachmentKind>(['QA', 'DEPLOYMENT', 'EXERCISE', 'LEARNING']);
    if (!mutationId || !kind || !allowed.has(kind)) return NextResponse.json({ ok: false, error: 'valid_mutationId_and_kind_required', allowedKinds: [...allowed] }, { status: 400 });
    const refs = strings(body.refs);
    if (!refs.length) return NextResponse.json({ ok: false, error: 'refs_required' }, { status: 400 });
    const attached = await attachSystemMutationEvidence({
      mutationId,
      kind,
      actorId,
      refs,
      outcome: text(body.outcome),
      metadata: row(body.metadata),
    });
    if (!attached.ok) return NextResponse.json(attached, { status: 409 });
    if (attached.idempotent) {
      return NextResponse.json({
        ok: true,
        action,
        idempotent: true,
        mutationId,
        kind,
        eventId: attached.eventId,
        verification: attached.verification,
        instruction: 'The same mutation evidence attachment already exists. No duplicate attachment or ROOT audit entry was created.',
      });
    }
    const audit = await auditRootAction({
      actorId,
      action: `mutations.attach_${kind.toLowerCase()}`,
      target: mutationId,
      payload: { kind, refs, eventId: attached.eventId },
      request,
    });
    return NextResponse.json({ ok: audit.ok, action, attached, audit }, { status: audit.ok ? 201 : 500 });
  }

  return NextResponse.json({ ok: false, error: 'unsupported_mutation_action', allowed: ['capture_commit', 'attach'] }, { status: 400 });
}
