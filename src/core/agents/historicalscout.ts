import type {
  KernelContext,
  KernelEvidence
} from "@/core/contracts";

const PHENOMENON_SOURCE_TABLES = [
  "sfi_phenomena",
  "sfi_phenomenon_evidence"
];

export interface HistoricalPrecedent {
  evidenceId: string;
  source: string;
  recency: "declared" | "undated";
  confidence: number;
}

export function HistoricalScoutAgent(
  context: KernelContext
): KernelContext {
  const evidence = context.evidence ?? [];

  const precedents: HistoricalPrecedent[] = evidence
    .filter(item =>
      PHENOMENON_SOURCE_TABLES.some(table =>
        item.source.toLowerCase().includes(table)
      )
    )
    .map(item => {
      const payloadText = JSON.stringify(item.payload).toLowerCase();

      const hasTemporalMarker =
        /\b(19|20)\d{2}\b/.test(payloadText) ||
        payloadText.includes("fecha") ||
        payloadText.includes("timestamp");

      return {
        evidenceId: item.id,
        source: item.source,
        recency: hasTemporalMarker ? "declared" : "undated",
        confidence: item.confidence
      };
    });

  const declaredCount = precedents.filter(
    p => p.recency === "declared"
  ).length;

  const confidence =
    precedents.length === 0
      ? 0
      : Math.min(
          (declaredCount / precedents.length) *
            (precedents.length / (evidence.length || 1)),
          1
        );

  const reconstruction = {
    precedentsFound: precedents.length,
    precedentsWithTimeline: declaredCount,
    precedents
  };

  const generatedEvidence: KernelEvidence = {
    id: crypto.randomUUID(),
    source: "HistoricalScoutAgent",
    confidence,
    payload: reconstruction
  };

  context.evidence.push(generatedEvidence);

  context.metadata = {
    ...context.metadata,
    historicalScout: {
      executed: true,
      precedentsFound: precedents.length,
      confidence,
      executedAt: new Date().toISOString()
    }
  };

  return context;
}