import type { EntityContext } from "@/core/contracts";
import { EmptyState, FieldRow, Panel, TraceLabel } from "./entityViewUtils";

export function EntityMemoryPanel({ context }: { context: EntityContext }) {
  return (
    <Panel title="Memory Panel">
      {context.memory.length === 0 ? <EmptyState>Sin memoria institucional asociada.</EmptyState> : null}
      {context.memory.length > 0 ? (
        <div style={{ display: "grid", gap: 14 }}>
          {context.memory.map((memory) => (
            <article key={memory.id} style={{ border: "1px solid #dfe3e8", padding: 14 }}>
              <dl style={{ margin: 0 }}>
                <FieldRow label="Knowledge" value={memory.knowledge} />
                <FieldRow label="Confidence" value={memory.confidence.toFixed(3)} />
                <FieldRow label="Evidence IDs" value={memory.evidenceIds.join(", ") || "Sin evidencia asociada"} />
                <FieldRow label="Created at" value={memory.createdAt} />
                <FieldRow label="Trace" value={<TraceLabel trace={memory.trace} />} />
                <FieldRow label="Provenance" value={context.provenance.find((item) => item.sourceId === memory.id)?.sourceTable ?? "Sin provenance especifica"} />
              </dl>
            </article>
          ))}
        </div>
      ) : null}
    </Panel>
  );
}
