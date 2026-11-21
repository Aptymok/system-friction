import { NextResponse } from 'next/server'
import { AccessDeniedError, requireAuthenticatedUser } from '@/lib/system/access/server'
import { createAmvResponse, type AmvInput } from '@/lib/amv/amv-core'
import { listAmvMemoryReferences, saveAmvMemory } from '@/lib/amv/amv-memory'

export const dynamic = 'force-dynamic'

function parseInput(body: unknown): AmvInput | null {
  if (!body || typeof body !== 'object') return null
  const payload = body as Record<string, unknown>
  const module = typeof payload.module === 'string' ? payload.module.trim() : ''
  const sessionId = typeof payload.sessionId === 'string' ? payload.sessionId.trim() : ''
  const message = typeof payload.message === 'string' ? payload.message.trim() : ''
  const context = payload.context && typeof payload.context === 'object' && !Array.isArray(payload.context)
    ? payload.context as Record<string, unknown>
    : undefined
  if (!module || !sessionId || !message) return null
  return { module, sessionId, message, context }
}

export async function POST(request: Request) {
  let userId: string
  try {
    const context = await requireAuthenticatedUser()
    userId = context.user.id
  } catch (error) {
    if (error instanceof AccessDeniedError) return NextResponse.json({ ok: false, error: error.code }, { status: error.status })
    return NextResponse.json({ ok: false, error: 'authorization_failed' }, { status: 503 })
  }

  const body = await request.json().catch(() => null)
  const input = parseInput(body)
  if (!input) return NextResponse.json({ ok: false, error: 'invalid_amv_input' }, { status: 400 })
  if (input.module.length > 80 || input.sessionId.length > 128 || input.message.length > 8_000) {
    return NextResponse.json({ ok: false, error: 'amv_input_too_large' }, { status: 413 })
  }

  // sessionId is supplied by the client; namespace it to the authenticated owner.
  // This keeps one caller from reading another caller's ephemeral memory with a guessed ID.
  const ownedInput: AmvInput = { ...input, sessionId: `${userId}:${input.sessionId}` }
  const memory = listAmvMemoryReferences({ module: ownedInput.module, sessionId: ownedInput.sessionId, limit: 8 })
  const result = createAmvResponse(ownedInput, memory)
  saveAmvMemory(result.memoryDelta)

  return NextResponse.json({ ...result, memoryDelta: { ...result.memoryDelta, sessionId: input.sessionId } })
}
