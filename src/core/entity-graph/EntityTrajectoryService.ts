import type { EntityGraphLimitation, Trajectory, TrajectoryPoint } from "@/core/contracts";
import { graphLimitation } from "./EntityGraphService";

export class EntityTrajectoryService {
  buildTrajectory(entityId: string, timeline: TrajectoryPoint[], inheritedLimitations: EntityGraphLimitation[] = []): Trajectory {
    const limitations = [...inheritedLimitations];
    const points = [...timeline].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
    const positionMethod = this.positionMethod(points);
    const trajectoryKind = this.trajectoryKind(points);

    if (points.length < 2) {
      limitations.push(
        graphLimitation({
          code: "INSUFFICIENT_TEMPORAL_POINTS",
          scope: `trajectory:${entityId}`,
          severity: "WARNING",
          message: "Trajectory requires at least two real temporal points.",
          requirement: "0 or 1 temporal points must produce PARTIAL and no projection.",
        })
      );
      return {
        entityId,
        trajectoryKind,
        timeline: points,
        currentPosition: points.at(-1) ?? null,
        projected: [],
        velocity: 0,
        velocityUnit: "position_per_day",
        acceleration: 0,
        accelerationUnit: "position_per_day_squared",
        deviation: 0,
        deviationDefinition: `not_calculated_without_two_real_temporal_points; position=${positionMethod}`,
        projectionMethod: "none",
        confidence: points.length === 1 ? points[0].confidence : 0,
        evidenceIds: this.evidenceIds(points),
        status: "PARTIAL",
        limitations,
      };
    }

    const velocity = this.velocity(points);
    const acceleration = this.acceleration(points);
    if (trajectoryKind === "institutional_record_timeline") {
      limitations.push(
        graphLimitation({
          code: "TRAJECTORY_RECORD_TIMELINE_ONLY",
          scope: `trajectory:${entityId}`,
          source: "entity_graph_timeline",
          severity: "INFO",
          message: "Trajectory points describe institutional record timestamps, not a comparable system-state variable.",
          requirement: "Record timelines may be operational as historical reconstruction but must not project systemic evolution.",
        })
      );
    }
    const projected = trajectoryKind === "system_state_trajectory" ? this.project(points, velocity, limitations) : [];
    const currentPosition = points.at(-1) ?? null;
    const deviation =
      projected.length > 0 && currentPosition
        ? projected[0].position - currentPosition.position
        : 0;

    return {
      entityId,
      trajectoryKind,
      timeline: points,
      currentPosition,
      projected,
      velocity,
      velocityUnit: "position_per_day",
      acceleration,
      accelerationUnit: "position_per_day_squared",
      deviation,
      deviationDefinition:
        projected.length > 0
          ? `first_projection_position_minus_current_position; position=${positionMethod}`
          : `not_calculated_without_projection; position=${positionMethod}; trajectoryKind=${trajectoryKind}`,
      projectionMethod:
        projected.length > 0
          ? `linear_projection_from_last_two_real_temporal_points; position=${positionMethod}`
          : trajectoryKind === "institutional_record_timeline"
            ? `none; trajectoryKind=institutional_record_timeline; position=${positionMethod}`
            : "none",
      confidence: this.averageConfidence(points),
      evidenceIds: this.evidenceIds(points),
      status: "OPERATIONAL",
      limitations,
    };
  }

  private velocity(points: TrajectoryPoint[]): number {
    const previous = points[points.length - 2];
    const current = points[points.length - 1];
    const days = this.daysBetween(previous.timestamp, current.timestamp);
    if (days <= 0) {
      return 0;
    }

    return (current.position - previous.position) / days;
  }

  private acceleration(points: TrajectoryPoint[]): number {
    if (points.length < 3) {
      return 0;
    }

    const a = points[points.length - 3];
    const b = points[points.length - 2];
    const c = points[points.length - 1];
    const firstDays = this.daysBetween(a.timestamp, b.timestamp);
    const secondDays = this.daysBetween(b.timestamp, c.timestamp);
    if (firstDays <= 0 || secondDays <= 0) {
      return 0;
    }

    const firstVelocity = (b.position - a.position) / firstDays;
    const secondVelocity = (c.position - b.position) / secondDays;
    return (secondVelocity - firstVelocity) / secondDays;
  }

  private project(points: TrajectoryPoint[], velocity: number, limitations: EntityGraphLimitation[]): TrajectoryPoint[] {
    const current = points.at(-1);
    const previous = points.at(-2);
    if (!current || !previous) {
      return [];
    }

    const stepDays = this.daysBetween(previous.timestamp, current.timestamp);
    if (stepDays <= 0) {
      limitations.push(
        graphLimitation({
          code: "NON_POSITIVE_TEMPORAL_INTERVAL",
          scope: `trajectory:${current.sourceEntityId}`,
          source: current.sourceType,
          severity: "WARNING",
          message: "Projection blocked because the last two temporal points do not form a positive interval.",
          requirement: "Projection requires two ordered temporal points with positive elapsed time.",
        })
      );
      return [];
    }

    const projectedDate = new Date(Date.parse(current.timestamp) + stepDays * 24 * 60 * 60 * 1000);
    return [
      {
        timestamp: projectedDate.toISOString(),
        sourceEntityId: current.sourceEntityId,
        sourceType: "trajectory_projection",
        position: current.position + velocity * stepDays,
        confidence: Math.max(0, current.confidence * 0.75),
        payload: {
          projectionMethod: "linear_projection_from_last_two_real_temporal_points",
          sourceTimelinePoints: [previous.sourceEntityId, current.sourceEntityId],
        },
      },
    ];
  }

  private daysBetween(left: string, right: string): number {
    return (Date.parse(right) - Date.parse(left)) / (24 * 60 * 60 * 1000);
  }

  private averageConfidence(points: TrajectoryPoint[]): number {
    if (points.length === 0) {
      return 0;
    }

    return points.reduce((total, point) => total + point.confidence, 0) / points.length;
  }

  private evidenceIds(points: TrajectoryPoint[]): string[] {
    return [...new Set(points.map((point) => point.sourceEntityId))];
  }

  private positionMethod(points: TrajectoryPoint[]): string {
    if (points.length === 0) {
      return "no_position";
    }

    const sources = new Set(points.map((point) => String(point.payload?.positionSource ?? "unknown")));
    return [...sources].sort().join("+");
  }

  private trajectoryKind(points: TrajectoryPoint[]): "system_state_trajectory" | "institutional_record_timeline" {
    if (points.length === 0) {
      return "institutional_record_timeline";
    }

    return points.every((point) => point.payload?.positionSource === "explicit_position")
      ? "system_state_trajectory"
      : "institutional_record_timeline";
  }
}
