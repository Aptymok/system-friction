import Link from 'next/link';
import { listOperationalCases } from '@/lib/sfi/case-platform/repository';
import { getSfiServiceProfile } from '@/core/case-platform';
import { requireAuthenticatedUser } from '@/lib/system/access/server';

export const dynamic = 'force-dynamic';

export default async function SfiCasesPage() {
  const { user } = await requireAuthenticatedUser();
  const cases = await listOperationalCases(user.id);
  return (
    <main className="min-h-screen bg-[#020608] px-5 py-6 font-mono text-[#dbe8ec]">
      <header className="mx-auto flex max-w-[1500px] items-end justify-between border-b border-cyan-200/10 pb-5">
        <div><p className="text-[10px] tracking-[0.28em] text-cyan-200/45">SYSTEM FRICTION INSTITUTE</p><h1 className="mt-2 text-2xl tracking-[0.16em]">CASES</h1></div>
        <div className="text-right text-[10px] tracking-[0.14em] text-cyan-100/45"><p>{user.email ?? user.id}</p><p>{cases.length} ACTIVE / HISTORICAL CASE RECORDS</p></div>
      </header>
      <section className="mx-auto mt-6 grid max-w-[1500px] grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {cases.map((item) => {
          const profile = getSfiServiceProfile(item.serviceProfileId);
          return (
            <Link key={item.id} href={`/cases/${encodeURIComponent(item.id)}`} className="group relative min-h-44 overflow-hidden border border-cyan-200/10 bg-[radial-gradient(circle_at_80%_0%,rgba(100,74,190,.14),transparent_37%),rgba(4,13,18,.8)] p-5 transition hover:border-cyan-200/30 hover:bg-cyan-200/[0.035]">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fuchsia-300/35 to-transparent opacity-0 transition group-hover:opacity-100" />
              <div className="flex items-start justify-between gap-4"><span className="text-[9px] tracking-[0.15em] text-cyan-200/55">{profile?.label ?? item.serviceProfileId}</span><span className="text-[9px] text-emerald-200/60">{item.status}</span></div>
              <h2 className="mt-6 text-lg tracking-[0.08em] text-[#dce7e9]">{item.subject}</h2>
              <p className="mt-2 line-clamp-2 text-[10px] leading-5 text-cyan-100/45">{item.scope}</p>
              <div className="mt-5 flex justify-between border-t border-cyan-100/10 pt-3 text-[9px] text-cyan-100/35"><span>{item.temporalWindow.mode}</span><span>{item.updatedAt}</span></div>
            </Link>
          );
        })}
        {!cases.length ? <div className="border border-cyan-200/10 p-8 text-[11px] tracking-[.12em] text-cyan-100/45">NO CASES AVAILABLE FOR THIS IDENTITY</div> : null}
      </section>
    </main>
  );
}
