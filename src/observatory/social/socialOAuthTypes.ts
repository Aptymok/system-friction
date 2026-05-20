import type { ObservationSourceDescriptor } from '@/observatory/source/sourceStateTypes';

export type SocialProvider = 'x' | 'twitter' | 'linkedin' | 'instagram' | 'facebook' | 'youtube';

export type SocialOAuthScopeMode = 'READ_ONLY' | 'WRITE_DISABLED' | 'WRITE_ENABLED';

export type SocialTokenRecord = {
  id: string;
  user_id: string;
  provider: SocialProvider | 'twitter';
  access_token: string;
  refresh_token?: string | null;
  expires_at?: string | null;
  provider_user_id?: string | null;
  scope?: string[] | null;
};

export type SocialIngestedPost = {
  provider: SocialProvider;
  externalId: string;
  text: string;
  publishedAt?: string | null;
  rawPayload: Record<string, unknown>;
  engagement: Record<string, number>;
  sourceUrl?: string | null;
};

export type SocialMetricSnapshot = {
  provider: SocialProvider;
  postId: string;
  engagement: Record<string, number>;
  resonanceScore?: number | null;
  commentsSummary?: string | null;
  rawPayload: Record<string, unknown>;
  sourceDescriptor: ObservationSourceDescriptor;
  capturedAt: string;
};

export type SocialIngestionResult = {
  ok: boolean;
  provider: SocialProvider;
  reason?: 'missing_token' | 'provider_error' | 'unsupported_provider' | 'write_disabled';
  sourceStatus?: 'none' | 'connected_read_only' | 'error';
  posts?: SocialIngestedPost[];
  snapshots?: SocialMetricSnapshot[];
  capturedCount?: number;
  lastSyncAt?: string;
};
