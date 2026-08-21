import { numericValue, readOperationalConsoleState, type SfiRecord } from './operationalConsole';

export type FrictionFieldState = {
  pressure: number | null;
  coherence: number | null;
  traceability: number | null;
  adaptation: number | null;
};

export type FrictionFieldResult = {
  topFriction: number | null;
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

export async function buildFrictionField(): Promise<FrictionFieldResult> {
  const live = await readOperationalConsoleState();
  const operationalCycle = live.operationalCycle?.data as SfiRecord | null;
  const stability = live.stability?.data as SfiRecord | null;
  const scoreFriction = live.scoreFriction?.data as SfiRecord | null;

  const values: FrictionFieldState = {
    pressure: extractNumber(operationalCycle, ['pressure', 'strain', 'friction_level']) ?? extractNumber(stability, ['pressure', 'strain']),
    coherence: extractNumber(operationalCycle, ['coherence']) ?? extractNumber(scoreFriction, ['coherence']),
    traceability: extractNumber(operationalCycle, ['traceability', 'traceability_score']) ?? extractNumber(scoreFriction, ['traceability']),
    adaptation: extractNumber(operationalCycle, ['adaptation']) ?? extractNumber(stability, ['adaptation']),
  };

  const nodes = [
    { id: 'pressure', label: 'Pressure', value: values.pressure },
    { id: 'coherence', label: 'Coherence', value: values.coherence },
    { id: 'traceability', label: 'Traceability', value: values.traceability },
    { id: 'adaptation', label: 'Adaptation', value: values.adaptation },
  ].filter((item): item is { id: string; label: string; value: number } => typeof item.value === 'number' && Number.isFinite(item.value));

  const explicitFriction = extractNumber(operationalCycle, ['friction_level', 'friction', 'top_friction'])
    ?? extractNumber(stability, ['friction_level', 'friction']);

  return {
    topFriction: explicitFriction,
    nodes,
    summary: explicitFriction !== null
      ? 'Fricción observada desde estado operativo persistido.'
      : 'No existe una métrica canónica de fricción persistida para este corte. No se deriva una sustituta mediante combinación heurística.',
  };
}
