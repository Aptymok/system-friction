import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export type ParticipantWindowStatus = 'ACTIVE' | 'CLOSED';

export type CreateParticipantWindowInput = {
  watchedThoughts: string[];
  caseId?: string | null;
};

export type AddParticipantMarkInput = {
  dayNumber: number;
  note?: string | null;
  observedAt?: string | null;
};

export type CloseParticipantWindowInput = {
  whatChanged: string;
  whatNoticed: string;
  whatAvoided: string;
  whatWasMine: string;
  whatWasNotMine: string;
  neededToday: string;
};

type Row = Record<string, unknown>;
type ServiceClient = ReturnType<typeof createServiceSupabaseClient>;

const TABLE_WINDOWS = 'field_participant_windows';
const TABLE_MARKS = 'field_participant_marks';
const WINDOW_HOURS = 72;

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Row) : {};
}

function requireText(value: string | undefined | null, field: string) {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed) throw new Error(`${field}_REQUIRED`);
  return trimmed.slice(0, 4000);
}

async function loadOwnedWindow(client: ServiceClient, ownerId: string, windowId: string) {
  const { data, error } = await client
    .from(TABLE_WINDOWS)
    .select('*')
    .eq('id', windowId)
    .eq('owner_id', ownerId)
    .maybeSingle();
  if (error) throw new Error(`PARTICIPANT_WINDOW_READ_FAILED: ${error.message}`);
  if (!data) throw new Error('PARTICIPANT_WINDOW_NOT_FOUND');
  return record(data);
}

export async function createParticipantWindow(ownerId: string, input: CreateParticipantWindowInput) {
  const client = createServiceSupabaseClient();
  const watchedThoughts = Array.isArray(input.watchedThoughts)
    ? input.watchedThoughts
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean)
        .slice(0, 5)
    : [];
  if (watchedThoughts.length === 0) throw new Error('WATCHED_THOUGHTS_REQUIRED');

  const startedAt = new Date();
  const expectedCloseAt = new Date(startedAt.getTime() + WINDOW_HOURS * 60 * 60 * 1000);

  const { data, error } = await client
    .from(TABLE_WINDOWS)
    .insert({
      owner_id: ownerId,
      case_id: input.caseId || null,
      watched_thoughts: watchedThoughts,
      status: 'ACTIVE',
      started_at: startedAt.toISOString(),
      expected_close_at: expectedCloseAt.toISOString(),
    })
    .select('*')
    .single();

  if (error) throw new Error(`PARTICIPANT_WINDOW_CREATE_FAILED: ${error.message}`);
  return record(data);
}

export async function listParticipantWindows(ownerId: string) {
  const client = createServiceSupabaseClient();
  const { data, error } = await client
    .from(TABLE_WINDOWS)
    .select('*')
    .eq('owner_id', ownerId)
    .order('started_at', { ascending: false });
  if (error) throw new Error(`PARTICIPANT_WINDOWS_LIST_FAILED: ${error.message}`);
  return Array.isArray(data) ? data.map(record) : [];
}

export async function getParticipantWindowState(ownerId: string, windowId: string) {
  const client = createServiceSupabaseClient();
  const windowRow = await loadOwnedWindow(client, ownerId, windowId);

  const { data: marks, error } = await client
    .from(TABLE_MARKS)
    .select('*')
    .eq('window_id', windowId)
    .eq('owner_id', ownerId)
    .order('moment_at', { ascending: true });
  if (error) throw new Error(`PARTICIPANT_MARKS_READ_FAILED: ${error.message}`);

  const now = Date.now();
  const expectedCloseAt = typeof windowRow.expected_close_at === 'string'
    ? new Date(windowRow.expected_close_at).getTime()
    : Number.NaN;

  return {
    window: windowRow,
    marks: Array.isArray(marks) ? marks.map(record) : [],
    canClose: windowRow.status === 'ACTIVE' && Number.isFinite(expectedCloseAt) && now >= expectedCloseAt,
    hoursRemaining: Number.isFinite(expectedCloseAt)
      ? Math.max(0, (expectedCloseAt - now) / (60 * 60 * 1000))
      : null,
  };
}

export async function addParticipantMark(ownerId: string, windowId: string, input: AddParticipantMarkInput) {
  const client = createServiceSupabaseClient();
  const windowRow = await loadOwnedWindow(client, ownerId, windowId);
  if (windowRow.status !== 'ACTIVE') throw new Error('PARTICIPANT_WINDOW_NOT_ACTIVE');

  const dayNumber = [1, 2, 3].includes(input.dayNumber) ? input.dayNumber : null;
  if (!dayNumber) throw new Error('DAY_NUMBER_INVALID');

  const momentAt = input.observedAt ? new Date(input.observedAt) : new Date();
  if (Number.isNaN(momentAt.getTime())) throw new Error('OBSERVED_AT_INVALID');

  const { data, error } = await client
    .from(TABLE_MARKS)
    .insert({
      window_id: windowId,
      owner_id: ownerId,
      day_number: dayNumber,
      moment_at: momentAt.toISOString(),
      note: typeof input.note === 'string' ? input.note.trim().slice(0, 2000) || null : null,
    })
    .select('*')
    .single();
  if (error) throw new Error(`PARTICIPANT_MARK_CREATE_FAILED: ${error.message}`);

  const currentCount = typeof windowRow.mark_count === 'number' ? windowRow.mark_count : 0;
  const { error: updateError } = await client
    .from(TABLE_WINDOWS)
    .update({ mark_count: currentCount + 1, updated_at: new Date().toISOString() })
    .eq('id', windowId)
    .eq('owner_id', ownerId);
  if (updateError) throw new Error(`PARTICIPANT_WINDOW_COUNT_FAILED: ${updateError.message}`);

  return record(data);
}

export async function closeParticipantWindow(
  ownerId: string,
  windowId: string,
  input: CloseParticipantWindowInput,
) {
  const client = createServiceSupabaseClient();
  const windowRow = await loadOwnedWindow(client, ownerId, windowId);
  if (windowRow.status !== 'ACTIVE') throw new Error('PARTICIPANT_WINDOW_NOT_ACTIVE');

  const payload = {
    status: 'CLOSED' as const,
    closed_at: new Date().toISOString(),
    reflection_what_changed: requireText(input.whatChanged, 'WHAT_CHANGED'),
    reflection_what_noticed: requireText(input.whatNoticed, 'WHAT_NOTICED'),
    reflection_what_avoided: requireText(input.whatAvoided, 'WHAT_AVOIDED'),
    reflection_what_was_mine: requireText(input.whatWasMine, 'WHAT_WAS_MINE'),
    reflection_what_was_not_mine: requireText(input.whatWasNotMine, 'WHAT_WAS_NOT_MINE'),
    reflection_needed_today: requireText(input.neededToday, 'NEEDED_TODAY'),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await client
    .from(TABLE_WINDOWS)
    .update(payload)
    .eq('id', windowId)
    .eq('owner_id', ownerId)
    .select('*')
    .single();
  if (error) throw new Error(`PARTICIPANT_WINDOW_CLOSE_FAILED: ${error.message}`);
  return record(data);
}
