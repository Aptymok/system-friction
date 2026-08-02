import type { EntityContext } from "@/core/contracts";
import { EmptyState, FieldRow, Panel } from "./entityViewUtils";

export function EntityAgentPanel({ context }: { context: EntityContext }) {
  return (
    <Panel title="Agent Panel">
      {context.agents.length === 0 ? <EmptyState>Sin agentes participantes en el contexto. Un agente registrado fuera de este contexto no se cuenta como participante.</EmptyState> : null}
      {context.agents.length > 0 ? (
        <div style={{ display: "grid", gap: 14 }}>
          {context.agents.map((agent) => {
            const executions = context.events.filter((event) => event.agentId === agent.id);
            const outputs = context.relationships.filter((relationship) => relationship.sourceId === agent.id && relationship.relationType === "PRODUCES");
            return (
              <article key={agent.id} style={{ border: "1px solid #dfe3e8", padding: 14 }}>
                <dl style={{ margin: 0 }}>
                  <FieldRow label="Agent identity" value={`${agent.name} (${agent.id})`} />
                  <FieldRow label="Type" value={agent.type} />
                  <FieldRow label="Capabilities" value={agent.capabilities.join(", ") || "Sin capabilities declaradas"} />
                  <FieldRow label="Lifecycle status" value={agent.status} />
                  <FieldRow label="Related executions" value={executions.map((event) => event.id).join(", ") || "Sin ejecuciones relacionadas"} />
                  <FieldRow label="Outputs produced" value={outputs.map((relationship) => relationship.targetId).join(", ") || "Sin outputs producidos en este contexto"} />
                </dl>
              </article>
            );
          })}
        </div>
      ) : null}
    </Panel>
  );
}
