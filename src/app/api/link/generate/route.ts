import { v4 as uuidv4 } from 'uuid'
import { requireServiceSupabaseClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const body = await req.json()
  const email = String(body.email || '')

  if (!email) {
    return new Response(JSON.stringify({ success: false, error: 'Email requerido' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }

  const magicToken = uuidv4()
  const expires = new Date(Date.now() + 1000 * 60 * 15)
  const supabase = requireServiceSupabaseClient()

  const { error } = await supabase
    .from('magic_links')
    .insert({
      email,
      token: magicToken,
      expires_at: expires.toISOString(),
      created_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    return new Response(JSON.stringify({ success: false, error: 'No se pudo generar el enlace mágico' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }

  const magicUrl = `https://systemfriction.org/api/link/verify?token=${magicToken}`
  return new Response(JSON.stringify({ success: true, token: magicToken, url: magicUrl, message: 'Token de acceso generado correctamente' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}