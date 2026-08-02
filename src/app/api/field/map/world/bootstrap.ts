import 'server-only';

import { runWorldObservationCycle, runWorldCalibrationCycle } from '@/lib/world-observatory/worldCycle';
import { runWorldHypothesisCycle } from '@/lib/world-observatory/hypothesisCycle';

let inFlight: Promise<{
  observation: Awaited<ReturnType<typeof runWorldObservationCycle>>;
  hypotheses: Awaited<ReturnType<typeof runWorldHypothesisCycle>>;
  calibration: Awaited<ReturnType<typeof runWorldCalibrationCycle>>;
}> | null = null;

export function bootstrapWorldObservatory() {
  if (!inFlight) {
    inFlight = (async () => {
      const observation = await runWorldObservationCycle();
      const hypotheses = await runWorldHypothesisCycle();
      const calibration = await runWorldCalibrationCycle();
      return { observation, hypotheses, calibration };
    })().finally(() => {
      inFlight = null;
    });
  }

  return inFlight;
}
