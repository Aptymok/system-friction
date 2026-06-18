import fs from 'node:fs/promises';
import path from 'node:path';
import { appendLogbookEntry } from '@/lib/logbook/query';

const LEARNING_FILE = path.join(process.cwd(), 'data', 'amv-learning.jsonl');

export type AmvLearningEvent = {
  id: string;
  case_id?: string | null;
  source: string;
  event_type: string;
  summary: string;
  payload: unknown;
  created_at: string;
};

function makeThought(summary: string) {
  const text = summary.trim();
  if (!text) return 'Necesito evidencia puntual para confirmar.';
  if (/degrad/i.test(text)) return `Veo degradacion: ${text}`;
  if (/regime|regimen|r.gimen/i.test(text)) return `Veo cambio de regimen: ${text}`;
  if (/fallback|error|missing|falta/i.test(text)) return `El sistema detecto que falta una pieza: ${text}`;
  return `Veo que ${text}`;
}

export async function appendAmvLearning(input: Omit<AmvLearningEvent, 'id' | 'created_at'>) {
  const event: AmvLearningEvent = {
    ...input,
    id: `amv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    created_at: new Date().toISOString(),
  };
  await fs.mkdir(path.dirname(LEARNING_FILE), { recursive: true });
  await fs.appendFile(LEARNING_FILE, `${JSON.stringify(event)}\n`, 'utf8');
  await appendLogbookEntry({
    scope: 'amv',
    visibility: 'root',
    case_id: event.case_id,
    event_type: event.event_type,
    title: 'AMV learning',
    summary: makeThought(event.summary),
    payload: event,
  });
  return event;
}

export async function readAmvThoughts(caseId?: string | null) {
  try {
    const raw = await fs.readFile(LEARNING_FILE, 'utf8');
    const events = raw
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line) as AmvLearningEvent)
      .filter((event) => !caseId || event.case_id === caseId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 25);
    return events.map((event) => ({
      id: event.id,
      thought: makeThought(event.summary),
      case_id: event.case_id ?? null,
      source: event.source,
      created_at: event.created_at,
      payload: event.payload,
    }));
  } catch {
    return [];
  }
}

