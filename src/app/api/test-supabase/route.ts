// src/app/api/test-supabase/route.ts
import { createServerSupabaseClient } from '@/runtime/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.from('nodes').select('*').limit(1)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
