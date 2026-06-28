import type { WorldVectorOperationalState } from '@/lib/world-vector/types';

export function WorldVectorAgentStatus({ state }: { state: WorldVectorOperationalState }) {
  return (
    <section className="border border-[#272219] bg-[#080806] p-4">
      <div className="text-[10px] uppercase tracking-[0.18em] text-[#8c816b]">Agent audit</div>
      <div className="mt-3 grid gap-2 text-xs text-[#f0e7d0] sm:grid-cols-2">
        <span>Memory: {state.agent_audit.memory_enabled ? 'enabled' : 'blocked'}</span>
        <span>Sensor: {state.agent_audit.pulse_available ? 'available' : 'missing'}</span>
        <span>Samples: {state.status.pulse.sample_count}</span>
        <span>Observation: {state.today.observation.status}</span>
      </div>
      {state.agent_audit.blocked.length > 0 ? (
        <div className="mt-3 text-xs leading-5 text-[#d08b63]">{state.agent_audit.blocked.join(' | ')}</div>
      ) : null}
      {state.agent_audit.warnings.length > 0 ? (
        <div className="mt-2 text-xs leading-5 text-[#c8a951]">{state.agent_audit.warnings.join(' | ')}</div>
      ) : null}
    </section>
  );
}
