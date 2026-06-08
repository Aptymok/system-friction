import { createServiceSupabaseClient } from '@/runtime/supabase/server'
import type { AmvScopeState } from '@/lib/amv/core/amvScopeStateTypes'
import type { AmvEvidenceTrust } from '@/lib/amv/core/evidenceTypes'
import type { AmvTrustLevel } from '@/lib/amv/core/amvTypes'
import { scorefrictionDashboardSpec } from './scorefrictionDashboardSpec'

type Row