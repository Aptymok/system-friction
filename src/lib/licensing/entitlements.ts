import { createServiceSupabaseClient } from '@/runtime/supabase/server'

export const ENTITLEMENTS = {
  observatory_base: 'observatory_base',
  amv_advanced: 'amv_advanced',
  longitudinal_memory: 'longitudinal_memory',
  extended_telemetry: 'extended_telemetry',
  node_lab: 'node_lab'
} as const

export type EntitlementKey = keyof typeof ENTITLEMENTS

export async function getEntitlements(userId: string | null | undefined) {
  if (!userId) return { observatory_base: true }
  const supabase = createServiceSupabaseClient()
  if (!supabase) return { observatory_base: true }

  const { data } = await supabase
    .from('licenses')
    .select('status, license_entitlements(entitlement_key, enabled, limits)')
    .eq('user_id', userId)
    .in('status', ['active', 'trialing'])

  const entitlements: Record<string, unknown> = { observatory_base: true }
  for (const license of data || []) {
    for (const entitlement of license.license_entitlements || []) {
      if (entitlement.enabled) entitlements[entitlement.entitlement_key] = entitlement.limits || true
    }
  }
  return entitlements
}
