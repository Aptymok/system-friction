import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeSupabaseUrl } from '@/runtime/supabase/url'

let browserClient: SupabaseClient | null = null

export function createBrowserSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  browserClient ??= createBrowserClient(normalizeSupabaseUrl(url), key)
  return browserClient
}
