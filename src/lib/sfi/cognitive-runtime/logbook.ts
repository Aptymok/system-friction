import 'server-only';

import { randomUUID } from 'crypto';

export const DEFAULT_LOGBOOK_ID = 'default';

export function defaultLogbookId(): string {
  return DEFAULT_LOGBOOK_ID;
}

export function createLogbookId(): string {
  return randomUUID();
}

export function isDefaultLogbook(logbookId: string): boolean {
  return logbookId === DEFAULT_LOGBOOK_ID;
}