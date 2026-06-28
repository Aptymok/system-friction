import type { WorldVectorCycleDay, WorldVectorSector } from './types';

const UTC_DAYS: Array<{
  dayOfWeek: string;
  sector: WorldVectorSector;
  sectorLabel: string;
}> = [
  { dayOfWeek: 'Sunday', sector: 'cycle_close', sectorLabel: 'cycle close' },
  { dayOfWeek: 'Monday', sector: 'institutional', sectorLabel: 'institutional' },
  { dayOfWeek: 'Tuesday', sector: 'technology_ai_data', sectorLabel: 'technology / AI / data' },
  { dayOfWeek: 'Wednesday', sector: 'architecture_city_space', sectorLabel: 'architecture / city / space' },
  { dayOfWeek: 'Thursday', sector: 'economy_market_capital', sectorLabel: 'economy / market / capital' },
  { dayOfWeek: 'Friday', sector: 'culture_signal_narrative', sectorLabel: 'culture / signal / narrative' },
  { dayOfWeek: 'Saturday', sector: 'social_behavioral', sectorLabel: 'social / behavioral' },
];

export function getCurrentWorldVectorCycleDay(input: Date = new Date()): WorldVectorCycleDay {
  const cycleDay = UTC_DAYS[input.getUTCDay()];

  return {
    ...cycleDay,
    isCycleClose: cycleDay.sector === 'cycle_close',
  };
}
