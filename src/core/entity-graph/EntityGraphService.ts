import { createServiceSupabaseClient } from "@/runtime/supabase/server";
import type { EntityGraphLimitation, SfiTraceContext } from "@/core/contracts";

export const ENTITY_GRAPH_SOURCE_TABLES = [
  "root_observation_events",
  "root_evidence_entries",
  "sfi_evidence_ledger",
  "sfi_prediction_entries",
  "sfi_prediction_verifications",
  "sfi_predictive_learning_events",
  "epistemic_events",
  "sfi_amv_memory",
  "root_agents",
  "root_audit_events",
  "sfi_phenomena",
  "sfi_phenomenon_evidence",
  "field_cases",
  "worldspect_snapshots",
  "world_vector_observations",
] as const;

export type EntityGraphSourceTable = (typeof ENTITY_GRAPH_SOURCE_TABLES)[number];

export interface EntityGraphRow {
  sourceTable: EntityGraphSourceTable;
  sourceId: string;
  payload: Record<string, unknown>;
  matchedBy: string;
  confidence: number;
  trace?: SfiTraceContext;
  createdAt?: string;
  updatedAt?: string;
  logbookId?: string;
}

export interface EntityGraphSourceQueryOptions {
  maxRows?: number;
  tables?: EntityGraphSourceTable[];
}

export interface EntityGraphSourceResult {
  rows: EntityGraphRow[];
  limitations: EntityGraphLimitation[];
  sourcesConsulted: EntityGraphSourceTable[];
  sourcesSkipped: EntityGraphSourceTable[];
}

export interface EntityGraphReadSource {
  findByEntityId(entityId: string, options?: EntityGraphSourceQueryOptions): Promise<EntityGraphSourceResult>;
}

export function graphLimitation(input: {
  code: string;
  scope: string;
  source?: string;
  severity?: EntityGraphLimitation["severity"];
  message: string;
  recoverable?: boolean;
  requirement?: string;
}): EntityGraphLimitation {
  return {
    code: input.code,
    scope: input.scope,
    source: input.source,
    severity: input.severity ?? "WARNING",
    message: input.message,
    recoverable: input.recoverable ?? true,
    requirement: input.requirement,
  };
}

export function normalizeLimitations(limitations: EntityGraphLimitation[]): EntityGraphLimitation[] {
  const seen = new Set<string>();
  const normalized: EntityGraphLimitation[] = [];

  for (const limitation of limitations) {
    const key = `${limitation.code}:${limitation.source ?? "none"}:${limitation.scope}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push(limitation);
  }

  return normalized.sort((a, b) => `${a.scope}:${a.source ?? ""}:${a.code}`.localeCompare(`${b.scope}:${b.source ?? ""}:${b.code}`));
}

const TABLE_ID_COLUMNS: Record<EntityGraphSourceTable, string[]> = {
  root_observation_events: ["id", "phenomenon_id", "agent_key"],
  root_evidence_entries: ["id", "actor_id", "target_node_id", "epistemic_event_id"],
  sfi_evidence_ledger: ["id", "evidence_id", "formula_id"],
  sfi_prediction_entries: ["id", "case_id", "hypothesis_id", "created_by"],
  sfi_prediction_verifications: ["id", "prediction_entry_id", "hypothesis_id"],
  sfi_predictive_learning_events: ["id", "run_id", "outcome_id", "model_id", "created_by"],
  epistemic_events: ["id", "event_id", "entity_id", "logbook_id"],
  sfi_amv_memory: ["id", "session_id", "module"],
  root_agents: ["id", "agent_key"],
  root_audit_events: ["id", "actor_id", "target"],
  sfi_phenomena: ["id"],
  sfi_phenomenon_evidence: ["id", "phenomenon_id", "evidence_id"],
  field_cases: ["id", "entity_id", "organization_id"],
  worldspect_snapshots: ["id", "entity_id", "report_id", "logbook_id"],
  world_vector_observations: ["id", "entity_id", "logbook_id"],
};

const TABLE_JSON_ID_FIELDS: Partial<Record<EntityGraphSourceTable, Record<string, string[]>>> = {
  root_observation_events: {
    linked: ["id"],
    evidence_used: ["id"],
  },
  root_evidence_entries: {
    payload: ["phenomenon", "phenomenon_id", "phenomenonId", "entity_id", "subject_entity_id", "observation_id", "evidence_id", "hypothesis_id", "agent_id"],
  },
  sfi_evidence_ledger: {
    payload: ["phenomenon", "phenomenon_id", "phenomenonId", "entity_id", "subject_entity_id", "observation_id", "evidence_id", "hypothesis_id"],
  },
  sfi_prediction_verifications: {
    verification_rule: ["entity"],
    source_value: ["observation_id", "evidence_id", "phenomenon", "entity_id"],
  },
  epistemic_events: {
    payload: ["entityId", "entity_id", "phenomenon", "phenomenon_id", "prediction_id", "hypothesis_id", "agent_id", "event_id"],
    source: ["sourceId"],
  },
  sfi_amv_memory: {
    inference: ["entity_id", "phenomenon_id", "evidence_id"],
    memory_delta: ["entityId", "entity_id", "caseId", "traceId", "phenomenon"],
  },
  root_audit_events: {
    payload: ["entity_id", "target_id", "phenomenon_id", "evidence_id", "prediction_id", "agent_id"],
  },
};

export function isValidEntityGraphId(entityId: string): boolean {
  return /^[A-Za-z0-9:_\-.]{1,160}$/.test(entityId);
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

export function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function booleanValue(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

export function stableRowId(row: Record<string, unknown>, fallback: string): string {
  return (
    stringValue(row.id) ??
    stringValue(row.entity_id) ??
    stringValue(row.entityId) ??
    stringValue(row.node_id) ??
    stringValue(row.event_id) ??
    stringValue(row.logbook_id) ??
    fallback
  );
}

export function rowTrace(row: Record<string, unknown>): SfiTraceContext | undefined {
  const logbookId = stringValue(row.logbook_id) ?? stringValue(row.logbookId);
  const correlationId =
    stringValue(row.correlation_id) ??
    stringValue(row.correlationId) ??
    stringValue(row.trace_id) ??
    stringValue(row.traceId) ??
    logbookId;
  const initiatedBy = stringValue(row.initiated_by) ?? stringValue(row.initiatedBy) ?? stringValue(row.actor_id);
  const createdAt =
    stringValue(row.created_at) ??
    stringValue(row.createdAt) ??
    stringValue(row.timestamp) ??
    stringValue(row.observedAt);

  if (!logbookId || !correlationId || !initiatedBy || !createdAt) {
    return undefined;
  }

  return { logbookId, correlationId, initiatedBy, createdAt };
}

export function normalizeGraphRow(
  sourceTable: EntityGraphSourceTable,
  row: Record<string, unknown>,
  matchedBy: string,
  fallbackId: string
): EntityGraphRow {
  return {
    sourceTable,
    sourceId: stableRowId(row, fallbackId),
    payload: row,
    matchedBy,
    confidence: numberValue(row.confidence) ?? numberValue(row.score) ?? 1,
    trace: rowTrace(row),
    createdAt: stringValue(row.created_at) ?? stringValue(row.createdAt),
    updatedAt: stringValue(row.updated_at) ?? stringValue(row.updatedAt),
    logbookId: stringValue(row.logbook_id) ?? stringValue(row.logbookId),
  };
}

export class SupabaseEntityGraphReadSource implements EntityGraphReadSource {
  async findByEntityId(entityId: string, options: EntityGraphSourceQueryOptions = {}): Promise<EntityGraphSourceResult> {
    if (!isValidEntityGraphId(entityId)) {
      return {
        rows: [],
        limitations: [
          graphLimitation({
            code: "INVALID_ENTITY_ID",
            scope: "identity",
            severity: "ERROR",
            message: "Entity id does not match the Entity Graph id contract.",
            recoverable: false,
            requirement: "entityId must be 1-160 characters using letters, numbers, colon, underscore, dash, or dot.",
          }),
        ],
        sourcesConsulted: [],
        sourcesSkipped: [...ENTITY_GRAPH_SOURCE_TABLES],
      };
    }

    const supabase = createServiceSupabaseClient();
    const tables = options.tables ?? [...ENTITY_GRAPH_SOURCE_TABLES];
    const limit = Math.max(1, Math.min(options.maxRows ?? 5, 25));
    const rows: EntityGraphRow[] = [];
    const limitations: EntityGraphLimitation[] = [];
    const seen = new Set<string>();
    const sourcesConsulted: EntityGraphSourceTable[] = [];
    const unreadableTables: EntityGraphSourceTable[] = [];

    for (const table of tables) {
      let tableHadSuccessfulRead = false;
      sourcesConsulted.push(table);

      for (const column of TABLE_ID_COLUMNS[table]) {
        const { data, error } = await supabase.from(table).select("*").eq(column, entityId).limit(limit);

        if (error) {
          continue;
        }

        tableHadSuccessfulRead = true;

        for (const item of data ?? []) {
          const record = asRecord(item);
          const row = normalizeGraphRow(table, record, column, `${table}:${rows.length}`);
          const key = `${row.sourceTable}:${row.sourceId}`;
          if (!seen.has(key)) {
            seen.add(key);
            rows.push(row);
          }
        }
      }

      for (const [jsonColumn, keys] of Object.entries(TABLE_JSON_ID_FIELDS[table] ?? {})) {
        for (const key of keys) {
          const { data, error } = await supabase.from(table).select("*").contains(jsonColumn, { [key]: entityId }).limit(limit);

          if (error) {
            continue;
          }

          tableHadSuccessfulRead = true;

          for (const item of data ?? []) {
            const record = asRecord(item);
            const row = normalizeGraphRow(table, record, `${jsonColumn}.${key}`, `${table}:${rows.length}`);
            const rowKey = `${row.sourceTable}:${row.sourceId}`;
            if (!seen.has(rowKey)) {
              seen.add(rowKey);
              rows.push(row);
            }
          }
        }
      }

      if (!tableHadSuccessfulRead) {
        unreadableTables.push(table);
      }
    }

    if (unreadableTables.length > 0) {
      limitations.push(
        graphLimitation({
          code: "SELECTED_SOURCES_UNREADABLE",
          scope: "source_read",
          source: "selected_sources",
          severity: "INFO",
          message: `Selected sources could not be read through configured id fields: ${unreadableTables.join(", ")}.`,
          requirement: "Optional selected sources must degrade without blocking context assembly.",
        })
      );
    }

    const consulted = [...new Set(sourcesConsulted)];
    const consultedSet = new Set(consulted);

    return {
      rows,
      limitations: normalizeLimitations(limitations),
      sourcesConsulted: consulted,
      sourcesSkipped: ENTITY_GRAPH_SOURCE_TABLES.filter((table) => !consultedSet.has(table)),
    };
  }
}

export function createDefaultEntityGraphSource(): EntityGraphReadSource {
  return new SupabaseEntityGraphReadSource();
}
