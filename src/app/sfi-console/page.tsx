import Link from 'next/link';
import SfiConsoleClient from '@/components/sfi-console/SfiConsoleClient';

export const dynamic = 'force-dynamic';

export default function SfiConsolePage() {
  return (
    <>
      <section className="border-b border-[#2a2418] bg-[#070604] px-5 py-3 text-[#cfc3aa]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#c8a951]">Internal operational surface</p>
            <p className="mt-1 text-sm text-[#9c927f]">SFI-01 founder operations are canonical in Founder Console. This route remains a transitional data-provider surface.</p>
          </div>
          <Link href="/founder-console" className="border border-[#c8a951]/50 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#c8a951]">Open Founder Console</Link>
        </div>
      </section>
      <SfiConsoleClient />
    </>
  );
}