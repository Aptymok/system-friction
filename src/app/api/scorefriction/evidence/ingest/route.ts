import { NextResponse } from 'next/server'
import { createEvidenceEnvelope } from '@/lib/sfi/evidence'
import { createServiceSupabaseClient } from '@/runtime/supabase/server'
import { randomUUID } from 'crypto';
import { InstitutionalMemoryWriter } from '@/core/memory/InstitutionalMemoryWriter';

export const dynamic = 'force-dynamic'

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function str(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

export async function POST(request: Request) {
  const body = record(await request.json().catch(() => ({})))
  const caseId = str(body.caseId, `SF-${Date.now().toString(36)}`)
  const raw = str(body.raw, JSON.stringify(body.payload ?? {}))
  const envelope = createEvidenceEnvelope({
    sourceName: str(body.sourceName ?? body.label, 'scorefriction-evidence'),
    sourceUrl: str(body.sourceUrl) || null,
    raw,
    anonymized: true,
    payloadSummary: { caseId, module: 'scorefriction', length: raw.length },
  })

  try {
    const service = createServiceSupabaseClient()

    // 1. Insertar en el ledger de evidencia
    const { data, error } = await service.from('sfi_evidence_ledger').insert({
      case_id: caseId,
      module: 'scorefriction',
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
    }).select('id').single()

    if (error) throw new Error(error.message)

    const evidenceId = data?.id

    // 2. Registrar admisión en memoria institucional (ADR-017)
    if (evidenceId) {
      const writer = new InstitutionalMemoryWriter()
      await writer.write({
        entityType: 'EVIDENCE',
        entityId: evidenceId,
        source: {
          component: 'EvidenceService',
        },
        provenance: {
          originTable: 'sfi_evidence_ledger',
          originId: evidenceId,
        },
        authorization: {
          rule: 'EVIDENCE_ADMISSION',
        },
      })
    }

    return NextResponse.json({
      ok: true,
      status: 'ACTIVE',
      evidence: { ...envelope, id: evidenceId, caseId }
    })

  } catch (error) {
    return NextResponse.json({
      ok: false,
      status: 'DEGRADED_BLOCKING',
      error: error instanceof Error ? error.message : 'ledger_write_failed',
      evidence: { ...envelope, caseId },
    }, { status: 500 })
  }
}