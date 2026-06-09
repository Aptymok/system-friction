import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/runtime/supabase/server'

export const dynamic = 'force-dynamic'

async function signOut(request: Request) {
  const supabase = await createServerSupabaseClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/login', request.url))
}

export async function GET(request: Request) {
  return signOut(request)
}

export async function POST(request: Request) {
  return signOut(request)
}
