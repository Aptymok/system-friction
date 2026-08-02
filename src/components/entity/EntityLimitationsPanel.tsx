import type { EntityGraphLimitation } from "@/core/contracts";
import { EmptyState, Panel } from "./entityViewUtils";

export function EntityLimitationsPanel({ limitations }: { limitations: EntityGraphLimitation[] }) {
  const grouped = limitations.reduce<Record<string, EntityGraphLimitation[]>>((acc, limitation) => {
    acc[limitation.scope] = [...(acc[limitation.scope] ?? []), limitation];
    return acc;
  }, {});

  return (
    <Panel title="Limitations Panel">
      {limitations.length === 0 ? <EmptyState>Sin limitaciones estructuradas para esta lectura.</EmptyState> : null}
      {Object.entries(grouped).map(([scope, items]) => (
        <section key={scope} style={{ marginBottom: 14 }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>{scope}</h3>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
            {items.map((limitation) => (
              <li key={`${limitation.code}:${limitation.source ?? "none"}:${limitation.scope}`} style={{ border: "1px solid #dfe3e8", padding: 12 }}>
                <div><strong>{limitation.code}</strong> / {limitation.severity}</div>
                <div>Source: {limitation.source ?? "No source"}</div>
                <div>{limitation.message}</div>
                <div>Recoverable: {limitation.recoverable ? "yes" : "no"}</div>
                <div>Requirement: {limitation.requirement ?? "No requirement supplied"}</div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </Panel>
  );
}
