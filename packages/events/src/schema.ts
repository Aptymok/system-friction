export type EpistemicClass =
  | 'observed'
  | 'declared'
  | 'derived'
  | 'inferred'
  | 'simulated'
  | 'fixture'
  | 'missing';

export type SFIEvent<TPayload = unknown> = {
  eventId: string;
  eventName: string;
  epistemicClass: EpistemicClass;
  confidence: number;
  payload: TPayload;
  occurredAt: string;
  source?: {
    sourceId?: string;
    sourceType?: string;
  };
  checksum?: string;
  lineage?: string[];
  uncertainty?: string;
};

export type EpistemicEventRecord<TPayload = unknown> = SFIEvent<TPayload> & {
  id?: string;
  logbookId: string;
  schemaVersion: string;
  hashPrev: string | null;
  hashSelf: string;
  createdAt: string;
};

const epistemicClasses: EpistemicClass[] = [
  'observed',
  'declared',
  'derived',
  'inferred',
  'simulated',
  'fixture',
  'missing',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function isEpistemicClass(value: unknown): boolean {
  return typeof value === 'string' && epistemicClasses.includes(value as EpistemicClass);
}

export function isConfidence(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

export function validateEpistemicEventShape(event: unknown): boolean {
  if (!isRecord(event)) return false;
  if (typeof event.eventId !== 'string' || event.eventId.length === 0) return false;
  if (typeof event.eventName !== 'string' || event.eventName.length === 0) return false;
  if (!isEpistemicClass(event.epistemicClass)) return false;
  if (!isConfidence(event.confidence)) return false;
  if (typeof event.occurredAt !== 'string' || event.occurredAt.length === 0) return false;
  if (!('payload' in event)) return false;
  if (event.checksum !== undefined && typeof event.checksum !== 'string') return false;
  if (event.uncertainty !== undefined && typeof event.uncertainty !== 'string') return false;
  if (event.lineage !== undefined) {
    if (!Array.isArray(event.lineage)) return false;
    if (!event.lineage.every((item) => typeof item === 'string')) return false;
  }
  if (event.source !== undefined) {
    if (!isRecord(event.source)) return false;
    if (event.source.sourceId !== undefined && typeof event.source.sourceId !== 'string') return false;
    if (event.source.sourceType !== undefined && typeof event.source.sourceType !== 'string') return false;
  }
  return true;
}

export function canonicalizeEventPayload(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalizeEventPayload);
  if (!value || typeof value !== 'object') return value;

  return Object.keys(value as Record<string, unknown>)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = canonicalizeEventPayload((value as Record<string, unknown>)[key]);
      return acc;
    }, {});
}
