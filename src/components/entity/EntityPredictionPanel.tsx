import type { EntityContext } from "@/core/contracts";
import { EmptyState, FieldRow, Panel } from "./entityViewUtils";

export function EntityPredictionPanel({ context }: { context: EntityContext }) {
  return (
    <Panel title="Prediction Panel">
      {context.predictions.length === 0 ? <EmptyState>Sin predicciones registradas para esta entidad.</EmptyState> : null}
      {context.predictions.length > 0 ? (
        <div style={{ display: "grid", gap: 14 }}>
          {context.predictions.map((prediction) => {
            const verification = context.relationships.find((relationship) => relationship.sourceId === prediction.id && relationship.relationType === "VERIFIED_BY");
            const memoryRelation = context.relationships.find((relationship) => relationship.sourceId === prediction.id || relationship.targetId === prediction.id);
            return (
              <article key={prediction.id ?? prediction.statement} style={{ border: "1px solid #dfe3e8", padding: 14 }}>
                <dl style={{ margin: 0 }}>
                  <FieldRow label="Statement" value={prediction.statement} />
                  <FieldRow label="Confidence" value={prediction.confidence.toFixed(3)} />
                  <FieldRow label="Status" value="Sin estado institucional registrado en el contexto." />
                  <FieldRow label="Verification" value={verification ? `${verification.relationType} via ${verification.targetId}` : "Sin verificacion asociada."} />
                  <FieldRow label="Learning/memory relation" value={memoryRelation ? `${memoryRelation.relationType}: ${memoryRelation.sourceId} -> ${memoryRelation.targetId}` : "Sin relacion de memoria o aprendizaje."} />
                  <FieldRow label="Temporal window" value={prediction.description ?? "Sin ventana temporal declarada."} />
                </dl>
              </article>
            );
          })}
        </div>
      ) : null}
    </Panel>
  );
}
