import type { EntityContext, EntityRelationship } from "@/core/contracts";
import { EmptyState, EntityLink, Panel, relatedTypeFor } from "./entityViewUtils";

function RelationRow({ relationship, direction }: { relationship: EntityRelationship; direction: "incoming" | "outgoing" }) {
  return (
    <li style={{ padding: "10px 0", borderBottom: "1px solid #eef0f3" }}>
      <div style={{ fontWeight: 700 }}>{relationship.relationType}</div>
      <div>
        Source: <EntityLink id={relationship.sourceId} entityType={relatedTypeFor(relationship, "source")} />
      </div>
      <div>
        Target: <EntityLink id={relationship.targetId} entityType={relatedTypeFor(relationship, "target")} />
      </div>
      <div style={{ color: "#5b6472", fontSize: 14 }}>
        Direction: {direction}; confidence {relationship.confidence.toFixed(3)}; weight {relationship.weight.toFixed(3)}
      </div>
      <div style={{ color: "#5b6472", fontSize: 14 }}>Source table: {relationship.sourceTable}</div>
      <div style={{ color: "#5b6472", fontSize: 14 }}>Derivation: {relationship.derivationRule}</div>
      <div style={{ color: "#5b6472", fontSize: 14 }}>Evidence: {relationship.evidenceIds.join(", ") || "No evidence ids"}</div>
    </li>
  );
}

export function EntityGraphView({ context }: { context: EntityContext }) {
  const incoming = context.relationships.filter((relationship) => relationship.targetId === context.entity.entityId);
  const outgoing = context.relationships.filter((relationship) => relationship.sourceId === context.entity.entityId);
  const contextual = context.relationships.filter((relationship) => relationship.sourceId !== context.entity.entityId && relationship.targetId !== context.entity.entityId);

  return (
    <Panel title="Relationship Field">
      {context.relationships.length === 0 ? <EmptyState>No hay relaciones ontologicamente validas para esta entidad.</EmptyState> : null}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18 }}>
        <section>
          <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>Incoming relations</h3>
          {incoming.length === 0 ? <EmptyState>Sin relaciones entrantes.</EmptyState> : <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>{incoming.map((relationship) => <RelationRow key={`in:${relationship.sourceId}:${relationship.relationType}:${relationship.targetId}`} relationship={relationship} direction="incoming" />)}</ul>}
        </section>
        <section>
          <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>Entity</h3>
          <div style={{ padding: 12, border: "1px solid #dfe3e8", background: "#f8fafc" }}>
            <strong>{context.entity.label}</strong>
            <div>{context.entity.type}</div>
            <EntityLink id={context.entity.entityId} entityType={context.entity.type} />
          </div>
        </section>
        <section>
          <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>Outgoing relations</h3>
          {outgoing.length === 0 ? <EmptyState>Sin relaciones salientes.</EmptyState> : <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>{outgoing.map((relationship) => <RelationRow key={`out:${relationship.sourceId}:${relationship.relationType}:${relationship.targetId}`} relationship={relationship} direction="outgoing" />)}</ul>}
        </section>
      </div>
      {contextual.length > 0 ? (
        <section style={{ marginTop: 18 }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>Contextual relations</h3>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>{contextual.map((relationship) => <RelationRow key={`ctx:${relationship.sourceId}:${relationship.relationType}:${relationship.targetId}`} relationship={relationship} direction="outgoing" />)}</ul>
        </section>
      ) : null}
    </Panel>
  );
}
