import { getWorldVectorStatus, getWorldVectorToday } from '@/lib/world-vector/readModel';

function formatMetric(value: number | null | undefined) {
  return typeof value === 'number' ? value.toFixed(2) : 'n/a';
}

export default async function WorldVectorPage() {
  const [status, today] = await Promise.all([
    getWorldVectorStatus(),
    getWorldVectorToday(),
  ]);

  const observation = today.observation;
  const dominant = observation.domain_values[0];

  return (
    <main className="min-h-screen bg-[#060605] px-6 py-10 text-[#d8d2c2]">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="border border-[#2f2a1e] bg-[#0b0b09] p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#c8a951]">System Friction Institute</p>
          <h1 className="mt-4 text-4xl font-semibold text-[#f5eedc]">World Vector Observatory</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#9f9788]">
            Lectura diaria derivada de WorldSpect. Esta superficie muestra pulso, memoria, vector dominante e interpretacion operativa.
          </p>
        </header>

        <section className="grid gap-3 md:grid-cols-5">
          <div className="border border-[#2f2a1e] bg-[#0b0b09] p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8f8878]">Pulse</div>
            <div className="mt-2 text-lg text-[#f5eedc]">{status.pulse.latest_snapshot_available ? 'ACTIVE' : 'MISSING'}</div>
          </div>
          <div className="border border-[#2f2a1e] bg-[#0b0b09] p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8f8878]">Last Snapshot</div>
            <div className="mt-2 text-sm text-[#f5eedc]">{status.pulse.latest_observed_at ?? 'none'}</div>
          </div>
          <div className="border border-[#2f2a1e] bg-[#0b0b09] p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8f8878]">Dominant</div>
            <div className="mt-2 text-lg text-[#f5eedc]">{dominant?.domain ?? 'unresolved'}</div>
          </div>
          <div className="border border-[#2f2a1e] bg-[#0b0b09] p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8f8878]">Confidence</div>
            <div className="mt-2 text-lg text-[#f5eedc]">{formatMetric(observation.confidence)}</div>
          </div>
          <div className="border border-[#2f2a1e] bg-[#0b0b09] p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8f8878]">Memory</div>
            <div className="mt-2 text-lg text-[#f5eedc]">{status.memory.enabled ? 'READY' : 'BLOCKED'}</div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="border border-[#2f2a1e] bg-[#0b0b09] p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">Domain Vector</div>
            <div className="mt-5 space-y-3">
              {observation.domain_values.map((item) => (
                <div key={item.domain} className="grid gap-2 md:grid-cols-[220px_1fr_70px] md:items-center">
                  <div className="font-mono text-xs text-[#d8d2c2]">{item.domain}</div>
                  <div className="h-2 bg-[#1e1c17]">
                    <div
                      className="h-2 bg-[#c8a951]"
                      style={{ width: `${Math.max(0, Math.min(1, item.value ?? 0)) * 100}%` }}
                    />
                  </div>
                  <div className="font-mono text-xs text-[#8f8878]">{formatMetric(item.value)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-[#2f2a1e] bg-[#0b0b09] p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">Agent Interpretation</div>
            <p className="mt-5 text-sm leading-7 text-[#d8d2c2]">{observation.interpretation}</p>
            <div className="mt-5 border-t border-[#2f2a1e] pt-4 font-mono text-[11px] uppercase tracking-[0.12em] text-[#8f8878]">
              status={observation.status} · sector={observation.sector} · signal={observation.dominant_signal ?? 'none'}
            </div>
          </div>
        </section>

        <section className="border border-[#2f2a1e] bg-[#0b0b09] p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">Lineage</div>
          <div className="mt-5 grid gap-3 font-mono text-xs text-[#d8d2c2] md:grid-cols-2">
            <div>snapshot_id: {observation.source_snapshot_id ?? 'none'}</div>
            <div>observed_at: {observation.observed_at ?? 'none'}</div>
            <div>cycle_start: {today.cycle_range.cycle_start_date}</div>
            <div>cycle_end: {today.cycle_range.cycle_end_date}</div>
            <div>memory: {status.memory.reason}</div>
            <div>warnings: {status.warnings.length ? status.warnings.join(', ') : 'none'}</div>
          </div>
        </section>
      </div>
    </main>
  );
}
