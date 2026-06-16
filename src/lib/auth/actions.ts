'use server'

import { redirect } from 'next/navigation'
import { checkRateLimit, rateLimitKey } from '@/lib/auth/rateLimit'
import { createServerSupabaseClient } from '@/runtime/supabase/server'
import { authSchema } from '@/lib/validation/schemas'

function formValue(formData: FormData, key: string) {
  return String(formData.get(key) || '')
}

function safeInternalRedirect(value: string) {
  if (!value) return '/root'
  if (!value.startsWith('/')) return '/root'
  if (value.startsWith('//')) return '/root'
  if (value.startsWith('/login')) return '/root'
  return value
}

export async function registerAction(formData: FormData) {
  const input = { email: formValue(formData, 'email'), password: formValue(formData, 'password') }
  const parsed = authSchema.safeParse(input)
  if (!parsed.success) redirect('/register?error=entrada_invalida')
  const limit = checkRateLimit(rateLimitKey('register', input.email), 5, 60_000)
  if (!limit.allowed) redirect('/register?error=rate_limit')

  const supabase = await createServerSupabaseClient()
  if (!supabase) redirect('/register?error=supabase_no_configurado')
  const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://systemfriction.org'
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: `${origin}/verify` }
  })
  if (error) redirect(`/register?error=${encodeURIComponent(error.message)}`)
  redirect('/verify?state=pending')
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
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`)

  redirect(next)
}

export async function forgotPasswordAction(formData: FormData) {
  const email = formValue(formData, 'email')
  const limit = checkRateLimit(rateLimitKey('forgot', email), 4, 60_000)
  if (!limit.allowed) redirect('/forgot?error=rate_limit')
  const supabase = await createServerSupabaseClient()
  if (!supabase) redirect('/forgot?error=supabase_no_configurado')
  const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://systemfriction.org'
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
  redirect('/terminal')
}

export async function logoutAction() {
  const supabase = await createServerSupabaseClient()
  if (supabase) await supabase.auth.signOut()
  redirect('/')
}
