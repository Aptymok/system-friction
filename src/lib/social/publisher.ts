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

async function readJson(response: Response) {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

async function postJson(url: string, accessToken: string, body: unknown, headers: Record<string, string> = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  })
  const data = await readJson(response)
  if (!response.ok) {
    throw new Error(`publisher_http_${response.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`)
  }
  return data
}

export async function publishToSocial(input: PublishInput): Promise<PublishResult> {
  if (!input.accessToken) throw new Error('missing_access_token')
  const provider = input.provider === 'twitter' ? 'x' : input.provider

  if (provider === 'x') return publishToX({ ...input, provider })
  if (provider === 'linkedin') return publishToLinkedIn(input)
  if (provider === 'instagram') return publishToInstagram(input)
  if (provider === 'tiktok') return publishToTikTok(input)

  throw new Error(`unsupported_provider_${input.provider}`)
}

async function publishToX(input: PublishInput): Promise<PublishResult> {
  const raw = await postJson('https://api.x.com/2/tweets', input.accessToken, { text: input.text })
  const externalPostId = String((raw as { data?: { id?: string } })?.data?.id || '')
  if (!externalPostId) throw new Error('x_missing_tweet_id')
  return {
    provider: 'x',
    externalPostId,
    externalUrl: `https://x.com/i/web/status/${externalPostId}`,
    raw,
  }
}

async function publishToLinkedIn(input: PublishInput): Promise<PublishResult> {
  const author = String(input.metadata?.linkedin_author_urn || input.externalAccountId || '')
  if (!author.startsWith('urn:li:')) throw new Error('linkedin_author_urn_required')

  const raw = await postJson(
    'https://api.linkedin.com/rest/posts',
    input.accessToken,
    {
      author,
      commentary: input.text,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    },
    {
      'Linkedin-Version': String(input.metadata?.linkedin_version || '202506'),
      'X-Restli-Protocol-Version': '2.0.0',
    }
  )

  const externalPostId = String((raw as { id?: string })?.id || '')
  if (!externalPostId) throw new Error('linkedin_missing_post_id')
  return { provider: 'linkedin', externalPostId, raw }
}

async function publishToInstagram(input: PublishInput): Promise<PublishResult> {
  const igUserId = String(input.metadata?.instagram_user_id || input.externalAccountId || '')
  if (!igUserId) throw new Error('instagram_user_id_required')
  if (!input.mediaUrl) throw new Error('instagram_media_url_required')

  const graphVersion = String(input.metadata?.graph_version || 'v24.0')
  const mediaField = input.metadata?.media_type === 'VIDEO' ? 'video_url' : 'image_url'
  const createParams = new URLSearchParams({
    caption: input.text,
    access_token: input.accessToken,
    [mediaField]: input.mediaUrl,
  })
  if (input.metadata?.media_type === 'REELS') createParams.set('media_type', 'REELS')

  const createResponse = await fetch(`https://graph.facebook.com/${graphVersion}/${igUserId}/media`, {
    method: 'POST',
    body: createParams,
  })
  const createData = await readJson(createResponse)
  if (!createResponse.ok) throw new Error(`instagram_container_${createResponse.status}: ${JSON.stringify(createData)}`)
  const creationId = String((createData as { id?: string })?.id || '')
  if (!creationId) throw new Error('instagram_missing_creation_id')

  const publishResponse = await fetch(`https://graph.facebook.com/${graphVersion}/${igUserId}/media_publish`, {
    method: 'POST',
    body: new URLSearchParams({ creation_id: creationId, access_token: input.accessToken }),
  })
  const publishData = await readJson(publishResponse)
  if (!publishResponse.ok) throw new Error(`instagram_publish_${publishResponse.status}: ${JSON.stringify(publishData)}`)
  const externalPostId = String((publishData as { id?: string })?.id || '')
  if (!externalPostId) throw new Error('instagram_missing_media_id')

  return { provider: 'instagram', externalPostId, raw: { create: createData, publish: publishData } }
}

async function publishToTikTok(input: PublishInput): Promise<PublishResult> {
  if (!input.mediaUrl) throw new Error('tiktok_media_url_required')

  const endpoint =
    input.metadata?.tiktok_publish_mode === 'direct'
      ? 'https://open.tiktokapis.com/v2/post/publish/video/init/'
      : 'https://open.tiktokapis.com/v2/post/publish/inbox/video/init/'

  const raw = await postJson(endpoint, input.accessToken, {
    post_info: {
      title: input.text.slice(0, 2200),
      privacy_level: input.metadata?.privacy_level || 'SELF_ONLY',
      disable_duet: Boolean(input.metadata?.disable_duet),
      disable_comment: Boolean(input.metadata?.disable_comment),
      disable_stitch: Boolean(input.metadata?.disable_stitch),
    },
    source_info: {
      source: 'PULL_FROM_URL',
      video_url: input.mediaUrl,
    },
  })

  const externalPostId = String((raw as { data?: { publish_id?: string } })?.data?.publish_id || '')
  if (!externalPostId) throw new Error('tiktok_missing_publish_id')
  return { provider: 'tiktok', externalPostId, raw }
}
