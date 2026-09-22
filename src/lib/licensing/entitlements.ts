import { createServiceSupabaseClient } from '@/runtime/supabase/server'

export const ENTITLEMENTS = {
  observatory_base: 'observatory_base',
  amv_advanced: 'amv_advanced',
  longitudinal_memory: 'longitudinal_memory',
  extended_telemetry: 'extended_telemetry',
  node_lab: 'node_lab'
} as const

export type EntitlementKey = keyof typeof ENTITLEMENTS

function activeEntitlement(row: Record<string, unknown> | null) {
  if (!row) return false
  const status = String(row.status ?? '').toLowerCase()
  if (status !== 'active' && status !== 'trialing') return false
  const validUntil = typeof row.valid_until === 'string' ? Date.parse(row.valid_until) : NaN
  return !Number.isFinite(validUntil) || validUntil > Date.now()
}

export async function getEntitlements(userId: string | null | undefined) {
  const baseline: Record<string, unknown> = { observatory_base: true }
  if (!userId) return baseline

  const service = createServiceSupabaseClient()
  const { data, error } = await service
    .from('sfi_user_entitlements')
    .select('tier,status,valid_until,metadata')
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !activeEntitlement(data as Record<string, unknown> | null)) return baseline

  const row = data as Record<string, unknown>
  const metadata = row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
    ? row.metadata as Record<string, unknown>
    : {}
  const declared = metadata.entitlements && typeof metadata.entitlements === 'object' && !Array.isArray(metadata.entitlements)
    ? metadata.entitlements as Record<string, unknown>
    : {}

  return {
    ...baseline,
    ...declared,
    tier: row.tier ?? null,
    entitlement_status: row.status ?? null,
    entitlement_source: 'sfi_user_entitlements',
  }
}
