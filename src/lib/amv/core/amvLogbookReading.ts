export type AmvLogbookReading = {
  scope: string;

  trust:
    | 'unknown'
    | 'simulated'
    | 'declared'
    | 'inferred'
    | 'audit'
    | 'verified'
    | 'sandbox';

  summary: string;

  operator: string | null;

  observedAt: string | null;

  payload: unknown | null;

  closesLoop: boolean;

  changesRoute: boolean;
};