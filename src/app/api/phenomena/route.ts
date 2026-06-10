import { NextResponse } from 'next/server'
import { buildPhenomenonRecord, listPhenomena, type PhenomenonCandidateInput } from '@/lib/phenomena/phenomenon-engine'

export const dynamic = 'force-dynamic'

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function str(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function num(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback)
  return Number.isFinite(parsed) ? parsed : fallback
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : []
}

function parseCandidate(value: unknown): PhenomenonCandidateInput {
  const body = record(value)
  const now = new Date().toISOString()
  return {
    module: str(body.module, 'sfi'),
    label: str(body.label, 'unnamed phenomenon'),
    evidenceIds: stringArray(body.evidenceIds),
    attractorKeys: stringArray(body.attractorKeys),
    ejectorKeys: stringArray(body.ejectorKeys),
    firstSeen: str(body.firstSeen, now),
    lastSeen: str(body.lastSeen, now),
    density: num(body.density),
    trust: num(body.trust),
    persistence: num(body.persistence),
    velocity: num(body.velocity),
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const module = searchParams.get('module') ?? undefined
  const result = await listPhenomena(module)
  return NextResponse.json(result)
}

export async function POST(request: Request) {
  const candidate = parseCandidate(await request.json().catch(() => ({})))
  const record = buildPhenomenonRecord(candidate)
  return NextResponse.json({ ok: true, record })
}
