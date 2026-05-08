import { NextRequest, NextResponse } from 'next/server'
import { verifyLink } from '@/lib/store/runtimeStore'

export async function POST(request: NextRequest) {
  const { token } = await request.json()
  if (!token) return NextResponse.json({ valid: false, error: 'Token requerido' }, { status: 400 })
  const result = verifyLink(token)
  if (!result?.node) return NextResponse.json({ valid: false, error: 'Token invalido o expirado' })
  return NextResponse.json({ valid: true, node_id: result.node.id, node: result.node })
}
