import type { WorldVectorOperationalState } from '@/lib/world-vector/types';

export function WorldVectorCycleCard({ state }: { state: WorldVectorOperationalState }) {
  return (
    <section className="border border-[#272219] bg-[#080806] p-4">
      <div className="text-[10px] uppercase tracking-[0.18em] text-[#8c816b]">Current cycle</div>
      <div className="mt-2 text-lg text-[#f0e7d0]">{state.today.cycle_day.sectorLabel}</div>
      <div className="mt-2 text-xs leading-5 text-[#9c927f]">
        {state.today.cycle_range.cycle_start_date} to {state.today.cycle_range.cycle_end_date}
      </div>
      <div className="mt-3 grid gap-2 text-xs text-[#c8a951] sm:grid-cols-2">
        <span>Day: {state.today.cycle_day.dayOfWeek}</span>
        <span>Close: {state.close_cycle.ready ? 'ready' : state.close_cycle.reason}</span>
      </div>
    </section>
  );
}
