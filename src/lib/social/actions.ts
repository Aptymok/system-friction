import type { OperationalAction, PublicationMetadata, SocialProvider } from '@/lib/types'

export function getPublicationMetadata(action: OperationalAction): PublicationMetadata {
  const metadata = (action.metadata || {}) as PublicationMetadata
  return {
    provider: metadata.provider,
    text: metadata.text || action.description,
    media_url: metadata.media_url ?? null,
    scheduled_for: metadata.scheduled_for || action.due_at || null,
    external_post_id: metadata.external_post_id || null,
    external_url: metadata.external_url || null,
    autonomous_amv: Boolean(metadata.autonomous_amv),
    metrics: metadata.metrics || {},
    error: metadata.error || null,
    attempts: Number(metadata.attempts || 0),
    published_at: metadata.published_at || null,
  }
}

export function normalizeProvider(provider: string): SocialProvider {
  return provider === 'twitter' ? 'x' : (provider as SocialProvider)
}
