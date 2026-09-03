import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { normalizeSupabaseUrl } from '@/runtime/supabase/url'
import { findInstitutionalMember } from '@/lib/system/access/institutionalMembers'

const AUTH_COOKIE_NAMES = ['sb-access-token', 'sb-refresh-token', 'supabase-auth-token']

const ROOT_INTERNAL_FRAME_PREFIXES = [
  '/root/institutionalization',
  '/root/reports',
  '/root/readiness',
  '/root/agents',
  '/root/cognitive-twin',
  '/root/predictions',
  '/root/attractor',
  '/root/longitudinal',
  '/root/decisions',
  '/root/readiness',
  '/field',
  '/studio',
  '/field',
  '/library',
] as const

type ModuleAccess = Record<string, unknown> | null | undefined
type SessionIdentity = { id: string; email: string | null }

function authErrorText(error: unknown) {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message ?? '')
  }
  return String(error || '')
}

function isMissingSessionError(error: unknown) {
  const message = authErrorText(error).toLowerCase()
  return (
    message.includes('auth session missing') ||
    message.includes('session missing') ||
    message.includes('refresh token not found') ||
    message.includes('refresh_token_not_found') ||
    message.includes('invalid refresh token')
  )
}

function clearSupabaseAuthCookies(response: NextResponse, request: NextRequest) {
  const names = new Set(AUTH_COOKIE_NAMES)
  request.cookies.getAll().forEach((cookie) => {
    if (cookie.name.startsWith('sb-') || cookie.name.includes('supabase')) names.add(cookie.name)
  })
  names.forEach((name) => response.cookies.delete(name))
}

function configuredFounderIds() {
  return new Set((process.env.SFI_FOUNDER_USER_IDS || '').split(',').map((value) => value.trim()).filter(Boolean))
}

function configuredFounderEmails() {
  return new Set(
    [process.env.SYSTEM_ROOT_EMAIL, ...(process.env.SFI_FOUNDER_EMAILS || '').split(',')]
      .map((value) => value?.trim().toLowerCase())
      .filter((value): value is string => Boolean(value)),
  )
}

function isRootRouteUser(userId?: string | null, role?: string | null, email?: string | null) {
  return (
    Boolean(userId && configuredFounderIds().has(userId)) ||
    role === 'root' ||
    role === 'system' ||
    Boolean(email && configuredFounderEmails().has(email.toLowerCase()))
  )
}

function hasEnabledModule(moduleAccess: ModuleAccess, ...keys: string[]) {
  if (!moduleAccess || typeof moduleAccess !== 'object') return false
  return keys.some((key) => moduleAccess[key] === true)
}

function isStudioRouteUser(
  userId?: string | null,
  role?: string | null,
  email?: string | null,
  moduleAccess?: ModuleAccess,
) {
  if (isRootRouteUser(userId, role, email)) return true
  if (hasEnabledModule(moduleAccess, 'studio', 'simulator')) return true
  if (findInstitutionalMember(email)?.modules.studio === true) return true

  const allowed = (process.env.STUDIO_AUTHORIZED_EMAILS || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
  return Boolean(email && allowed.includes(email.toLowerCase()))
}

function requestedPath(request: NextRequest) {
  return `${request.nextUrl.pathname}${request.nextUrl.search}`
}

function redirectToLoginWithNext(request: NextRequest, error?: string) {
  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('next', requestedPath(request))
  if (error) loginUrl.searchParams.set('error', error)
  return NextResponse.redirect(loginUrl)
}

function redirectToAuthUnavailable(request: NextRequest) {
  const unavailableUrl = new URL('/auth-unavailable', request.url)
  unavailableUrl.searchParams.set('next', requestedPath(request))
  return NextResponse.redirect(unavailableUrl)
}

function isLocalStudioBypass(request: NextRequest) {
  if (process.env.SFI_LOCAL_STUDIO_AUTH_BYPASS !== 'true') return false
  const host = request.nextUrl.hostname
  return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0'
}

function permitsRootInternalFrame(pathname: string) {
  return ROOT_INTERNAL_FRAME_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next()
  const { pathname } = request.nextUrl

  // SFI remains non-frameable by default. Only explicit owned surfaces used by
  // ROOT's internal observation window may be embedded, and only by the same origin.
  response.headers.set('X-Frame-Options', permitsRootInternalFrame(pathname) ? 'SAMEORIGIN' : 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  if (pathname === '/' || pathname.startsWith('/llms')) {
    response.headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
  }

  if (pathname.startsWith('/root') || pathname.startsWith('/field') || pathname.startsWith('/studio')) {
    response.headers.set('Cache-Control', 'no-store, must-revalidate')
  }

  // System agents authenticate at the API boundary with SFI_AGENT_SECRET.
  // They must not enter browser Supabase session middleware.
  const isWorldVectorAgentRoute = pathname.startsWith('/api/world-vector')
  if (isWorldVectorAgentRoute) return response

  // /field is the public live Observatory. It must not acquire a browser-session
  // dependency: its public read models use service-backed, evidence-bounded APIs.
  const requiresSession = pathname.startsWith('/root') || pathname.startsWith('/studio')
  if (!requiresSession) return response

  if (pathname.startsWith('/studio') && isLocalStudioBypass(request)) {
    response.headers.set('X-SFI-Auth-Bypass', 'local-studio')
    return response
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    return redirectToLoginWithNext(request, 'supabase_no_configurado')
  }

  const supabase = createServerClient(normalizeSupabaseUrl(supabaseUrl), supabaseKey, {
    cookies: {
      getAll() { return request.cookies.getAll() },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value)
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  // Do not call /auth/v1/user on every protected navigation. In production that
  // endpoint has shown intermittent 500/504 responses and long latency. getClaims()
  // verifies the signed access token (and refreshes only when actually necessary),
  // reducing both remote verification pressure and false logout transitions.
  let identity: SessionIdentity | null = null
  let authUnavailable = false
  try {
    const result = await supabase.auth.getClaims()
    const claims = result.data?.claims as Record<string, unknown> | undefined
    const subject = typeof claims?.sub === 'string' ? claims.sub : null
    const email = typeof claims?.email === 'string' ? claims.email : null

    if (result.error && isMissingSessionError(result.error)) {
      clearSupabaseAuthCookies(response, request)
    } else if (result.error) {
      authUnavailable = true
    } else if (subject) {
      identity = { id: subject, email }
    }
  } catch (error) {
    if (isMissingSessionError(error)) {
      clearSupabaseAuthCookies(response, request)
    } else {
      authUnavailable = true
    }
  }

  // A transport/backend outage is not a logout. Never send the user to the login
  // form for a 5xx/timeout because that makes a healthy local session look invalid.
  if (authUnavailable) return redirectToAuthUnavailable(request)
  if (!identity) return redirectToLoginWithNext(request)

  // ROOT authorization intentionally happens only in the server-side ROOT gates
  // (requireRootObserverPage / requireRootViewer / requireRootActor), which use the
  // authoritative service-backed profile. The proxy only verifies that a browser
  // session exists. This prevents an RLS-filtered profile lookup here from denying
  // a valid institutional observer before the authoritative gate runs.
  if (pathname.startsWith('/root')) return response

  if (pathname.startsWith('/studio')) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role,module_access')
      .eq('user_id', identity.id)
      .maybeSingle()

    const allowedWithoutProfile = isStudioRouteUser(identity.id, null, identity.email, null)
    if (profileError && !allowedWithoutProfile) return redirectToAuthUnavailable(request)

    if (!isStudioRouteUser(identity.id, profile?.role, identity.email, profile?.module_access as ModuleAccess)) {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
