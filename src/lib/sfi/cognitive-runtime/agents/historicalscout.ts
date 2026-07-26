import 'server-only';

import { appendEpistemicEvent } from '@/lib/events/eventStore';
import { randomUUID } from 'crypto';

export const historicalScoutAgent = {
  id: 'historical_scout',
  name: 'Historical Scout',
  layer: 'reconstruct',
  domain: 'historical_reconstruction',
  authorityLevel: 'observer',
};

export type HistoricalScoutInput = {
  phenomenon: string;
  scope?: string;
  from?: string;
  to?: string;
  sources?: string[];
  logbookId: string;
};

export type HistoricalRecord = {
  period: string;
  source: string;
  observation: string;
  confidence: number;
};

export async function runHistoricalScout(
  input: HistoricalScoutInput
) {
  const records: HistoricalRecord[] = [];

  const event = await appendEpistemicEvent({
    eventId: randomUUID(),

    eventName: 'historical.reconstruction.completed',

    epistemicClass: 'derived',

    confidence:
      records.length > 0
        ? 0.65
        : 0.25,

    occurredAt: new Date().toISOString(),

    source: {
      sourceId: 'historical_scout',
      sourceType: 'cognitive_agent',
    },

    payload: {
      phenomenon: input.phenomenon,
      scope: input.scope ?? null,
      interval: {
        from: input.from ?? null,
        to: input.to ?? null,
      },
      records,
      status:
        records.length > 0
          ? 'reconstructed'
          : 'missing_evidence',
    },

    lineage: [
      'historical_scout',
      input.phenomenon,
    ],

    logbookId: input.logbookId,
  });

  return {
    ok: event.ok,
    agent: historicalScoutAgent,
    records,
    event,
  };
}