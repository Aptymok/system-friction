import { NextRequest, NextResponse } from 'next/server'
import { getAudits, getNode } from '@/lib/store/runtimeStore'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const node = getNode(id)
  if (!node) return NextResponse.json({ error: 'Nodo no encontrado' }, { status: 404 })
  return NextResponse.json({ node, audits: getAudits(node.id) })
}
