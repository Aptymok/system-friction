export type SocialReturnMetric = {
  network: string;
  postId: string;
  sourceState: 'SOCIAL_RETURN';
  sourceUrl?: string;
  capturedAt: string;
  reach?: number;
  impressions?: number;
  clicks?: number;
  reactions?: number;
  commentsCount?: number;
  qualitativeNotes?: string;
};
