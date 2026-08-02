import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  ENTITY_GRAPH_SOURCE_TABLES,
  createEntityContextService,
  graphLimitation,
  resolverForEntityType,
  type EntityContextResult,
  type EntityGraphReadSource,
  type EntityGraphRow,
  type EntityGraphSourceQueryOptions,
  type EntityGraphSourceTable,
} from "@/core/entity-graph";
import type { SfiEntityType } from "@/core/contracts";

class FixtureEntityGraphSource implements EntityGraphReadSource {
  readonly queries: Array<{ entityId: string; tables: EntityGraphSourceTable[] }> = [];

  constructor(private readonly rows: Record<string, EntityGraphRow[]>) {}

  resetQueries() {
    this.queries.length = 0;
  }

  async findByEntityId(entityId: string, options: EntityGraphSourceQueryOptions = {}) {
    const tables = options.tables ?? [...ENTITY_GRAPH_SOURCE_TABLES];
    this.queries.push({ entityId, tables });
    const selected = new Set(tables);
    const rows = (this.rows[entityId] ?? []).filter((row) => selected.has(row.sourceTable));
    const consulted = [...new Set(tables)];
    const consultedSet = new Set(consulted);

    return {
      rows,
      limitations: [
        graphLimitation({
          code: "FIXTURE_DUPLICATE_LIMITATION",
          scope: "fixture",
          source: "fixture",
          severity: "INFO",
          message: "Duplicate fixture limitation for normalization QA.",
          requirement: "Limitations must deduplicate by code + source + scope.",
        }),
        graphLimitation({
          code: "FIXTURE_DUPLICATE_LIMITATION",
          scope: "fixture",
          source: "fixture",
          severity: "INFO",
          message: "Duplicate fixture limitation for normalization QA.",
          requirement: "Limitations must deduplicate by code + source + scope.",
        }),
      ],
      sourcesConsulted: consulted,
      sourcesSkipped: ENTITY_GRAPH_SOURCE_TABLES.filter((table) => !consultedSet.has(table)),
    };
  }
}

const trace = {
  logbookId: "logbook-entity-graph-qa",
  correlationId: "trace-entity-graph-qa",
  initiatedBy: "qa:sfi-entity-graph",
  createdAt: "2026-01-01T00:00:00.000Z",
};

function row(sourceTable: EntityGraphRow["sourceTable"], sourceId: string, payload: Record<string, unknown>): EntityGraphRow {
  return {
    sourceTable,
    sourceId,
    payload,
    matchedBy: "fixture",
    confidence: typeof payload.confidence === "number" ? payload.confidence : 0.8,
    trace,
    createdAt: typeof payload.created_at === "string" ? payload.created_at : "2026-01-01T00:00:00.000Z",
    logbookId: trace.logbookId,
  };
}

const rowsByEntity: Record<string, EntityGraphRow[]> = {
  "phenomenon-1": [
    row("sfi_phenomena", "phenomenon-1", { id: "phenomenon-1", title: "QA phenomenon", created_at: "2026-01-01T00:00:00.000Z", confidence: 0.9 }),
    row("root_observation_events", "obs-1", {
      id: "obs-1",
      phenomenon_id: "phenomenon-1",
      source_id: "obs-1",
      sourceType: "OBSERVATION",
      target_id: "phenomenon-1",
      targetType: "PHENOMENON",
      relation_type: "SUPPORTS",
      observedAt: "2026-01-02T00:00:00.000Z",
      signal: { metric: "friction", value: 0.42 },
      confidence: 0.7,
    }),
    row("root_evidence_entries", "evidence-1", {
      id: "evidence-1",
      observation_id: "obs-1",
      hypothesis_id: "hypothesis-1",
      agent_id: "agent-1",
      created_at: "2026-01-03T00:00:00.000Z",
      assessment: "Observed friction is supported by fixture signal.",
      confidence: 0.82,
    }),
    row("sfi_prediction_entries", "pred-1", {
      id: "pred-1",
      entity_id: "phenomenon-1",
      hypothesis_id: "hypothesis-1",
      created_at: "2026-01-04T00:00:00.000Z",
      statement: "Friction remains detectable if no intervention occurs.",
      confidence: 0.72,
    }),
    row("root_audit_events", "decision-1", {
      id: "decision-1",
      entity_id: "phenomenon-1",
      target_id: "phenomenon-1",
      status: "APPROVED",
      reason: "Fixture governance decision.",
      timestamp: "2026-01-05T00:00:00.000Z",
      confidence: 0.88,
    }),
  ],
  "obs-fixture": [
    row("root_observation_events", "obs-fixture", {
      id: "obs-fixture",
      phenomenon_id: "phenomenon-1",
      observedAt: "2026-02-01T00:00:00.000Z",
      signal: { value: 0.5 },
      confidence: 0.6,
    }),
    row("root_evidence_entries", "evidence-for-obs", {
      id: "evidence-for-obs",
      observation_id: "obs-fixture",
      hypothesis_id: "hypothesis-obs",
      created_at: "2026-02-02T00:00:00.000Z",
      confidence: 0.65,
    }),
  ],
  "evidence-fixture": [
    row("root_evidence_entries", "evidence-fixture", {
      id: "evidence-fixture",
      observation_id: "obs-fixture",
      hypothesis_id: "hypothesis-evidence",
      agent_id: "agent-fixture",
      created_at: "2026-03-01T00:00:00.000Z",
      confidence: 0.77,
    }),
  ],
  "prediction-fixture": [
    row("sfi_prediction_entries", "prediction-fixture", {
      id: "prediction-fixture",
      hypothesis_id: "hypothesis-prediction",
      created_at: "2026-04-01T00:00:00.000Z",
      statement: "Prediction fixture statement.",
      confidence: 0.7,
    }),
    row("sfi_prediction_verifications", "verification-fixture", {
      id: "verification-fixture",
      prediction_id: "prediction-fixture",
      evidence_id: "evidence-fixture",
      verifiedAt: "2026-04-02T00:00:00.000Z",
      confidence: 0.72,
    }),
  ],
  "agent-fixture": [
    row("root_agents", "agent-fixture", {
      id: "agent-fixture",
      agent_id: "agent-fixture",
      name: "QA Agent",
      capabilities: ["capability-fixture"],
      created_at: "2026-05-01T00:00:00.000Z",
      confidence: 0.91,
    }),
  ],
  "execution-fixture": [
    row("epistemic_events", "execution-fixture", {
      id: "execution-fixture",
      event_id: "execution-fixture",
      agent_id: "agent-fixture",
      event_name: "sfi.agent.executed",
      timestamp: "2026-06-01T00:00:00.000Z",
      confidence: 0.83,
    }),
  ],
  "memory-fixture": [
    row("sfi_amv_memory", "memory-fixture", {
      id: "memory-fixture",
      entity_id: "memory-fixture",
      evidence_id: "evidence-fixture",
      created_at: "2026-07-01T00:00:00.000Z",
      knowledge: "Memory fixture.",
      confidence: 0.66,
    }),
  ],
  "event-fixture": [
    row("epistemic_events", "event-fixture", {
      id: "event-fixture",
      event_id: "event-fixture",
      agent_id: "agent-fixture",
      event_name: "sfi.event.fixture",
      timestamp: "2026-08-01T00:00:00.000Z",
      confidence: 0.7,
    }),
  ],
  "governance-fixture": [
    row("root_audit_events", "governance-fixture", {
      id: "governance-fixture",
      entity_id: "phenomenon-1",
      target_id: "phenomenon-1",
      status: "APPROVED",
      timestamp: "2026-09-01T00:00:00.000Z",
      confidence: 0.85,
    }),
  ],
  "organization-fixture": [
    row("field_cases", "organization-fixture", {
      id: "organization-fixture",
      organization_id: "organization-fixture",
      created_at: "2026-10-01T00:00:00.000Z",
      confidence: 0.62,
    }),
  ],
  "report-fixture": [
    row("worldspect_snapshots", "report-fixture", {
      id: "report-fixture",
      report_id: "report-fixture",
      title: "Report fixture",
      phenomenon_id: "phenomenon-1",
      memory_id: "memory-fixture",
      provenance: "qa_fixture",
      generatedAt: "2026-11-01T00:00:00.000Z",
      confidence: 0.78,
    }),
  ],
  "formula-fixture": [
    row("sfi_evidence_ledger", "formula-fixture", {
      id: "formula-fixture",
      formula_id: "formula-fixture",
      owner: "qa_fixture",
      inputs: ["x"],
      output: "score",
      implementation: "canonical_formula_fixture",
      created_at: "2026-12-01T00:00:00.000Z",
      confidence: 0.71,
    }),
  ],
};

const fixtureCases: Array<{ entityId: string; entityType: SfiEntityType; expectsRelationship?: boolean }> = [
  { entityId: "phenomenon-1", entityType: "PHENOMENON", expectsRelationship: true },
  { entityId: "obs-fixture", entityType: "OBSERVATION", expectsRelationship: true },
  { entityId: "evidence-fixture", entityType: "EVIDENCE", expectsRelationship: true },
  { entityId: "prediction-fixture", entityType: "PREDICTION", expectsRelationship: true },
  { entityId: "agent-fixture", entityType: "AGENT", expectsRelationship: true },
  { entityId: "execution-fixture", entityType: "AGENT_EXECUTION", expectsRelationship: true },
  { entityId: "memory-fixture", entityType: "MEMORY" },
  { entityId: "event-fixture", entityType: "EVENT" },
  { entityId: "governance-fixture", entityType: "GOVERNANCE_DECISION", expectsRelationship: true },
  { entityId: "organization-fixture", entityType: "ORGANIZATION" },
  { entityId: "report-fixture", entityType: "REPORT", expectsRelationship: true },
  { entityId: "formula-fixture", entityType: "FORMULA" },
];

function assertNoObjectObject(value: unknown) {
  const serialized = JSON.stringify(value);
  assert.ok(serialized, "result must serialize");
  assert.equal(serialized.includes("[object Object]"), false, "result must not contain [object Object]");
}

function stableForDeterminism(result: EntityContextResult) {
  return {
    resolverUsed: result.resolverUsed,
    resolvedEntityType: result.resolvedEntityType,
    typeHintMatched: result.typeHintMatched,
    relationships: result.context?.relationships ?? [],
    timeline: result.context?.trajectory.timeline.map((point) => ({
      timestamp: point.timestamp,
      sourceEntityId: point.sourceEntityId,
      sourceType: point.sourceType,
    })) ?? [],
    limitations: result.context?.limitations ?? result.limitations,
    contextCompleteness: result.contextCompleteness,
  };
}

function limitationKey(limitation: { code: string; source?: string; scope: string }) {
  return `${limitation.code}:${limitation.source ?? "none"}:${limitation.scope}`;
}

function assertLimitationsDeduped(result: EntityContextResult) {
  const limitations = result.context?.limitations ?? result.limitations;
  const keys = limitations.map((limitation) => limitationKey(limitation));
  assert.equal(new Set(keys).size, keys.length, "limitations must be deduplicated");
}

function assertNoDirectUiAccess() {
  const root = process.cwd();
  const walk = (directory: string): string[] => {
    if (!fs.existsSync(directory)) return [];
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return walk(fullPath);
      return /\.(ts|tsx|js|jsx)$/.test(entry.name) ? [fullPath] : [];
    });
  };
  const offenders = [...walk(path.join(root, "src", "app")), ...walk(path.join(root, "src", "components"))]
    .filter((file) => !file.split(path.sep).join("/").includes("/src/app/api/"))
    .filter((file) => {
      const source = fs.readFileSync(file, "utf8");
      return source.includes("@/core/entity-graph") || source.includes("core/entity-graph");
    });

  assert.deepEqual(offenders, [], "UI files must not import the Entity Graph Layer directly");
}

async function main() {
  const fixtureSource = new FixtureEntityGraphSource(rowsByEntity);
  const service = createEntityContextService(fixtureSource);

  const hintedPhenomenon = await service.getEntityContext("phenomenon-1", {
    entityType: "PHENOMENON",
    includeTimeline: true,
    includeTrajectory: true,
    includeRelationships: true,
    maxDepth: 2,
  });
  assert.equal(hintedPhenomenon.ok, true, "hinted phenomenon must resolve");
  assert.equal(hintedPhenomenon.typeHintProvided, true, "type hint must be recorded");
  assert.equal(hintedPhenomenon.typeHintMatched, true, "type hint must match");
  assert.equal(hintedPhenomenon.inferencePerformed, false, "type hint must avoid inference");
  assert.deepEqual(fixtureSource.queries[0].tables, ["sfi_phenomena"], "type hint must consult only PHENOMENON identity sources first");
  assert.equal(hintedPhenomenon.sourcesConsulted.includes("root_agents"), false, "irrelevant AGENT source must not be consulted for hinted PHENOMENON");

  fixtureSource.resetQueries();
  const inferredPhenomenon = await service.getEntityContext("phenomenon-1", {
    includeRelationships: true,
  });
  assert.equal(inferredPhenomenon.ok, true, "inferred phenomenon must resolve");
  assert.equal(inferredPhenomenon.inferencePerformed, true, "missing hint must perform conservative inference");
  assert.ok(inferredPhenomenon.sourcesConsulted.length > hintedPhenomenon.sourcesConsulted.length, "hinted query must consult fewer sources than inference");

  const mismatch = await service.getEntityContext("obs-fixture", {
    entityType: "PHENOMENON",
  });
  assert.equal(mismatch.ok, false, "type mismatch must not resolve context");
  assert.equal(mismatch.code, "TYPE_MISMATCH", "wrong resolver must return TYPE_MISMATCH");
  assert.equal(mismatch.requestedEntityType, "PHENOMENON", "requested type must be preserved");
  assert.equal(mismatch.resolvedEntityType, "OBSERVATION", "resolved type must be reported");
  assert.equal(mismatch.typeHintMatched, false, "mismatch must be explicit");
  assert.equal(mismatch.resolverUsed, "PHENOMENON", "wrong resolver must not fallback silently");

  for (const fixture of fixtureCases) {
    const resolver = resolverForEntityType(fixture.entityType);
    fixtureSource.resetQueries();
    const result = await service.getEntityContext(fixture.entityId, {
      entityType: fixture.entityType,
      includeTimeline: true,
      includeTrajectory: true,
      includeRelationships: true,
      maxDepth: 2,
    });

    assert.equal(result.ok, true, `${fixture.entityType} fixture must resolve`);
    assert.ok(result.context, `${fixture.entityType} context must be present`);
    assert.equal(result.resolverUsed, fixture.entityType, `${fixture.entityType} resolver must be used`);
    assert.equal(result.context.entity.type, fixture.entityType, `${fixture.entityType} identity type must match`);
    assert.ok(result.context.provenance.length >= 1, `${fixture.entityType} provenance must be retained`);
    assert.deepEqual(fixtureSource.queries[0].tables, resolver.identitySources(), `${fixture.entityType} identity sources must be resolver-specific`);
    assert.equal(result.sourcesConsulted.includes("root_agents") && fixture.entityType !== "AGENT" && fixture.entityType !== "AGENT_EXECUTION" && fixture.entityType !== "EVENT", false, `${fixture.entityType} must not consult irrelevant AGENT source`);
    assert.ok(result.context.trajectory.timeline.length >= 1, `${fixture.entityType} timeline must retain real temporal points`);
    assert.ok(result.context.trajectory.status === "OPERATIONAL" || result.context.trajectory.status === "PARTIAL", `${fixture.entityType} trajectory must have an honest status`);
    if (fixture.expectsRelationship) {
      assert.ok(result.context.relationships.length >= 1, `${fixture.entityType} must produce at least one validated relationship`);
    }
    for (const relationship of result.context.relationships) {
      assert.ok(relationship.evidenceIds.length >= 1, "relationship must include evidenceIds");
      assert.ok(relationship.derivationRule, "relationship must include derivationRule");
    }
    assertLimitationsDeduped(result);
    assertNoObjectObject(result);

    const repeat = await service.getEntityContext(fixture.entityId, {
      entityType: fixture.entityType,
      includeTimeline: true,
      includeTrajectory: true,
      includeRelationships: true,
      maxDepth: 2,
    });
    assert.deepEqual(stableForDeterminism(repeat), stableForDeterminism(result), `${fixture.entityType} context must be deterministic except generatedAt/readTrace`);
  }

  const sparse = await service.getEntityContext("organization-fixture", {
    entityType: "ORGANIZATION",
    includeTrajectory: true,
  });
  assert.equal(sparse.context?.trajectory.timeline.length, 1, "single-point fixture must have exactly one timeline point");
  assert.equal(sparse.context?.trajectory.status, "PARTIAL", "single-point trajectory must remain PARTIAL");
  assert.equal(sparse.context?.trajectory.projected.length, 0, "single-point trajectory must not project");

  const missing = await service.getEntityContext("missing-1", {
    entityType: "PHENOMENON",
  });
  assert.equal(missing.ok, false, "missing entity must not resolve");
  assert.equal(missing.code, "NOT_FOUND", "missing entity must return NOT_FOUND");

  const invalidType = await service.getEntityContext("phenomenon-1", {
    entityType: "INVALID_TYPE" as SfiEntityType,
  });
  assert.equal(invalidType.ok, false, "invalid entity type must not resolve");
  assert.equal(invalidType.code, "INVALID_ENTITY_TYPE", "invalid entity type must be structured");

  assertNoDirectUiAccess();

  const relationTriples = hintedPhenomenon.context?.relationships.map((relationship) => `${relationship.sourceId}:${relationship.relationType}:${relationship.targetId}`) ?? [];
  assert.ok(relationTriples.includes("obs-1:OBSERVES:phenomenon-1"), "OBSERVATION -> OBSERVES -> PHENOMENON must be accepted");
  assert.equal(relationTriples.includes("obs-1:SUPPORTS:phenomenon-1"), false, "OBSERVATION -> SUPPORTS -> PHENOMENON must be rejected");
  assert.ok(hintedPhenomenon.ontologyViolationsRejected >= 1, "ontology violation must be counted");

  console.log("qa:sfi-entity-graph passed");
  console.log(JSON.stringify({
    fixturesCovered: fixtureCases.map((fixture) => fixture.entityType),
    hintedPhenomenonSources: hintedPhenomenon.sourcesConsulted,
    inferredPhenomenonSources: inferredPhenomenon.sourcesConsulted,
    typeMismatch: {
      code: mismatch.code,
      requestedEntityType: mismatch.requestedEntityType,
      resolvedEntityType: mismatch.resolvedEntityType,
      resolversAttempted: mismatch.resolversAttempted,
    },
    acceptedRelationships: relationTriples,
    ontologyViolationsRejected: hintedPhenomenon.ontologyViolationsRejected,
    limitations: hintedPhenomenon.context?.limitations.map((limitation) => limitation.code) ?? [],
  }, null, 2));
}

main().catch((error) => {
  console.error("qa:sfi-entity-graph failed");
  console.error(error);
  process.exit(1);
});
