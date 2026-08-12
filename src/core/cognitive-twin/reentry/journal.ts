import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import type { CognitiveTwinDevelopmentalEvent } from './types';

const ROLE = 'cognitive_twin_developmental_heartbeat';
type Row = Record<string, unknown>;

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function parseEvent(row: Row): CognitiveTwinDevelopmentalEvent | null {
  const envelope = record(row.output_envelope);
  const result = record(envelope.result);
  const event = record(result.developmentalEvent);
  if (event.schemaVersion !== 'SFI-CT-DEVELOPMENTAL-EVENT-1.0') return null;
  if (event.rootVisibility !== 'ALWAYS_VISIBLE') return null;
  return event as unknown as CognitiveTwinDevelopmentalEvent;
}

export async function readCognitiveTwinJournal(limit = 120) {
  const db = createServiceSupabaseClient();
  const result = await db.from('sfi_cognitive_twin_runs')
    .select('*')
    .eq('role', ROLE)
    .order('created_at', { ascending: false })
    .limit(Math.max(1, Math.min(limit, 400)));
  if (result.error) throw new Error(`CT_JOURNAL_READ_FAILED:${result.error.message}`);

  const entries = ((result.data ?? []) as Row[])
    .map(parseEvent)
    .filter((event): event is CognitiveTwinDevelopmentalEvent => Boolean(event));

  return {
    generatedAt: new Date().toISOString(),
    subjectId: 'CT-A01',
    visibilityRule: 'ROOT_ALWAYS_VISIBLE',
    privateReasoningPersisted: false,
    entries,
    limitations: [
      'The journal contains auditable computational state summaries, not private reasoning traces.',
      'A self-report records what the runtime represented about its operations; it is not evidence of phenomenal experience.',
    ],
  };
}

export type CognitiveTwinJournal = Awaited<ReturnType<typeof readCognitiveTwinJournal>>;
