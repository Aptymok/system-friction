import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createEntityContextService,
  isSupportedEntityType,
  isValidEntityGraphId,
  type EntityContextOptions,
  type EntityContextResult,
} from "@/core/entity-graph";
import { AccessDeniedError, requireFounder } from "@/lib/system/access/server";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  entityType: z.string().optional(),
  includeTimeline: z.coerce.boolean().optional(),
  includeTrajectory: z.coerce.boolean().optional(),
  includeRelationships: z.coerce.boolean().optional(),
  maxEvents: z.coerce.number().int().positive().max(250).optional(),
  maxDepth: z.coerce.number().int().min(0).max(2).optional(),
});

type ReadActor = {
  mode: "authenticated" | "local_test";
  actorId: string;
  actorRole: "FOUNDER" | "SYSTEM_ADMIN" | "LOCAL_TEST";
};

function jsonError(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json(
    {
      ok: false,
      route: "/api/sfi/entities/[id]",
      error: {
        code,
        message,
        details,
      },
    },
    { status }
  );
}

function localEntityReadEnabled(request: Request): boolean {
  const expected = process.env.SFI_ENTITY_GRAPH_LOCAL_TOKEN;
  const hostname = new URL(request.url).hostname;
  const loopback = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  return loopback && Boolean(expected) && request.headers.get("x-sfi-entity-graph-local-token") === expected;
}

async function resolveReadActor(request: Request): Promise<ReadActor> {
  if (localEntityReadEnabled(request)) {
    return {
      mode: "local_test",
      actorId: "LOCAL_SFI_ENTITY_GRAPH_READER",
      actorRole: "LOCAL_TEST",
    };
  }

  const gate = await requireFounder();
  return {
    mode: "authenticated",
    actorId: gate.user.id,
    actorRole: gate.profile?.role === "system" ? "SYSTEM_ADMIN" : "FOUNDER",
  };
}

function sanitizeContextResult(result: EntityContextResult): EntityContextResult {
  if (!result.context) {
    return result;
  }

  return {
    ...result,
    context: {
      ...result.context,
      entity: {
        ...result.context.entity,
        payload: {
          sourceTable: result.context.entity.sourceTable,
          sourceId: result.context.entity.sourceId,
          payloadKeys: result.context.entity.payload?.payloadKeys ?? [],
        },
      },
      events: result.context.events.map((event) => ({
        ...event,
        payload:
          event.payload && typeof event.payload === "object"
            ? {
                sourceTable: (event.payload as Record<string, unknown>).sourceTable,
                sourceId: (event.payload as Record<string, unknown>).sourceId,
                payloadKeys: (event.payload as Record<string, unknown>).payloadKeys,
              }
            : null,
      })),
    },
  };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidEntityGraphId(id)) {
    return jsonError(400, "INVALID_ENTITY_ID", "Entity id must be 1-160 characters using letters, numbers, colon, underscore, dash, or dot.");
  }

  const url = new URL(request.url);
  const parsedQuery = querySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsedQuery.success) {
    return jsonError(400, "INVALID_QUERY", "Entity graph query options are invalid.", parsedQuery.error.flatten());
  }
  if (parsedQuery.data.entityType && !isSupportedEntityType(parsedQuery.data.entityType)) {
    return jsonError(400, "INVALID_ENTITY_TYPE", "entityType must match SfiEntityType.", {
      requestedEntityType: parsedQuery.data.entityType,
    });
  }

  try {
    const actor = await resolveReadActor(request);
    const service = createEntityContextService();
    const serviceOptions: EntityContextOptions = {
      ...parsedQuery.data,
      entityType: parsedQuery.data.entityType && isSupportedEntityType(parsedQuery.data.entityType)
        ? parsedQuery.data.entityType
        : undefined,
    };
    const result = await service.getEntityContext(id, serviceOptions);

    if (!result.ok) {
      const status = result.code === "INVALID_ID" || result.code === "INVALID_ENTITY_TYPE"
        ? 400
        : result.code === "TYPE_MISMATCH"
          ? 409
          : 404;
      return jsonError(status, result.code, result.code === "TYPE_MISMATCH" ? "Entity type hint does not match the resolved institutional entity." : "Entity was not found in configured institutional sources.", {
        requestedEntityType: result.requestedEntityType,
        resolvedEntityType: result.resolvedEntityType,
        typeHintMatched: result.typeHintMatched,
        inferencePerformed: result.inferencePerformed,
        resolversAttempted: result.resolversAttempted,
        limitations: result.limitations,
      });
    }

    if (!result.context?.entity.publicable && actor.mode !== "authenticated" && actor.mode !== "local_test") {
      return jsonError(403, "ENTITY_RESTRICTED", "Entity context requires founder authorization.");
    }

    return NextResponse.json({
      ok: true,
      route: "/api/sfi/entities/[id]",
      generatedAt: result.generatedAt,
      requestedEntityType: result.requestedEntityType,
      resolvedEntityType: result.resolvedEntityType,
      typeHintMatched: result.typeHintMatched,
      inferencePerformed: result.inferencePerformed,
      resolversAttempted: result.resolversAttempted,
      resolverUsed: result.resolverUsed,
      sourcesConsulted: result.sourcesConsulted,
      sourcesSkipped: result.sourcesSkipped,
      ontologyViolationsRejected: result.ontologyViolationsRejected,
      contextCompleteness: result.contextCompleteness,
      authorization: {
        mode: actor.mode,
        actorRole: actor.actorRole,
      },
      result: sanitizeContextResult(result),
    });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return jsonError(error.status, error.code, error.message);
    }

    return jsonError(500, "ENTITY_CONTEXT_READ_FAILED", "Entity context read failed.");
  }
}
