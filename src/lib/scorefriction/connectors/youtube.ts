function n(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

export function normalizeYouTubeObservation(input: Record<string, unknown>) {
  const comments = Array.isArray(input.comments) ? input.comments : [];
  const viewCount = n(input.viewCount);
  const likeCount = n(input.likeCount);
  const commentCount = n(input.commentCount) || comments.length;
  const commentText = comments.map((item) => typeof item === 'string' ? item : JSON.stringify(item)).join(' ');

  return {
    title: input.title ?? null,
    description: input.description ?? null,
    tags: Array.isArray(input.tags) ? input.tags : [],
    channel: input.channel ?? null,
    publishedAt: input.publishedAt ?? null,
    viewCount,
    likeCount,
    commentCount,
    comments,
    derived: {
      public_reception_vector: clamp01((likeCount + commentCount) / Math.max(1, viewCount) * 8),
      comment_conflict_score: clamp01((commentText.match(/no|mal|odio|copia|pelea/gi)?.length ?? 0) / Math.max(1, comments.length)),
      identity_resonance_score: clamp01((commentText.match(/yo|nosotros|barrio|mx|mex|familia/gi)?.length ?? 0) / Math.max(1, comments.length)),
      semantic_echo_score: clamp01((commentText.match(/hook|coro|frase|letra|me paso/gi)?.length ?? 0) / Math.max(1, comments.length)),
      retention_proxy: clamp01(commentCount / Math.max(1, viewCount) * 20),
    },
  };
}
