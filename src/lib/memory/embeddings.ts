import { createServiceSupabaseClient } from '@/runtime/supabase/server'
import { appendEvent } from '@/lib/db/events'

export async function storeMemoryVector(input: {
  node_id: string
  source_table: string
  source_id: string
  content: string
  metadata?: Record<string, unknown>
}) {
  const supabase = createServiceSupabaseClient()

  if (!supabase) {
    return {
      ok: false,
      reason: 'supabase_unavailable',
    }
  }

  const payload = {
    node_id: input.node_id,
    source_table: input.source_table,
    source_id: input.source_id,
    content: input.content,
    embedding: null,
    metadata: input.metadata ?? {},
  }

  const { data, error } = await supabase
    .from('memory_vectors')
    .insert(payload)
    .select('id')
    .single()

  if (error) {
    await appendEvent({
      node_id: input.node_id,
      event_type: 'memory.vector_failed',
      payload: {
        source_table: input.source_table,
        source_id: input.source_id,
        error: error.message,
      },
      source: 'memory-vector-writer',
    })

    return {
      ok: false,
      reason: error.message,
    }
  }

  await appendEvent({
    node_id: input.node_id,
    event_type: 'memory.vector_created',
    payload: {
      vector_id: data?.id,
      source_table: input.source_table,
      source_id: input.source_id,
    },
    source: 'memory-vector-writer',
  })

  return {
    ok: true,
    id: data?.id,
  }
}