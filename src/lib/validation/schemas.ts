import { z } from 'zod'

export const intakeSchema = z.object({
  alias: z.string().min(2).max(64),
  email: z.string().email().max(160),
  responses: z.array(
    z.object({
      question_id: z.string().min(2).max(12),
      question_text: z.string().min(3).max(400),
      phase: z.string().min(2).max(120),
      answer: z.string().min(1).max(1600)
    })
  ).min(6)
})

export const auditSchema = z.object({
  source: z.enum(['web', 'whatsapp']).default('web'),
  nodeId: z.string().min(3).optional(),
  narrative: z.string().min(3).max(5000).optional(),
  responses: z
    .array(
      z.object({
        question_number: z.number().int().positive(),
        answer: z.string().min(1).max(1000)
      })
    )
    .optional(),
  whatsapp_phone: z.string().max(80).optional()
})

export const amvSessionSchema = z.object({
  nodeId: z.string().min(3)
})

export const amvRespondSchema = z.object({
  nodeId: z.string().min(3),
  sessionId: z.string().min(3).optional(),
  answer: z.string().min(1).max(1600),
  questionIndex: z.number().int().min(0).max(2).default(0)
})

export const authSchema = z.object({
  email: z.string().email().max(160),
  password: z.string().min(8).max(128)
})

export const telemetrySourceSchema = z.object({
  nodeId: z.string().min(3),
  provider: z.enum(['github', 'medium', 'linkedin', 'x', 'twitter', 'instagram', 'tiktok', 'telegram', 'rss', 'manual']),
  source_type: z.enum(['oauth', 'webhook', 'manual_import', 'rss', 'api']),
  handle: z.string().max(180).optional(),
  access_token: z.string().min(8).optional(),
  refresh_token: z.string().min(8).optional(),
  expires_at: z.string().datetime().optional(),
  external_account_id: z.string().max(240).optional(),
  consent_scope: z.record(z.string(), z.unknown()).default({})
})

export const telemetryIngestSchema = z.object({
  nodeId: z.string().min(3),
  provider: z.enum(['github', 'medium', 'linkedin', 'x', 'twitter', 'instagram', 'tiktok', 'telegram', 'rss', 'manual']),
  external_id: z.string().max(240).optional(),
  raw_text: z.string().min(1).max(8000),
  raw_payload: z.record(z.string(), z.unknown()).default({}),
  published_at: z.string().datetime().optional()
})

export const socialPostSchema = z.object({
  nodeId: z.string().min(3),
  provider: z.enum(['x', 'twitter', 'instagram', 'tiktok', 'linkedin']),
  text: z.string().min(1).max(2800),
  media_url: z.string().url().optional(),
  scheduled_for: z.string().datetime().optional(),
  autonomous_amv: z.boolean().default(false),
  mode: z.enum(['publish_now', 'schedule']).default('schedule')
})
