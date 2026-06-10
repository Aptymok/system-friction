import { createServiceSupabaseClient } from '@/runtime/supabase/server'

export type PhenomenonCandidateInput = {
  module: string
  label: string
  evidenceIds: string[]
  attractorKeys: string[]
  ejectorKeys: string[]
  firstSeen: string
  lastSeen: string
  density: number
  trust: number
  persistence: number
  velocity: number
}

export type PhenomenonPromotion = {
  promote: boolean
  score: number
  regime: 'persistent' | 'emerging' | 'latent'
  days: number
}

export type PhenomenonRecord = PhenomenonCandidateInput & {
  phenomenonKey: string
  promotion: PhenomenonPromotion
  degradation: number
}

const GLOBAL_KEY = '__sfi_phenomena_store__'

function fallbackStore() {
  const globalStore = globalThis as typeof globalThis & { [GLOBAL_KEY]?: Map<string, PhenomenonRecord> }
  if (!globalStore[GLOBAL_KEY]) globalStore[GLOBAL_KEY] = new Map()
  return globalStore[GLOBAL_KEY]
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

function cleanKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 96) || 'phenomenon'
}

export function shouldPromotePhenomenon(input: PhenomenonCandidateInput): PhenomenonPromotion {
  const days = Math.max(0, (new Date(input.lastSeen).getTime() - new Date(input.firstSeen).getTime()) / 86400000)
  const temporalPersistence = Math.min(1, days / 21)

  const score =
    clamp01(input.density) * 0.25 +
    clamp01(input.trust) * 0.25 +
    clamp01(input.persistence) * 0.20 +
    temporalPersistence * 0.20 +
    Math.min(1, input.evidenceIds.length / 7) * 0.10

  return {
    promote: score >= 0.62 && days >= 3,
    score,
    regime: score >= 0.80 && days >= 21 ? 'persistent' : score >= 0.62 ? 'emerging' : 'latent',
    days,
  }
}

export function buildPhenomenonRecord(input: PhenomenonCandidateInput): PhenomenonRecord {
  const promotion = shouldPromotePhenomenon(input)
  return {
    ...input,
    phenomenonKey: `${cleanKey(input.module)}:${cleanKey(input.label)}`,
    promotion,
    degradation: clamp01(1 - input.trust),
  }
}

export async function promotePhenomenonCandidate(input: PhenomenonCandidateInput) {
  const record = buildPhenomenonRecord(input)
  if (!record.evidenceIds.length) return { ok: false as const, error: 'phenomenon_evidence_required', record }
  if (!record.promotion.promote) return { ok: true as const, promoted: false, record }

  try {
    const service = createServiceSupabaseClient()
    const { data, error } = await service
      .from('sfi_phenomena')
      .upsert({
        phenomenon_key: record.phenomenonKey,
        label: record.label,
        module: record.module,
        description: `Persistent phenomenon promoted from ${record.evidenceIds.length} evidence reference(s).`,
        regime: record.promotion.regime,
        density: clamp01(record.density),
        persistence: clamp01(record.persistence),
        velocity: clamp01(record.velocity),
        trust: clamp01(record.trust),
        degradation: record.degradation,
        evidence_count: record.evidenceIds.length,
        attractor_count: record.attractorKeys.length,
        ejector_count: record.ejectorKeys.length,
        first_seen: record.firstSeen,
        last_seen: record.lastSeen,
        vector: {
          score: record.promotion.score,
          days: record.promotion.days,
          evidenceIds: record.evidenceIds,
          attractorKeys: record.attractorKeys,
          ejectorKeys: record.ejectorKeys,
        },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'phenomenon_key' })
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    fallbackStore().set(record.phenomenonKey, record)
    return { ok: true as const, promoted: true, record, data, stored: true }
  } catch (error) {
    fallbackStore().set(record.phenomenonKey, record)
    return { ok: true as const, promoted: true, record, stored: false, warning: error instanceof Error ? error.message : 'sfi_phenomena_unavailable' }
  }
}

export async function listPhenomena(module?: string) {
  try {
    const service = createServiceSupabaseClient()
    let query = service.from('sfi_phenomena').select('*').order('density', { ascending: false }).limit(50)
    if (module) query = query.eq('module', module)
    const { data, error } = await query
    if (error) throw new Error(error.message)
    return { ok: true as const, data: data ?? [], source: 'supabase' }
  } catch (error) {
    const values = Array.from(fallbackStore().values()).filter((item) => !module || item.module === module)
    return { ok: true as const, data: values, source: 'memory', warning: error instanceof Error ? error.message : 'sfi_phenomena_unavailable' }
  }
}
