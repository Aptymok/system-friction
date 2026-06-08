import { NextResponse } from 'next/server'
import { buildUploadContract, type AmvUploadObjectType } from '@/lib/amv/core/uploadContract'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const payload = body && typeof body === 'object' ? body as Record<string, unknown> : {}
  const objectType = typeof payload.objectType === 'string' ? payload.objectType as AmvUploadObjectType : 'evidencia'
  return NextResponse.json(buildUploadContract(objectType))
}
