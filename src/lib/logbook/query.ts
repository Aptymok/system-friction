import fs from 'node:fs/promises';
import path from 'node:path';
import { canViewLogbookEntry, type LogbookEntry, type LogbookScope, type LogbookViewer } from './permissions';

const LOGBOOK_FILE = path.join(process.cwd(), 'data', 'logbook-visible.jsonl');

function id(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function appendLogbookEntry(input: Omit<LogbookEntry, 'id' | 'created_at'> & { id?: string; created_at?: string }) {
  const entry: LogbookEntry = {
    ...input,
    id: input.id ?? id('log'),
    created_at: input.created_at ?? new Date().toISOString(),
  };
  await fs.mkdir(path.dirname(LOGBOOK_FILE), { recursive: true });
  await fs.appendFile(LOGBOOK_FILE, `${JSON.stringify(entry)}\n`, 'utf8');
  return entry;
}

async function readAllLogbookEntries() {
  try {
    const raw = await fs.readFile(LOGBOOK_FILE, 'utf8');
    return raw
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line) as LogbookEntry)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  } catch {
    return [] as LogbookEntry[];
  }
}

export async function readVisibleLogbookEntries(viewer: LogbookViewer, filters: { scope?: LogbookScope | 'all'; case_id?: string | null } = {}) {
  const entries = await readAllLogbookEntries();
  return entries
    .filter((entry) => canViewLogbookEntry(entry, viewer))
    .filter((entry) => !filters.scope || filters.scope === 'all' || entry.scope === filters.scope)
    .filter((entry) => !filters.case_id || entry.case_id === filters.case_id)
    .slice(0, 200);
}

