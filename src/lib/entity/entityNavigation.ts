import type { SfiEntityType } from "@/core/contracts";
import { isSupportedEntityType } from "@/core/entity-graph/EntitySourceCapabilityRegistry";

export type EntityNavigationSourceContext = {
  field?: string;
  source?: string;
  predictionRegistered?: boolean;
  isRegisteredPrediction?: boolean;
};

const NON_ENTITY_VALUES = new Set([
  "MISSING",
  "NO_EVIDENCE",
  "NO_SOURCE",
  "NO_OBJECT",
  "NO_MEMORY",
  "UNKNOWN",
  "N/A",
  "null",
  "undefined",
]);

const FIELD_TYPE_MAP: Record<string, SfiEntityType> = {
  phenomenonId: "PHENOMENON",
  phenomenon_id: "PHENOMENON",
  observationId: "OBSERVATION",
  observation_id: "OBSERVATION",
  evidenceId: "EVIDENCE",
  evidence_id: "EVIDENCE",
  predictionId: "PREDICTION",
  prediction_id: "PREDICTION",
  agentId: "AGENT",
  agent_id: "AGENT",
  agentExecutionId: "AGENT_EXECUTION",
  agent_execution_id: "AGENT_EXECUTION",
  eventId: "EVENT",
  event_id: "EVENT",
  memoryId: "MEMORY",
  memory_id: "MEMORY",
  decisionId: "GOVERNANCE_DECISION",
  decision_id: "GOVERNANCE_DECISION",
  formulaId: "FORMULA",
  formula_id: "FORMULA",
  reportId: "REPORT",
  report_id: "REPORT",
  organizationId: "ORGANIZATION",
  organization_id: "ORGANIZATION",
};

export function isNavigableEntityId(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed || NON_ENTITY_VALUES.has(trimmed)) return false;
  if (trimmed.length > 180) return false;
  if (/^[a-f0-9]{32,}$/i.test(trimmed)) return false;
  if (/[\\/\s]/.test(trimmed)) return false;
  return /^[A-Za-z0-9._:-]+$/.test(trimmed);
}

export function buildEntityHref(entityId: unknown, entityType: unknown) {
  if (!isNavigableEntityId(entityId)) return null;
  if (!isSupportedEntityType(entityType)) return null;
  return `/entity/${encodeURIComponent(entityId.trim())}?entityType=${encodeURIComponent(entityType)}`;
}

export function resolveKnownEntityType(sourceContext: EntityNavigationSourceContext | string | null | undefined) {
  const context = typeof sourceContext === "string" ? { field: sourceContext } : sourceContext;
  const field = context?.field;
  if (!field) return null;
  if (field === "hypothesisId" || field === "hypothesis_id") {
    return context.predictionRegistered || context.isRegisteredPrediction ? "PREDICTION" : null;
  }
  return FIELD_TYPE_MAP[field] ?? null;
}
