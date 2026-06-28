import type { WorldVectorReport } from '@/lib/world-vector/types';

export function WorldVectorReportCard({ label, report }: { label: string; report: WorldVectorReport }) {
  return (
    <section className="border border-[#272219] bg-[#080806] p-4">
      <div className="text-[10px] uppercase tracking-[0.18em] text-[#8c816b]">{label}</div>
      <div className="mt-2 text-sm uppercase tracking-[0.12em] text-[#f0e7d0]">{report.title}</div>
      <p className="mt-3 line-clamp-6 whitespace-pre-line text-xs leading-5 text-[#9c927f]">{report.body}</p>
    </section>
  );
}
