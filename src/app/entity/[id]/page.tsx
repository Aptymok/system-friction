import Link from "next/link";
import { EntityAgentPanel } from "@/components/entity/EntityAgentPanel";
import { EntityEvidencePanel } from "@/components/entity/EntityEvidencePanel";
import { EntityGovernancePanel } from "@/components/entity/EntityGovernancePanel";
import { EntityGraphView } from "@/components/entity/EntityGraphView";
import { EntityLimitationsPanel } from "@/components/entity/EntityLimitationsPanel";
import { EntityMemoryPanel } from "@/components/entity/EntityMemoryPanel";
import { EntityPredictionPanel } from "@/components/entity/EntityPredictionPanel";
import { EntityTimeline } from "@/components/entity/EntityTimeline";
import { EntityTrajectoryPanel } from "@/components/entity/EntityTrajectoryPanel";
import { FieldRow, Panel, StatusBadge } from "@/components/entity/entityViewUtils";
import { readEntityContextView } from "@/lib/entity/readEntityContextView";

export const dynamic = "force-dynamic";

type EntityPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ entityType?: string }>;
};

function shellStyle() {
  return {
    maxWidth: 1180,
    margin: "0 auto",
    padding: "28px 20px 56px",
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    color: "#111827",
  };
}

function contextStatus(result: Awaited<ReturnType<typeof readEntityContextView>>) {
  if (!result.ok) {
    if (result.code === "TYPE_MISMATCH") return "TYPE_MISMATCH";
    if (result.code === "NOT_FOUND") return "NOT_FOUND";
    if (result.status === 403) return "BLOCKED";
    return "BLOCKED";
  }

  const context = result.result.context;
  if (!context) return "BLOCKED";
  if (context.trajectory.status === "OPERATIONAL" && context.limitations.length === 0) return "OPERATIONAL";
  return "PARTIAL";
}

function DiagnosticStrip({ result }: { result: NonNullable<Awaited<ReturnType<typeof readEntityContextView>>["result"]> }) {
  const trajectoryStatus = result.context?.trajectory.status ?? "PARTIAL";
  const limitationsCount = result.context?.limitations.length ?? result.limitations.length;

  return (
    <section aria-label="Context diagnostic strip" style={{ borderTop: "1px solid #dfe3e8", borderBottom: "1px solid #dfe3e8", padding: "12px 0", margin: "18px 0 8px" }}>
      <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <div><dt>sourcesConsulted</dt><dd>{result.sourcesConsulted.length}</dd></div>
        <div><dt>sourcesSkipped</dt><dd>{result.sourcesSkipped.length}</dd></div>
        <div><dt>resolversAttempted</dt><dd>{result.resolversAttempted.join(", ") || "none"}</dd></div>
        <div><dt>ontologyViolationsRejected</dt><dd>{result.ontologyViolationsRejected}</dd></div>
        <div><dt>limitations</dt><dd>{limitationsCount}</dd></div>
        <div><dt>trajectory</dt><dd><StatusBadge status={trajectoryStatus} /></dd></div>
      </dl>
    </section>
  );
}

function FailureSurface({ id, result }: { id: string; result: Awaited<ReturnType<typeof readEntityContextView>> }) {
  const status = contextStatus(result);
  const correctedType = !result.ok ? result.result?.resolvedEntityType : null;

  return (
    <main style={shellStyle()}>
      <nav style={{ color: "#5b6472", marginBottom: 18 }}>
        <Link href="/entity">Entity Graph</Link> {"->"} {correctedType ?? "Unresolved"} {"->"} {id}
      </nav>
      <h1 style={{ margin: 0 }}>Entity Graph</h1>
      <p><StatusBadge status={status} /> {result.ok ? "" : result.message}</p>
      {!result.ok && result.result ? <DiagnosticStrip result={result.result} /> : null}
      {!result.ok && result.code === "TYPE_MISMATCH" ? (
        <Panel title="TYPE_MISMATCH">
          <dl style={{ margin: 0 }}>
            <FieldRow label="requestedEntityType" value={result.result?.requestedEntityType ?? "No solicitado"} />
            <FieldRow label="resolvedEntityType" value={result.result?.resolvedEntityType ?? "No resuelto"} />
            <FieldRow label="typeHintMatched" value={String(result.result?.typeHintMatched)} />
            <FieldRow label="Corrected link" value={correctedType ? <Link href={`/entity/${encodeURIComponent(id)}?entityType=${correctedType}`}>Abrir con {correctedType}</Link> : "Sin tipo corregido"} />
          </dl>
        </Panel>
      ) : null}
      {!result.ok && result.result ? <EntityLimitationsPanel limitations={result.result.limitations} /> : null}
    </main>
  );
}

export default async function EntityPage({ params, searchParams }: EntityPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const readResult = await readEntityContextView({ entityId: id, entityType: query.entityType });

  if (!readResult.ok || !readResult.result.context) {
    return <FailureSurface id={id} result={readResult} />;
  }

  const result = readResult.result;
  const context = result.context!;
  const status = contextStatus(readResult);

  return (
    <main style={shellStyle()}>
      <nav style={{ color: "#5b6472", marginBottom: 18 }}>
        <Link href="/entity">Entity Graph</Link> {"->"} {context.entity.type} {"->"} {context.entity.entityId}
      </nav>

      <header style={{ paddingBottom: 18 }}>
        <p style={{ margin: "0 0 8px", color: "#5b6472" }}>Internal Observation Interface</p>
        <h1 style={{ margin: "0 0 8px", fontSize: 34, lineHeight: 1.1 }}>{context.entity.label}</h1>
        <p style={{ margin: 0 }}><StatusBadge status={status} /></p>
        <dl style={{ margin: "18px 0 0", display: "grid", gap: 0 }}>
          <FieldRow label="entityId" value={context.entity.entityId} />
          <FieldRow label="resolvedEntityType" value={result.resolvedEntityType ?? context.entity.type} />
          <FieldRow label="lifecycle/status" value={context.governance.status === "UNKNOWN" ? context.trajectory.status : context.governance.status} />
          <FieldRow label="confidence" value={typeof context.entity.confidence === "number" ? context.entity.confidence.toFixed(3) : "No registrado"} />
          <FieldRow label="logbookId" value={context.entity.logbookId ?? "No registrado"} />
          <FieldRow label="resolverUsed" value={result.resolverUsed ?? "No resolver"} />
          <FieldRow label="contextCompleteness" value={result.contextCompleteness.score.toFixed(3)} />
          <FieldRow label="generatedAt" value={result.generatedAt} />
        </dl>
      </header>

      <DiagnosticStrip result={result} />

      <EntityTimeline context={context} />
      <EntityGraphView context={context} />
      <EntityEvidencePanel context={context} />
      <EntityPredictionPanel context={context} />
      <EntityMemoryPanel context={context} />
      <EntityAgentPanel context={context} />
      <EntityTrajectoryPanel context={context} />
      <EntityGovernancePanel context={context} />
      <EntityLimitationsPanel limitations={context.limitations} />
    </main>
  );
}
