// src/runtime/supabase/server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { normalizeSupabaseUrl } from '@/runtime/supabase/url';

export class SfiAuthUnavailableError extends Error {
  constructor(message = 'Supabase Auth is temporarily unavailable.') {
    super(message);
    this.name = 'SfiAuthUnavailableError';
  }
}

function authErrorText(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error && typeof (error as { message?: unknown }).message === 'string') {
    return String((error as { message: string }).message);
  }
  return String(error ?? 'unknown_auth_error');
}

function isMissingSessionError(error: unknown) {
  const message = authErrorText(error).toLowerCase();
  return (
    message.includes('auth session missing') ||
    message.includes('session missing') ||
    message.includes('refresh token not found') ||
    message.includes('refresh_token_not_found') ||
    message.includes('invalid refresh token')
  );
}

/**
 * Resolve the browser identity without turning a transient GoTrue outage into
 * a false anonymous session. getClaims() verifies the JWT; getSession() then
 * supplies the matching persisted user object without another /auth/v1/user
 * round trip. getUser() remains a bounded compatibility fallback only.
 */
export async function getVerifiedServerUser(supabase: SupabaseClient): Promise<User | null> {
  let claimsFailure: unknown = null;

  try {
    const claimsResult = await supabase.auth.getClaims();
    claimsFailure = claimsResult.error;
    const subject = claimsResult.data?.claims?.sub;

    if (!claimsResult.error && typeof subject === 'string' && subject) {
      const sessionResult = await supabase.auth.getSession();
      if (sessionResult.error) {
        if (isMissingSessionError(sessionResult.error)) return null;
        throw new SfiAuthUnavailableError(`supabase_session_unavailable:${authErrorText(sessionResult.error)}`);
      }

      const sessionUser = sessionResult.data.session?.user ?? null;
      if (sessionUser?.id === subject) return sessionUser;

      // A verified token whose cookie payload is incomplete is unusual. Resolve
      // it once against Auth rather than treating the user as anonymous.
      const userResult = await supabase.auth.getUser();
      if (!userResult.error && userResult.data.user?.id === subject) return userResult.data.user;
      if (userResult.error && isMissingSessionError(userResult.error)) return null;
      throw new SfiAuthUnavailableError(`verified_claim_user_resolution_failed:${authErrorText(userResult.error)}`);
    }

    if (claimsResult.error && isMissingSessionError(claimsResult.error)) return null;
  } catch (error) {
    if (isMissingSessionError(error)) return null;
    if (error instanceof SfiAuthUnavailableError) throw error;
    claimsFailure = error;
  }

  // Compatibility fallback for auth configurations that cannot verify claims
  // locally. A transport failure is explicitly different from no session.
  const userResult = await supabase.auth.getUser();
  if (userResult.error) {
    if (isMissingSessionError(userResult.error)) return null;
    throw new SfiAuthUnavailableError(
      `supabase_auth_unavailable:${authErrorText(userResult.error ?? claimsFailure)}`,
    );
  }
  return userResult.data.user ?? null;
}

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
