// src/runtime/supabase/server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { normalizeSupabaseUrl } from '@/runtime/supabase/url';
import { readContinuityProfileByEmail } from '@/lib/sfi/continuityPostgres';

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

const SFI_NEON_SESSION_COOKIE = 'sfi_neon_auth_session';
const DEFAULT_NEON_AUTH_BASE_URL =
  'https://ep-aged-fog-awnq9sns.neonauth.c-12.us-east-1.aws.neon.tech/sfi_continuity/auth';

export function neonAuthBaseUrl() {
  return (process.env.NEON_AUTH_BASE_URL || DEFAULT_NEON_AUTH_BASE_URL).replace(/\/$/, '');
}

function appOrigin() {
  return (process.env.NEXT_PUBLIC_APP_URL || 'https://systemfriction.org').replace(/\/$/, '');
}

function responseSessionCookie(response: Response) {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  const candidates = headers.getSetCookie?.() ?? [response.headers.get('set-cookie') || ''];
  for (const value of candidates) {
    const match = value.match(/(?:^|,\s*)([^=;,\s]*session_token)=([^;,\s]+)/i);
    if (match) return `${match[1]}=${match[2]}`;
  }
  return null;
}

export async function persistNeonAuthSession(response: Response) {
  const pair = responseSessionCookie(response);
  if (!pair) throw new SfiAuthUnavailableError('neon_auth_session_cookie_missing');
  const headersModule = await import('next/headers');
  const cookieStore = await headersModule.cookies();
  cookieStore.set(SFI_NEON_SESSION_COOKIE, Buffer.from(pair, 'utf8').toString('base64url'), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearNeonAuthSession() {
  const headersModule = await import('next/headers');
  const cookieStore = await headersModule.cookies();
  cookieStore.set(SFI_NEON_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

async function neonSessionCookiePair() {
  const headersModule = await import('next/headers');
  const cookieStore = await headersModule.cookies();
  const encoded = cookieStore.get(SFI_NEON_SESSION_COOKIE)?.value;
  if (!encoded) return null;
  try {
    return Buffer.from(encoded, 'base64url').toString('utf8');
  } catch {
    return null;
  }
}

export async function getVerifiedNeonServerUser(): Promise<User | null> {
  const sessionCookie = await neonSessionCookiePair();
  if (!sessionCookie) return null;

  let response: Response;
  try {
    response = await fetch(`${neonAuthBaseUrl()}/get-session`, {
      method: 'GET',
      headers: {
        Cookie: sessionCookie,
        Origin: appOrigin(),
      },
      cache: 'no-store',
    });
  } catch (error) {
    throw new SfiAuthUnavailableError(`neon_auth_unavailable:${authErrorText(error)}`);
  }

  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) {
    throw new SfiAuthUnavailableError(`neon_auth_session_read_failed:${response.status}`);
  }

  const body = await response.json().catch(() => null) as
    | { user?: { id?: string; email?: string; name?: string; createdAt?: string } | null }
    | null;
  const email = body?.user?.email?.trim().toLowerCase();
  if (!email) return null;

  const profile = await readContinuityProfileByEmail(email);
  const canonicalUserId = typeof profile?.user_id === 'string' ? profile.user_id : null;
  if (!canonicalUserId) return null;

  return {
    id: canonicalUserId,
    email,
    aud: 'authenticated',
    role: 'authenticated',
    app_metadata: { provider: 'neon', providers: ['neon'] },
    user_metadata: {
      auth_provider: 'neon',
      neon_auth_user_id: body?.user?.id ?? null,
      name: body?.user?.name ?? null,
    },
    identities: [],
    created_at: body?.user?.createdAt || new Date(0).toISOString(),
  } as User;
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
