function n(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

export function normalizeTikTokAlternative(input: Record<string, unknown>) {
  const comments = Array.isArray(input.comments) ? input.comments : [];
  const caption = typeof input.caption === 'string' ? input.caption : '';
  const videoCount = n(input.video_count);
  const likeCount = n(input.like_count);
  const commentCount = n(input.comment_count) || comments.length;
  const shareCount = n(input.share_count);
  const engagement = likeCount + commentCount + shareCount;

  return {
    hashtag: input.hashtag ?? null,
    sound_title: input.sound_title ?? null,
    caption,
    video_count: videoCount,
    like_count: likeCount,
    comment_count: commentCount,
    share_count: shareCount,
    comments,
    region: input.region ?? 'MX',
    collected_at: input.collected_at ?? new Date().toISOString(),
    derived: {
      fragmentability_score: clamp01(videoCount / 10000 + shareCount / Math.max(1, engagement) * 0.4),
      caption_reuse_score: clamp01(caption.split(/\s+/).filter((word) => word.length < 5).length / 20),
      gesture_adoption_score: clamp01(videoCount / 5000 + commentCount / Math.max(1, likeCount) * 0.2),
      sound_memetic_velocity: clamp01(shareCount / Math.max(1, videoCount) * 5),
      semantic_compression_score: clamp01(1 - Math.min(1, caption.length / 180)),
      ritualization_index: clamp01(videoCount / 8000 + shareCount / Math.max(1, likeCount) * 0.6),
    },
  };
}
