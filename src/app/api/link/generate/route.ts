import { NextRequest, NextResponse } from 'next/server'
import { getNode, createLink } from '@/lib/store/runtimeStore'
import { generateToken } from '@/lib/utils/tokens'

export async function POST(request: NextRequest) {
  const { nodeId, expiresInHours = 168 } = await request.json()
  if (!nodeId || !getNode(nodeId)) {
    return NextResponse.json({ success: false, error: 'nodeId requerido o invalido' }, { status: 400 })
  }
  const expiresAt = new Date(Date.now() + Number(expiresInHours) * 60 * 60 * 1000).toISOString()
  const token = generateToken()
  createLink(nodeId, token, expiresAt)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return NextResponse.json({ success: true, token, url: `${baseUrl}/link/${token}`, expires_at: expiresAt })
}
