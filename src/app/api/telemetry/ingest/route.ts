import { NextRequest, NextResponse } from 'next/server'
import { appendEvent } from '@/lib/db/events'
import { extractMemoryFacts } from '@/lib/memory/facts'
import { storeMemoryVector } from '@/lib/memory/embeddings'
import { requireServiceSupabaseClient } from '@/lib/supabase/server'
import { telemetryConnectors } from '@/lib/telemetry/connectors/registry'
import { normalizeSignal } from '@/lib/telemetry/normalize'
import { telemetryIngestSchema } from '@/lib/validation/schemas'

export async function POST(request: NextRequest) {
  const parsed = telemetryIngestSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Senal invalida' }, { status: 400 })
  const supabase = requireServiceSupabaseClient()
  const { data: node } = await supabase.from('nodes').select('id,user_id').eq('id', parsed.data.nodeId).single()
  if (!node) return NextResponse.json({ success: false, error: 'Nodo no encontrado' }, { status: 404 })

  const connector = telemetryConnectors[parsed.data.provider]
  const rawSignals = await connector.ingest(parsed.data)
  const stored = []

  for (const rawSignal of rawSignals) {
    const normalized = normalizeSignal(rawSignal)
    const { data: signal } = await supabase
      .from('external_signals')
      .insert({
        user_id: node.user_id,
        node_id: node.id,
        provider: normalized.provider,
        external_id: normalized.external_id,
        raw_payload: normalized.raw_payload,
        normalized_text: normalized.normalized_text,
        semantic_tags: normalized.semantic_tags,
        signal_strength: normalized.signal_strength,
        published_at: normalized.published_at
      })
      .select('*')
      .single()

    if (signal) {
      stored.push(signal)
      await storeMemoryVector({
        node_id: node.id,
        source_table: 'external_signals',
        source_id: signal.id,
        content: normalized.normalized_text,
        metadata: { provider: normalized.provider, tags: normalized.semantic_tags }
      })
      const facts = extractMemoryFacts({
        node_id: node.id,
        audit_id: undefined,
        narrative: normalized.normalized_text,
        result: {
          ihg: 0,
          nti: normalized.signal_strength,
          ldi: 0,
          loop_score: 0,
          divergence: normalized.signal_strength,
          verdict: 'Senal externa ingerida',
          diagnosis: normalized.normalized_text,
          entities: [],
          pattern: normalized.semantic_tags[0] || 'external_signal',
          hard_stop: false,
          proposed_action: 'Revisar si esta senal altera la resolucion minima activa.'
        }
      }).map((fact) => ({ ...fact, fact_type: 'external_signal' }))
      if (facts.length) await supabase.from('memory_facts').insert(facts)
      await appendEvent({ user_id: node.user_id, node_id: node.id, event_type: 'telemetry.signal_ingested', payload: { signal_id: signal.id, provider: normalized.provider } })
    }
  }

  return NextResponse.json({ success: true, stored })
}
