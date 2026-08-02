import Link from "next/link";
import type { ReactNode } from "react";
import type { EntityRelationship, SfiEntityType, SfiTraceContext } from "@/core/contracts";

export function EmptyState({ children }: { children: ReactNode }) {
  return <p style={{ margin: 0, color: "#6b7280" }}>{children}</p>;
}

export function FieldRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(120px, 180px) 1fr", gap: 12, padding: "6px 0", borderBottom: "1px solid #eef0f3" }}>
      <dt style={{ color: "#5b6472" }}>{label}</dt>
      <dd style={{ margin: 0, minWidth: 0, overflowWrap: "anywhere" }}>{value || "No registrado"}</dd>
    </div>
  );
}

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ padding: "24px 0", borderTop: "1px solid #dfe3e8" }}>
      <h2 style={{ margin: "0 0 14px", fontSize: 18, lineHeight: 1.3 }}>{title}</h2>
      {children}
    </section>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  const color = normalized === "OPERATIONAL" ? "#0f766e" : normalized === "PARTIAL" ? "#92400e" : normalized === "TYPE_MISMATCH" || normalized === "NOT_FOUND" ? "#991b1b" : "#374151";
  return (
    <span style={{ display: "inline-block", color, fontWeight: 700, letterSpacing: 0, textTransform: "uppercase" }}>
      {normalized}
    </span>
  );
}

export function TraceLabel({ trace }: { trace?: SfiTraceContext }) {
  if (!trace) {
    return <span>No trace registrado</span>;
  }

  return <span>{trace.logbookId}</span>;
}

export function relatedTypeFor(relationship: EntityRelationship, side: "source" | "target"): SfiEntityType | undefined {
  if (relationship.relationType === "OBSERVES") {
    return side === "source" ? "OBSERVATION" : "PHENOMENON";
  }
  if (relationship.relationType === "VERIFIED_BY") {
    return side === "source" ? "PREDICTION" : "EVIDENCE";
  }
  if (relationship.relationType === "APPROVES" || relationship.relationType === "REJECTS") {
    return side === "source" ? "GOVERNANCE_DECISION" : "PHENOMENON";
  }
  if (relationship.relationType === "EXECUTES") {
    return side === "source" ? "AGENT" : "CAPABILITY";
  }
  if (relationship.relationType === "EXECUTED_BY") {
    return side === "source" ? "AGENT_EXECUTION" : "AGENT";
  }
  if (relationship.relationType === "PRODUCES") {
    return side === "source" ? "AGENT" : "EVIDENCE";
  }
  if (relationship.relationType === "DERIVED_FROM" && relationship.sourceTable === "worldspect_snapshots") {
    return side === "source" ? "REPORT" : "MEMORY";
  }
  return undefined;
}

export function EntityLink({ id, entityType }: { id: string; entityType?: SfiEntityType }) {
  const href = entityType ? `/entity/${encodeURIComponent(id)}?entityType=${entityType}` : `/entity/${encodeURIComponent(id)}`;
  return (
    <Link href={href} style={{ color: "#0f4c81", textDecoration: "underline", textUnderlineOffset: 2, overflowWrap: "anywhere" }}>
      {id}
    </Link>
  );
}
