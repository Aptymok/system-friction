import { NextResponse } from 'next/server';
import { z } from 'zod';

import { CanonicalPipelineRunner } from '@/core/runtime/pipeline';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { AccessDeniedError, requireFounder } from '@/lib/system/access/server';

export const dynamic = 'force-dynamic';

const executionBodySchema = z.object({
  capabilityId: z.string().min(1).optional(),
  actorId: z.string().min(1).optional(),
  payload: z.unknown().optional(),
}).passthrough();

type ActorContext = {
  actorId: string;
  actorRole: string;
  actorType: string;
  permissions: ['MODEL_EXECUTE', 'SYSTEM_ADMIN'] | ['MODEL_EXECUTE'];
  mode: 'authenticated' | 'local_test';
};

function jsonError(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json({
    ok: false,
    route: '/api/sfi/execution',
    error: {
      code,
      message,
      details,
    },
  }, { status });
}

function localExecutionToken(request: Request) {
  return request.headers.get('x-sfi-local-execution-token') ?? '';
}

function localExecutionEnabled(request: Request) {
  const expected = process.env.SFI_EXECUTION_LOCAL_TOKEN;
  const hostname = new URL(request.url).hostname;
  const loopback = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  return (
    loopback &&
    Boolean(expected) &&
    localExecutionToken(request) === expected
  );
}

async function resolveActor(request: Request): Promise<ActorContext> {
  if (localExecutionEnabled(request)) {
    return {
      actorId: 'LOCAL_SFI_EXECUTION_ACTOR',
      actorRole: 'LOCAL_TEST',
      actorType: 'SYSTEM',
      permissions: ['MODEL_EXECUTE'],
      mode: 'local_test',
    };
  }

  const gate = await requireFounder();
  return {
    actorId: gate.user.id,
    actorRole: gate.profile?.role === 'system' ? 'SYSTEM_ADMIN' : 'FOUNDER',
    actorType: 'USER',
    permissions: ['MODEL_EXECUTE', 'SYSTEM_ADMIN'],
    mode: 'authenticated',
  };
}

function sanitizeEvent(row: Record<string, unknown>) {
  return {
    id: row.id,
    eventId: row.event_id,
    eventName: row.event_name,
    logbookId: row.logbook_id,
    epistemicClass: row.epistemic_class,
    confidence: row.confidence,
    payload: row.payload,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
  };
}

async function readObservableExecutions(trace: string | null) {
  const service = createServiceSupabaseClient();
  let query = service
    .from('epistemic_events')
    .select('id,event_id,event_name,logbook_id,epistemic_class,confidence,payload,occurred_at,created_at')
    .like('event_name', 'sfi.pipeline.%')
    .order('occurred_at', { ascending: false })
    .limit(trace ? 200 : 50);

  if (trace) {
    query = query.eq('logbook_id', trace);
  }

  const { data, error } = await query;
  if (error) {
    return {
      ok: false,
      error: error.message,
      events: [],
    };
  }

  const events = (data ?? []).map((row) => sanitizeEvent(row as Record<string, unknown>));
  const latestTrace = events[0]?.logbookId ?? null;
  const traceEvents = trace
    ? events
    : events.filter((event) => event.logbookId === latestTrace);

  return {
    ok: true,
    trace: trace ?? latestTrace,
    events: traceEvents,
    agentStates: traceEvents
      .filter((event) => event.eventName === 'sfi.pipeline.agent.executed' || event.eventName === 'sfi.pipeline.agent.failed')
      .map((event) => {
        const payload = event.payload && typeof event.payload === 'object'
          ? event.payload as Record<string, any>
          : {};
        const result = payload.result && typeof payload.result === 'object'
          ? payload.result as Record<string, any>
          : {};
        const agent = payload.agent && typeof payload.agent === 'object'
          ? payload.agent as Record<string, any>
          : {};
        return {
          agentId: agent.id ?? event.eventName,
          name: agent.name ?? agent.id ?? event.eventName,
          status: event.eventName === 'sfi.pipeline.agent.failed'
            ? 'FAILED'
            : result.status === 'SUCCESS'
              ? 'OPERATIONAL'
              : 'BLOCKED',
          resultStatus: result.status ?? 'FAILED',
          confidence: result.confidence ?? event.confidence,
          durationMs: payload.durationMs ?? null,
        };
      }),
  };
}

export async function GET(request: Request) {
  try {
    await resolveActor(request);
    const url = new URL(request.url);
    const trace = url.searchParams.get('trace');
    const result = await readObservableExecutions(trace);
    if (!result.ok) {
      return jsonError(503, 'OBSERVABILITY_UNAVAILABLE', 'Could not read persisted SFI execution trace.', result.error);
    }
    return NextResponse.json({
      ok: true,
      route: '/api/sfi/execution',
      observability: result,
    });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return jsonError(error.status, error.code, error.message);
    }
    return jsonError(500, 'SFI_EXECUTION_READ_FAILED', 'SFI execution observability failed.');
  }
}

export async function POST(request: Request) {
  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return jsonError(400, 'INVALID_JSON', 'Request body must be valid JSON.');
  }

  const parsed = executionBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return jsonError(400, 'INVALID_BODY', 'Request body does not match the SFI execution contract.', parsed.error.flatten());
  }

  try {
    const actor = await resolveActor(request);

    if (parsed.data.actorId && parsed.data.actorId !== actor.actorId) {
      return jsonError(403, 'ACTOR_IMPERSONATION_BLOCKED', 'actorId must be resolved from authorization, not supplied freely.');
    }

    if (parsed.data.actorId === 'SYSTEM') {
      return jsonError(403, 'SYSTEM_ACTOR_BLOCKED', 'SYSTEM actor cannot be supplied by public request body.');
    }

    const runner = new CanonicalPipelineRunner();
    const result = await runner.run({
      capabilityId: parsed.data.capabilityId ?? 'CAPABILITY_CANONICAL_PIPELINE',
      actorId: actor.actorId,
      actorRole: actor.actorRole,
      actorType: actor.actorType,
      permissions: actor.permissions,
      payload: parsed.data.payload ?? parsed.data,
    });

    return NextResponse.json({
      ok: result.status === 'COMPLETED',
      route: '/api/sfi/execution',
      authorization: {
        mode: actor.mode,
        actorType: actor.actorType,
        actorRole: actor.actorRole,
      },
      result,
    }, { status: result.status === 'COMPLETED' ? 200 : 500 });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return jsonError(error.status, error.code, error.message);
    }
    return jsonError(
      500,
      'SFI_EXECUTION_FAILED',
      'SFI execution failed before producing a canonical runtime result.',
      error instanceof Error ? error.message : null
    );
  }
}
