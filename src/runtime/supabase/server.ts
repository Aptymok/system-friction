// src/runtime/supabase/server.ts
import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { normalizeSupabaseUrl } from '@/runtime/supabase/url';

function firstDefined(...values: Array<string | undefined>) {
  return values.find((value) => typeof value === 'string' && value.trim().length > 0);
}

function requireSupabaseEnv(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`Missing Supabase environment variable: ${name}`);
  }

  return value;
}

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const supabaseUrl = requireSupabaseEnv(
    'NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL',
    firstDefined(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_URL),
  );
  const anonKey = requireSupabaseEnv(
    'NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY',
    firstDefined(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, process.env.SUPABASE_ANON_KEY),
  );

  return createServerClient(
    normalizeSupabaseUrl(supabaseUrl),
    anonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}

export function createServiceSupabaseClient() {
  const supabaseUrl = firstDefined(process.env.SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = firstDefined(process.env.SUPABASE_SERVICE_ROLE_KEY, process.env.SUPABASE_SERVICE_KEY);

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables for service client: SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(normalizeSupabaseUrl(supabaseUrl), serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        'X-Client-Info': 'sfi-service-role',
      },
    },
  });
}
