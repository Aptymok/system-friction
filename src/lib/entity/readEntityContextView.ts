import "server-only";

import { headers } from "next/headers";
import {
  createEntityContextService,
  isSupportedEntityType,
  isValidEntityGraphId,
  type EntityContextOptions,
  type EntityContextResult,
} from "@/core/entity-graph";
import type { SfiEntityType } from "@/core/contracts";
import { AccessDeniedError, requireFounder } from "@/lib/system/access/server";

export type EntityViewReadResult =
  | {
      ok: true;
      status: 200;
      result: EntityContextResult;
    }
  | {
      ok: false;
      status: 400 | 403 | 404 | 409 | 500;
      code: string;
      message: string;
      result?: EntityContextResult;
    };

export interface EntityViewReadInput {
  entityId: string;
  entityType?: string;
}

async function localEntityReadEnabled() {
  const expected = process.env.SFI_ENTITY_GRAPH_LOCAL_TOKEN;
  if (!expected) {
    return false;
  }

  const headerList = await headers();
  const host = headerList.get("host") ?? "";
  const hostname = host.split(":")[0];
  const loopback = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  return loopback && headerList.get("x-sfi-entity-graph-local-token") === expected;
}

async function authorizeEntityView() {
  if (await localEntityReadEnabled()) {
    return;
  }

  await requireFounder();
}

export async function readEntityContextView(input: EntityViewReadInput): Promise<EntityViewReadResult> {
  if (!isValidEntityGraphId(input.entityId)) {
    return {
      ok: false,
      status: 400,
      code: "INVALID_ENTITY_ID",
      message: "Entity id must be 1-160 characters using letters, numbers, colon, underscore, dash, or dot.",
    };
  }

  if (input.entityType && !isSupportedEntityType(input.entityType)) {
    return {
      ok: false,
      status: 400,
      code: "INVALID_ENTITY_TYPE",
      message: "entityType must match SfiEntityType.",
    };
  }

  try {
    await authorizeEntityView();
    const options: EntityContextOptions = {
      entityType: input.entityType ? (input.entityType as SfiEntityType) : undefined,
      includeTimeline: true,
      includeTrajectory: true,
      includeRelationships: true,
      maxDepth: 2,
      maxEvents: 100,
    };
    const result = await createEntityContextService().getEntityContext(input.entityId, options);

    if (!result.ok) {
      return {
        ok: false,
        status: result.code === "TYPE_MISMATCH" ? 409 : result.code === "INVALID_ENTITY_TYPE" || result.code === "INVALID_ID" ? 400 : 404,
        code: result.code,
        message: result.code === "TYPE_MISMATCH"
          ? "Entity type hint does not match the resolved institutional entity."
          : "Entity was not found in configured institutional sources.",
        result,
      };
    }

    return { ok: true, status: 200, result };
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return {
        ok: false,
        status: error.status === 404 ? 404 : 403,
        code: error.code === "AUTH_REQUIRED" ? "FORBIDDEN" : error.code,
        message: error.message,
      };
    }

    return {
      ok: false,
      status: 500,
      code: "ENTITY_VIEW_READ_FAILED",
      message: "Entity context view failed before producing a stable result.",
    };
  }
}
