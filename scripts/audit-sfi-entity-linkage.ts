import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createEntityContextService, resolverForEntityType, type EntityGraphSourceTable } from "../src/core/entity-graph";
import { createServiceSupabaseClient } from "../src/runtime/supabase/server";

const PHENOMENON_ID = "e57f7f57-43d0-4c34-9015-e827e2a231c5";
const EVIDENCE_ID = "afe5f7cb-3a9a-49cd-bfac-a35ee204a654";

type AbsenceClassification =
  | "NO_RECORD"
  | "RECORD_EXISTS_UNLINKED"
  | "BROKEN_REFERENCE"
  | "LEGACY_SCHEMA"
  | "MISSING_PROVENANCE"
  | "MISSING_LOGBOOK"
  | "MISSING_ENTITY_ID"
  | "NOT_APPLICABLE";

type JsonFieldSpec = Record<string, string[]>;

type TableAuditSpec = {
  table: EntityGraphSourceTable;
  directFields: string[];
  jsonFields: JsonFieldSpec;
  recommendedCanonicalLink: string;
};

type MatchedRow = {
  sourceId: string;
  matchedBy: string;
  matchedValue: string;
  row: Record<string, unknown>;
};

type TableAudit = {
  table: string;
  rowsInspected: number;
  tableRowsAvailable: number;
  exactMatches: Array<{ sourceId: string; matchedBy: string; matchedValue: string }>;
  candidateReferences: Array<{ sourceId: string; matchedBy: string; matchedValue: string; reason: string }>;
  brokenReferences: string[];
  missingForeignKeys: string[];
  availableLinkFields: string[];
  recommendedCanonicalLink: string;
};

type LinkageAudit = {
  selectedPhenomenonId: string;
  selectedEvidenceId: string;
  aliases: string[];
  generatedAt: string;
  tables: TableAudit[];
  emptySectionClassification: Record<string, AbsenceClassification>;
  recordsFoundButUnlinked: Array<{ table: string; sourceId: string; reason: string }>;
  brokenReferences: string[];
  aliasesAdded: string[];
  relationsRetired: string[];
  trajectory: {
    status: string;
    trajectoryKind: string;
    timestamps: Array<{
      timestamp: string;
      sourceEntityId: string;
      sourceType: string;
      position: number;
      positionSource: unknown;
      confidence: number;
    }>;
    velocity: number;
    velocityUnit: string;
    acceleration: number;
    accelerationUnit: string;
    projectionMethod: string;
    projectedCount: number;
    operationalReason: string;
  };
  contextCompleteness: {
    score: number;
    sectionsApplicable: string[];
    sectionsPresent: string[];
    sectionsMissing: string[];
    sectionsUnlinked: string[];
    sectionsNotApplicable: string[];
  };
  backfillPlan: Array<{
    table: string;
    record: string;
    missingKey: string;
    derivedValue: string;
    verifiableSource: string;
    confidence: number;
    logbookId: string | null;
    auditRequired: string;
    authorizedWriter: string;
    status: "PLANNED_NOT_EXECUTED" | "BLOCKED";
  }>;
  backfillExecuted: false;
};

const TABLE_SPECS: TableAuditSpec[] = [
  {
    table: "sfi_phenomena",
    directFields: ["id", "phenomenon_key"],
    jsonFields: {},
    recommendedCanonicalLink: "sfi_phenomena.id is the PHENOMENON identity; related rows should reference phenomenon_id or an observation bridge.",
  },
  {
    table: "root_observation_events",
    directFields: ["id", "phenomenon_id", "phenomenonId", "entity_id", "subject_entity_id", "logbook_id"],
    jsonFields: { linked: ["id"], evidence_used: ["id"], provenance: ["originId"] },
    recommendedCanonicalLink: "root_observation_events.phenomenon_id -> sfi_phenomena.id, then evidence.observation_id -> observation.id.",
  },
  {
    table: "root_evidence_entries",
    directFields: ["id", "phenomenon_id", "phenomenonId", "entity_id", "subject_entity_id", "observation_id", "evidence_id", "epistemic_event_id"],
    jsonFields: { payload: ["phenomenon", "phenomenon_id", "phenomenonId", "observation_id", "evidence_id"], provenance: ["originId", "originTable"] },
    recommendedCanonicalLink: "Prefer evidence.observation_id -> root_observation_events.id; phenomenon aliases remain contextual until an observation bridge or authorized canonical key exists.",
  },
  {
    table: "sfi_phenomenon_evidence",
    directFields: ["id", "phenomenon_id", "evidence_id"],
    jsonFields: {},
    recommendedCanonicalLink: "Bridge row phenomenon_id + evidence_id if the institutional writer authorizes contextual evidence membership.",
  },
  {
    table: "sfi_prediction_entries",
    directFields: ["id", "case_id", "hypothesis_id", "entity_id", "phenomenon_id", "logbook_id"],
    jsonFields: { provenance: ["originId"], payload: ["phenomenon_id", "phenomenonId", "evidence_id"] },
    recommendedCanonicalLink: "Prediction rows should reference entity_id/phenomenon_id or hypothesis/evidence provenance explicitly.",
  },
  {
    table: "sfi_prediction_verifications",
    directFields: ["id", "prediction_entry_id", "hypothesis_id", "logbook_id"],
    jsonFields: { verification_rule: ["entity"], source_value: ["observation_id", "evidence_id", "phenomenon", "phenomenon_id", "entity_id"] },
    recommendedCanonicalLink: "Verification remains a PREDICTION fragment and may create VERIFIED_BY only with evidence_id.",
  },
  {
    table: "sfi_predictive_learning_events",
    directFields: ["id", "run_id", "outcome_id", "model_id", "prediction_id", "logbook_id"],
    jsonFields: { error_analysis: ["evidence_id", "phenomenon_id"], parameter_delta: ["phenomenon_id"] },
    recommendedCanonicalLink: "Learning events need prediction_id or hypothesis provenance before joining this PHENOMENON context.",
  },
  {
    table: "epistemic_events",
    directFields: ["id", "event_id", "logbook_id", "node_id", "actor_id"],
    jsonFields: { payload: ["entityId", "entity_id", "phenomenon", "phenomenon_id", "prediction_id", "hypothesis_id", "agent_id", "event_id", "evidence_id"], source: ["sourceId"] },
    recommendedCanonicalLink: "Use event payload/source IDs, logbook_id, or epistemic_event_id; never use textual event content.",
  },
  {
    table: "sfi_amv_memory",
    directFields: ["id", "session_id", "module", "logbook_id", "entity_id", "phenomenon_id", "evidence_id"],
    jsonFields: { inference: ["entity_id", "phenomenon_id", "evidence_id"], memory_delta: ["entityId", "entity_id", "traceId", "phenomenon", "evidence_id"] },
    recommendedCanonicalLink: "Memory must expose provenance through entity/evidence/prediction/logbook fields before joining this context.",
  },
  {
    table: "root_audit_events",
    directFields: ["id", "actor_id", "target"],
    jsonFields: { payload: ["entity_id", "target_id", "phenomenon_id", "evidence_id", "prediction_id", "agent_id"] },
    recommendedCanonicalLink: "Governance decisions need target/entity/evidence IDs in payload, not action text.",
  },
  {
    table: "root_agents",
    directFields: ["id", "agent_id", "agent_key"],
    jsonFields: {},
    recommendedCanonicalLink: "Agents join only through execution/event/evidence producer IDs.",
  },
];

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function stableRowId(row: Record<string, unknown>, fallback: string) {
  return stringValue(row.id) ?? stringValue(row.event_id) ?? stringValue(row.hypothesis_id) ?? fallback;
}

function uniqueRows(rows: MatchedRow[]) {
  const seen = new Set<string>();
  return rows.filter((item) => {
    const key = `${item.sourceId}:${item.matchedBy}:${item.matchedValue}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => `${a.sourceId}:${a.matchedBy}`.localeCompare(`${b.sourceId}:${b.matchedBy}`));
}

function rowSummary(row: MatchedRow) {
  return {
    sourceId: row.sourceId,
    matchedBy: row.matchedBy,
    matchedValue: row.matchedValue,
  };
}

function isCandidateReference(match: MatchedRow) {
  return match.matchedBy.startsWith("payload.") || match.matchedBy.startsWith("provenance.") || match.matchedBy === "phenomenon_key";
}

function availableLinkFields(row: Record<string, unknown> | null, spec: TableAuditSpec) {
  const keys = new Set<string>([...spec.directFields]);
  for (const [jsonColumn, nestedKeys] of Object.entries(spec.jsonFields)) {
    for (const nestedKey of nestedKeys) keys.add(`${jsonColumn}.${nestedKey}`);
  }
  for (const key of Object.keys(row ?? {})) keys.add(key);
  return [...keys].sort();
}

function missingForeignKeys(table: string, matches: MatchedRow[]) {
  const missing = new Set<string>();
  for (const match of matches) {
    const row = match.row;
    const payload = asRecord(row.payload);
    if (table === "root_evidence_entries") {
      if (!stringValue(row.observation_id) && !stringValue(payload.observation_id)) missing.add(`${match.sourceId}:observation_id`);
      if (!stringValue(row.epistemic_event_id)) missing.add(`${match.sourceId}:epistemic_event_id`);
      if (!stringValue(row.phenomenon_id) && !stringValue(payload.phenomenon_id) && !stringValue(payload.phenomenonId)) missing.add(`${match.sourceId}:phenomenon_id`);
      if (!("provenance" in row)) missing.add(`${match.sourceId}:provenance`);
    }
    if (table === "sfi_phenomena") {
      if (!stringValue(row.logbook_id)) missing.add(`${match.sourceId}:logbook_id`);
      if (!stringValue(row.correlation_id)) missing.add(`${match.sourceId}:correlation_id`);
    }
  }
  return [...missing].sort();
}

async function queryDirect(supabase: ReturnType<typeof createServiceSupabaseClient>, spec: TableAuditSpec, field: string, value: string) {
  const { data, error } = await supabase.from(spec.table).select("*").eq(field, value).limit(25);
  if (error) return [];
  return (data ?? []).map((row, index) => ({
    sourceId: stableRowId(asRecord(row), `${spec.table}:${field}:${index}`),
    matchedBy: field,
    matchedValue: value,
    row: asRecord(row),
  }));
}

async function queryJson(supabase: ReturnType<typeof createServiceSupabaseClient>, spec: TableAuditSpec, jsonColumn: string, key: string, value: string) {
  const { data, error } = await supabase.from(spec.table).select("*").contains(jsonColumn, { [key]: value }).limit(25);
  if (error) return [];
  return (data ?? []).map((row, index) => ({
    sourceId: stableRowId(asRecord(row), `${spec.table}:${jsonColumn}.${key}:${index}`),
    matchedBy: `${jsonColumn}.${key}`,
    matchedValue: value,
    row: asRecord(row),
  }));
}

async function auditTable(supabase: ReturnType<typeof createServiceSupabaseClient>, spec: TableAuditSpec, aliases: string[]): Promise<TableAudit> {
  const { count } = await supabase.from(spec.table).select("*", { count: "exact", head: true });
  const { data: sample } = await supabase.from(spec.table).select("*").limit(1);
  const matches: MatchedRow[] = [];
  const sampleKeys = new Set(Object.keys(asRecord(sample?.[0] ?? null)));
  const directFields = spec.directFields.filter((field) => sampleKeys.has(field));
  const jsonFields = Object.fromEntries(
    Object.entries(spec.jsonFields).filter(([jsonColumn]) => sampleKeys.has(jsonColumn))
  );

  for (const value of aliases) {
    for (const field of directFields) {
      matches.push(...await queryDirect(supabase, spec, field, value));
    }
    for (const [jsonColumn, keys] of Object.entries(jsonFields)) {
      for (const key of keys) {
        matches.push(...await queryJson(supabase, spec, jsonColumn, key, value));
      }
    }
  }

  const unique = uniqueRows(matches);
  const exact = unique.filter((match) => !isCandidateReference(match));
  const candidates = unique.filter(isCandidateReference);
  const brokenReferences: string[] = [];
  if (spec.table === "root_evidence_entries") {
    for (const candidate of candidates) {
      const payload = asRecord(candidate.row.payload);
      if (candidate.sourceId === EVIDENCE_ID && stringValue(payload.phenomenon) === "operational_continuity_loss") {
        brokenReferences.push(`${EVIDENCE_ID}:payload.phenomenon resolves to phenomenon_key but no observation_id, phenomenon_id, logbook_id, or epistemic_event_id is present`);
      }
    }
  }
  if (spec.table === "sfi_phenomenon_evidence" && unique.length === 0) {
    brokenReferences.push(`missing bridge row for phenomenon_id=${PHENOMENON_ID} and evidence_id=${EVIDENCE_ID}`);
  }

  return {
    table: spec.table,
    rowsInspected: unique.length,
    tableRowsAvailable: count ?? 0,
    exactMatches: exact.map(rowSummary),
    candidateReferences: candidates.map((match) => ({
      ...rowSummary(match),
      reason: "Declared alias match; contextual until an ontology-valid bridge exists.",
    })),
    brokenReferences: brokenReferences.sort(),
    missingForeignKeys: missingForeignKeys(spec.table, unique),
    availableLinkFields: availableLinkFields(asRecord(sample?.[0] ?? null), spec),
    recommendedCanonicalLink: spec.recommendedCanonicalLink,
  };
}

function classifySections(auditTables: TableAudit[]): Record<string, AbsenceClassification> {
  const byTable = new Map(auditTables.map((table) => [table.table, table]));
  const observations = byTable.get("root_observation_events");
  const evidence = byTable.get("root_evidence_entries");
  const predictions = byTable.get("sfi_prediction_entries");
  const events = byTable.get("epistemic_events");
  const memory = byTable.get("sfi_amv_memory");
  const governance = byTable.get("root_audit_events");

  return {
    observations: observations && observations.exactMatches.length + observations.candidateReferences.length > 0 ? "BROKEN_REFERENCE" : "NO_RECORD",
    evidence: evidence && evidence.candidateReferences.length > 0 ? "LEGACY_SCHEMA" : "NO_RECORD",
    predictions: predictions && predictions.tableRowsAvailable > 0 ? "RECORD_EXISTS_UNLINKED" : "NO_RECORD",
    events: events && events.tableRowsAvailable > 0 ? "RECORD_EXISTS_UNLINKED" : "NO_RECORD",
    agents: "NOT_APPLICABLE",
    memory: memory && memory.tableRowsAvailable > 0 ? "RECORD_EXISTS_UNLINKED" : "NO_RECORD",
    governance: governance && governance.tableRowsAvailable > 0 ? "RECORD_EXISTS_UNLINKED" : "NO_RECORD",
  };
}

function buildBackfillPlan(auditTables: TableAudit[]): LinkageAudit["backfillPlan"] {
  const evidence = auditTables.find((table) => table.table === "root_evidence_entries");
  const plan: LinkageAudit["backfillPlan"] = [];
  if (evidence?.candidateReferences.some((item) => item.sourceId === EVIDENCE_ID && item.matchedBy === "payload.phenomenon")) {
    plan.push({
      table: "root_evidence_entries",
      record: EVIDENCE_ID,
      missingKey: "phenomenon_id",
      derivedValue: PHENOMENON_ID,
      verifiableSource: "root_evidence_entries.payload.phenomenon equals sfi_phenomena.phenomenon_key",
      confidence: 0.9,
      logbookId: null,
      auditRequired: "Confirm canonical evidence-to-phenomenon storage policy; this does not create an ontology relationship without observation bridge.",
      authorizedWriter: "Institutional evidence writer or InstitutionalEventPipeline after policy approval",
      status: "PLANNED_NOT_EXECUTED",
    });
    plan.push({
      table: "root_evidence_entries",
      record: EVIDENCE_ID,
      missingKey: "observation_id",
      derivedValue: "UNAVAILABLE",
      verifiableSource: "No root_observation_events row currently references the selected phenomenon or evidence.",
      confidence: 0,
      logbookId: null,
      auditRequired: "A real observation must exist before evidence can be canonically DERIVED_FROM observation.",
      authorizedWriter: "BLOCKED_PENDING_REAL_OBSERVATION_AND_INSTITUTIONAL_WRITER",
      status: "BLOCKED",
    });
  }
  return plan;
}

function assertNoDirectWrites() {
  const source = fs.readFileSync(new URL(import.meta.url), "utf8");
  assert.equal(/\.(insert|update|upsert|delete)\s*\(/.test(source), false, "linkage audit must not write directly");
}

async function buildAudit(): Promise<LinkageAudit> {
  loadEnvLocal();
  const supabase = createServiceSupabaseClient();
  const { data: phenomenonRows, error: phenomenonError } = await supabase
    .from("sfi_phenomena")
    .select("*")
    .eq("id", PHENOMENON_ID)
    .limit(1);
  assert.equal(phenomenonError, null, `selected phenomenon must be readable: ${phenomenonError?.message ?? ""}`);
  const phenomenon = asRecord(phenomenonRows?.[0]);
  assert.ok(phenomenon.id, "selected phenomenon must exist");

  const { data: evidenceRows, error: evidenceError } = await supabase
    .from("root_evidence_entries")
    .select("*")
    .eq("id", EVIDENCE_ID)
    .limit(1);
  assert.equal(evidenceError, null, `selected evidence must be readable: ${evidenceError?.message ?? ""}`);
  const evidence = asRecord(evidenceRows?.[0]);
  assert.ok(evidence.id, "selected evidence must exist");

  const evidencePayload = asRecord(evidence.payload);
  const aliases = [
    PHENOMENON_ID,
    EVIDENCE_ID,
    stringValue(phenomenon.phenomenon_key),
    stringValue(phenomenon.logbook_id),
    stringValue(phenomenon.correlation_id),
    stringValue(evidence.evidence_hash),
    stringValue(evidence.epistemic_event_id),
    stringValue(evidencePayload.phenomenon),
    stringValue(evidencePayload.phenomenon_id),
    stringValue(evidencePayload.phenomenonId),
  ].filter((value): value is string => Boolean(value));

  const tables = [];
  for (const spec of TABLE_SPECS) {
    tables.push(await auditTable(supabase, spec, [...new Set(aliases)]));
  }

  const context = await createEntityContextService().getEntityContext(PHENOMENON_ID, {
    entityType: "PHENOMENON",
    includeTimeline: true,
    includeTrajectory: true,
    includeRelationships: true,
    maxDepth: 2,
    maxEvents: 100,
  });
  assert.ok(context.ok && context.context, `EntityContext must resolve selected phenomenon, got ${context.code}`);

  return {
    selectedPhenomenonId: PHENOMENON_ID,
    selectedEvidenceId: EVIDENCE_ID,
    aliases: [...new Set(aliases)].sort(),
    generatedAt: new Date().toISOString(),
    tables,
    emptySectionClassification: classifySections(tables),
    recordsFoundButUnlinked: tables.flatMap((table) => table.candidateReferences.map((reference) => ({
      table: table.table,
      sourceId: reference.sourceId,
      reason: `${reference.matchedBy}=${reference.matchedValue}`,
    }))).sort((a, b) => `${a.table}:${a.sourceId}:${a.reason}`.localeCompare(`${b.table}:${b.sourceId}:${b.reason}`)),
    brokenReferences: tables.flatMap((table) => table.brokenReferences.map((reference) => `${table.table}:${reference}`)).sort(),
    aliasesAdded: [
      "phenomenonId",
      "payload.phenomenon_id",
      "payload.phenomenonId",
      "payload.phenomenon",
      "provenance.originId",
      "subject_entity_id",
    ],
    relationsRetired: ["PHENOMENON -> CONTAINS -> EVIDENCE"],
    trajectory: {
      status: context.context.trajectory.status,
      trajectoryKind: context.context.trajectory.trajectoryKind ?? "system_state_trajectory",
      timestamps: context.context.trajectory.timeline.map((point) => ({
        timestamp: point.timestamp,
        sourceEntityId: point.sourceEntityId,
        sourceType: point.sourceType,
        position: point.position,
        positionSource: point.payload?.positionSource,
        confidence: point.confidence,
      })),
      velocity: context.context.trajectory.velocity,
      velocityUnit: context.context.trajectory.velocityUnit,
      acceleration: context.context.trajectory.acceleration,
      accelerationUnit: context.context.trajectory.accelerationUnit,
      projectionMethod: context.context.trajectory.projectionMethod,
      projectedCount: context.context.trajectory.projected.length,
      operationalReason: "Two ordered institutional record timestamps are enough for an OPERATIONAL record timeline, but not for a projected system-state trajectory.",
    },
    contextCompleteness: {
      score: context.contextCompleteness.score,
      sectionsApplicable: context.contextCompleteness.sectionsApplicable,
      sectionsPresent: context.contextCompleteness.sectionsPresent,
      sectionsMissing: context.contextCompleteness.sectionsMissing,
      sectionsUnlinked: context.contextCompleteness.sectionsUnlinked,
      sectionsNotApplicable: context.contextCompleteness.sectionsNotApplicable,
    },
    backfillPlan: buildBackfillPlan(tables),
    backfillExecuted: false,
  };
}

function semanticDigest(audit: LinkageAudit) {
  return {
    selectedPhenomenonId: audit.selectedPhenomenonId,
    selectedEvidenceId: audit.selectedEvidenceId,
    aliases: audit.aliases,
    tables: audit.tables,
    emptySectionClassification: audit.emptySectionClassification,
    recordsFoundButUnlinked: audit.recordsFoundButUnlinked,
    brokenReferences: audit.brokenReferences,
    aliasesAdded: audit.aliasesAdded,
    relationsRetired: audit.relationsRetired,
    trajectory: audit.trajectory,
    contextCompleteness: audit.contextCompleteness,
    backfillPlan: audit.backfillPlan,
    backfillExecuted: audit.backfillExecuted,
  };
}

async function main() {
  assertNoDirectWrites();
  const audit = await buildAudit();
  const second = await buildAudit();
  assert.deepEqual(semanticDigest(second), semanticDigest(audit), "linkage audit must be deterministic except generatedAt");

  const allowedAliases = new Set(resolverForEntityType("PHENOMENON").acceptedIdFields);
  for (const alias of audit.aliasesAdded) {
    assert.ok(allowedAliases.has(alias), `${alias} must be declared in EntitySourceCapabilityRegistry`);
  }

  const context = await createEntityContextService().getEntityContext(PHENOMENON_ID, {
    entityType: "PHENOMENON",
    includeTimeline: true,
    includeTrajectory: true,
    includeRelationships: true,
    maxDepth: 2,
    maxEvents: 100,
  });
  assert.ok(context.context, "context required for QA assertions");
  assert.equal(context.context.relationships.some((relation) => relation.sourceId === PHENOMENON_ID && relation.targetId === EVIDENCE_ID && relation.relationType === "CONTAINS"), false, "non-canonical PHENOMENON CONTAINS EVIDENCE must be absent");
  assert.equal(context.ontologyViolationsRejected, 0, "resolver should not emit out-of-matrix relationships for this case");
  assert.equal(audit.recordsFoundButUnlinked.length > 0, true, "legacy/context references must be visible");
  assert.equal(audit.brokenReferences.length > 0, true, "broken references must be reported");
  assert.equal(audit.backfillExecuted, false, "audit must not execute backfill");
  assert.equal(audit.trajectory.trajectoryKind, "institutional_record_timeline", "trajectory must not be classified as system_state_trajectory");
  assert.equal(audit.trajectory.projectedCount, 0, "record timeline must not produce projection");
  assert.equal(JSON.stringify(audit).includes("[object Object]"), false, "audit must not leak [object Object]");

  console.log("qa:sfi-entity-linkage passed");
  console.log(JSON.stringify(audit, null, 2));
}

main().catch((error) => {
  console.error("qa:sfi-entity-linkage failed");
  console.error(error);
  process.exit(1);
});
