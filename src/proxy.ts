import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { normalizeSupabaseUrl } from '@/runtime/supabase/url'

const AUTH_COOKIE_NAMES = ['sb-access-token', 'sb-refresh-token', 'supabase-auth-token']

function isRefreshTokenMissing(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '')
  return message.toLowerCase().includes('refresh token not found') || message.toLowerCase().includes('refresh_token_not_found')
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

function isStudioRouteUser(userId?: string | null, role?: string | null, email?: string | null) {
  if (isRootRouteUser(userId, role, email)) return true
  const allowed = (process.env.STUDIO_AUTHORIZED_EMAILS || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
  return Boolean(email && allowed.includes(email.toLowerCase()))
}

function redirectToLoginWithNext(request: NextRequest) {
  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`)
  return NextResponse.redirect(loginUrl)
}

function isLocalStudioBypass(request: NextRequest) {
  if (process.env.SFI_LOCAL_STUDIO_AUTH_BYPASS !== 'true') return false
  const host = request.nextUrl.hostname
  return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0'
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next()
  const { pathname } = request.nextUrl

  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  if (pathname === '/' || pathname.startsWith('/llms')) {
    response.headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
  }

  if (pathname.startsWith('/root') || pathname.startsWith('/field') || pathname.startsWith('/studio')) {
    response.headers.set('Cache-Control', 'no-store, must-revalidate')
  }

  const requiresSession = pathname.startsWith('/root') || pathname.startsWith('/field') || pathname.startsWith('/studio')
  if (!requiresSession) return response

  if (pathname.startsWith('/studio') && isLocalStudioBypass(request)) {
    response.headers.set('X-SFI-Auth-Bypass', 'local-studio')
    return response
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('error', 'supabase_no_configurado')
    loginUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`)
    return NextResponse.redirect(loginUrl)
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

  let user = null
  try {
    const result = await supabase.auth.getUser()
    user = result.data.user
    if (result.error && isRefreshTokenMissing(result.error)) {
      clearSupabaseAuthCookies(response, request)
      user = null
    }
  } catch (error) {
    if (isRefreshTokenMissing(error)) {
      clearSupabaseAuthCookies(response, request)
      user = null
    } else {
      throw error
    }
  }

  if (!user) return redirectToLoginWithNext(request)

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (pathname.startsWith('/root') && !isRootRouteUser(user.id, profile?.role, user.email)) {
    return NextResponse.redirect(new URL('/unauthorized', request.url))
  }

  if (pathname.startsWith('/studio') && !isStudioRouteUser(user.id, profile?.role, user.email)) {
    return NextResponse.redirect(new URL('/unauthorized', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
