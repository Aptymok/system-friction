import type { EntityContext } from "@/core/contracts";
import { EmptyState, FieldRow, Panel, TraceLabel } from "./entityViewUtils";

export function EntityGovernancePanel({ context }: { context: EntityContext }) {
  return (
    <Panel title="Governance Panel">
      {context.decisions.length === 0 ? <EmptyState>Sin decision institucional registrada.</EmptyState> : null}
      {context.decisions.length > 0 ? (
        <div style={{ display: "grid", gap: 14 }}>
          {context.decisions.map((decision) => (
            <article key={decision.id} style={{ border: "1px solid #dfe3e8", padding: 14 }}>
              <dl style={{ margin: 0 }}>
                <FieldRow label="Decision" value={decision.decision} />
                <FieldRow label="Authority" value={decision.authority} />
                <FieldRow label="Reason" value={decision.reason} />
                <FieldRow label="Timestamp" value={decision.timestamp} />
                <FieldRow label="Trace" value={<TraceLabel trace={decision.trace} />} />
              </dl>
            </article>
          ))}
        </div>
      ) : null}
    </Panel>
  );
}
