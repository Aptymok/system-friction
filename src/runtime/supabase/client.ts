import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { tryNormalizeSupabaseUrl } from '@/runtime/supabase/url'

let browserClient: SupabaseClient | null = null

export function createBrowserSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const normalizedUrl = tryNormalizeSupabaseUrl(url)
  if (!normalizedUrl || !key) return null
  browserClient ??= createBrowserClient(normalizedUrl, key)
  return browserClient
}
