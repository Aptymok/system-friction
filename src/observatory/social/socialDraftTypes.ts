import type { ObservationSourceDescriptor } from '@/observatory/source/sourceStateTypes';
import type { WorldSpectReading } from '@/observatory/worldspect/worldSpectTypes';

export type SocialNetwork =
  | 'linkedin'
  | 'x'
  | 'instagram'
  | 'tiktok'
  | 'youtube'
  | 'reddit'
  | 'unknown';

export type SocialDraftStatus =
  | 'DRAFT'
  | 'MIHM_REVIEWED'
  | 'WORLDSPECT_REVIEWED'
  | 'CONTENT_APPROVED'
  | 'POST_CONFIRMATION_REQUIRED'
  | 'PUBLISHED'
  | 'FAILED'
  | 'ARCHIVED';

export type MihmDraftReview = {
  clarityScore: number | null;
  traceScore: number | null;
  frictionScore: number | null;
  riskLevel: 'low' | 'medium' | 'high' | 'unknown';
  suggestedFixes: string[];
  visibleReading: string;
  sourceDescriptor: ObservationSourceDescriptor;
};

export type WorldSpectDraftReview = {
  reading: WorldSpectReading;
  visibleReading: string;
  suggestedFixes: string[];
  sourceDescriptor: ObservationSourceDescriptor;
};

export type SocialDraftApproval = {
  approvedAt: string;
  approvedBy: 'human';
  contentHash: string;
  sourceDescriptor: ObservationSourceDescriptor;
};

export type SocialDraft = {
  id: string;
  network: SocialNetwork;
  text: string;
  objective: string;
  status: SocialDraftStatus;
  createdAt: string;
  updatedAt: string;
  contentHash?: string;
  contentApproved: boolean;
  approval?: SocialDraftApproval;
  mihmReview?: MihmDraftReview;
  worldSpectReview?: WorldSpectDraftReview;
  sourceDescriptor: ObservationSourceDescriptor;
};
