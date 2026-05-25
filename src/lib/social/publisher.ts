import type { SocialProvider } from '@/lib/types'

export type PublishInput = {
  provider: SocialProvider
  text: string
  accessToken: string
  mediaUrl?: string | null
  externalAccountId?: string | null
  metadata?: Record<string, unknown> | null
}

export type PublishResult = {
  provider: SocialProvider
  externalPostId: string
  externalUrl?: string
  raw: unknown
}

export type PublishDisabledResult = {
  canPublish: false
  reason: 'OAuth write no habilitado.'
}

export function assertSocialWriteDisabled(): PublishDisabledResult {
  return {
    canPublish: false,
    reason: 'OAuth write no habilitado.',
  }
}

export async function publishToSocial(_input: PublishInput): Promise<PublishDisabledResult> {
  return assertSocialWriteDisabled()
}
