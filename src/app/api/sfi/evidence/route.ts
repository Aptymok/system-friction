import { NextResponse } from 'next/server'
import { createEvidenceEnvelope } from '@/lib/sfi/evidence'
import { createServiceSupabaseClient } from '@/runtime/supabase/server'

export const dynamic = 'force-dynamic'

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function str(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

export async function POST(request: Request) {
  const body = record(await request.json().catch(() => ({})))
  const module = str(body.module, 'scorefriction')
  const caseId = str(body.caseId, 'SF-LOCAL')
  const raw = str(body.raw, JSON.stringify(body.payload ?? {}))
  const sourceName = str(body.sourceName, str(body.label, 'scorefriction-input'))
  const sourceUrl = str(body.sourceUrl) || null

  const envelope = createEvidenceEnvelope({
    sourceName,
    sourceUrl,
    raw,
    anonymized: body.anonymized !== false,
    verified: Boolean(body.verified),
    sourceCount: Number(body.sourceCount ?? 1),
    payloadSummary: {
      caseId,
      module,
      inputKind: str(body.kind, 'text'),
      length: raw.length,
      label: str(body.label, sourceName),
    },
  })

  let stored = false
  let id = crypto.randomUUID()
  const warnings: string[] = []

  try {
    const service = createServiceSupabaseClient()
    const { data, error } = await service
      .from('sfi_evidence_ledger')
      .insert({
        case_id: caseId,
        module,
        evidence_kind: envelope.kind,
        source_name: envelope.sourceName,
        source_url: envelope.sourceUrl,
        private_ref: envelope.privateRef,
        public_summary: envelope.payloadSummary,
        evidence_hash: envelope.hash,
        anonymized: envelope.anonymized,
        trust_level: envelope.trustLevel,
        trust_score: envelope.trustScore,
        ldi: envelope.ldi,
        public_weight: envelope.publicWeight,
        observed_at: envelope.observedAt,
      })
      .select('id')
      .single()

    if (error) {
      warnings.push(`sfi_evidence_ledger_write_failed:${error.message}`)
    } else {
      stored = true
      id = str(data?.id, id)
    }
  } catch (error) {
    warnings.push(`sfi_evidence_ledger_not_ready:${error instanceof Error ? error.message : 'unknown'}`)
  }

  return NextResponse.json({
    ok: true,
    stored,
    warnings,
    evidence: {
      ...envelope,
      id,
      module,
      caseId,
    },
  })
}
