import type { StudioArtifactInput, StudioArtifactKind } from './types';

export function classifyArtifact(input: Partial<StudioArtifactInput>): StudioArtifactKind {
  const raw = `${input.kind ?? ''} ${input.title ?? ''} ${input.sourceUrl ?? ''}`.toLowerCase();
  if (raw.includes('policy')) return 'policy_document';
  if (raw.includes('podcast')) return 'podcast';
  if (raw.includes('song') || raw.includes('track')) return 'song';
  if (raw.includes('video')) return 'video';
  if (raw.includes('campaign')) return 'campaign';
  if (raw.includes('speech')) return 'speech';
  if (raw.includes('book')) return 'book';
  if (raw.includes('article')) return 'article';
  return input.kind ?? 'other';
}
