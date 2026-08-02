import type { EntityContext } from "@/core/contracts";
import { FieldRow, Panel, StatusBadge } from "./entityViewUtils";

export function EntityTrajectoryPanel({ context }: { context: EntityContext }) {
  const trajectory = context.trajectory;
  const usesConfidenceProxy = trajectory.projectionMethod.includes("confidence_observable") || trajectory.deviationDefinition.includes("confidence_observable");

  return (
    <Panel title="Trajectory Panel">
      <dl style={{ margin: 0 }}>
        <FieldRow label="Status" value={<StatusBadge status={trajectory.status} />} />
        <FieldRow label="Trajectory kind" value={trajectory.trajectoryKind ?? "system_state_trajectory"} />
        <FieldRow label="Timeline points" value={trajectory.timeline.length} />
        <FieldRow label="Current position" value={trajectory.currentPosition ? `${trajectory.currentPosition.position.toFixed(3)} @ ${trajectory.currentPosition.timestamp}` : "Sin posicion actual"} />
        <FieldRow label="Projected" value={trajectory.projected.length > 0 ? trajectory.projected.map((point) => `${point.position.toFixed(3)} @ ${point.timestamp}`).join(", ") : "Sin proyeccion"} />
        <FieldRow label="Velocity" value={`${trajectory.velocity.toFixed(6)} ${trajectory.velocityUnit}`} />
        <FieldRow label="Acceleration" value={`${trajectory.acceleration.toFixed(6)} ${trajectory.accelerationUnit}`} />
        <FieldRow label="Deviation" value={`${trajectory.deviation.toFixed(6)}; ${trajectory.deviationDefinition}`} />
        <FieldRow label="Projection method" value={trajectory.projectionMethod} />
        <FieldRow label="Confidence" value={trajectory.confidence.toFixed(3)} />
      </dl>
      {trajectory.timeline.length <= 1 ? (
        <p style={{ margin: "12px 0 0", color: "#92400e" }}>
          0-1 puntos temporales producen estado PARTIAL; no se dibuja ni se insinua tendencia.
        </p>
      ) : null}
      {usesConfidenceProxy ? (
        <p style={{ margin: "12px 0 0", color: "#5b6472" }}>
          La posicion usa confidence como proxy observable porque no existe una posicion explicita en la fuente.
        </p>
      ) : null}
      {trajectory.limitations.length > 0 ? (
        <ul style={{ margin: "12px 0 0", paddingLeft: 18 }}>
          {trajectory.limitations.map((limitation) => (
            <li key={`${limitation.code}:${limitation.scope}`}>{limitation.code}: {limitation.message}</li>
          ))}
        </ul>
      ) : null}
    </Panel>
  );
}
