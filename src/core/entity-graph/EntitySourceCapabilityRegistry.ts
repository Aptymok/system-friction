import type { EntityRelationType, SfiEntityType } from "@/core/contracts";
import type { EntityGraphRow, EntityGraphSourceTable } from "./EntityGraphService";

export type EntitySourceSensitivity = "PUBLIC" | "INTERNAL" | "FOUNDER";

export interface EntitySourceCapability {
  table: EntityGraphSourceTable;
  entityTypes: SfiEntityType[];
  knownColumns: string[];
  temporalFields: string[];
  derivableRelations: EntityRelationType[];
  sensitivity: EntitySourceSensitivity;
  required: boolean;
}

export interface EntityTypeResolverDefinition {
  entityType: SfiEntityType;
  primarySources: EntityGraphSourceTable[];
  contextSources: EntityGraphSourceTable[];
  relationSources: EntityGraphSourceTable[];
  optionalSources: EntityGraphSourceTable[];
  acceptedIdFields: string[];
  relations: EntityRelationType[];
  sensitivity: EntitySourceSensitivity;
  publicableByDefault: boolean;
}

export interface EntityTypeResolver extends EntityTypeResolverDefinition {
  sources(): EntityGraphSourceTable[];
  identitySources(): EntityGraphSourceTable[];
  contextReadSources(includeRelationships: boolean): EntityGraphSourceTable[];
  resolveIdentity(entityId: string, rows: EntityGraphRow[]): EntityGraphRow | null;
  resolveContextFragments(rows: EntityGraphRow[]): EntityGraphRow[];
}

export const SUPPORTED_ENTITY_TYPES: SfiEntityType[] = [
  "OBSERVATION",
  "EVIDENCE",
  "EVENT",
  "AGENT",
  "AGENT_EXECUTION",
  "CAPABILITY",
  "PHENOMENON",
  "HYPOTHESIS",
  "PREDICTION",
  "FORMULA",
  "MEMORY",
  "ORGANIZATION",
  "REPORT",
  "STATE",
  "GOVERNANCE_DECISION",
];

export function isSupportedEntityType(value: unknown): value is SfiEntityType {
  return typeof value === "string" && SUPPORTED_ENTITY_TYPES.includes(value as SfiEntityType);
}

export const SOURCE_CAPABILITIES: Record<EntityGraphSourceTable, EntitySourceCapability> = {
  sfi_phenomena: {
    table: "sfi_phenomena",
    entityTypes: ["PHENOMENON"],
    knownColumns: ["id", "title", "name", "created_at", "updated_at", "confidence", "publicable"],
    temporalFields: ["created_at", "updated_at"],
    derivableRelations: ["CONTAINS"],
    sensitivity: "INTERNAL",
    required: true,
  },
  root_observation_events: {
    table: "root_observation_events",
    entityTypes: ["OBSERVATION", "PHENOMENON"],
    knownColumns: ["id", "entity_id", "phenomenon_id", "observedAt", "observed_at", "created_at", "logbook_id"],
    temporalFields: ["observedAt", "observed_at", "created_at"],
    derivableRelations: ["OBSERVES"],
    sensitivity: "FOUNDER",
    required: false,
  },
  root_evidence_entries: {
    table: "root_evidence_entries",
    entityTypes: ["EVIDENCE", "OBSERVATION", "HYPOTHESIS"],
    knownColumns: ["id", "entity_id", "phenomenon_id", "observation_id", "hypothesis_id", "agent_id", "created_at", "confidence"],
    temporalFields: ["created_at"],
    derivableRelations: ["DERIVED_FROM", "SUPPORTS", "PRODUCES"],
    sensitivity: "FOUNDER",
    required: false,
  },
  sfi_evidence_ledger: {
    table: "sfi_evidence_ledger",
    entityTypes: ["EVIDENCE", "OBSERVATION", "HYPOTHESIS"],
    knownColumns: ["id", "evidence_id", "entity_id", "phenomenon_id", "observation_id", "hypothesis_id", "created_at", "confidence"],
    temporalFields: ["created_at"],
    derivableRelations: ["DERIVED_FROM", "SUPPORTS"],
    sensitivity: "FOUNDER",
    required: false,
  },
  sfi_prediction_entries: {
    table: "sfi_prediction_entries",
    entityTypes: ["PREDICTION", "HYPOTHESIS"],
    knownColumns: ["id", "entity_id", "hypothesis_id", "created_at", "generatedAt", "confidence"],
    temporalFields: ["created_at", "generatedAt", "generated_at"],
    derivableRelations: ["DERIVED_FROM"],
    sensitivity: "INTERNAL",
    required: false,
  },
  sfi_prediction_verifications: {
    table: "sfi_prediction_verifications",
    entityTypes: ["PREDICTION", "EVIDENCE"],
    knownColumns: ["id", "prediction_id", "evidence_id", "verifiedAt", "verified_at", "confidence"],
    temporalFields: ["verifiedAt", "verified_at", "created_at"],
    derivableRelations: ["VERIFIED_BY"],
    sensitivity: "INTERNAL",
    required: false,
  },
  sfi_predictive_learning_events: {
    table: "sfi_predictive_learning_events",
    entityTypes: ["PREDICTION", "EVENT"],
    knownColumns: ["id", "prediction_id", "event_id", "created_at", "timestamp", "confidence"],
    temporalFields: ["timestamp", "created_at"],
    derivableRelations: ["UPDATES"],
    sensitivity: "INTERNAL",
    required: false,
  },
  epistemic_events: {
    table: "epistemic_events",
    entityTypes: ["EVENT", "AGENT", "PHENOMENON", "PREDICTION", "MEMORY"],
    knownColumns: ["id", "event_id", "entity_id", "agent_id", "logbook_id", "event_name", "timestamp", "occurred_at", "created_at"],
    temporalFields: ["timestamp", "occurred_at", "created_at"],
    derivableRelations: ["GENERATED_BY", "UPDATES"],
    sensitivity: "FOUNDER",
    required: false,
  },
  sfi_amv_memory: {
    table: "sfi_amv_memory",
    entityTypes: ["MEMORY", "PHENOMENON", "EVIDENCE"],
    knownColumns: ["id", "entity_id", "phenomenon_id", "evidence_id", "created_at", "logbook_id", "confidence"],
    temporalFields: ["created_at"],
    derivableRelations: ["DERIVED_FROM"],
    sensitivity: "FOUNDER",
    required: false,
  },
  root_agents: {
    table: "root_agents",
    entityTypes: ["AGENT"],
    knownColumns: ["id", "agent_id", "agent_key", "name", "capabilities", "created_at"],
    temporalFields: ["created_at"],
    derivableRelations: ["EXECUTES", "PRODUCES"],
    sensitivity: "INTERNAL",
    required: true,
  },
  root_audit_events: {
    table: "root_audit_events",
    entityTypes: ["GOVERNANCE_DECISION", "EVENT", "AGENT", "PHENOMENON"],
    knownColumns: ["id", "entity_id", "target_id", "agent_id", "logbook_id", "status", "decision", "timestamp", "created_at"],
    temporalFields: ["timestamp", "created_at"],
    derivableRelations: ["APPROVES", "REJECTS", "UPDATES"],
    sensitivity: "FOUNDER",
    required: false,
  },
  sfi_phenomenon_evidence: {
    table: "sfi_phenomenon_evidence",
    entityTypes: ["PHENOMENON", "EVIDENCE"],
    knownColumns: ["id", "phenomenon_id", "evidence_id", "created_at", "confidence"],
    temporalFields: ["created_at"],
    derivableRelations: ["CONTAINS"],
    sensitivity: "FOUNDER",
    required: false,
  },
  field_cases: {
    table: "field_cases",
    entityTypes: ["PHENOMENON", "ORGANIZATION"],
    knownColumns: ["id", "entity_id", "organization_id", "created_at", "updated_at"],
    temporalFields: ["created_at", "updated_at"],
    derivableRelations: ["CONTAINS", "IMPACTS"],
    sensitivity: "FOUNDER",
    required: false,
  },
  worldspect_snapshots: {
    table: "worldspect_snapshots",
    entityTypes: ["OBSERVATION", "REPORT"],
    knownColumns: ["id", "entity_id", "generatedAt", "generated_at", "created_at"],
    temporalFields: ["generatedAt", "generated_at", "created_at"],
    derivableRelations: ["DERIVED_FROM"],
    sensitivity: "INTERNAL",
    required: false,
  },
  world_vector_observations: {
    table: "world_vector_observations",
    entityTypes: ["OBSERVATION", "PHENOMENON"],
    knownColumns: ["id", "entity_id", "observedAt", "observed_at", "created_at", "logbook_id"],
    temporalFields: ["observedAt", "observed_at", "created_at"],
    derivableRelations: ["OBSERVES"],
    sensitivity: "INTERNAL",
    required: false,
  },
};

export const ENTITY_RESOLVER_DEFINITIONS: Record<string, EntityTypeResolverDefinition> = {
  PHENOMENON: {
    entityType: "PHENOMENON",
    primarySources: ["sfi_phenomena"],
    contextSources: [
      "root_observation_events",
      "root_evidence_entries",
      "sfi_evidence_ledger",
      "sfi_prediction_entries",
      "sfi_prediction_verifications",
      "sfi_predictive_learning_events",
      "root_audit_events",
      "sfi_amv_memory",
    ],
    relationSources: ["sfi_phenomenon_evidence", "epistemic_events"],
    optionalSources: ["root_agents", "field_cases", "world_vector_observations"],
    acceptedIdFields: [
      "id",
      "phenomenon_id",
      "phenomenonId",
      "entity_id",
      "subject_entity_id",
      "payload.phenomenon",
      "payload.phenomenon_id",
      "payload.phenomenonId",
      "provenance.originId",
    ],
    relations: ["OBSERVES", "CONTAINS"],
    sensitivity: "INTERNAL",
    publicableByDefault: false,
  },
  OBSERVATION: {
    entityType: "OBSERVATION",
    primarySources: ["root_observation_events", "world_vector_observations", "worldspect_snapshots"],
    contextSources: ["root_evidence_entries", "sfi_evidence_ledger"],
    relationSources: ["root_evidence_entries", "sfi_evidence_ledger"],
    optionalSources: [],
    acceptedIdFields: ["id", "observation_id", "entity_id"],
    relations: ["OBSERVES", "SUPPORTS"],
    sensitivity: "INTERNAL",
    publicableByDefault: false,
  },
  EVIDENCE: {
    entityType: "EVIDENCE",
    primarySources: ["root_evidence_entries", "sfi_evidence_ledger", "sfi_phenomenon_evidence"],
    contextSources: ["sfi_prediction_verifications"],
    relationSources: ["sfi_prediction_verifications"],
    optionalSources: ["sfi_amv_memory"],
    acceptedIdFields: ["id", "evidence_id", "entity_id"],
    relations: ["DERIVED_FROM", "SUPPORTS"],
    sensitivity: "FOUNDER",
    publicableByDefault: false,
  },
  PREDICTION: {
    entityType: "PREDICTION",
    primarySources: ["sfi_prediction_entries"],
    contextSources: ["sfi_prediction_verifications", "sfi_predictive_learning_events"],
    relationSources: ["sfi_prediction_verifications"],
    optionalSources: ["epistemic_events"],
    acceptedIdFields: ["id", "prediction_id", "entity_id"],
    relations: ["DERIVED_FROM", "VERIFIED_BY"],
    sensitivity: "INTERNAL",
    publicableByDefault: false,
  },
  AGENT: {
    entityType: "AGENT",
    primarySources: ["root_agents"],
    contextSources: ["epistemic_events", "root_audit_events"],
    relationSources: ["epistemic_events", "root_audit_events"],
    optionalSources: [],
    acceptedIdFields: ["id", "agent_id", "agent_key"],
    relations: ["EXECUTES", "PRODUCES"],
    sensitivity: "INTERNAL",
    publicableByDefault: false,
  },
  AGENT_EXECUTION: {
    entityType: "AGENT_EXECUTION",
    primarySources: ["epistemic_events"],
    contextSources: ["root_agents"],
    relationSources: ["root_agents"],
    optionalSources: [],
    acceptedIdFields: ["id", "event_id", "logbook_id"],
    relations: ["EXECUTED_BY"],
    sensitivity: "FOUNDER",
    publicableByDefault: false,
  },
  MEMORY: {
    entityType: "MEMORY",
    primarySources: ["sfi_amv_memory"],
    contextSources: ["epistemic_events", "root_evidence_entries"],
    relationSources: ["root_evidence_entries"],
    optionalSources: [],
    acceptedIdFields: ["id", "entity_id", "logbook_id"],
    relations: ["DERIVED_FROM"],
    sensitivity: "FOUNDER",
    publicableByDefault: false,
  },
  EVENT: {
    entityType: "EVENT",
    primarySources: ["epistemic_events", "root_audit_events"],
    contextSources: ["root_agents"],
    relationSources: ["root_agents"],
    optionalSources: [],
    acceptedIdFields: ["id", "event_id", "logbook_id"],
    relations: ["GENERATED_BY", "UPDATES"],
    sensitivity: "FOUNDER",
    publicableByDefault: false,
  },
  GOVERNANCE_DECISION: {
    entityType: "GOVERNANCE_DECISION",
    primarySources: ["root_audit_events"],
    contextSources: ["epistemic_events"],
    relationSources: ["epistemic_events"],
    optionalSources: [],
    acceptedIdFields: ["id", "entity_id", "target_id", "logbook_id"],
    relations: ["APPROVES", "REJECTS"],
    sensitivity: "FOUNDER",
    publicableByDefault: false,
  },
  ORGANIZATION: {
    entityType: "ORGANIZATION",
    primarySources: ["field_cases"],
    contextSources: ["root_observation_events", "root_evidence_entries"],
    relationSources: ["root_observation_events", "root_evidence_entries"],
    optionalSources: [],
    acceptedIdFields: ["id", "organization_id", "entity_id"],
    relations: ["CONTAINS", "IMPACTS"],
    sensitivity: "FOUNDER",
    publicableByDefault: false,
  },
  REPORT: {
    entityType: "REPORT",
    primarySources: ["worldspect_snapshots"],
    contextSources: ["sfi_amv_memory", "root_evidence_entries"],
    relationSources: ["sfi_amv_memory", "root_evidence_entries"],
    optionalSources: [],
    acceptedIdFields: ["id", "report_id", "entity_id"],
    relations: ["DERIVED_FROM"],
    sensitivity: "INTERNAL",
    publicableByDefault: false,
  },
  FORMULA: {
    entityType: "FORMULA",
    primarySources: ["sfi_evidence_ledger"],
    contextSources: [],
    relationSources: [],
    optionalSources: [],
    acceptedIdFields: ["id", "formula_id", "entity_id"],
    relations: ["DERIVED_FROM"],
    sensitivity: "INTERNAL",
    publicableByDefault: false,
  },
};

export function createStaticEntityResolver(entityType: SfiEntityType): EntityTypeResolver {
  const definition = ENTITY_RESOLVER_DEFINITIONS[entityType] ?? {
    entityType,
    primarySources: [],
    contextSources: [],
    relationSources: [],
    optionalSources: [],
    acceptedIdFields: ["id", "entity_id"],
    relations: [],
    sensitivity: "FOUNDER" as const,
    publicableByDefault: false,
  };

  return {
    ...definition,
    sources() {
      return [...new Set([...definition.primarySources, ...definition.contextSources, ...definition.relationSources])];
    },
    identitySources() {
      return [...definition.primarySources];
    },
    contextReadSources(includeRelationships: boolean) {
      return [
        ...new Set([
          ...definition.primarySources,
          ...definition.contextSources,
          ...(includeRelationships ? definition.relationSources : []),
        ]),
      ];
    },
    resolveIdentity(entityId: string, rows: EntityGraphRow[]) {
      const primarySet = new Set(definition.primarySources);
      const candidate = (
        rows.find((row) => primarySet.has(row.sourceTable) && row.sourceId === entityId) ??
        rows.find((row) => primarySet.has(row.sourceTable)) ??
        rows[0] ??
        null
      );
      return candidate && satisfiesSemanticMinimum(definition.entityType, candidate) ? candidate : null;
    },
    resolveContextFragments(rows: EntityGraphRow[]) {
      const allowed = new Set([...definition.primarySources, ...definition.contextSources, ...definition.relationSources]);
      return rows.filter((row) => allowed.has(row.sourceTable));
    },
  };
}

function recordString(row: EntityGraphRow, key: string): string | undefined {
  const value = row.payload[key];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function recordArray(row: EntityGraphRow, key: string): unknown[] {
  const value = row.payload[key];
  return Array.isArray(value) ? value : [];
}

function satisfiesSemanticMinimum(entityType: SfiEntityType, row: EntityGraphRow): boolean {
  if (entityType === "REPORT") {
    const hasIdentity = Boolean(row.sourceId || recordString(row, "report_id") || recordString(row, "id"));
    const hasTitle = Boolean(recordString(row, "title") || recordString(row, "description") || recordString(row, "summary"));
    const hasSubject = Boolean(
      recordString(row, "phenomenon_id") ||
      recordString(row, "entity_id") ||
      recordString(row, "source_id") ||
      recordArray(row, "source_ids").length > 0
    );
    const hasDate = Boolean(recordString(row, "generatedAt") || recordString(row, "generated_at") || recordString(row, "created_at"));
    const hasProvenance = Boolean(row.trace?.logbookId || row.logbookId || recordString(row, "provenance") || recordString(row, "source_id"));
    return hasIdentity && hasTitle && hasSubject && hasDate && hasProvenance;
  }

  if (entityType === "FORMULA") {
    const hasFormulaId = Boolean(row.sourceId || recordString(row, "formula_id") || recordString(row, "id"));
    const hasOwner = Boolean(recordString(row, "owner") || recordString(row, "owner_id") || recordString(row, "evaluator_id"));
    const hasInputs = recordArray(row, "inputs").length > 0 || Boolean(recordString(row, "input_schema"));
    const hasOutput = Boolean(recordString(row, "output") || recordString(row, "output_schema") || recordString(row, "result_field"));
    const hasImplementation = Boolean(recordString(row, "implementation") || recordString(row, "canonical_reference") || recordString(row, "formula_ref"));
    return hasFormulaId && hasOwner && hasInputs && hasOutput && hasImplementation;
  }

  return true;
}

export function primaryIdentitySources(): EntityGraphSourceTable[] {
  return [
    ...new Set(
      Object.values(ENTITY_RESOLVER_DEFINITIONS).flatMap((definition) => definition.primarySources)
    ),
  ];
}

export function inferEntityTypeFromSource(table: EntityGraphSourceTable): SfiEntityType {
  return SOURCE_CAPABILITIES[table]?.entityTypes[0] ?? "STATE";
}

export function resolverForEntityType(entityType: SfiEntityType): EntityTypeResolver {
  return createStaticEntityResolver(entityType);
}

export function sourcesSkippedForResolver(resolver: EntityTypeResolver): EntityGraphSourceTable[] {
  const consulted = new Set(resolver.sources());
  return (Object.keys(SOURCE_CAPABILITIES) as EntityGraphSourceTable[]).filter((table) => !consulted.has(table));
}
