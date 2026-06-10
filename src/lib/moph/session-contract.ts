import { normalizeMophMetrics } from './moph-math'

export type MophConsentState = 'local_only' | 'anonymous_persisted' | 'account_persisted'

export type MophSessionPayload = {
  sessionKey: string
  consentState: MophConsentState
  movementTraceDigest: string
  choices: Array<{ chapter: string; value: string; latencyMs: number }>
  texts: Array<{ chapter: string; length: number; editRatio: number }>
  behavioralNodes: string[]
  metrics: {
    ihg: number
    nti: number
    ldi: number
    go: number
    epsilon: number
    phi: number
  }
  publicSummary: Record<string, unknown>
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function str(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function num(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback)
  return Number.isFinite(parsed) ? parsed : fallback
}

function choiceRows(value: unknown): MophSessionPayload['choices'] {
  return Array.isArray(value)
    ? value.map((item) => record(item)).map((item) => ({
      chapter: str(item.chapter, 'unknown'),
      value: str(item.value, 'unknown').slice(0, 120),
      latencyMs: Math.max(0, Math.floor(num(item.latencyMs))),
    }))
    : []
}

function textRows(value: unknown): MophSessionPayload['texts'] {
  return Array.isArray(value)
    ? value.map((item) => record(item)).map((item) => ({
      chapter: str(item.chapter, 'unknown'),
      length: Math.max(0, Math.floor(num(item.length))),
      editRatio: Math.max(0, Math.min(1, num(item.editRatio))),
    }))
    : []
}

export function sanitizeMophSessionPayload(input: unknown): MophSessionPayload {
  const payload = record(input)
  const metrics = record(payload.metrics)
  const normalized = normalizeMophMetrics({
    ihg: num(metrics.ihg ?? metrics.IHG),
    nti: num(metrics.nti ?? metrics.NTI),
    ldi: num(metrics.ldi ?? metrics.LDI),
    go: num(metrics.go ?? metrics.GO),
    epsilon: num(metrics.epsilon),
  })
  const consentState = str(payload.consentState, 'local_only') as MophConsentState

  return {
    sessionKey: str(payload.sessionKey, `moph_${Date.now().toString(36)}`),
    consentState: consentState === 'account_persisted' || consentState === 'anonymous_persisted' ? consentState : 'local_only',
    movementTraceDigest: str(payload.movementTraceDigest, 'missing_digest').slice(0, 160),
    choices: choiceRows(payload.choices),
    texts: textRows(payload.texts),
    behavioralNodes: Array.isArray(payload.behavioralNodes) ? payload.behavioralNodes.map(String).slice(0, 40) : [],
    metrics: normalized,
    publicSummary: record(payload.publicSummary),
  }
}
