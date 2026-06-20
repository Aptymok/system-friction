import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { executeAbortableQuery } from '@/lib/supabase/abortableQuery';

export type SfiOperationalEventRisk = 'low' | 'medium' | 'high' | 'critical' | 'unknown';
export type SfiOperationalEventStatus =
  | 'observed'
  | 'pending'
  | 'classified'
  | 'blocked'
  | 'drafted'
  | 'persisted'
  | 'resolved'
  | 'unknown';

export type SfiOperationalEvent = {
  id: string;
  created_at: string;
  organ: string;
  kind: string;
  title: string;
  summary: string;
  source?: string;
  risk?: SfiOperationalEventRisk | string;
  status?: SfiOperationalEventStatus | string;
  payload?: Record<string, unknown>;
  next_action?: string;
};

export let lastSfiSupabaseWriteError: unknown = null;

const DATA_DIR = path.join(process.cwd(), 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'sfi-operational-events.json');

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(EVENTS_FILE)) fs.writeFileSync(EVENTS_FILE, '[]', 'utf8');
}

function readLocalEvents(): SfiOperationalEvent[] {
  ensureDataFile();
  try {
    const parsed = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalEvents(events: SfiOperationalEvent[]) {
  ensureDataFile();
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2), 'utf8');
}

async function writeSupabaseEvent(event: SfiOperationalEvent): Promise<boolean> {
  try {
    const service = createServiceSupabaseClient();
    const input = JSON.stringify(event);
    const inputHash = sha256(input);

    const { error } = await executeAbortableQuery(service.from('sfi_amv_memory').insert({
      session_id: 'sfi-operational',
      module: event.organ || 'sfi',
      input_hash: inputHash,
      input_summary: event.title || event.kind || 'SFI operational event',
      inference: {
        kind: event.kind,
        source: event.source,
        risk: event.risk,
        status: event.status
      },
      decision: {
        next_action: event.next_action || null
      },
      output_summary: event.summary || 'Evento operacional SFI persistido.',
      evaluation: {
        patch: 'P06',
        persistence: 'supabase.sfi_amv_memory'
      },
      memory_delta: {
        sfi_operational_event: event
      },
      uncertainty: event.risk === 'high' ? 0.55 : event.risk === 'medium' ? 0.35 : 0.18,
      source_trust: event.status === 'observed' ? 0.82 : 0.55,
      requires_human_validation: event.risk === 'high'
    }), 5000);

    if (error) throw error;
    lastSfiSupabaseWriteError = null;
    return true;
  } catch (error) {
    lastSfiSupabaseWriteError = error;
    console.warn('[sfi-operational-events] Supabase write failed, falling back to local JSON:', error);
    return false;
  }
}

async function readSupabaseEvents(): Promise<SfiOperationalEvent[] | null> {
  try {
    const service = createServiceSupabaseClient();
    const { data, error } = await executeAbortableQuery(service
      .from('sfi_amv_memory')
      .select('*')
      .eq('session_id', 'sfi-operational')
      .order('created_at', { ascending: true })
      .limit(500));

    if (error) throw error;

    return (data || []).map((row: any) => {
      const embedded = row?.memory_delta?.sfi_operational_event;
      if (embedded && typeof embedded === 'object') return embedded as SfiOperationalEvent;

      return {
        id: String(row.id),
        created_at: String(row.created_at || new Date().toISOString()),
        organ: String(row.module || 'sfi'),
        kind: String(row.inference?.kind || 'memory'),
        title: String(row.input_summary || 'SFI memory event'),
        summary: String(row.output_summary || 'Memoria SFI recuperada desde sfi_amv_memory.'),
        source: String(row.inference?.source || 'sfi_amv_memory'),
        risk: String(row.inference?.risk || 'unknown'),
        status: String(row.inference?.status || 'observed'),
        payload: row.memory_delta || {},
        next_action: row.decision?.next_action || undefined
      };
    });
  } catch (error) {
    console.warn('[sfi-operational-events] Supabase read failed, falling back to local JSON:', error);
    return null;
  }
}

export async function readSfiOperationalEventsAsync(): Promise<SfiOperationalEvent[]> {
  const supabaseEvents = await readSupabaseEvents();
  if (supabaseEvents && supabaseEvents.length > 0) return supabaseEvents;
  return readLocalEvents();
}

export function readSfiOperationalEvents(): SfiOperationalEvent[] {
  return readLocalEvents();
}

export function writeSfiOperationalEvents(events: SfiOperationalEvent[]) {
  writeLocalEvents(events);
}

export async function appendSfiOperationalEventAsync(input: Partial<SfiOperationalEvent>): Promise<SfiOperationalEvent> {
  const now = new Date().toISOString();

  const event: SfiOperationalEvent = {
    id: input.id || `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    created_at: input.created_at || now,
    organ: input.organ || 'unknown',
    kind: input.kind || 'observation',
    title: input.title || 'Evento operacional SFI',
    summary: input.summary || 'Evento registrado por la membrana operacional SFI.',
    source: input.source || 'api/sfi/events',
    risk: input.risk || 'unknown',
    status: input.status || 'observed',
    payload: input.payload,
    next_action: input.next_action
  };

  const wroteSupabase = await writeSupabaseEvent(event);

  const local = readLocalEvents();
  const deduped = local.filter((existing) => existing.id !== event.id);
  writeLocalEvents([...deduped, event].sort((a, b) => a.created_at.localeCompare(b.created_at)));

  return {
    ...event,
    payload: {
      ...(event.payload || {}),
      persistence: wroteSupabase ? 'supabase_primary' : 'local_fallback'
    }
  };
}

export function appendSfiOperationalEvent(input: Partial<SfiOperationalEvent>): SfiOperationalEvent {
  const now = new Date().toISOString();

  const event: SfiOperationalEvent = {
    id: input.id || `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    created_at: input.created_at || now,
    organ: input.organ || 'unknown',
    kind: input.kind || 'observation',
    title: input.title || 'Evento operacional SFI',
    summary: input.summary || 'Evento registrado por la membrana operacional SFI.',
    source: input.source || 'api/sfi/events',
    risk: input.risk || 'unknown',
    status: input.status || 'observed',
    payload: input.payload,
    next_action: input.next_action
  };

  void writeSupabaseEvent(event);

  const events = readLocalEvents();
  const deduped = events.filter((existing) => existing.id !== event.id);
  writeLocalEvents([...deduped, event].sort((a, b) => a.created_at.localeCompare(b.created_at)));

  return event;
}

export async function latestEventByOrganAsync(organ: string): Promise<SfiOperationalEvent | null> {
  const events = await readSfiOperationalEventsAsync();
  return events
    .filter((event) => event.organ === organ)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0] || null;
}

export function latestEventByOrgan(organ: string): SfiOperationalEvent | null {
  return readLocalEvents()
    .filter((event) => event.organ === organ)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0] || null;
}

export async function getSfiOperationalPersistenceStatus() {
  const supabaseEvents = await readSupabaseEvents();
  return {
    primary: 'supabase.sfi_amv_memory',
    fallback: 'data/sfi-operational-events.json',
    supabaseOk: Boolean(supabaseEvents),
    supabaseEventCount: supabaseEvents?.length ?? null,
    localEventCount: readLocalEvents().length,
    logbook_id: 'sfi-operational',
    schema_version: '2026-06-14.sfi-operational.v1'
  };
}
