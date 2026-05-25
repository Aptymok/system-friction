// src/lib/supabase/server.ts
import 'server-only'; // Importante: evita que se use en componentes cliente
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { normalizeSupabaseUrl } from '@/runtime/supabase/url';

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL!),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables for service client');
  }

  return createServerClient(normalizeSupabaseUrl(supabaseUrl), serviceRoleKey, {
    cookies: {
      get: async () => null,
      set: async () => {},
      remove: async () => {},
    },
  });
}
