import type {
  KernelContext,
  KernelEvidence,
  KernelPrediction,
} from "@/core/contracts";

export type TrajectoryPointSource = "evidence" | "prediction";

export interface TrajectoryPoint {
  id: string;
  timestamp: string;
  source: TrajectoryPointSource;
  sourceId: string;
  confidence: number;
  position: number;
  signal: string;
}

export interface StructuredTrajectoryPayload {
  entityId: string | null;
  subject: string;
  timeline: TrajectoryPoint[];
  currentPosition: TrajectoryPoint | null;
  projected: TrajectoryPoint[];
  velocity: number;
  acceleration: number;
  deviation: number;
  confidence: number;
  evidenceIds: string[];
  limitations: string[];
}

const TRAJECTORY_SOURCE = "TrajectoryAgent";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeTimestamp(value: unknown): string | null {
  const raw = text(value);
  if (!raw) return null;

  const isoMatch = raw.match(/\b\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?)?\b/);
  if (!isoMatch) return null;

  const candidate = isoMatch[0].includes("T")
    ? isoMatch[0]
    : `${isoMatch[0]}T00:00:00.000Z`;
  const date = new Date(candidate);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function findTimestamp(value: unknown): string | null {
  const record = asRecord(value);
  const preferredKeys = [
    "timestamp",
    "observedAt",
    "occurredAt",
    "createdAt",
    "date",
    "referenceTime",
    "targetDate",
    "horizonDate",
  ];

  for (const key of preferredKeys) {
    const direct = normalizeTimestamp(record[key]);
    if (direct) return direct;
  }

  if (typeof value === "string") return normalizeTimestamp(value);

  for (const nested of Object.values(record)) {
    if (typeof nested === "string") {
      const found = normalizeTimestamp(nested);
      if (found) return found;
    }
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      const found = findTimestamp(nested);
      if (found) return found;
    }
  }

  return null;
}

function evidenceSignal(evidence: KernelEvidence) {
  const payload = asRecord(evidence.payload);
  const textValue =
    text(payload.summary) ??
    text(payload.statement) ??
    text(payload.description) ??
    text(payload.text) ??
    evidence.source;

  return textValue.slice(0, 180);
}

function predictionSignal(prediction: KernelPrediction) {
  return (prediction.description ?? prediction.statement).slice(0, 180);
}

function resolveSubject(context: KernelContext) {
  const input = asRecord(context.input);
  const explicitSubject =
    text(input.subject) ??
    text(input.entityId) ??
    text(input.caseId) ??
    text(input.phenomenonId);
  const firstHypothesis = context.hypotheses[0];
  const firstEvidence = context.evidence[0];

  return {
    entityId:
      text(input.entityId) ??
      text(input.caseId) ??
      text(input.phenomenonId) ??
      null,
    subject:
      explicitSubject ??
      firstHypothesis?.id ??
      firstHypothesis?.statement ??
      firstEvidence?.id ??
      context.capabilityId ??
      context.trace.logbookId,
  };
}

function pointFromEvidence(evidence: KernelEvidence): TrajectoryPoint | null {
  if (evidence.source === TRAJECTORY_SOURCE) return null;
  if (evidence.source === "TemporalResolverAgent") return null;

  const timestamp = findTimestamp(evidence.payload);
  if (!timestamp) return null;

  return {
    id: `trajectory-point-${evidence.id}`,
    timestamp,
    source: "evidence",
    sourceId: evidence.id,
    confidence: clamp01(evidence.confidence),
    position: clamp01(evidence.confidence),
    signal: evidenceSignal(evidence),
  };
}

function pointFromPrediction(prediction: KernelPrediction): TrajectoryPoint | null {
  const timestamp =
    findTimestamp(prediction.description) ??
    findTimestamp(prediction.statement);
  if (!timestamp) return null;

  const sourceId = prediction.id ?? `prediction-${timestamp}`;

  return {
    id: `trajectory-projection-${sourceId}`,
    timestamp,
    source: "prediction",
    sourceId,
    confidence: clamp01(prediction.confidence),
    position: clamp01(prediction.confidence),
    signal: predictionSignal(prediction),
  };
}

function sortByTime<T extends { timestamp: string }>(points: T[]): T[] {
  return [...points].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

function daysBetween(from: string, to: string) {
  const delta = new Date(to).getTime() - new Date(from).getTime();
  return delta / 86_400_000;
}

function calculateVelocity(points: TrajectoryPoint[]) {
  if (points.length < 2) return 0;
  const previous = points[points.length - 2];
  const current = points[points.length - 1];
  const days = daysBetween(previous.timestamp, current.timestamp);
  if (days <= 0) return 0;
  return (current.position - previous.position) / days;
}

function calculateAcceleration(points: TrajectoryPoint[]) {
  if (points.length < 3) return 0;
  const a = points[points.length - 3];
  const b = points[points.length - 2];
  const c = points[points.length - 1];
  const firstDays = daysBetween(a.timestamp, b.timestamp);
  const secondDays = daysBetween(b.timestamp, c.timestamp);
  if (firstDays <= 0 || secondDays <= 0) return 0;
  const firstVelocity = (b.position - a.position) / firstDays;
  const secondVelocity = (c.position - b.position) / secondDays;
  return (secondVelocity - firstVelocity) / secondDays;
}

function calculateDeviation(current: TrajectoryPoint | null, projected: TrajectoryPoint[]) {
  if (!current || projected.length === 0) return 0;
  const total = projected.reduce(
    (sum, point) => sum + Math.abs(point.position - current.position),
    0
  );
  return clamp01(total / projected.length);
}

function averageConfidence(points: TrajectoryPoint[]) {
  if (points.length === 0) return 0;
  return clamp01(
    points.reduce((sum, point) => sum + point.confidence, 0) / points.length
  );
}

export function TrajectoryAgent(context: KernelContext): KernelContext {
  const timeline = sortByTime(
    context.evidence
      .map(pointFromEvidence)
      .filter((point): point is TrajectoryPoint => Boolean(point))
  );
  const projected = sortByTime(
    context.predictions
      .map(pointFromPrediction)
      .filter((point): point is TrajectoryPoint => Boolean(point))
  );
  const temporalPoints = [...timeline, ...projected];
  const limitations: string[] = [];

  if (timeline.length < 2) {
    limitations.push("insufficient_observed_temporal_evidence_for_observed_timeline");
  }
  if (projected.length === 0) {
    limitations.push("no_temporally_bounded_predictions_available");
  }

  const canBuildTrajectory = temporalPoints.length >= 2 && timeline.length > 0;
  const currentPosition = timeline[timeline.length - 1] ?? null;
  const { entityId, subject } = resolveSubject(context);
  const confidence = averageConfidence(temporalPoints);
  const payload: StructuredTrajectoryPayload = {
    entityId,
    subject,
    timeline,
    currentPosition,
    projected,
    velocity: calculateVelocity(timeline),
    acceleration: calculateAcceleration(timeline),
    deviation: calculateDeviation(currentPosition, projected),
    confidence,
    evidenceIds: timeline.map((point) => point.sourceId),
    limitations,
  };

  context.metadata = {
    ...context.metadata,
    trajectoryAssessment: {
      executedAt: new Date().toISOString(),
      status: canBuildTrajectory ? "structured" : "partial",
      temporalPoints: temporalPoints.length,
      timelinePoints: timeline.length,
      projectedPoints: projected.length,
      limitations,
    },
  };

  if (!canBuildTrajectory) {
    return context;
  }

  const evidence: KernelEvidence = {
    id: crypto.randomUUID(),
    source: TRAJECTORY_SOURCE,
    confidence,
    payload,
  };

  context.evidence.push(evidence);

  return context;
}
