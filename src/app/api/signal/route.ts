import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedUser } from '@/lib/system/access/server';
import {
  humanSignalTenantId,
  linkHumanEvidenceToUniversalCycle,
  openHumanUniversalSignalCycle,
  readOwnedHumanUniversalCycle,
  recordOwnedHumanUniversalReturn,
  runOwnedHumanUniversalCycle,
} from '@/lib/sfi/humanUniversalSignal';
import { SFI_SIGNAL_KINDS, type UniversalCycleInput, type UniversalSignalInput } from '@/lib/sfi/universalSignalCycle';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const signalSchema = z.object({
  kind: z.enum(SFI_SIGNAL_KINDS).default('text'),
  name: z.string().trim().max(240).optional(),
  mimeType: z.string().trim().max(160).optional(),
  sourceUrl: z.string().trim().url().max(2000).optional(),
  assetRef: z.string().trim().max(2000).optional(),
  content: z.unknown().optional(),
  observedAt: z.string().trim().max(80).optional(),
}).strict();

const intakeSchema = z.object({
  operation: z.literal('intake'),
  input: z.object({
    signal: signalSchema,
    question: z.string().trim().max(2000).optional(),
    objective: z.string().trim().max(2000).optional(),
    declaredFunction: z.string().trim().max(1000).optional(),
    systemType: z.string().trim().max(500).optional(),
  }).strict(),
}).strict();
const statusSchema = z.object({ operation: z.literal('status'), cycleId: z.string().uuid() }).strict();
const evidenceSchema = z.object({ operation: z.literal('evidence'), cycleId: z.string().uuid(), signal: signalSchema, notes: z.string().trim().max(2000).optional() }).strict();
const runSchema = z.object({ operation: z.literal('run'), cycleId: z.string().uuid() }).strict();
const returnSchema = z.object({ operation: z.literal('return'), cycleId: z.string().uuid(), outcome: z.unknown(), notes: z.string().trim().max(4000).optional() }).strict();
const bodySchema = z.discriminatedUnion('operation', [intakeSchema, statusSchema, evidenceSchema, runSchema, returnSchema]);

function compactHistory(history: Awaited<ReturnType<typeof readOwnedHumanUniversalCycle>>) {
  return {
    cycleId: history.cycleId,
    state: history.state ?? null,
    eventCount: history.events.length,
    evidenceCount: history.events.filter((event) => event.event_name === 'SFI_UNIVERSAL_CYCLE_EVIDENCE_LINKED').length,
    cognitiveRunCount: history.cognitiveRuns?.length ?? 0,
    returnCount: history.returns?.length ?? 0,
    latestEvent: history.events.length ? {
      eventId: history.events[history.events.length - 1]?.event_id ?? null,
      eventName: history.events[history.events.length - 1]?.event_name ?? null,
      occurredAt: history.events[history.events.length - 1]?.occurred_at ?? null,
    } : null,
  };
}

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const status = message.includes('OWNER_REQUIRED') ? 403 : message.includes('CLOSED') ? 409 : message.includes('HISTORY_UNAVAILABLE') ? 404 : message.includes('AUTH') ? 401 : 500;
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function GET(request: Request) {
  try {
    const { user } = await requireAuthenticatedUser();
    const cycleId = new URL(request.url).searchParams.get('cycleId')?.trim();
    if (!cycleId) return NextResponse.json({ ok: false, error: 'cycleId_required' }, { status: 400 });
    const parsed = z.string().uuid().parse(cycleId);
    const history = await readOwnedHumanUniversalCycle(parsed, user.id);
    return NextResponse.json({ ok: true, operation: 'status', cycle: compactHistory(history) });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requireAuthenticatedUser();
    const tenantId = humanSignalTenantId(user.id);
    const body = bodySchema.parse(await request.json());

    if (body.operation === 'intake') {
      const opened = await openHumanUniversalSignalCycle(body.input as UniversalCycleInput, user.id, tenantId);
      const history = await readOwnedHumanUniversalCycle(opened.cycleId, user.id);
      return NextResponse.json({ ok: true, operation: 'intake', ...opened, cycle: compactHistory(history) }, { status: 201 });
    }
    if (body.operation === 'status') {
      const history = await readOwnedHumanUniversalCycle(body.cycleId, user.id);
      return NextResponse.json({ ok: true, operation: 'status', cycle: compactHistory(history) });
    }
    if (body.operation === 'evidence') {
      const linked = await linkHumanEvidenceToUniversalCycle({ cycleId: body.cycleId, signal: body.signal as UniversalSignalInput, notes: body.notes }, user.id, tenantId);
      const history = await readOwnedHumanUniversalCycle(body.cycleId, user.id);
      return NextResponse.json({ ok: true, operation: 'evidence', linked, cycle: compactHistory(history) }, { status: 201 });
    }
    if (body.operation === 'run') {
      const result = await runOwnedHumanUniversalCycle(body.cycleId, user.id, tenantId);
      const history = await readOwnedHumanUniversalCycle(body.cycleId, user.id);
      return NextResponse.json({ ok: true, operation: 'run', cycleId: result.cycleId, taskId: result.taskId, executedAgents: result.result.executedAgents, missingAgents: result.result.missingAgents, cycle: compactHistory(history) }, { status: 201 });
    }
    const returned = await recordOwnedHumanUniversalReturn({ cycleId: body.cycleId, outcome: body.outcome, notes: body.notes }, user.id, tenantId);
    if (!returned.ok) throw new Error('SFI_HUMAN_SIGNAL_RETURN_FAILED');
    const history = await readOwnedHumanUniversalCycle(body.cycleId, user.id);
    return NextResponse.json({ ok: true, operation: 'return', eventId: returned.data.event_id ?? null, cycle: compactHistory(history) }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
