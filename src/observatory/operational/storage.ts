import type { OperationalReading } from './analysis';

type ObjectiveRecord = {
  id: string;
  title: string;
  description: string;
  ihg: number;
  nti: number;
  ldi: number;
  dueAt: string | null;
  createdAt: string;
};

type LogRecord = {
  id: string;
  kind: string;
  payload: unknown;
  createdAt: string;
};

type CalendarRecord = {
  id: string;
  sourceId: string;
  status: 'suggested' | 'accepted' | 'cancelled' | 'edited';
  scheduledFor: string;
  prompt: string;
  material: string;
  createdAt: string;
};

type OperationalMemory = {
  objectives: ObjectiveRecord[];
  logs: LogRecord[];
  calendars: CalendarRecord[];
};

const globalMemory = globalThis as typeof globalThis & { __sfiOperationalMemory?: OperationalMemory };

function memory(): OperationalMemory {
  globalMemory.__sfiOperationalMemory ||= { objectives: [], logs: [], calendars: [] };
  return globalMemory.__sfiOperationalMemory;
}

function id(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function saveObjective(input: {
  title: string;
  description: string;
  dueAt?: string | null;
  reading: Pick<OperationalReading, 'ihg' | 'nti' | 'ldi'>;
}) {
  const record: ObjectiveRecord = {
    id: id('obj'),
    title: input.title,
    description: input.description,
    ihg: input.reading.ihg,
    nti: input.reading.nti,
    ldi: input.reading.ldi,
    dueAt: input.dueAt ?? null,
    createdAt: new Date().toISOString(),
  };
  memory().objectives.unshift(record);
  return record;
}

export function logOperationalEvent(kind: string, payload: unknown) {
  const record: LogRecord = {
    id: id('log'),
    kind,
    payload,
    createdAt: new Date().toISOString(),
  };
  memory().logs.unshift(record);
  return record;
}

export function createCalendarSuggestion(input: {
  sourceId: string;
  reading: Pick<OperationalReading, 'ihg' | 'nti' | 'ldi' | 'narrative'>;
  title?: string;
}) {
  const delayHours = input.reading.ldi > 0.55 ? 6 : input.reading.nti > 0.5 ? 12 : 24;
  const scheduled = new Date(Date.now() + delayHours * 60 * 60 * 1000);
  const prompt = `Convertir lectura SFI en publicación breve: IHG ${input.reading.ihg}, NTI ${input.reading.nti}, LDI ${input.reading.ldi}.`;
  const material = `${input.title ?? 'Lectura operacional'}\n${input.reading.narrative}`;
  const record: CalendarRecord = {
    id: id('cal'),
    sourceId: input.sourceId,
    status: 'suggested',
    scheduledFor: scheduled.toISOString(),
    prompt,
    material,
    createdAt: new Date().toISOString(),
  };
  memory().calendars.unshift(record);
  return record;
}

export function updateCalendar(id: string, input: Partial<Pick<CalendarRecord, 'status' | 'scheduledFor' | 'prompt' | 'material'>>) {
  const item = memory().calendars.find((record) => record.id === id);
  if (!item) return null;
  Object.assign(item, input);
  return item;
}

export function getOperationalMemory() {
  return memory();
}
