import { NextRequest, NextResponse } from 'next/server'
import { getEntitlements } from '@/lib/licensing/entitlements'
import { createServiceSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId')
  const entitlements = await getEntitlements(userId)
  return NextResponse.json({ success: true, entitlements })
}

export async function POST(request: NextRequest) {
  const supabase = createServiceSupabaseClient()
  if (!supabase) return NextResponse.json({ success: false, error: 'Supabase no configurado' }, { status: 503 })
  const { userId, product_key = 'observatory_base', entitlements = ['observatory_base'] } = await request.json()
  if (!userId) return NextResponse.json({ success: false, error: 'userId requerido' }, { status: 400 })

  const { data: license, error } = await supabase
    .from('licenses')
    .insert({ user_id: userId, product_key, status: 'active', provider: 'manual' })
    .select('*')
    .single()

  if (error || !license) return NextResponse.json({ success: false, error: error?.message || 'No se pudo activar licencia' }, { status: 500 })
  await supabase.from('license_entitlements').insert(
    entitlements.map((entitlement_key: string) => ({
      license_id: license.id,
      entitlement_key,
      enabled: true
    }))
  )
  return NextResponse.json({ success: true, license })
}
