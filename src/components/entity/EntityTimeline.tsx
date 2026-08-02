import type { EntityContext, TrajectoryPoint } from "@/core/contracts";
import { EmptyState, EntityLink, Panel, StatusBadge, TraceLabel } from "./entityViewUtils";

function labelForPoint(context: EntityContext, point: TrajectoryPoint): string {
  const event = context.events.find((item) => item.id === point.sourceEntityId);
  if (event) return event.type;
  const evidence = context.evidence.find((item) => item.id === point.sourceEntityId);
  if (evidence) return evidence.assessment;
  const observation = context.observations.find((item) => item.id === point.sourceEntityId);
  if (observation) return observation.source;
  const memory = context.memory.find((item) => item.id === point.sourceEntityId);
  if (memory) return memory.knowledge;
  const prediction = context.predictions.find((item) => item.id === point.sourceEntityId);
  if (prediction) return prediction.statement;
  return "Evento temporal institucional";
}

function traceForPoint(context: EntityContext, point: TrajectoryPoint) {
  return (
    context.events.find((item) => item.id === point.sourceEntityId)?.logbookId ??
    context.evidence.find((item) => item.id === point.sourceEntityId)?.trace.logbookId ??
    context.observations.find((item) => item.id === point.sourceEntityId)?.trace.logbookId ??
    context.memory.find((item) => item.id === point.sourceEntityId)?.trace.logbookId
  );
}

export function EntityTimeline({ context }: { context: EntityContext }) {
  const points = context.trajectory.timeline;

  return (
    <Panel title="Entity Timeline">
      {points.length === 0 ? <EmptyState>Sin historia temporal reconstruible.</EmptyState> : null}
      {points.length === 1 ? (
        <p style={{ margin: "0 0 12px", color: "#92400e" }}>
          <StatusBadge status="PARTIAL" />: un solo punto temporal no permite inferir tendencia.
        </p>
      ) : null}
      {points.length > 0 ? (
        <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
          {points.map((point) => (
            <li key={`${point.sourceType}:${point.sourceEntityId}:${point.timestamp}`} style={{ borderLeft: "3px solid #0f4c81", padding: "6px 0 6px 14px" }}>
              <time dateTime={point.timestamp} style={{ display: "block", fontWeight: 700 }}>{point.timestamp}</time>
              <div>{labelForPoint(context, point)}</div>
              <div style={{ color: "#5b6472", fontSize: 14 }}>
                Source: {point.sourceType} / <EntityLink id={point.sourceEntityId} /> / confidence {point.confidence.toFixed(3)}
              </div>
              <div style={{ color: "#5b6472", fontSize: 14 }}>
                Trace: {traceForPoint(context, point) ?? <TraceLabel />}
              </div>
            </li>
          ))}
        </ol>
      ) : null}
    </Panel>
  );
}
