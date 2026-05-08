import { createServiceSupabaseClient } from '@/lib/supabase/server'

export async function storeMemoryVector(input: {
  node_id: string
  source_table: string
  source_id: string
  content: string
  metadata?: Record<string, unknown>
}) {
  const supabase = createServiceSupabaseClient()
  if (!supabase) return

  // TODO(vNEXT): replace null embedding with provider-generated vector once the embedding provider is selected.
  await supabase.from('memory_vectors').insert({
    node_id: input.node_id,
    source_table: input.source_table,
    source_id: input.source_id,
    content: input.content,
    embedding: null,
    metadata: input.metadata || {}
  })
}
