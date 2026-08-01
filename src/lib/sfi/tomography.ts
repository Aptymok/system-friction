import { readOperationalConsoleState, type SfiRecord } from './operationalConsole';

export type InstitutionalTomography = {
  system: string;
  field: string;
  frictions: string[];
  sections: string[];
};

export async function buildInstitutionalTomography(input?: { system?: string; field?: string; frictions?: string[] }): Promise<InstitutionalTomography> {
  const state = await readOperationalConsoleState();
  const operationalCycle = state.operationalCycle?.data as SfiRecord | null;
  const evidenceMap = Array.isArray(state.evidenceMap?.data) ? state.evidenceMap.data : [];
  const recoveryQueue = Array.isArray(state.recoveryQueue?.data) ? state.recoveryQueue.data : [];
  const frictions = (input?.frictions ?? [
    ...evidenceMap.slice(0, 3).map((row) => String((row as Record<string, unknown>).summary ?? (row as Record<string, unknown>).title ?? '')),
    ...recoveryQueue.slice(0, 3).map((row) => String((row as Record<string, unknown>).reason ?? (row as Record<string, unknown>).status ?? '')),
  ].filter(Boolean)) as string[];

  return {
    system: input?.system ?? String((operationalCycle as Record<string, unknown> | null)?.system ?? 'SFI'),
    field: input?.field ?? String((operationalCycle as Record<string, unknown> | null)?.field ?? 'Observatorio institucional'),
    frictions,
    sections: ['Sistema', 'Campo', 'Variables', 'Actores', 'Fricciones', 'Intervenciones'],
  };
}
