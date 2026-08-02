import type { EntityGraphLimitation, TrajectoryPoint } from "@/core/contracts";
import { asRecord, graphLimitation, numberValue, stringValue, type EntityGraphRow } from "./EntityGraphService";

export interface EntityTimelineResult {
  timeline: TrajectoryPoint[];
  limitations: EntityGraphLimitation[];
}

const DATE_KEYS = [
  "observedAt",
  "observed_at",
  "createdAt",
  "created_at",
  "timestamp",
  "verifiedAt",
  "verified_at",
  "generatedAt",
  "generated_at",
  "executedAt",
  "executed_at",
  "occurredAt",
  "occurred_at",
] as const;

export class EntityTimelineService {
  buildTimeline(rows: EntityGraphRow[]): EntityTimelineResult {
    const limitations: EntityGraphLimitation[] = [];
    const seen = new Set<string>();
    const points: TrajectoryPoint[] = [];

    for (const row of rows) {
      const payload = row.payload;
      const nested = asRecord(payload.payload);
      let foundDate = false;

      for (const key of DATE_KEYS) {
        const raw = stringValue(payload[key]) ?? stringValue(nested[key]);
        if (!raw) {
          continue;
        }

        foundDate = true;
        const normalized = this.normalizeDate(raw);
        if (!normalized) {
          limitations.push(
            graphLimitation({
              code: "INVALID_TEMPORAL_SIGNAL",
              scope: `timeline:${row.sourceId}`,
              source: row.sourceTable,
              severity: "WARNING",
              message: `Temporal field ${key} is not a valid timestamp.`,
              requirement: "Timeline points must come from real ISO-compatible timestamps and cannot be year-only values.",
            })
          );
          continue;
        }

        const dedupeKey = `${row.sourceTable}:${row.sourceId}:${normalized}`;
        if (seen.has(dedupeKey)) {
          continue;
        }

        seen.add(dedupeKey);
        const position = this.positionForRow(row);
        points.push({
          timestamp: normalized,
          sourceEntityId: row.sourceId,
          sourceType: row.sourceTable,
          position: position.value,
          confidence: row.confidence,
          payload: {
            dateKey: key,
            sourceTable: row.sourceTable,
            positionSource: position.source,
          },
        });
      }

      if (!foundDate) {
        limitations.push(
          graphLimitation({
            code: "MISSING_TEMPORAL_SIGNAL",
            scope: `timeline:${row.sourceId}`,
            source: row.sourceTable,
            severity: "INFO",
            message: "Row has no configured temporal field.",
            requirement: "Timeline points require observedAt, createdAt, timestamp, verifiedAt, generatedAt, or executedAt.",
          })
        );
      }
    }

    points.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));

    return {
      timeline: points,
      limitations,
    };
  }

  private normalizeDate(raw: string): string | null {
    const value = raw.trim();
    if (/^\d{4}$/.test(value)) {
      return null;
    }

    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) {
      return null;
    }

    return date.toISOString();
  }

  private positionForRow(row: EntityGraphRow): { value: number; source: "explicit_position" | "confidence_observable" } {
    const payload = row.payload;
    const nested = asRecord(payload.payload);
    const explicit =
      numberValue(payload.position) ??
      numberValue(payload.score) ??
      numberValue(payload.value) ??
      numberValue(nested.position) ??
      numberValue(nested.score) ??
      numberValue(nested.value);

    if (typeof explicit === "number") {
      return { value: explicit, source: "explicit_position" };
    }

    return { value: row.confidence, source: "confidence_observable" };
  }
}
