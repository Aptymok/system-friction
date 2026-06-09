import Link from 'next/link';
import type { ReactNode } from 'react';
import { LogoutLink } from '@/components/auth/LogoutLink';

const NAV = [
  ['/repository', 'Repositorio'],
  ['/scorefriction', 'Observatorio'],
  ['/scorefriction/wide', 'Wide'],
  ['/scorefriction/lab', 'Lab'],
  ['/scorefriction/wave', 'Wave'],
  ['/scorefriction/cases', 'Cases'],
  ['/scorefriction/evidence', 'Evidence'],
];

export function ScoreFrictionShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#070706] text-[#d8d0bd]">
      <header className="border-b border-[#26221b] bg-[#0c0b09]">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-[#b8924b]">ScoreFriction Cultural Wave</p>
            <h1 className="mt-2 font-serif text-3xl text-[#ead8aa]">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#918877]">{subtitle}</p>
          </div>
          <nav className="flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.14em]">
            {NAV.map(([href, label]) => (
              <Link key={href} href={href} className="border border-[#26221b] px-3 py-2 text-[#a89469] hover:border-[#b8924b] hover:text-[#ead8aa]">
                {label}
              </Link>
            ))}
            <LogoutLink />
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-5 py-6">{children}</div>
    </main>
  );
}

export function ScoreFrictionPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border border-[#26221b] bg-[#0c0b09] p-4">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#b8924b]">{title}</h2>
      <div className="mt-3 text-sm leading-6 text-[#b8ad98]">{children}</div>
    </section>
  );
}
