import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createEntityContextService, type EntityContextResult } from "../src/core/entity-graph";
import type { EntityContext, EntityRelationship } from "../src/core/contracts";
import { createServiceSupabaseClient } from "../src/runtime/supabase/server";

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
}

type ConnectedSummary = {
  selectedEntityId: string;
  selectedEntityType: "PHENOMENON";
  primarySource: "sfi_phenomena";
  label: string;
  observations: number;
  evidence: number;
  predictions: number;
  events: number;
  participatingAgents: number;
  memory: number;
  relationships: number;
  timelinePoints: number;
  trajectoryStatus: string;
  trajectoryKind: string;
  contextCompleteness: EntityContextResult["contextCompleteness"];
  sectionsApplicable: string[];
  sectionsPresent: string[];
  unresolvedReferences: string[];
  ontologyViolationsRejected: number;
  connectedRecords: Array<{
    sourceTable: string;
    sourceId: string;
    matchedBy: string;
    confidence: number;
  }>;
  relationshipFoundations: Array<{
    sourceId: string;
    relationType: string;
    targetId: string;
    sourceTable: string;
    derivationRule: string;
    evidenceIds: string[];
  }>;
};

function scoreContext(context: EntityContext) {
  return [
    context.observations.length,
    context.evidence.length,
    context.predictions.length,
    context.events.length,
    context.agents.length,
    context.memory.length,
    context.relationships.length,
    context.trajectory.timeline.length,
    context.decisions.length,
  ].reduce((total, count) => total + count, 0);
}

function unresolvedReferences(context: EntityContext): string[] {
  const missing: string[] = [];
  if (context.observations.length === 0) {
    missing.push("observations: no exact observation_id, phenomenon_id, entity_id, linked.id, or payload reference was found for the selected phenomenon aliases");
  }
  if (context.predictions.length === 0) {
    missing.push("predictions: no exact prediction_id, entity_id, hypothesis_id, source_value, or verification_rule reference was found for the selected phenomenon aliases");
  }
  if (context.events.length === 0) {
    missing.push("events: no exact event_id, logbook_id, entity_id, source.sourceId, or payload reference was found for the selected phenomenon aliases");
  }
  if (context.agents.length === 0) {
    missing.push("agents: no resolved event or evidence row exposed an agent_id tied to this phenomenon context");
  }
  if (context.memory.length === 0) {
    missing.push("memory: no sfi_amv_memory row exposed entity, phenomenon, evidence, prediction, or logbook provenance tied to this phenomenon context");
  }
  if (context.decisions.length === 0) {
    missing.push("governance: no root_audit_events target_id, entity_id, or payload reference was found for this phenomenon context");
  }
  return missing.sort();
}

function relationshipKey(relation: EntityRelationship) {
  return [
    relation.sourceId,
    relation.relationType,
    relation.targetId,
    relation.sourceTable,
    relation.derivationRule,
    relation.evidenceIds.join("|"),
  ].join("::");
}

function semanticDigest(summary: ConnectedSummary) {
  return {
    selectedEntityId: summary.selectedEntityId,
    selectedEntityType: summary.selectedEntityType,
    primarySource: summary.primarySource,
    observations: summary.observations,
    evidence: summary.evidence,
    predictions: summary.predictions,
    events: summary.events,
    participatingAgents: summary.participatingAgents,
    memory: summary.memory,
    relationships: summary.relationships,
    timelinePoints: summary.timelinePoints,
    trajectoryStatus: summary.trajectoryStatus,
    trajectoryKind: summary.trajectoryKind,
    contextCompleteness: {
      score: summary.contextCompleteness.score,
      sectionsApplicable: summary.sectionsApplicable,
      sectionsPresent: summary.sectionsPresent,
    },
    unresolvedReferences: summary.unresolvedReferences,
    ontologyViolationsRejected: summary.ontologyViolationsRejected,
    connectedRecords: summary.connectedRecords,
    relationshipFoundations: summary.relationshipFoundations,
  };
}

function summarize(result: EntityContextResult): ConnectedSummary {
  assert.ok(result.ok, `selected entity context should be found, got ${result.code}`);
  assert.ok(result.context, "selected entity context is missing");
  const context = result.context;
  assert.equal(context.entity.type, "PHENOMENON", "connected institutional case must stay PHENOMENON");

  return {
    selectedEntityId: context.entity.entityId,
    selectedEntityType: "PHENOMENON",
    primarySource: "sfi_phenomena",
    label: context.entity.label ?? context.entity.entityId,
    observations: context.observations.length,
    evidence: context.evidence.length,
    predictions: context.predictions.length,
    events: context.events.length,
    participatingAgents: context.agents.length,
    memory: context.memory.length,
    relationships: context.relationships.length,
    timelinePoints: context.trajectory.timeline.length,
    trajectoryStatus: context.trajectory.status,
    trajectoryKind: context.trajectory.trajectoryKind ?? "system_state_trajectory",
    contextCompleteness: result.contextCompleteness,
    sectionsApplicable: result.contextCompleteness.sectionsApplicable,
    sectionsPresent: result.contextCompleteness.sectionsPresent,
    unresolvedReferences: unresolvedReferences(context),
    ontologyViolationsRejected: result.ontologyViolationsRejected,
    connectedRecords: context.provenance
      .map((item) => ({
        sourceTable: item.sourceTable,
        sourceId: item.sourceId,
        matchedBy: item.matchedBy,
        confidence: item.confidence,
      }))
      .sort((a, b) => `${a.sourceTable}:${a.sourceId}:${a.matchedBy}`.localeCompare(`${b.sourceTable}:${b.sourceId}:${b.matchedBy}`)),
    relationshipFoundations: context.relationships
      .map((relation) => ({
        sourceId: relation.sourceId,
        relationType: relation.relationType,
        targetId: relation.targetId,
        sourceTable: relation.sourceTable,
        derivationRule: relation.derivationRule,
        evidenceIds: [...relation.evidenceIds].sort(),
      }))
      .sort((a, b) => relationshipKey(a as EntityRelationship).localeCompare(relationshipKey(b as EntityRelationship))),
  };
}

function assertNoTextualCoincidenceRelations(summary: ConnectedSummary) {
  for (const relation of summary.relationshipFoundations) {
    assert.equal(/text|similar|proximity|coincid/i.test(relation.derivationRule), false, `relationship uses non-institutional matching: ${relation.derivationRule}`);
    assert.ok(relation.derivationRule.length > 0, "relationship must declare a derivation rule");
    assert.ok(relation.evidenceIds.length > 0, "relationship must carry evidenceIds");
  }
}

function assertNoRegisteredAgentWithoutExecution(context: EntityContext) {
  const executionLinks = new Set<string>();
  for (const relation of context.relationships) {
    if (relation.relationType === "GENERATED_BY" && relation.targetId) executionLinks.add(relation.targetId);
    if (relation.relationType === "PRODUCES" && relation.sourceId) executionLinks.add(relation.sourceId);
  }
  for (const agent of context.agents) {
    assert.ok(executionLinks.has(agent.id), `agent ${agent.id} was included without execution or produced artifact relation`);
  }
}

function assertVerificationIsContextual(context: EntityContext) {
  assert.equal(
    context.provenance.some((item) => item.sourceTable === "sfi_prediction_verifications" && item.sourceId === context.entity.entityId),
    false,
    "prediction verification must not become its own top-level entity in a PHENOMENON context"
  );
}

function assertMemoryHasProvenance(context: EntityContext) {
  const provenanceIds = new Set(context.provenance.map((item) => item.sourceId));
  for (const memory of context.memory) {
    const memoryRecord = memory as unknown as { id: string; trace?: unknown; provenance?: unknown };
    assert.ok(provenanceIds.has(memory.id) || memoryRecord.trace || memoryRecord.provenance, `memory ${memory.id} lacks provenance`);
  }
}

function assertEventTracePreservedWhenPresent(context: EntityContext) {
  const eventSourceRowsWithTrace = new Set(
    context.provenance
      .filter((item) => item.sourceTable === "epistemic_events" || item.sourceTable === "root_audit_events")
      .map((item) => item.sourceId)
  );
  for (const event of context.events) {
    if (eventSourceRowsWithTrace.has(event.id)) {
      assert.ok((event as unknown as { trace?: unknown }).trace, `event ${event.id} should preserve trace when source row exposes it`);
    }
  }
}

async function findBestPhenomenon() {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("sfi_phenomena")
    .select("id, phenomenon_key, label, description, created_at, updated_at")
    .order("created_at", { ascending: true })
    .limit(50);

  assert.equal(error, null, `sfi_phenomena must be readable: ${error?.message ?? ""}`);
  assert.ok(data && data.length > 0, "sfi_phenomena must contain at least one real PHENOMENON");

  const service = createEntityContextService();
  const candidates = [];
  for (const phenomenon of data) {
    const id = String(phenomenon.id);
    const result = await service.getEntityContext(id, {
      entityType: "PHENOMENON",
      includeTimeline: true,
      includeTrajectory: true,
      includeRelationships: true,
      maxDepth: 2,
      maxEvents: 100,
    });
    if (result.context) {
      candidates.push({ result, score: scoreContext(result.context) });
    }
  }

  assert.ok(candidates.length > 0, "at least one PHENOMENON must resolve through EntityContextService");
  return candidates.sort((a, b) => b.score - a.score || a.result.context!.entity.entityId.localeCompare(b.result.context!.entity.entityId))[0].result;
}

async function main() {
  loadEnvLocal();

  const first = await findBestPhenomenon();
  const summary = summarize(first);
  assert.ok(first.context, "context required for assertions");

  assert.equal(summary.primarySource, "sfi_phenomena");
  assert.equal(summary.selectedEntityType, "PHENOMENON");
  assert.ok(summary.evidence >= 1, "selected PHENOMENON should connect to at least one real evidence row");
  assert.equal(summary.relationshipFoundations.some((relation) => relation.sourceId === summary.selectedEntityId && relation.relationType === "CONTAINS"), false, "non-canonical PHENOMENON CONTAINS EVIDENCE relationship must not be emitted");
  assert.ok(summary.timelinePoints >= 2, "selected PHENOMENON should expose at least two real temporal points after evidence connection");
  assert.equal(summary.contextCompleteness.sectionsUnlinked.includes("evidence"), true, "legacy evidence reference must be reported as unlinked instead of canonical relationship");

  assertNoTextualCoincidenceRelations(summary);
  assertNoRegisteredAgentWithoutExecution(first.context);
  assertVerificationIsContextual(first.context);
  assertMemoryHasProvenance(first.context);
  assertEventTracePreservedWhenPresent(first.context);
  assert.equal(JSON.stringify(summary).includes("[object Object]"), false, "connected entity QA leaked [object Object]");

  const second = await createEntityContextService().getEntityContext(summary.selectedEntityId, {
    entityType: "PHENOMENON",
    includeTimeline: true,
    includeTrajectory: true,
    includeRelationships: true,
    maxDepth: 2,
    maxEvents: 100,
  });
  const secondSummary = summarize(second);
  assert.deepEqual(semanticDigest(secondSummary), semanticDigest(summary), "connected entity context must be semantically deterministic across two runs");

  console.log("qa:sfi-connected-entity passed");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
