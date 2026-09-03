'use server'

import { redirect } from 'next/navigation'
import { checkRateLimit, rateLimitKey } from '@/lib/auth/rateLimit'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/runtime/supabase/server'
import { authSchema } from '@/lib/validation/schemas'

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
  const service = createServiceSupabaseClient()
  const { data: profile } = await service
    .from('profiles')
    .select('role,module_access')
    .eq('user_id', userId)
    .maybeSingle()
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
  const limit = checkRateLimit(rateLimitKey('login', input.email), 8, 60_000)
  if (!limit.allowed) redirect(`/login?error=rate_limit&next=${encodeURIComponent(next)}`)

  const supabase = await createServerSupabaseClient()
  if (!supabase) redirect(`/login?error=supabase_no_configurado&next=${encodeURIComponent(next)}`)
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error || !data.user) redirect(`/login?error=${encodeURIComponent(error?.message ?? 'auth_user_missing')}&next=${encodeURIComponent(next)}`)

  redirect(await resolvePostLoginPath(data.user.id, next))
}

export async function forgotPasswordAction(formData: FormData) {
  const email = formValue(formData, 'email')
  const limit = checkRateLimit(rateLimitKey('forgot', email), 4, 60_000)
  if (!limit.allowed) redirect('/forgot?error=rate_limit')
  const supabase = await createServerSupabaseClient()
  if (!supabase) redirect('/forgot?error=supabase_no_configurado')
  const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://www.systemfriction.org'
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/reset` })
  redirect('/forgot?state=sent')
}

export async function resetPasswordAction(formData: FormData) {
  const password = formValue(formData, 'password')
  const parsed = authSchema.shape.password.safeParse(password)
  if (!parsed.success) redirect('/reset?error=entrada_invalida')
  const supabase = await createServerSupabaseClient()
  if (!supabase) redirect('/reset?error=supabase_no_configurado')
  const { error } = await supabase.auth.updateUser({ password })
  if (error) redirect(`/reset?error=${encodeURIComponent(error.message)}`)
  redirect('/entry')
}

export async function logoutAction() {
  const supabase = await createServerSupabaseClient()
  if (supabase) await supabase.auth.signOut()
  redirect('/')
}
