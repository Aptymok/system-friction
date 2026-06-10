import { NextResponse } from 'next/server'
import { createAmvResponse, type AmvInput } from '@/lib/amv/amv-core'
import { listAmvMemoryReferences, saveAmvMemory } from '@/lib/amv/amv-memory'

export const dynamic = 'force-dynamic'

function parseInput(body: unknown): AmvInput | null {
  if (!body || typeof body !== 'object') return null
  const payload = body as Record<string, unknown>
  const module = typeof payload.module === 'string' ? payload.module.trim() : ''
  const sessionId = typeof payload.sessionId === 'string' ? payload.sessionId.trim() : `amv_eval_${Date.now().toString(36)}`
  const message = typeof payload.message === 'string' ? payload.message.trim() : ''
  const context = payload.context && typeof payload.context === 'object' && !Array.isArray(payload.context)
    ? payload.context as Record<string, unknown>
    : undefined
  if (!module || !message) return null
  return { module, sessionId, message, context }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const input = parseInput(body)
  if (!input) return NextResponse.json({ ok: false, error: 'invalid_amv_input' }, { status: 400 })

  const memory = listAmvMemoryReferences({ module: input.module, sessionId: input.sessionId, limit: 8 })
  const result = createAmvResponse(input, memory)
  saveAmvMemory(result.memoryDelta)

  return NextResponse.json({
    ok: true,
    inference: result.inference,
    response: result.response,
    memoryDelta: result.memoryDelta,
    requiresHumanValidation: result.requiresHumanValidation,
    nextObservation: result.nextObservation,
  })
}
