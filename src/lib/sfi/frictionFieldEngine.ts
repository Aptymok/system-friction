import { numericValue, readOperationalConsoleState, type SfiRecord } from './operationalConsole';

export type FrictionFieldState = {
  pressure: number;
  coherence: number;
  traceability: number;
  adaptation: number;
};

export type FrictionFieldResult = {
  topFriction: number;
  nodes: Array<{ id: string; label: string; value: number }>;
  summary: string;
};

function extractNumber(record: SfiRecord | null | undefined, keys: string[]) {
  if (!record) return null;
  for (const key of keys) {
    const value = numericValue((record as Record<string, unknown>)[key], null);
    if (value !== null) return value;
  }
  return null;
}

export async function buildFrictionField(input?: Partial<FrictionFieldState>): Promise<FrictionFieldResult> {
  const live = await readOperationalConsoleState();
  const operationalCycle = live.operationalCycle?.data as SfiRecord | null;
  const stability = live.stability?.data as SfiRecord | null;
  const scoreFriction = live.scoreFriction?.data as SfiRecord | null;

  const pressure = input?.pressure ?? extractNumber(operationalCycle, ['pressure', 'strain', 'friction_level']) ?? extractNumber(stability, ['pressure', 'strain']) ?? 0;
  const coherence = input?.coherence ?? extractNumber(operationalCycle, ['coherence']) ?? extractNumber(scoreFriction, ['coherence']) ?? 0;
  const traceability = input?.traceability ?? extractNumber(operationalCycle, ['traceability', 'traceability_score']) ?? extractNumber(scoreFriction, ['traceability']) ?? 0;
  const adaptation = input?.adaptation ?? extractNumber(operationalCycle, ['adaptation']) ?? extractNumber(stability, ['adaptation']) ?? 0;

  const topFriction = Math.max(0, pressure - coherence + traceability * 0.2);
  const summary = live.ok
    ? 'El campo de fricción se calcula a partir del estado operativo y la trazabilidad del sistema.'
    : 'No hay datos operativos disponibles todavía; el campo de fricción se mostrará cuando exista una lectura real.';

  return {
    topFriction,
    nodes: [
      { id: 'pressure', label: 'Pressure', value: pressure },
      { id: 'coherence', label: 'Coherence', value: coherence },
      { id: 'traceability', label: 'Traceability', value: traceability },
      { id: 'adaptation', label: 'Adaptation', value: adaptation },
    ],
    summary,
  };
}
