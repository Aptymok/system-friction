import { randomUUID } from "node:crypto";
import type {
  AgentDefinition,
  EntityContext,
  EntityGraphLimitation,
  Evidence,
  GovernanceDecision,
  GovernanceState,
  InstitutionalMemory,
  KernelPrediction,
  Observation,
  SfiEntity,
  SfiEntityType,
  SfiEvent,
  SfiEventSource,
  SfiTraceContext,
  Trajectory,
} from "@/core/contracts";
import { EntityGraphBuilder } from "./EntityGraphBuilder";
import { EntityRelationResolver } from "./EntityRelationResolver";
import {
  asRecord,
  ENTITY_GRAPH_SOURCE_TABLES,
  createDefaultEntityGraphSource,
  graphLimitation,
  normalizeLimitations,
  numberValue,
  stringValue,
  type EntityGraphReadSource,
  type EntityGraphRow,
  type EntityGraphSourceTable,
} from "./EntityGraphService";
import { isSupportedEntityType, resolverForEntityType, sourcesSkippedForResolver } from "./EntitySourceCapabilityRegistry";
import { EntityTimelineService } from "./EntityTimelineService";
import { EntityTrajectoryService } from "./EntityTrajectoryService";

export interface EntityContextOptions {
  entityType?: SfiEntityType;
  includeTimeline?: boolean;
  includeTrajectory?: boolean;
  includeRelationships?: boolean;
  maxEvents?: number;
  maxDepth?: number;
}

export interface EntityContextResult {
  ok: boolean;
  code: "FOUND" | "NOT_FOUND" | "INVALID_ID" | "INVALID_ENTITY_TYPE" | "TYPE_MISMATCH";
  context: EntityContext | null;
  generatedAt: string;
  readTrace: SfiTraceContext;
  options: {
    includeTimeline: boolean;
    includeTrajectory: boolean;
    includeRelationships: boolean;
    maxEvents: number;
    maxDepth: number;
  };
  resolverUsed: string | null;
  requestedEntityType: SfiEntityType | null;
  resolvedEntityType: SfiEntityType | null;
  typeHintProvided: boolean;
  typeHintMatched: boolean | null;
  inferencePerformed: boolean;
  resolversAttempted: string[];
  sourcesConsulted: string[];
  sourcesSkipped: string[];
  ontologyViolationsRejected: number;
  contextCompleteness: {
    score: number;
    sectionsApplicable: string[];
    sectionsPresent: string[];
    presentSections: string[];
    missingSections: string[];
    sectionsMissing: string[];
    sectionsUnlinked: string[];
    sectionsNotApplicable: string[];
  };
  limitations: EntityGraphLimitation[];
}

export class EntityContextService {
  private readonly builder: EntityGraphBuilder;
  private readonly relationResolver = new EntityRelationResolver();
  private readonly timelineService = new EntityTimelineService();
  private readonly trajectoryService = new EntityTrajectoryService();

  constructor(private readonly source: EntityGraphReadSource = createDefaultEntityGraphSource()) {
    this.builder = new EntityGraphBuilder(source);
  }

  async getEntityContext(entityId: string, options: EntityContextOptions = {}): Promise<EntityContextResult> {
    const generatedAt = new Date().toISOString();
    const readTrace: SfiTraceContext = {
      logbookId: `entity_graph_read:${randomUUID()}`,
      correlationId: entityId,
      initiatedBy: "entity_graph_context_service",
      createdAt: generatedAt,
    };
    const boundedOptions = this.boundOptions(options);
    const typeHintProvided = Boolean(options.entityType);

    if (options.entityType && !isSupportedEntityType(options.entityType)) {
      return this.emptyResult({
        code: "INVALID_ENTITY_TYPE",
        generatedAt,
        readTrace,
        options: boundedOptions,
        requestedEntityType: null,
        resolvedEntityType: null,
        typeHintProvided: true,
        typeHintMatched: false,
        inferencePerformed: false,
        resolversAttempted: [],
        limitations: [
          graphLimitation({
            code: "INVALID_ENTITY_TYPE",
            scope: "entity_type_hint",
            severity: "ERROR",
            message: "entityType is not a supported SFI entity type.",
            recoverable: false,
            requirement: "entityType must match SfiEntityType.",
          }),
        ],
      });
    }

    const hintedResolver = options.entityType ? resolverForEntityType(options.entityType) : undefined;
    const identity = await this.builder.resolveEntity(entityId, hintedResolver);
    const inferencePerformed = !typeHintProvided;
    const resolversAttempted = hintedResolver ? [hintedResolver.entityType] : [identity.resolver?.entityType ?? "CONSERVATIVE_INFERENCE"];

    if (!identity.ok && hintedResolver && identity.code === "NOT_FOUND") {
      const mismatchCheck = await this.builder.resolveEntity(entityId);
      if (mismatchCheck.ok && mismatchCheck.entity) {
        return this.emptyResult({
          code: "TYPE_MISMATCH",
          generatedAt,
          readTrace,
          options: boundedOptions,
          resolverUsed: hintedResolver.entityType,
          requestedEntityType: hintedResolver.entityType,
          resolvedEntityType: mismatchCheck.entity.type,
          typeHintProvided: true,
          typeHintMatched: false,
          inferencePerformed: false,
          resolversAttempted: [...resolversAttempted, mismatchCheck.resolver?.entityType ?? "CONSERVATIVE_TYPE_CHECK"],
          sourcesConsulted: [...new Set([...identity.sourcesConsulted, ...mismatchCheck.sourcesConsulted])],
          sourcesSkipped: mismatchCheck.sourcesSkipped,
          limitations: normalizeLimitations([
            ...identity.limitations,
            graphLimitation({
              code: "TYPE_MISMATCH",
              scope: `identity:${entityId}`,
              severity: "ERROR",
              message: `Requested entityType ${hintedResolver.entityType} did not match resolved entityType ${mismatchCheck.entity.type}.`,
              recoverable: false,
              requirement: "Declared entityType must match the entity resolved from institutional primary sources.",
            }),
          ]),
        });
      }
    }

    if (!identity.ok || !identity.entity) {
      return {
        ok: false,
        code: identity.code,
        context: null,
        generatedAt,
        readTrace,
        options: boundedOptions,
        resolverUsed: identity.resolver?.entityType ?? null,
        requestedEntityType: options.entityType ?? null,
        resolvedEntityType: null,
        typeHintProvided,
        typeHintMatched: typeHintProvided ? false : null,
        inferencePerformed,
        resolversAttempted,
        sourcesConsulted: identity.sourcesConsulted,
        sourcesSkipped: identity.sourcesSkipped,
        ontologyViolationsRejected: 0,
        contextCompleteness: {
          score: 0,
          sectionsApplicable: ["identity"],
          sectionsPresent: [],
          presentSections: [],
          missingSections: ["entity"],
          sectionsMissing: ["entity"],
          sectionsUnlinked: [],
          sectionsNotApplicable: [],
        },
        limitations: identity.limitations,
      };
    }

    if (hintedResolver && identity.entity.type !== hintedResolver.entityType) {
      return this.emptyResult({
        code: "TYPE_MISMATCH",
        generatedAt,
        readTrace,
        options: boundedOptions,
        resolverUsed: hintedResolver.entityType,
        requestedEntityType: hintedResolver.entityType,
        resolvedEntityType: identity.entity.type,
        typeHintProvided: true,
        typeHintMatched: false,
        inferencePerformed: false,
        resolversAttempted,
        sourcesConsulted: identity.sourcesConsulted,
        sourcesSkipped: identity.sourcesSkipped,
        limitations: [
          graphLimitation({
            code: "TYPE_MISMATCH",
            scope: `identity:${entityId}`,
            severity: "ERROR",
            message: `Requested entityType ${hintedResolver.entityType} did not match resolved entityType ${identity.entity.type}.`,
            recoverable: false,
            requirement: "Declared entityType must match the entity resolved from institutional primary sources.",
          }),
        ],
      });
    }

    const resolver = hintedResolver ?? resolverForEntityType(identity.entity.type);
    const contextTables = resolver.contextReadSources(boundedOptions.includeRelationships);
    const aliasResult = await this.findRowsForEntityIds(this.identityAliases(identity.entity, identity.rows), contextTables, boundedOptions.maxEvents);
    const referenceResult = await this.findRowsForEntityIds(
      this.referenceIds([...identity.rows, ...aliasResult.rows]),
      contextTables,
      boundedOptions.maxEvents
    );
    const sourceResult = this.mergeSourceResults([aliasResult, referenceResult]);
    const combinedSourcesConsulted = [...new Set([...identity.sourcesConsulted, ...sourceResult.sourcesConsulted])];
    const combinedConsultedSet = new Set(combinedSourcesConsulted);
    const combinedSourcesSkipped = ENTITY_GRAPH_SOURCE_TABLES.filter((table) => !combinedConsultedSet.has(table));
    const scopedRows = resolver.resolveContextFragments(sourceResult.rows).slice(0, boundedOptions.maxEvents);
    const scopedIdentity = this.builder.resolveEntityFromRows(
      entityId,
      scopedRows.length > 0 ? scopedRows : identity.rows,
      sourceResult.limitations,
      combinedSourcesConsulted,
      [...new Set([...combinedSourcesSkipped, ...sourcesSkippedForResolver(resolver)])],
      resolver
    );
    if (!scopedIdentity.ok || !scopedIdentity.entity) {
      return {
        ok: false,
        code: scopedIdentity.code,
        context: null,
        generatedAt,
        readTrace,
        options: boundedOptions,
        resolverUsed: resolver.entityType,
        requestedEntityType: options.entityType ?? null,
        resolvedEntityType: null,
        typeHintProvided,
        typeHintMatched: typeHintProvided ? false : null,
        inferencePerformed,
        resolversAttempted,
        sourcesConsulted: scopedIdentity.sourcesConsulted,
        sourcesSkipped: scopedIdentity.sourcesSkipped,
        ontologyViolationsRejected: 0,
        contextCompleteness: {
          score: 0,
          sectionsApplicable: ["identity"],
          sectionsPresent: [],
          presentSections: [],
          missingSections: ["entity"],
          sectionsMissing: ["entity"],
          sectionsUnlinked: [],
          sectionsNotApplicable: [],
        },
        limitations: scopedIdentity.limitations,
      };
    }

    const entity = scopedIdentity.entity;
    const limitations = [...scopedIdentity.limitations];
    const rows = this.uniqueRows([...identity.rows, ...scopedIdentity.rows]).slice(0, boundedOptions.maxEvents);
    const timelineResult = this.timelineService.buildTimeline(rows);
    const timeline = boundedOptions.includeTimeline || boundedOptions.includeTrajectory ? timelineResult.timeline : [];

    if (boundedOptions.includeTimeline || boundedOptions.includeTrajectory) {
      limitations.push(...timelineResult.limitations);
    }

    const trajectory = boundedOptions.includeTrajectory
      ? this.trajectoryService.buildTrajectory(entity.entityId, timeline, timelineResult.limitations)
      : this.emptyTrajectory(entity.entityId, "TRAJECTORY_EXCLUDED_BY_OPTIONS");

    const relationshipResult = boundedOptions.includeRelationships
      ? this.relationResolver.resolveRelationships(entity, rows, boundedOptions.maxDepth)
      : { relationships: [], limitations: [], rejected: 0 };
    const relationships = relationshipResult.relationships;
    limitations.push(...relationshipResult.limitations);
    if (!boundedOptions.includeRelationships) {
      limitations.push(
        graphLimitation({
          code: "RELATIONSHIPS_EXCLUDED_BY_OPTIONS",
          scope: "relationships",
          severity: "INFO",
          message: "Relationships were not resolved because includeRelationships=false.",
          requirement: "Set includeRelationships=true to resolve ontology-validated relationships.",
        })
      );
    }

    const observations = rows.filter((row) => this.isObservation(row)).map((row) => this.toObservation(row, entity, readTrace));
    const evidence = rows.filter((row) => this.isEvidence(row)).map((row) => this.toEvidence(row, entity, readTrace));
    const predictions = this.toPredictions(rows);
    const decisions = rows.filter((row) => row.sourceTable === "root_audit_events").map((row) => this.toDecision(row, entity, readTrace));
    const memory = rows.filter((row) => row.sourceTable === "sfi_amv_memory").map((row) => this.toMemory(row, entity, readTrace));
    const agents = rows.filter((row) => row.sourceTable === "root_agents").map((row) => this.toAgent(row));
    const events = rows.filter((row) => this.isEvent(row)).map((row, index) => this.toEvent(row, entity, readTrace, index));
    const governance = this.toGovernance(entity, decisions);
    const sectionsUnlinked = this.unlinkedSections(entity, rows, relationships);
    this.addUnlinkedSectionLimitations(entity, rows, relationships, limitations);

    const sectionState = {
      identity: { present: true, applicable: true },
      observations,
      evidence,
      predictions,
      governance: { present: decisions.length > 0, applicable: true },
      memory,
      agents,
      events,
      relationships,
      trajectory: { present: trajectory.timeline.length > 0, applicable: boundedOptions.includeTrajectory },
    };
    const contextCompleteness = this.contextCompleteness(sectionState, sectionsUnlinked);
    this.addEmptySectionLimitations(limitations, contextCompleteness.missingSections);

    const context: EntityContext = {
      entity,
      observations,
      evidence,
      predictions,
      decisions,
      memory,
      agents,
      events,
      trajectory,
      governance,
      relationships,
      provenance: scopedIdentity.provenance,
      limitations: normalizeLimitations(limitations),
    };

    return {
      ok: true,
      code: "FOUND",
      context,
      generatedAt,
      readTrace,
      options: boundedOptions,
      resolverUsed: resolver.entityType,
      requestedEntityType: options.entityType ?? null,
      resolvedEntityType: entity.type,
      typeHintProvided,
      typeHintMatched: typeHintProvided ? entity.type === options.entityType : null,
      inferencePerformed,
      resolversAttempted,
      sourcesConsulted: scopedIdentity.sourcesConsulted,
      sourcesSkipped: scopedIdentity.sourcesSkipped,
      ontologyViolationsRejected: relationshipResult.rejected,
      contextCompleteness,
      limitations: context.limitations,
    };
  }

  private boundOptions(options: EntityContextOptions): EntityContextResult["options"] {
    return {
      includeTimeline: options.includeTimeline ?? true,
      includeTrajectory: options.includeTrajectory ?? true,
      includeRelationships: options.includeRelationships ?? true,
      maxEvents: Math.max(1, Math.min(options.maxEvents ?? 100, 250)),
      maxDepth: Math.max(0, Math.min(options.maxDepth ?? 1, 2)),
    };
  }

  private emptyResult(input: {
    code: EntityContextResult["code"];
    generatedAt: string;
    readTrace: SfiTraceContext;
    options: EntityContextResult["options"];
    resolverUsed?: string | null;
    requestedEntityType: SfiEntityType | null;
    resolvedEntityType: SfiEntityType | null;
    typeHintProvided: boolean;
    typeHintMatched: boolean | null;
    inferencePerformed: boolean;
    resolversAttempted: string[];
    sourcesConsulted?: string[];
    sourcesSkipped?: string[];
    limitations: EntityGraphLimitation[];
  }): EntityContextResult {
    return {
      ok: false,
      code: input.code,
      context: null,
      generatedAt: input.generatedAt,
      readTrace: input.readTrace,
      options: input.options,
      resolverUsed: input.resolverUsed ?? null,
      requestedEntityType: input.requestedEntityType,
      resolvedEntityType: input.resolvedEntityType,
      typeHintProvided: input.typeHintProvided,
      typeHintMatched: input.typeHintMatched,
      inferencePerformed: input.inferencePerformed,
      resolversAttempted: input.resolversAttempted,
      sourcesConsulted: input.sourcesConsulted ?? [],
      sourcesSkipped: input.sourcesSkipped ?? [],
      ontologyViolationsRejected: 0,
      contextCompleteness: {
        score: 0,
        sectionsApplicable: ["identity"],
        sectionsPresent: [],
        presentSections: [],
        missingSections: ["entity"],
        sectionsMissing: ["entity"],
        sectionsUnlinked: [],
        sectionsNotApplicable: [],
      },
      limitations: input.limitations,
    };
  }

  private isObservation(row: EntityGraphRow): boolean {
    return ["root_observation_events", "world_vector_observations", "worldspect_snapshots"].includes(row.sourceTable);
  }

  private isEvidence(row: EntityGraphRow): boolean {
    return ["root_evidence_entries", "sfi_evidence_ledger", "sfi_phenomenon_evidence"].includes(row.sourceTable);
  }

  private isPrediction(row: EntityGraphRow): boolean {
    return row.sourceTable === "sfi_prediction_entries";
  }

  private isEvent(row: EntityGraphRow): boolean {
    return ["epistemic_events", "root_audit_events"].includes(row.sourceTable);
  }

  private toObservation(row: EntityGraphRow, entity: SfiEntity, readTrace: SfiTraceContext): Observation {
    return {
      id: row.sourceId,
      phenomenonId:
        stringValue(row.payload.phenomenon_id) ??
        stringValue(row.payload.phenomenonId) ??
        entity.entityId,
      source: row.sourceTable,
      signal: row.payload.signal ?? row.payload.payload ?? row.payload,
      observedAt:
        stringValue(row.payload.observedAt) ??
        stringValue(row.payload.observed_at) ??
        row.createdAt ??
        readTrace.createdAt,
      confidence: row.confidence,
      trace: row.trace ?? entity.trace ?? readTrace,
      createdAt: row.createdAt ?? readTrace.createdAt,
    };
  }

  private toEvidence(row: EntityGraphRow, entity: SfiEntity, readTrace: SfiTraceContext): Evidence {
    return {
      id: row.sourceId,
      observationIds: this.stringArray(row.payload.observation_ids, row.payload.observation_id),
      evaluatorId:
        stringValue(row.payload.evaluator_id) ??
        stringValue(row.payload.evaluatorId) ??
        stringValue(row.payload.agent_id) ??
        "entity_graph_reader",
      confidence: row.confidence,
      assessment:
        stringValue(row.payload.assessment) ??
        stringValue(row.payload.summary) ??
        stringValue(row.payload.statement) ??
        stringValue(row.payload.title) ??
        stringValue(row.payload.content) ??
        "Evidence row resolved without textual assessment.",
      trace: row.trace ?? entity.trace ?? readTrace,
      createdAt: row.createdAt ?? readTrace.createdAt,
    };
  }

  private toPredictions(rows: EntityGraphRow[]): KernelPrediction[] {
    const verificationRows = rows.filter((row) => row.sourceTable === "sfi_prediction_verifications");
    const learningRows = rows.filter((row) => row.sourceTable === "sfi_predictive_learning_events");

    return rows.filter((row) => this.isPrediction(row)).map((row) => {
      const verifications = verificationRows.filter((verification) => {
        const predictionId = stringValue(verification.payload.prediction_entry_id) ?? stringValue(verification.payload.prediction_id);
        const hypothesisId = stringValue(verification.payload.hypothesis_id);
        return predictionId === row.sourceId || hypothesisId === stringValue(row.payload.hypothesis_id);
      });
      const verification = verifications[0];
      const learningEventIds = learningRows
        .filter((learning) => {
          const predictionId = stringValue(learning.payload.prediction_id) ?? stringValue(learning.payload.prediction_entry_id);
          return predictionId === row.sourceId || stringValue(learning.payload.hypothesis_id) === stringValue(row.payload.hypothesis_id);
        })
        .map((learning) => learning.sourceId);

      return {
        id: row.sourceId,
        statement:
          stringValue(row.payload.statement) ??
          stringValue(row.payload.prediction) ??
          stringValue(row.payload.prediccion_explicita) ??
          stringValue(row.payload.title) ??
          `${row.sourceTable}:${row.sourceId}`,
        description: stringValue(row.payload.description) ?? stringValue(row.payload.summary) ?? stringValue(row.payload.case_label),
        confidence: row.confidence,
        verification: verification ? {
          id: verification.sourceId,
          status:
            stringValue(verification.payload.verification_state) ??
            stringValue(verification.payload.evaluation_result) ??
            "UNKNOWN",
          observedValue: verification.payload.source_value,
          verifiedAt:
            stringValue(verification.payload.verifiedAt) ??
            stringValue(verification.payload.verified_at) ??
            stringValue(verification.payload.source_checked_at) ??
            verification.createdAt,
          evidenceIds: this.stringArray(verification.payload.evidence_ids, verification.payload.evidence_id),
          error: stringValue(verification.payload.error) ?? null,
          learningEventIds,
        } : undefined,
      };
    });
  }

  private toDecision(row: EntityGraphRow, entity: SfiEntity, readTrace: SfiTraceContext): GovernanceDecision {
    const status = (stringValue(row.payload.status) ?? stringValue(row.payload.decision) ?? "UNKNOWN").toUpperCase();
    const decision = ["APPROVED", "REJECTED", "OVERRIDDEN", "PENDING"].includes(status)
      ? (status as GovernanceDecision["decision"])
      : "UNKNOWN";

    return {
      id: row.sourceId,
      targetId: stringValue(row.payload.target_id) ?? stringValue(row.payload.entity_id) ?? entity.entityId,
      decision,
      authority:
        stringValue(row.payload.authority) ??
        stringValue(row.payload.actor_id) ??
        "root_audit_events",
      reason:
        stringValue(row.payload.reason) ??
        stringValue(row.payload.action) ??
        "Governance decision inferred from root_audit_events row.",
      trace: row.trace ?? entity.trace ?? readTrace,
      timestamp:
        stringValue(row.payload.timestamp) ??
        stringValue(row.payload.created_at) ??
        row.createdAt ??
        readTrace.createdAt,
    };
  }

  private toMemory(row: EntityGraphRow, entity: SfiEntity, readTrace: SfiTraceContext): InstitutionalMemory {
    return {
      id: row.sourceId,
      evidenceIds: this.stringArray(row.payload.evidence_ids, row.payload.evidence_id),
      phenomenonId:
        stringValue(row.payload.phenomenon_id) ??
        stringValue(row.payload.entity_id) ??
        entity.entityId,
      knowledge:
        stringValue(row.payload.knowledge) ??
        stringValue(row.payload.summary) ??
        stringValue(asRecord(row.payload.memory_delta).knowledge) ??
        "Memory row resolved without textual knowledge.",
      confidence: row.confidence,
      trace: row.trace ?? entity.trace ?? readTrace,
      createdAt: row.createdAt ?? readTrace.createdAt,
    };
  }

  private toAgent(row: EntityGraphRow): AgentDefinition {
    return {
      id: row.sourceId,
      name: stringValue(row.payload.name) ?? stringValue(row.payload.agent_name) ?? row.sourceId,
      type: stringValue(row.payload.type) ?? "ENTITY_GRAPH_SOURCE_AGENT",
      capabilities: this.stringArray(row.payload.capabilities),
      readsMemory: this.stringArray(row.payload.reads_memory),
      writesMemory: [],
      emits: this.stringArray(row.payload.emits),
      humanApprovalRequired: Boolean(row.payload.human_approval_required),
      confidenceModel: stringValue(row.payload.confidence_model) ?? "source_declared",
      status: "ACTIVE",
    };
  }

  private toEvent(row: EntityGraphRow, entity: SfiEntity, readTrace: SfiTraceContext, index: number): SfiEvent {
    return {
      id: row.sourceId,
      version: stringValue(row.payload.version) ?? "1",
      type: stringValue(row.payload.type) ?? stringValue(row.payload.event_name) ?? row.sourceTable,
      logbookId: row.logbookId ?? row.trace?.logbookId ?? entity.logbookId ?? readTrace.logbookId,
      source: this.toEventSource(row),
      agentId: stringValue(row.payload.agent_id) ?? stringValue(row.payload.agentId),
      payload: {
        sourceTable: row.sourceTable,
        sourceId: row.sourceId,
        payloadKeys: Object.keys(row.payload).sort(),
      },
      timestamp:
        stringValue(row.payload.timestamp) ??
        stringValue(row.payload.created_at) ??
        stringValue(row.payload.occurred_at) ??
        row.createdAt ??
        readTrace.createdAt,
      sequence: numberValue(row.payload.sequence) ?? index,
    };
  }

  private toEventSource(row: EntityGraphRow): SfiEventSource {
    const source = (stringValue(row.payload.source) ?? "").toUpperCase();
    const allowed: SfiEventSource[] = ["AMV", "RUNTIME", "AGENT", "GOVERNANCE", "VERIFICATION", "SYSTEM"];
    if (allowed.includes(source as SfiEventSource)) {
      return source as SfiEventSource;
    }
    return row.sourceTable === "root_audit_events" ? "GOVERNANCE" : "SYSTEM";
  }

  private toGovernance(entity: SfiEntity, decisions: GovernanceDecision[]): GovernanceState {
    const finalDecision = [...decisions].reverse().find((decision) => decision.decision !== "UNKNOWN");
    return {
      entityId: entity.entityId,
      decisions,
      status: finalDecision?.decision === "APPROVED" || finalDecision?.decision === "REJECTED" || finalDecision?.decision === "PENDING"
        ? finalDecision.decision
        : "UNKNOWN",
      limitations: decisions.length === 0
        ? [
            graphLimitation({
              code: "NO_GOVERNANCE_DECISIONS",
              scope: `governance:${entity.entityId}`,
              severity: "INFO",
              message: "No governance decisions were found for this entity.",
              requirement: "Governance state requires root_audit_events rows linked to the entity.",
            }),
          ]
        : [],
    };
  }

  private emptyTrajectory(entityId: string, code: string): Trajectory {
    return {
      entityId,
      trajectoryKind: "institutional_record_timeline",
      timeline: [],
      currentPosition: null,
      projected: [],
      velocity: 0,
      velocityUnit: "position_per_day",
      acceleration: 0,
      accelerationUnit: "position_per_day_squared",
      deviation: 0,
      deviationDefinition: "not_calculated",
      projectionMethod: "none",
      confidence: 0,
      evidenceIds: [],
      status: "PARTIAL",
      limitations: [
        graphLimitation({
          code,
          scope: `trajectory:${entityId}`,
          severity: "INFO",
          message: "Trajectory was not calculated for this request.",
          requirement: "includeTrajectory must be true and at least two temporal points are needed for OPERATIONAL trajectory.",
        }),
      ],
    };
  }

  private stringArray(value: unknown, fallback?: unknown): string[] {
    const values = Array.isArray(value) ? value : fallback ? [fallback] : [];
    return values.filter((item): item is string => typeof item === "string" && item.length > 0);
  }

  private contextCompleteness(
    sections: Record<string, unknown[] | { present: boolean; applicable: boolean }>,
    sectionsUnlinked: string[] = []
  ): EntityContextResult["contextCompleteness"] {
    const entries = Object.entries(sections).filter(([, value]) => Array.isArray(value) || value.applicable);
    const unlinked = new Set(sectionsUnlinked);
    const sectionsApplicable = entries.map(([section]) => section).sort();
    const sectionsPresent = entries
      .filter(([section, value]) => !unlinked.has(section) && (Array.isArray(value) ? value.length > 0 : value.present))
      .map(([section]) => section)
      .sort();
    const missingSections = entries
      .filter(([, value]) => Array.isArray(value) ? value.length === 0 : !value.present)
      .map(([section]) => section)
      .sort();

    return {
      score: sectionsApplicable.length === 0 ? 0 : sectionsPresent.length / sectionsApplicable.length,
      sectionsApplicable,
      sectionsPresent,
      presentSections: sectionsPresent,
      missingSections,
      sectionsMissing: missingSections,
      sectionsUnlinked: [...unlinked].sort(),
      sectionsNotApplicable: [],
    };
  }

  private async findRowsForEntityIds(entityIds: string[], tables: EntityGraphSourceTable[], maxRows: number) {
    const results = [];
    for (const entityId of entityIds.slice(0, 40)) {
      const result = await this.source.findByEntityId(entityId, { tables, maxRows });
      results.push(result);
    }
    return this.mergeSourceResults(results);
  }

  private mergeSourceResults(results: Array<Awaited<ReturnType<EntityGraphReadSource["findByEntityId"]>>>): Awaited<ReturnType<EntityGraphReadSource["findByEntityId"]>> {
    const rows = this.uniqueRows(results.flatMap((result) => result.rows));
    const sourcesConsulted = [...new Set(results.flatMap((result) => result.sourcesConsulted))];
    const sourcesSkipped = [...new Set(results.flatMap((result) => result.sourcesSkipped))];
    const limitations = normalizeLimitations(results.flatMap((result) => result.limitations));
    return { rows, limitations, sourcesConsulted, sourcesSkipped };
  }

  private uniqueRows(rows: EntityGraphRow[]): EntityGraphRow[] {
    const seen = new Set<string>();
    const unique: EntityGraphRow[] = [];
    for (const row of rows) {
      const key = `${row.sourceTable}:${row.sourceId}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(row);
      }
    }
    return unique.sort((a, b) => `${a.sourceTable}:${a.sourceId}`.localeCompare(`${b.sourceTable}:${b.sourceId}`));
  }

  private identityAliases(entity: SfiEntity, rows: EntityGraphRow[]): string[] {
    const aliases = new Set<string>([entity.entityId, entity.sourceId ?? ""]);
    for (const row of rows) {
      for (const key of ["id", "entity_id", "phenomenon_id", "phenomenon_key", "label", "name", "logbook_id"]) {
        const value = stringValue(row.payload[key]);
        if (value) aliases.add(value);
      }
    }
    return [...aliases].filter((value) => /^[A-Za-z0-9:_\-.]{1,160}$/.test(value));
  }

  private referenceIds(rows: EntityGraphRow[]): string[] {
    const values = new Set<string>();
    const keys = new Set([
      "entity_id",
      "target_id",
      "source_id",
      "phenomenon_id",
      "observation_id",
      "evidence_id",
      "prediction_id",
      "prediction_entry_id",
      "hypothesis_id",
      "agent_id",
      "agent_key",
      "event_id",
      "memory_id",
      "logbook_id",
    ]);
    const visit = (value: unknown): void => {
      if (Array.isArray(value)) {
        for (const item of value) visit(item);
        return;
      }
      const record = asRecord(value);
      for (const [key, nested] of Object.entries(record)) {
        if (keys.has(key) && typeof nested === "string" && /^[A-Za-z0-9:_\-.]{1,160}$/.test(nested)) {
          values.add(nested);
        }
        if (key === "id" && typeof nested === "string" && /^[A-Za-z0-9:_\-.]{1,160}$/.test(nested)) {
          values.add(nested);
        }
        if (typeof nested === "object" && nested !== null) visit(nested);
      }
    };
    for (const row of rows) visit(row.payload);
    return [...values].sort();
  }

  private unlinkedSections(entity: SfiEntity, rows: EntityGraphRow[], relationships: { sourceId: string; targetId: string }[]): string[] {
    const sections = new Set<string>();
    if (this.nonCanonicalEvidenceReferences(entity, rows, relationships).length > 0) {
      sections.add("evidence");
    }
    return [...sections].sort();
  }

  private addUnlinkedSectionLimitations(
    entity: SfiEntity,
    rows: EntityGraphRow[],
    relationships: { sourceId: string; targetId: string }[],
    limitations: EntityGraphLimitation[]
  ): void {
    for (const row of this.nonCanonicalEvidenceReferences(entity, rows, relationships)) {
      limitations.push(
        graphLimitation({
          code: "NON_CANONICAL_CONTEXT_REFERENCE",
          scope: `evidence:${row.sourceId}`,
          source: row.sourceTable,
          severity: "INFO",
          message: "Evidence references the phenomenon through a declared legacy payload alias but lacks an observation bridge or ontology-valid relationship.",
          requirement: "Use OBSERVATION -> OBSERVES -> PHENOMENON and EVIDENCE -> DERIVED_FROM -> OBSERVATION, or keep this as contextual unresolved reference until authorized backfill.",
        })
      );
    }
  }

  private nonCanonicalEvidenceReferences(entity: SfiEntity, rows: EntityGraphRow[], relationships: { sourceId: string; targetId: string }[]): EntityGraphRow[] {
    const aliases = new Set(this.identityAliases(entity, rows));
    const relatedIds = new Set(relationships.flatMap((relationship) => [relationship.sourceId, relationship.targetId]));
    return rows.filter((row) => {
      if (!this.isEvidence(row) || relatedIds.has(row.sourceId)) {
        return false;
      }
      const nested = asRecord(row.payload.payload);
      const phenomenonAlias =
        stringValue(row.payload.phenomenon) ??
        stringValue(row.payload.phenomenon_id) ??
        stringValue(row.payload.phenomenonId) ??
        stringValue(nested.phenomenon) ??
        stringValue(nested.phenomenon_id) ??
        stringValue(nested.phenomenonId);
      const observationId = stringValue(row.payload.observation_id) ?? stringValue(row.payload.observationId) ?? stringValue(nested.observation_id) ?? stringValue(nested.observationId);
      return Boolean(phenomenonAlias && aliases.has(phenomenonAlias) && !observationId);
    });
  }

  private addEmptySectionLimitations(limitations: EntityGraphLimitation[], missingSections: string[]): void {
    if (missingSections.length > 0) {
      limitations.push(
        graphLimitation({
          code: "CONTEXT_SECTIONS_EMPTY",
          scope: "context",
          severity: "INFO",
          message: `No data was available for sections: ${missingSections.join(", ")}.`,
          requirement: "Empty sections must remain empty and be reported without synthetic content.",
        })
      );
    }
  }
}

export function createEntityContextService(source?: EntityGraphReadSource): EntityContextService {
  return new EntityContextService(source);
}
