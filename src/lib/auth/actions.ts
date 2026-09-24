'use server'

import { redirect } from 'next/navigation'
import { checkRateLimit, rateLimitKey } from '@/lib/auth/rateLimit'
import {
  createServerSupabaseClient,
  createServiceSupabaseClient,
  requestNeonPasswordReset,
  resetNeonPassword,
  signInWithNeonAuth,
  signOutNeonAuth,
} from '@/runtime/supabase/server'
import { readContinuityProfile, readContinuityProfileByEmail } from '@/lib/sfi/continuityPostgres'
import { activateNeonPasswordWithBootstrap } from '@/lib/auth/neonPasswordBootstrap'
import { authSchema } from '@/lib/validation/schemas'
import { canonicalFounderUserId, isConfiguredFounderIdentity } from '@/lib/system/access/founderAuthority'

function formValue(formData: FormData, key: string) {
  return String(formData.get(key) || '')
}

function safeInternalRedirect(value: string) {
  if (!value) return '/entry'
  if (!value.startsWith('/')) return '/entry'
  if (value.startsWith('//')) return '/entry'
  if (
    value.startsWith('/login') ||
    value.startsWith('/signup') ||
    value.startsWith('/verify') ||
    value.startsWith('/auth-unavailable')
  ) return '/entry'
  return value
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}


async function resolvePostLoginPath(userId: string, requestedNext: string) {
  if (requestedNext !== '/entry') return requestedNext
  if (isConfiguredFounderIdentity({ userId })) return '/root'

  let primaryProfile: { role?: unknown; module_access?: unknown } | null = null
  try {
    const service = createServiceSupabaseClient()
    const primary = await service
      .from('profiles')
      .select('role,module_access')
      .eq('user_id', userId)
      .maybeSingle()
    if (!primary.error) primaryProfile = primary.data
  } catch {
    primaryProfile = null
  }

  const continuityProfile = primaryProfile
    ? null
    : await readContinuityProfile(userId).catch(() => null)
  const profile = primaryProfile ?? continuityProfile
  const role = typeof profile?.role === 'string' ? profile.role : null
  const access = record(profile?.module_access)
  const rootObserverRole = role === 'root' || role === 'system' || role === 'observer' || role === 'controller'
  if (rootObserverRole && (access.root === true || access.root_observe === true || access.full_access === true)) return '/root'
  return '/field'
}

export async function registerAction(formData: FormData) {
  const input = { email: formValue(formData, 'email'), password: formValue(formData, 'password') }
  const next = safeInternalRedirect(formValue(formData, 'next'))
  const parsed = authSchema.safeParse(input)
  if (!parsed.success) redirect(`/signup?error=entrada_invalida&next=${encodeURIComponent(next)}`)
  const limit = checkRateLimit(rateLimitKey('register', input.email), 5, 60_000)
  if (!limit.allowed) redirect(`/signup?error=rate_limit&next=${encodeURIComponent(next)}`)

  const supabase = await createServerSupabaseClient()
  if (!supabase) redirect(`/signup?error=supabase_no_configurado&next=${encodeURIComponent(next)}`)
  const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://www.systemfriction.org'
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: `${origin}/verify?next=${encodeURIComponent(next)}` }
  })
  if (error) redirect(`/signup?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`)
  redirect(`/verify?state=pending&next=${encodeURIComponent(next)}`)
}

export async function loginAction(formData: FormData) {
  const input = { email: formValue(formData, 'email'), password: formValue(formData, 'password') }
  const next = safeInternalRedirect(formValue(formData, 'next'))
  const parsed = authSchema.safeParse(input)
  if (!parsed.success) redirect(`/login?error=entrada_invalida&next=${encodeURIComponent(next)}`)
  const email = parsed.data.email.trim().toLowerCase()
  const limit = checkRateLimit(rateLimitKey('login', email), 8, 60_000)
  if (!limit.allowed) redirect(`/login?error=rate_limit&next=${encodeURIComponent(next)}`)

  // Neon is the continuity-first credential provider. A valid Neon session wins
  // without touching Supabase Auth. Supabase is a bounded compatibility fallback
  // for institutional accounts whose invitation/password lifecycle still lives
  // in the canonical Supabase Auth registry.
  const neon = await signInWithNeonAuth(email, parsed.data.password)
  if (neon.ok) {
    const founderUserId = canonicalFounderUserId({ email })
    const profile = founderUserId
      ? null
      : await readContinuityProfileByEmail(email).catch(() => null)
    const canonicalUserId = founderUserId
      ?? (typeof profile?.user_id === 'string' ? profile.user_id : null)

    if (canonicalUserId) {
      redirect(await resolvePostLoginPath(canonicalUserId, next))
    }

    // Do not keep an unbound Neon session. A primary-bound institutional account
    // may still authenticate below through Supabase.
    await signOutNeonAuth()
  } else if (neon.status === 429) {
    redirect(`/login?error=rate_limit&next=${encodeURIComponent(next)}`)
  }

  let primaryStatus = 503
  let primaryUserId: string | null = null
  try {
    const supabase = await createServerSupabaseClient()
    const primary = await supabase.auth.signInWithPassword({
      email,
      password: parsed.data.password,
    })
    primaryStatus = Number(primary.error?.status ?? (primary.data.user ? 200 : 401))
    primaryUserId = !primary.error && primary.data.user ? primary.data.user.id : null
  } catch {
    primaryStatus = 503
  }

  // redirect() throws NEXT_REDIRECT internally; keep it outside the provider
  // try/catch so a successful primary login cannot be misclassified as 503.
  if (primaryUserId) {
    redirect(await resolvePostLoginPath(primaryUserId, next))
  }

  const neonUnavailable = !neon.ok && neon.status >= 500
  const primaryUnavailable = primaryStatus === 402 || primaryStatus >= 500
  const errorCode = primaryStatus === 429
    ? 'rate_limit'
    : neonUnavailable || primaryUnavailable
      ? 'auth_unavailable'
      : 'invalid_credentials'
  redirect(`/login?error=${errorCode}&next=${encodeURIComponent(next)}`)
}

export async function activateContinuityPasswordAction(formData: FormData) {
  const code = formValue(formData, 'code').trim()
  const password = formValue(formData, 'password')
  const confirmation = formValue(formData, 'confirmation')
  const parsedPassword = authSchema.shape.password.safeParse(password)
  const codeValid = /^SFI-[A-Za-z0-9_-]{24,64}$/.test(code)

  if (!codeValid || !parsedPassword.success || password !== confirmation) {
    redirect('/continuity-access?error=entrada_invalida')
  }

  const limit = checkRateLimit(rateLimitKey('continuity-bootstrap', 'founder'), 6, 5 * 60_000)
  if (!limit.allowed) redirect('/continuity-access?error=rate_limit')

  const result = await activateNeonPasswordWithBootstrap(
    code,
    parsedPassword.data,
  ).catch(() => null)

  if (!result) redirect('/continuity-access?error=auth_unavailable')
  if (result.status !== 'ACTIVATED') redirect('/continuity-access?error=invalid_or_expired')
  redirect('/login?state=continuity_activated')
}

export async function forgotPasswordAction(formData: FormData) {
  const email = formValue(formData, 'email')
  const limit = checkRateLimit(rateLimitKey('forgot', email), 4, 60_000)
  if (!limit.allowed) redirect('/forgot?error=rate_limit')
  const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://systemfriction.org'
  try {
    await requestNeonPasswordReset(email, `${origin}/reset`)
  } catch {
    redirect('/forgot?error=auth_unavailable')
  }
  redirect('/forgot?state=sent')
}

export async function resetPasswordAction(formData: FormData) {
  const password = formValue(formData, 'password')
  const confirmation = formValue(formData, 'confirmation')
  const token = formValue(formData, 'token')
  const parsed = authSchema.shape.password.safeParse(password)
  if (!parsed.success || password !== confirmation || !token) {
    redirect(`/reset?error=entrada_invalida${token ? `&token=${encodeURIComponent(token)}` : ''}`)
  }
  const result = await resetNeonPassword(parsed.data, token)
  if (!result.ok) redirect(`/reset?error=${encodeURIComponent(result.message)}`)
  redirect('/login?state=password_reset')
}

export async function logoutAction() {
  await signOutNeonAuth().catch(() => null)
  const supabase = await createServerSupabaseClient()
  if (supabase) await supabase.auth.signOut().catch(() => null)
  redirect('/')
}
