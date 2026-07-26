import type { EpistemicClass, SFIEvent } from '../../../../packages/events/src/schema';

export type AMVReadingConfidence =
  | "low"
  | "medium"
  | "high";

export interface AMVEvidenceReference {
  id: string;
  source: string;
  confidence: number;
}

export interface AMVPattern {
  id: string;
  type: string;
  description: string;
  weight: number;
}

export interface AMVRecommendation {
  id: string;
  category: string;
  description: string;
  priority: number;
}

export interface AMVReading {

  readingId: string;

  scope: string;

  generatedAt: string;

  confidence: AMVReadingConfidence;

  evidence: AMVEvidenceReference[];

  patterns: AMVPattern[];

  recommendations: AMVRecommendation[];

  metadata: Record<string, unknown>;

}

export type CognitiveEvent<T = unknown> = SFIEvent<T>;