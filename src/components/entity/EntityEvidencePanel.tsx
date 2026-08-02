import type { EntityContext } from "@/core/contracts";
import { EmptyState, FieldRow, Panel, TraceLabel } from "./entityViewUtils";

export function EntityEvidencePanel({ context }: { context: EntityContext }) {
  const sourceUnavailable = context.limitations.some((limitation) => limitation.scope === "source_read" || limitation.code.includes("SOURCE"));

  return (
    <Panel title="Evidence Panel">
      {context.evidence.length === 0 && sourceUnavailable ? <EmptyState>Evidence source unavailable for this read.</EmptyState> : null}
      {context.evidence.length === 0 && !sourceUnavailable ? <EmptyState>Evidence absent for this entity.</EmptyState> : null}
      {context.evidence.length > 0 ? (
        <div style={{ display: "grid", gap: 14 }}>
          {context.evidence.map((item) => (
            <article key={item.id} style={{ border: "1px solid #dfe3e8", padding: 14 }}>
              <dl style={{ margin: 0 }}>
                <FieldRow label="Evidence id" value={item.id} />
                <FieldRow label="Assessment" value={item.assessment} />
                <FieldRow label="Confidence" value={item.confidence.toFixed(3)} />
                <FieldRow label="Evaluator" value={item.evaluatorId} />
                <FieldRow label="Observation IDs" value={item.observationIds.join(", ") || "Sin observaciones asociadas"} />
                <FieldRow label="Trace" value={<TraceLabel trace={item.trace} />} />
                <FieldRow label="Created at" value={item.createdAt} />
              </dl>
            </article>
          ))}
        </div>
      ) : null}
    </Panel>
  );
}
