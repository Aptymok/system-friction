import type { EntityGraphLimitation, EntityRelationship, EntityRelationType, SfiEntity, SfiEntityType } from "@/core/contracts";
import {
  EntityOntologyValidator,
  type EntityRelationshipCandidate,
} from "./EntityOntologyValidator";
import { asRecord, numberValue, stringValue, type EntityGraphRow } from "./EntityGraphService";
import { inferEntityTypeFromSource } from "./EntitySourceCapabilityRegistry";

export interface EntityRelationshipResolution {
  relationships: EntityRelationship[];
  limitations: EntityGraphLimitation[];
  rejected: number;
}

const DIRECT_ID_TYPE_KEYS: Array<[string, SfiEntityType]> = [
  ["phenomenon_id", "PHENOMENON"],
  ["phenomenonId", "PHENOMENON"],
  ["observation_id", "OBSERVATION"],
  ["observationId", "OBSERVATION"],
  ["evidence_id", "EVIDENCE"],
  ["evidenceId", "EVIDENCE"],
  ["prediction_id", "PREDICTION"],
  ["predictionId", "PREDICTION"],
  ["hypothesis_id", "HYPOTHESIS"],
  ["hypothesisId", "HYPOTHESIS"],
  ["agent_id", "AGENT"],
  ["agentId", "AGENT"],
  ["capability_id", "CAPABILITY"],
  ["capabilityId", "CAPABILITY"],
  ["memory_id", "MEMORY"],
  ["memoryId", "MEMORY"],
  ["report_id", "REPORT"],
  ["reportId", "REPORT"],
  ["target_id", "PHENOMENON"],
  ["targetId", "PHENOMENON"],
];

export class EntityRelationResolver {
  private readonly validator = new EntityOntologyValidator();

  resolveRelationships(entity: SfiEntity, rows: EntityGraphRow[], maxDepth = 1): EntityRelationshipResolution {
    const boundedDepth = Math.max(0, Math.min(maxDepth, 2));
    if (boundedDepth === 0) {
      return { relationships: [], limitations: [], rejected: 0 };
    }

    const typeIndex = this.buildTypeIndex(entity, rows);
    const candidates = rows.flatMap((row) => this.candidatesForRow(entity, row, rows, typeIndex));
    const validation = this.validator.validate(candidates);

    return {
      relationships: validation.accepted,
      limitations: validation.rejected,
      rejected: validation.rejected.length,
    };
  }

  private candidatesForRow(entity: SfiEntity, row: EntityGraphRow, rows: EntityGraphRow[], typeIndex: Map<string, SfiEntityType>): EntityRelationshipCandidate[] {
    const payload = row.payload;
    const nestedPayload = asRecord(payload.payload);
    const evidenceIds = this.extractEvidenceIds(payload);
    const candidates: EntityRelationshipCandidate[] = [];
    const rowType = typeIndex.get(row.sourceId) ?? inferEntityTypeFromSource(row.sourceTable);
    const entityAliases = this.entityAliases(entity, rows);

    const phenomenonId = stringValue(payload.phenomenon_id) ?? stringValue(payload.phenomenonId);
    if (phenomenonId && rowType === "OBSERVATION") {
      candidates.push(this.candidate(row, row.sourceId, "OBSERVATION", entityAliases.has(phenomenonId) ? entity.entityId : phenomenonId, "PHENOMENON", "OBSERVES", "observation.phenomenon_id explicitly identifies the observed phenomenon", evidenceIds));
    }

    const observationId = stringValue(payload.observation_id) ?? stringValue(payload.observationId);
    if (observationId && rowType === "EVIDENCE") {
      candidates.push(this.candidate(row, row.sourceId, "EVIDENCE", observationId, "OBSERVATION", "DERIVED_FROM", "evidence.observation_id explicitly identifies the source observation", evidenceIds));
    }

    const hypothesisId = stringValue(payload.hypothesis_id) ?? stringValue(payload.hypothesisId);
    if (hypothesisId && rowType === "EVIDENCE") {
      candidates.push(this.candidate(row, row.sourceId, "EVIDENCE", hypothesisId, "HYPOTHESIS", "SUPPORTS", "evidence.hypothesis_id explicitly identifies the supported hypothesis", evidenceIds));
    }

    if (hypothesisId && rowType === "PREDICTION") {
      candidates.push(this.candidate(row, row.sourceId, "PREDICTION", hypothesisId, "HYPOTHESIS", "DERIVED_FROM", "prediction.hypothesis_id explicitly identifies the source hypothesis", evidenceIds));
    }

    const predictionId = stringValue(payload.prediction_id) ?? stringValue(payload.predictionId);
    const verificationEvidenceId = stringValue(payload.evidence_id) ?? stringValue(payload.evidenceId);
    if (predictionId && verificationEvidenceId && row.sourceTable === "sfi_prediction_verifications") {
      candidates.push(this.candidate(row, predictionId, "PREDICTION", verificationEvidenceId, "EVIDENCE", "VERIFIED_BY", "prediction_verification links prediction_id to evidence_id", [verificationEvidenceId]));
    }

    const agentId = stringValue(payload.agent_id) ?? stringValue(payload.agentId) ?? stringValue(payload.agent_key);
    const capabilities = Array.isArray(payload.capabilities)
      ? payload.capabilities.filter((value): value is string => typeof value === "string" && value.length > 0)
      : [];
    if (rowType === "AGENT") {
      for (const capabilityId of capabilities) {
        candidates.push(this.candidate(row, row.sourceId, "AGENT", capabilityId, "CAPABILITY", "EXECUTES", "agent.capabilities declares an executable capability", [row.sourceId]));
      }
    }

    if (agentId && rowType === "EVIDENCE") {
      candidates.push(this.candidate(row, agentId, "AGENT", row.sourceId, "EVIDENCE", "PRODUCES", "evidence.agent_id explicitly identifies the producing agent", evidenceIds));
    }

    if (agentId && rowType === "EVENT") {
      candidates.push(this.candidate(row, row.sourceId, "EVENT", agentId, "AGENT", "GENERATED_BY", "event.agent_id explicitly identifies the generating agent", [row.sourceId]));
      candidates.push(this.candidate(row, agentId, "AGENT", row.sourceId, "EVENT", "PRODUCES", "event.agent_id explicitly identifies the producing agent", [row.sourceId]));
    }

    if (agentId && entity.type === "AGENT_EXECUTION") {
      candidates.push(this.candidate(row, entity.entityId, "AGENT_EXECUTION", agentId, "AGENT", "EXECUTED_BY", "agent execution row identifies agent_id", [row.sourceId]));
    }

    if (rowType === "MEMORY") {
      for (const evidenceId of evidenceIds) {
        candidates.push(this.candidate(row, row.sourceId, "MEMORY", evidenceId, "EVIDENCE", "DERIVED_FROM", "memory evidence_id/evidence_ids explicitly identifies source evidence", [evidenceId]));
      }
      const memoryPredictionId = stringValue(payload.prediction_id) ?? stringValue(payload.predictionId) ?? stringValue(asRecord(payload.inference).entity_id);
      const memoryPredictionType = stringValue(asRecord(payload.inference).entity_type);
      if (memoryPredictionId && memoryPredictionType === "PREDICTION") {
        candidates.push(this.candidate(row, row.sourceId, "MEMORY", memoryPredictionId, "PREDICTION", "DERIVED_FROM", "memory.inference.entity_id explicitly identifies source prediction", [row.sourceId]));
      }
    }

    const memoryId = stringValue(payload.memory_id) ?? stringValue(payload.memoryId);
    if (memoryId && rowType === "REPORT") {
      candidates.push(this.candidate(row, row.sourceId, "REPORT", memoryId, "MEMORY", "DERIVED_FROM", "report.memory_id explicitly identifies the source memory", [memoryId]));
    }

    const targetIdForGovernance = stringValue(payload.target_id) ?? stringValue(payload.targetId) ?? stringValue(payload.entity_id);
    const status = (stringValue(payload.status) ?? stringValue(payload.decision) ?? "").toUpperCase();
    if (targetIdForGovernance && rowType === "GOVERNANCE_DECISION" && (status === "APPROVED" || status === "REJECTED")) {
      candidates.push(
        this.candidate(
          row,
          row.sourceId,
          "GOVERNANCE_DECISION",
          targetIdForGovernance,
          "PHENOMENON",
          status === "APPROVED" ? "APPROVES" : "REJECTS",
          "governance decision status and target_id define approval relationship",
          [row.sourceId]
        )
      );
    }

    const sourceId = stringValue(payload.source_id) ?? stringValue(payload.sourceId) ?? stringValue(nestedPayload.sourceId);
    const targetId = stringValue(payload.target_id) ?? stringValue(payload.targetId) ?? stringValue(nestedPayload.targetId);
    const explicitRelation = stringValue(payload.relation_type) ?? stringValue(payload.relationType) ?? stringValue(nestedPayload.relationType);
    if (sourceId && targetId && explicitRelation) {
      candidates.push(
        this.candidate(
          row,
          sourceId,
          this.typeForExplicitId(sourceId, payload, "sourceType", typeIndex),
          targetId,
          this.typeForExplicitId(targetId, payload, "targetType", typeIndex),
          this.relationFromPayload(explicitRelation),
          "row.source_id, row.target_id and row.relation_type define an explicit relationship",
          evidenceIds
        )
      );
    }

    return candidates.filter((candidate) => candidate.sourceId !== candidate.targetId);
  }

  private candidate(
    row: EntityGraphRow,
    sourceId: string,
    sourceType: SfiEntityType,
    targetId: string,
    targetType: SfiEntityType,
    relationType: EntityRelationType,
    derivationRule: string,
    evidenceIds: string[]
  ): EntityRelationshipCandidate {
    return {
      sourceId,
      sourceType,
      targetId,
      targetType,
      relationType,
      weight: this.clamp(numberValue(row.payload.weight) ?? row.confidence),
      confidence: this.clamp(row.confidence),
      evidenceIds: evidenceIds.length > 0 ? [...new Set(evidenceIds)] : [row.sourceId],
      trace: row.trace,
      logbookId: row.logbookId,
      derivationRule,
      sourceTable: row.sourceTable,
    };
  }

  private buildTypeIndex(entity: SfiEntity, rows: EntityGraphRow[]): Map<string, SfiEntityType> {
    const index = new Map<string, SfiEntityType>([[entity.entityId, entity.type]]);

    for (const row of rows) {
      index.set(row.sourceId, row.sourceId === entity.entityId ? entity.type : inferEntityTypeFromSource(row.sourceTable));
      for (const [key, type] of DIRECT_ID_TYPE_KEYS) {
        const value = stringValue(row.payload[key]) ?? stringValue(asRecord(row.payload.payload)[key]);
        if (value) {
          index.set(value, type);
        }
      }
    }

    return index;
  }

  private entityAliases(entity: SfiEntity, rows: EntityGraphRow[]): Set<string> {
    const aliases = new Set<string>([entity.entityId, entity.sourceId ?? ""]);
    for (const row of rows) {
      if (row.sourceTable !== "sfi_phenomena") continue;
      for (const key of ["id", "entity_id", "phenomenon_id", "phenomenon_key", "label", "name"]) {
        const value = stringValue(row.payload[key]);
        if (value) aliases.add(value);
      }
    }
    return aliases;
  }

  private typeForExplicitId(id: string, payload: Record<string, unknown>, typeKey: "sourceType" | "targetType", typeIndex: Map<string, SfiEntityType>): SfiEntityType {
    const explicit = stringValue(payload[typeKey]);
    if (explicit) {
      return explicit as SfiEntityType;
    }

    return typeIndex.get(id) ?? "STATE";
  }

  private extractEvidenceIds(payload: Record<string, unknown>): string[] {
    const direct = [
      stringValue(payload.evidence_id),
      stringValue(payload.evidenceId),
      stringValue(payload.evidence_entry_id),
      stringValue(payload.evidenceEntryId),
    ].filter((value): value is string => Boolean(value));

    const list = Array.isArray(payload.evidence_ids)
      ? payload.evidence_ids.filter((value): value is string => typeof value === "string" && value.length > 0)
      : [];

    return [...new Set([...direct, ...list])];
  }

  private relationFromPayload(value: string): EntityRelationType {
    const allowed: EntityRelationType[] = [
      "OBSERVES",
      "SUPPORTS",
      "DERIVED_FROM",
      "VERIFIED_BY",
      "GENERATED_BY",
      "IMPACTS",
      "EXECUTES",
      "EXECUTED_BY",
      "PRODUCES",
      "APPROVES",
      "REJECTS",
      "UPDATES",
      "INFLUENCES",
      "PROJECTS",
      "CONTAINS",
    ];

    return allowed.includes(value as EntityRelationType) ? (value as EntityRelationType) : "DERIVED_FROM";
  }

  private clamp(value: number): number {
    return Math.max(0, Math.min(1, value));
  }
}
