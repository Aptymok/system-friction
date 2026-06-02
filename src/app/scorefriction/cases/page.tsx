import { SCORE_FRICTION_CASES } from '@/lib/scorefriction/cases';
import { ScoreFrictionShell } from '@/scorefriction/components/ScoreFrictionShell';

export default function ScoreFrictionCasesPage() {
  return (
    <ScoreFrictionShell
      title="Case Studies"
      subtitle="Programa inicial de investigacion. ScoreFriction no observa a ciegas: cada entrada debe tensionar una hipotesis."
    >
      <div className="grid gap-3">
        {SCORE_FRICTION_CASES.map((item) => (
          <article key={item.case_id} className="border border-[#26221b] bg-[#0c0b09] p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="border border-[#b8924b] px-2 py-1 font-mono text-[10px] text-[#ead8aa]">{item.case_id}</span>
              <h2 className="font-serif text-xl text-[#d8d0bd]">{item.name}</h2>
            </div>
            <div className="mt-3 grid gap-3 text-sm leading-6 text-[#b8ad98] md:grid-cols-2">
              <p><span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#766d5d]">Fenomeno</span><br />{item.phenomenon}</p>
              <p><span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#766d5d]">Friccion</span><br />{item.friction}</p>
              <p><span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#766d5d]">Hipotesis</span><br />{item.hypothesis}</p>
              <p><span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#766d5d]">Verificacion</span><br />{item.verificationMetric}</p>
            </div>
          </article>
        ))}
      </div>
    </ScoreFrictionShell>
  );
}
