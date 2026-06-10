import { evaluateSfiRegime, type SfiMetrics } from '@/lib/sfi/math';

export function SfiMetricRail({ metrics }: { metrics: SfiMetrics }) {
  const regime = evaluateSfiRegime(metrics);
  return (
    <aside className="fixed bottom-5 right-5 z-50 min-w-[220px] border border-[#c8a95122] bg-[#060605]/90 p-3 font-mono text-[10px] tracking-[0.14em] text-[#c8a95199] backdrop-blur">
      <div className="mb-2 text-[8px] uppercase tracking-[0.24em] text-[#4a4a45]">SYSTEM STATE</div>
      <Metric label="PHI_SF" value={metrics.phi.toFixed(3)} />
      <Metric label="IHG" value={metrics.ihg.toFixed(2)} />
      <Metric label="NTI" value={metrics.nti.toFixed(2)} />
      <Metric label="LDI" value={metrics.ldi.toFixed(2)} />
      <Metric label="FS" value={metrics.fs.toFixed(2)} />
      <div className={regime === 'ENTROPICO' ? 'mt-2 text-[#b85050]' : regime === 'HOMEOSTATICO' ? 'mt-2 text-[#3a8a5a]' : 'mt-2 text-[#c8a951]'}>
        {regime}
      </div>
    </aside>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-[#c8a95110] py-1">
      <span className="text-[#4a4a45]">{label}</span>
      <span>{value}</span>
    </div>
  );
}
