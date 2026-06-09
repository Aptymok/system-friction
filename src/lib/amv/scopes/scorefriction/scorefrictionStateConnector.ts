import { createServiceSupabaseClient } from '@/runtime/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AmvScopeState } from '@/lib/amv/core/amvScopeStateTypes'
import type { AmvEvidenceTrust } from '@/lib/amv/core/evidenceTypes'
import type { AmvTrustLevel } from '@/lib/amv/core/amvTypes'
import { scorefrictionDashboardSpec } from './scorefrictionDashboardSpec'

type Row = Record<string, unknown>

const SUPABASE_CLIENT_FACTORY = 'createServiceSupabaseClient'

function asRows(data: unknown): Row[] {
  return Array.isArray(data) ? data.filter((item): item is