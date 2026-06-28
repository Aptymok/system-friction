import type { WorldVectorOperationalState } from '@/lib/world-vector/types';
import { WorldVectorAgentStatus } from './WorldVectorAgentStatus';
import { WorldVectorCycleCard } from './WorldVectorCycleCard';
import { WorldVectorReportCard } from './WorldVectorReportCard';

export default function WorldVectorPanel({ state }: { state: WorldVectorOperationalState }) {
  return (
    <section className="border-b border-[#272219] bg-[#050504] px-4 py-5 text-[#f0e7d0] sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[#8c816b]">World Vector</div>
            <h2 className="mt-1 text-xl font-semibold">Operational memory</h2>
          </div>
          <div className="text-xs uppercase tracking-[0.14em] text-[#c8a951]">
            Sensor {state.status.pulse.latest_snapshot_available ? 'active' : 'missing'} · Memory {state.status.memory.enabled ? 'enabled' : state.status.memory.reason}
          </div>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-4">
          <WorldVectorCycleCard state={state} />
          <section className="border border-[#272219] bg-[#080806] p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[#8c816b]">Today observation</div>
            <div className="mt-2 text-sm uppercase tracking-[0.12em] text-[#f0e7d0]">{state.today.observation.dominant_signal ?? 'not_available'}</div>
            <p className="mt-3 text-xs leading-5 text-[#9c927f]">{state.today.observation.interpretation}</p>
          </section>
          <WorldVectorReportCard label="Internal report" report={state.reports.internal} />
          <WorldVectorAgentStatus state={state} />
        </div>
        <div className="mt-3">
          <WorldVectorReportCard label="Public draft" report={state.reports.public} />
        </div>
      </div>
    </section>
  );
}
