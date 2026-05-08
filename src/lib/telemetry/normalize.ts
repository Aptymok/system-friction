import type { RawSignal } from './connectors/base'

export function normalizeSignal(signal: RawSignal) {
  const normalized_text = signal.raw_text.trim().replace(/\s+/g, ' ')
  const semantic_tags = [
    normalized_text.match(/\bpero|aunque|sin embargo\b/i) ? 'contradiccion' : null,
    normalized_text.match(/\bmanana|luego|pospongo|evito\b/i) ? 'latencia' : null,
    normalized_text.length > 600 ? 'dispersion' : null
  ].filter(Boolean) as string[]

  return {
    provider: signal.provider,
    external_id: signal.external_id,
    raw_payload: signal.raw_payload,
    normalized_text,
    semantic_tags,
    signal_strength: Math.min(1, semantic_tags.length * 0.25 + normalized_text.length / 2000),
    published_at: signal.published_at
  }
}
