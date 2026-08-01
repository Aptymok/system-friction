// src/runtime/supabase/server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { normalizeSupabaseUrl } from '@/runtime/supabase/url';

export async function createServerSupabaseClient() {
  let headersModule: typeof import('next/headers') | undefined;

  try {
    headersModule = await import('next/headers');
  } catch {
    throw new Error('next/headers is unavailable outside a Next.js runtime');
  }

  const cookieStore = await headersModule.cookies();

  return createServerClient(
    normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL!),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              cookieStore.set({ name, value, ...options });
            } catch {
              // Server Components cannot always mutate cookies. Server Actions and Route
              // Handlers can. Supabase SSR will continue with the readable cookie state.
            }
          });
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
