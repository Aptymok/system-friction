export type ManualSocialReturn = {
  platform: string;
  postId?: string;
  resonanceScore?: number;
  engagement: {
    impressions?: number;
    views?: number;
    likes?: number;
    comments?: number;
    reposts?: number;
    clicks?: number;
  };
  commentsSummary?: string;
  rawPayload?: Record<string, unknown>;
  capturedAt: string;
};

export type ManualSocialPostInput = {
  network: string;
  postUrl?: string;
  postText: string;
  postedAt: string;
  externalPostId?: string;
};
