// src/lib/db/events.ts

import { createServiceSupabaseClient } from '@/runtime/supabase/server'

export type SFIEventType =
  | 'node.created'
  | 'intake.completed'
  | 'audit.created'
  | 'pattern.detected'
  | 'hard_stop.triggered'
  | 'action.created'
  | 'action.completed'
  | 'action.missed'
  | 'telemetry.signal_ingested'
  | 'amv.question_asked'
  | 'amv.session_completed'
  | 'license.changed'
  | 'publication.scheduled'
  | 'publication.published'
  | 'publication.failed'
  | 'memory.vector_created'
  | 'memory.vector_failed'
  | 'external.signal_ingested'
  | 'social.metric_captured'

export interface SFIEventPayload {
  [key: string]: unknown
}

export async function appendEvent(input: {
  user_id?: string | null
  node_id?: string | null
  event_type: SFIEventType
  payload?: SFIEventPayload
  source?: string
}) {
  const supabase = createServiceSupabaseClient()

  if (!supabase) {
    return {
      ok: false,
      reason: 'supabase_unavailable',
    }
  }

  const { error } = await supabase
    .from('interaction_events')
    .insert({
      user_id: input.user_id ?? null,
      node_id: input.node_id ?? null,
      event_type: input.event_type,
      payload: input.payload ?? {},
      source: input.source ?? 'system',
    })

  if (error) {
    return {
      ok: false,
      reason: error.message,
    }
  }

  return {
    ok: true,
  }
}