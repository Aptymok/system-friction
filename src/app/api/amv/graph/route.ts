import { NextResponse } from 'next/server'
import { buildAmvGraph } from '@/lib/amv/core/amvGraphBuilder'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const scope = url.searchParams.get('scope') || 'root'
  const subject = url.searchParams.get('subject') || scope
  return NextResponse.json(buildAmvGraph(scope, subject))
}
