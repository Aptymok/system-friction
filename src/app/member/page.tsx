import type { Metadata } from 'next';
import Link from 'next/link';
import { requireSfiMemberPage } from '@/lib/system/access/server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Espacio de miembro · System Friction Institute',
  description: 'Espacio institucional para miembros de SFI.',
  robots: { index: false, follow: false, nocache: true },
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export default async function MemberPage() {
  const { user, profile, member, workspace } = await requireSfiMemberPage('/member');
  const displayName = member?.displayName ?? profile.alias ?? user.email ?? 'Miembro SFI';
  const access = record(profile.module_access);
  const canObserveRoot = profile.role === 'observer' || access.root === true || access.root_observe === true;
  const warnings = workspace.warnings ?? [];

  const destinations = [
    ...(canObserveRoot ? [{ href: '/root', code: 'ROOT · OBSERVER', title: 'Estado institucional', detail: 'Evidencia, runtime, reportes y trayectoria sin autoridad soberana.', tone: 'cyan' }] : []),
    { href: '/field', code: 'FIELD', title: 'Trayectoria y retorno', detail: 'Observación longitudinal, evidencia e intervención reversible.', tone: 'gold' },
    { href: '/studio', code: 'STUDIO', title: 'Análisis de objeto', detail: 'Objeto → evidencia → modelo → proyección → retorno gobernado.', tone: 'violet' },
    { href: '/cases', code: 'CASE PLATFORM', title: 'Casos / Assurance', detail: 'Expedientes tenant-scoped, análisis, reportes y acciones gobernadas.', tone: 'cyan' },
    { href: '/field/map', code: 'WORLD FIELD', title: 'Campo mundial', detail: 'Señales localizadas sin convertir proximidad en causalidad.', tone: 'gold' },
    { href: '/observatory', code: 'PUBLIC OBSERVATORY', title: 'Lectura pública', detail: 'Estado agregado publicado, evidencia permitida y provenance.', tone: 'violet' },
  ] as const;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020405] p-4 text-[#d8e2e1] sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(43,204,216,.12),transparent_26%),radial-gradient(circle_at_88%_18%,rgba(121,77,157,.12),transparent_24%),linear-gradient(rgba(61,155,165,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(61,155,165,.025)_1px,transparent_1px)] bg-[size:auto,auto,44px_44px,44px_44px]" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1540px] border border-[#16313a] bg-[#030809e8] shadow-[0_30px_120px_rgba(0,0,0,.72)]">
        <header className="grid gap-px border-b border-[#17313a] bg-[#17313a] xl:grid-cols-[1.7fr_1fr]">
          <div className="bg-[#030809] p-5 sm:p-7">
            <span className="font-mono text-[8px] uppercase tracking-[0.25em] text-[#67dce5]">SYSTEM FRICTION INSTITUTE · MEMBER SPACE</span>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-[#eff5f2] sm:text-4xl">{displayName}</h1>
            <p className="mt-3 max-w-3xl text-xs leading-6 text-[#809598]">Private navigation over the member's real workspace counts and access profile. This page does not reinterpret missing state and does not confer execution authority.</p>
          </div>
          <div className="grid grid-cols-2 gap-px bg-[#17313a] sm:grid-cols-4 xl:grid-cols-2">
            {[
              ['ROLE', String(profile.role)],
              ['MEMBERSHIP', 'ACTIVE'],
              ['ROOT', canObserveRoot ? 'OBSERVE' : 'RESTRICTED'],
              ['WARNINGS', String(warnings.length)],
            ].map(([label, value]) => <div key={label} className="bg-[#040a0c] p-4"><span className="block font-mono text-[7px] tracking-[0.16em] text-[#55747a]">{label}</span><strong className="mt-2 block font-mono text-[9px] font-medium text-[#bad8d6]">{value}</strong></div>)}
          </div>
        </header>

        <section className="grid gap-px border-b border-[#17313a] bg-[#17313a] md:grid-cols-3">
          {[
            ['FIELD CASES', workspace.caseCount, 'Persisted member-owned longitudinal cases.'],
            ['STUDIO OBJECTS', workspace.objectCount, 'Persisted member-owned analytical objects.'],
            ['PENDING RETURNS', workspace.pendingReturnCount, 'Open return points requiring later observation.'],
          ].map(([label, count, detail]) => <article key={String(label)} className="bg-[#030809] p-5"><span className="font-mono text-[7px] uppercase tracking-[0.18em] text-[#5b7c82]">{label}</span><strong className="mt-2 block font-mono text-3xl font-light text-[#78e3e9]">{count}</strong><p className="mt-2 text-[10px] leading-5 text-[#72878a]">{detail}</p></article>)}
        </section>

        {warnings.length ? <section className="border-b border-[#17313a] bg-[#0b0807] px-5 py-3 font-mono text-[8px] leading-5 text-[#b98b77]">{warnings.map((warning) => <div key={warning}>DEGRADED READ · {warning}</div>)}</section> : null}

        <section className="grid gap-px bg-[#17313a] md:grid-cols-2 xl:grid-cols-3">
          {destinations.map((item) => (
            <Link key={item.href} href={item.href} className="group min-h-[190px] bg-[#030809] p-5 no-underline transition-colors hover:bg-[#061116]">
              <div className="flex items-center justify-between"><span className={`font-mono text-[7px] uppercase tracking-[0.19em] ${item.tone === 'gold' ? 'text-[#c0a66b]' : item.tone === 'violet' ? 'text-[#a88ac3]' : 'text-[#63dbe5]'}`}>{item.code}</span><span className="font-mono text-[7px] text-[#35535a]">OPEN →</span></div>
              <h2 className="mt-5 text-xl font-medium text-[#e2ece9]">{item.title}</h2>
              <p className="mt-3 text-[11px] leading-6 text-[#7c9294]">{item.detail}</p>
            </Link>
          ))}
        </section>

        <footer className="flex flex-wrap justify-between gap-3 border-t border-[#17313a] bg-[#020607] px-5 py-3 font-mono text-[7px] uppercase tracking-[0.13em] text-[#58777c]">
          <span>{user.email} · MEMBER WORKSPACE</span>
          <span className="text-[#8f79a0]">VISIBILITY ≠ AUTHORITY · NAVIGATION ≠ CANONICAL WRITE</span>
        </footer>
      </div>
    </main>
  );
}
