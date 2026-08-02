import type {
  EntityContextProvenance,
  EntityGraphLimitation,
  SfiEntity,
} from "@/core/contracts";
import {
  asRecord,
  createDefaultEntityGraphSource,
  graphLimitation,
  isValidEntityGraphId,
  normalizeLimitations,
  stringValue,
  type EntityGraphReadSource,
  type EntityGraphRow,
} from "./EntityGraphService";
import {
  inferEntityTypeFromSource,
  primaryIdentitySources,
  resolverForEntityType,
  type EntityTypeResolver,
} from "./EntitySourceCapabilityRegistry";

export interface EntityGraphIdentityResult {
  ok: boolean;
  code: "FOUND" | "NOT_FOUND" | "INVALID_ID";
  entity: SfiEntity | null;
  rows: EntityGraphRow[];
  provenance: EntityContextProvenance[];
  limitations: EntityGraphLimitation[];
  resolver: EntityTypeResolver | null;
  sourcesConsulted: string[];
  sourcesSkipped: string[];
}

export class EntityGraphBuilder {
  constructor(private readonly source: EntityGraphReadSource = createDefaultEntityGraphSource()) {}

  async resolveEntity(entityId: string, resolver?: EntityTypeResolver): Promise<EntityGraphIdentityResult> {
    if (!isValidEntityGraphId(entityId)) {
      return {
        ok: false,
        code: "INVALID_ID",
        entity: null,
        rows: [],
        provenance: [],
        limitations: [
          graphLimitation({
            code: "INVALID_ENTITY_ID",
            scope: "identity",
            severity: "ERROR",
            message: "Entity id does not match the Entity Graph id contract.",
            recoverable: false,
          }),
        ],
        resolver: null,
        sourcesConsulted: [],
        sourcesSkipped: [],
      };
    }

    const requestedTables = resolver?.identitySources() ?? primaryIdentitySources();
    const { rows, limitations, sourcesConsulted, sourcesSkipped } = await this.source.findByEntityId(entityId, {
      tables: requestedTables,
    });
    return this.resolveEntityFromRows(entityId, rows, limitations, sourcesConsulted, sourcesSkipped, resolver);
  }

  resolveEntityFromRows(
    entityId: string,
    rows: EntityGraphRow[],
    limitations: EntityGraphLimitation[],
    sourcesConsulted: string[],
    sourcesSkipped: string[],
    resolver?: EntityTypeResolver
  ): EntityGraphIdentityResult {
    if (rows.length === 0) {
      return {
        ok: false,
        code: "NOT_FOUND",
        entity: null,
        rows,
        provenance: [],
        limitations: normalizeLimitations([
          ...limitations,
          graphLimitation({
            code: "ENTITY_NOT_FOUND",
            scope: "identity",
            severity: "WARNING",
            message: "Entity was not found in the selected institutional sources.",
            requirement: "A matching row must exist in at least one primary source for the resolver.",
          }),
        ]),
        resolver: resolver ?? null,
        sourcesConsulted,
        sourcesSkipped,
      };
    }

    const activeResolver = resolver ?? resolverForEntityType(inferEntityTypeFromSource(this.selectPrimaryRow(rows, resolver).sourceTable));
    const primary = this.selectPrimaryRow(rows, activeResolver);
    const entity: SfiEntity = {
      entityId,
      type: activeResolver.entityType,
      label: this.resolveLabel(entityId, primary.payload),
      trace: primary.trace,
      logbookId: primary.logbookId ?? primary.trace?.logbookId,
      sourceTable: primary.sourceTable,
      sourceId: primary.sourceId,
      payload: {
        sourceTable: primary.sourceTable,
        sourceId: primary.sourceId,
        payloadKeys: Object.keys(primary.payload).sort(),
      },
      createdAt: primary.createdAt,
      updatedAt: primary.updatedAt,
      confidence: primary.confidence,
      publicable: this.resolvePublicable(primary.payload) ?? activeResolver.publicableByDefault,
    };

    return {
      ok: true,
      code: "FOUND",
      entity,
      rows,
      provenance: rows.map((row) => ({
        sourceTable: row.sourceTable,
        sourceId: row.sourceId,
        entityId,
        matchedBy: row.matchedBy,
        confidence: row.confidence,
        payloadKeys: Object.keys(row.payload).sort(),
      })),
      limitations: normalizeLimitations(limitations),
      resolver: activeResolver,
      sourcesConsulted,
      sourcesSkipped,
    };
  }

  private selectPrimaryRow(rows: EntityGraphRow[], resolver?: EntityTypeResolver): EntityGraphRow {
    const identityPriority = resolver?.primarySources ?? primaryIdentitySources();

    return (
      [...rows].sort((a, b) => {
        const leftPriority = identityPriority.includes(a.sourceTable) ? identityPriority.indexOf(a.sourceTable) : Number.MAX_SAFE_INTEGER;
        const rightPriority = identityPriority.includes(b.sourceTable) ? identityPriority.indexOf(b.sourceTable) : Number.MAX_SAFE_INTEGER;
        const priorityDelta = leftPriority - rightPriority;
        if (priorityDelta !== 0) {
          return priorityDelta;
        }
        return b.confidence - a.confidence;
      })[0] ?? rows[0]
    );
  }

  private resolveLabel(entityId: string, payload: Record<string, unknown>): string {
    return (
      stringValue(payload.title) ??
      stringValue(payload.name) ??
      stringValue(payload.label) ??
      stringValue(payload.statement) ??
      stringValue(asRecord(payload.payload).title) ??
      entityId
    );
  }

  private resolvePublicable(payload: Record<string, unknown>): boolean | undefined {
    const publicable = payload.publicable ?? payload.is_public ?? payload.public;
    return typeof publicable === "boolean" ? publicable : undefined;
  }
}
