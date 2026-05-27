import { appendEpistemicEvent } from '@/lib/events/eventStore';
import { readCanonicalGraphState } from '@/lib/graph/canonicalGraph';
import { getLatestWorldSpectSnapshot, snapshotRowToApiData } from '@/lib/worldspect/snapshotStore';
import { cycle } from '../../../packages/sfi-kernel/src';
import { persistKernelCycle } from './kernelCycleStore';

export async function runKernelCycle() {
  const latestWorldSpect = await getLatestWorldSpectSnapshot();

  if (!latestWorldSpect) {
    return { ok: false as const, error: 'worldspect_snapshot_missing' };
  }

  const result = await cycle({
    readWorldSpect: async () => snapshotRowToApiData(latestWorldSpect),
    readGraph: async () => readCanonicalGraphState('sfi'),
    appendEvent: async (event) => {
      const appended = await appendEpistemicEvent({
        ...event,
        source: {
          sourceId: 'sfi-kernel',
          sourceType: 'runtime',
        },
      });

      if (!appended.ok) {
        throw new Error(appended.error);
      }

      return typeof appended.data.id === 'string' ? { id: appended.data.id } : null;
    },
    persistCycle: async (record) => {
      const persisted = await persistKernelCycle(record);

      if (!persisted.ok) {
        throw new Error(`${persisted.error}: ${persisted.details}`);
      }

      return persisted.data;
    },
  });

  return { ok: true as const, data: result };
}
