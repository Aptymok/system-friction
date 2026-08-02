import type {
  EntityGraphLimitation,
  EntityRelationship,
  EntityRelationType,
  SfiEntityType,
  SfiTraceContext,
} from "@/core/contracts";
import { graphLimitation } from "./EntityGraphService";

export interface EntityRelationshipCandidate {
  sourceId: string;
  sourceType: SfiEntityType;
  targetId: string;
  targetType: SfiEntityType;
  relationType: EntityRelationType;
  weight: number;
  confidence: number;
  evidenceIds: string[];
  trace?: SfiTraceContext;
  logbookId?: string;
  derivationRule: string;
  sourceTable: string;
}

export interface EntityRelationshipValidationResult {
  accepted: EntityRelationship[];
  rejected: EntityGraphLimitation[];
}

const ONTOLOGY_MATRIX = new Set<string>([
  key("OBSERVATION", "OBSERVES", "PHENOMENON"),
  key("OBSERVATION", "SUPPORTS", "EVIDENCE"),
  key("EVIDENCE", "DERIVED_FROM", "OBSERVATION"),
  key("EVIDENCE", "SUPPORTS", "HYPOTHESIS"),
  key("PREDICTION", "DERIVED_FROM", "HYPOTHESIS"),
  key("PREDICTION", "VERIFIED_BY", "EVIDENCE"),
  key("EVENT", "GENERATED_BY", "AGENT"),
  key("AGENT", "EXECUTES", "CAPABILITY"),
  key("AGENT", "PRODUCES", "EVIDENCE"),
  key("AGENT", "PRODUCES", "EVENT"),
  key("AGENT_EXECUTION", "EXECUTED_BY", "AGENT"),
  key("MEMORY", "DERIVED_FROM", "EVIDENCE"),
  key("MEMORY", "DERIVED_FROM", "PREDICTION"),
  key("REPORT", "DERIVED_FROM", "MEMORY"),
  key("PHENOMENON", "CONTAINS", "OBSERVATION"),
  key("PHENOMENON", "CONTAINS", "PREDICTION"),
  key("GOVERNANCE_DECISION", "DERIVED_FROM", "EVIDENCE"),
  key("GOVERNANCE_DECISION", "APPROVES", "PHENOMENON"),
  key("GOVERNANCE_DECISION", "REJECTS", "PHENOMENON"),
]);

function key(sourceType: SfiEntityType, relationType: EntityRelationType, targetType: SfiEntityType): string {
  return `${sourceType}:${relationType}:${targetType}`;
}

export class EntityOntologyValidator {
  validate(candidates: EntityRelationshipCandidate[]): EntityRelationshipValidationResult {
    const accepted: EntityRelationship[] = [];
    const rejected: EntityGraphLimitation[] = [];
    const seen = new Set<string>();

    for (const candidate of candidates) {
      const violation = this.violation(candidate);
      if (violation) {
        rejected.push(violation);
        continue;
      }

      const dedupeKey = `${candidate.sourceId}:${candidate.relationType}:${candidate.targetId}`;
      if (seen.has(dedupeKey)) {
        continue;
      }

      seen.add(dedupeKey);
      accepted.push({
        sourceId: candidate.sourceId,
        targetId: candidate.targetId,
        relationType: candidate.relationType,
        weight: candidate.weight,
        confidence: candidate.confidence,
        evidenceIds: candidate.evidenceIds,
        trace: candidate.trace,
        derivationRule: candidate.derivationRule,
        sourceTable: candidate.sourceTable,
      });
    }

    return { accepted, rejected };
  }

  private violation(candidate: EntityRelationshipCandidate): EntityGraphLimitation | null {
    const scope = `relationship:${candidate.sourceId}:${candidate.relationType}:${candidate.targetId}`;

    if (!candidate.sourceId || !candidate.targetId || !candidate.relationType) {
      return graphLimitation({
        code: "RELATION_REQUIRED_FIELD_MISSING",
        scope,
        source: candidate.sourceTable,
        severity: "WARNING",
        message: "Relationship candidate is missing sourceId, targetId, or relationType.",
        requirement: "EntityRelationship requires sourceId, targetId, and relationType.",
      });
    }

    if (!candidate.derivationRule && candidate.evidenceIds.length === 0) {
      return graphLimitation({
        code: "RELATION_PROVENANCE_MISSING",
        scope,
        source: candidate.sourceTable,
        severity: "WARNING",
        message: "Relationship candidate has neither evidenceIds nor derivationRule.",
        requirement: "Every relationship must have evidence or an explicit derivation rule.",
      });
    }

    if (!ONTOLOGY_MATRIX.has(key(candidate.sourceType, candidate.relationType, candidate.targetType))) {
      return graphLimitation({
        code: "ONTOLOGY_RELATION_REJECTED",
        scope,
        source: candidate.sourceTable,
        severity: "WARNING",
        message: `${candidate.sourceType} -> ${candidate.relationType} -> ${candidate.targetType} is not allowed by the Entity Graph ontology.`,
        requirement: "Relationship must match the ontology matrix before entering the graph.",
      });
    }

    return null;
  }
}
