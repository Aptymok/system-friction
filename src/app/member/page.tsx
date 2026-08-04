import type { Metadata } from 'next';
import Link from 'next/link';
import { requireSfiMemberPage } from '@/lib/system/access/server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Espacio de miembro · System Friction Institute',
  description: 'Espacio institucional para miembros de SFI.',
  robots: { index: false, follow: false, nocache: true },
};

export default async function MemberPage() {
  const { user, profile, member, supabase } = await requireSfiMemberPage('/member');

  const [cases, objects, returns] = await Promise.all([
    supabase.from('field_cases').select('id', { count: 'exact', head: true }).eq('owner_id', user.id).is('deleted_at', null),
    supabase.from('studio_objects').select('id', { count: 'exact', head: true }).eq('owner_id', user.id),
    supabase.from('field_returns').select('id', { count: 'exact', head: true }).eq('owner_id', user.id).is('returned_at', null),
  ]);

  const displayName = member?.displayName ?? profile.alias ?? user.email ?? 'Miembro SFI';

  return (
    <main className="min-h-screen bg-[#050504] px-5 py-8 text-[#d8d1c0] md:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="border border-[#332c20] bg-[#090908] p-6 md:p-9">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#c8a951]">SYSTEM FRICTION INSTITUTE · MIEMBRO</p>
          <h1 className="mt-4 font-serif text-4xl text-[#f2e8d2]">Bienvenido, {displayName}.</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#999080]">
            Este es tu espacio institucional dentro de SFI. Aquí puedes construir una trayectoria en FIELD,
            trabajar objetos en STUDIO y consultar el campo mundial y el observatorio público. ROOT permanece
            reservado para la gobernanza del instituto.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 font-mono text-[9px] uppercase tracking-[0.13em]">
            <span className="border border-[#332c20] px-3 py-2 text-[#a69a83]">{user.email}</span>
            <span className="border border-[#5b4b28] px-3 py-2 text-[#c8a951]">Rol: {String(profile.role)}</span>
            <span className="border border-[#332c20] px-3 py-2 text-[#a69a83]">Membresía SFI activa</span>
          </div>
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <article className="border border-[#332c20] bg-[#090908] p-5">
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#98896b]">Trayectorias propias</span>
            <strong className="mt-3 block text-3xl font-normal text-[#e4c377]">{cases.count ?? 0}</strong>
            <p className="mt-3 text-xs leading-6 text-[#8e8575]">Procesos longitudinales que has abierto en FIELD.</p>
          </article>
          <article className="border border-[#332c20] bg-[#090908] p-5">
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#98896b]">Objetos propios</span>
            <strong className="mt-3 block text-3xl font-normal text-[#e4c377]">{objects.count ?? 0}</strong>
            <p className="mt-3 text-xs leading-6 text-[#8e8575]">Objetos que has trasladado o cargado en STUDIO.</p>
          </article>
          <article className="border border-[#332c20] bg-[#090908] p-5">
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#98896b]">Retornos pendientes</span>
            <strong className="mt-3 block text-3xl font-normal text-[#e4c377]">{returns.count ?? 0}</strong>
            <p className="mt-3 text-xs leading-6 text-[#8e8575]">Puntos de revisión que todavía necesitan observación posterior.</p>
          </article>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <Link href="/interface" className="group border border-[#5b4b28] bg-[#0b0a08] p-6 no-underline hover:border-[#c8a951]">
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#c8a951]">FIELD</span>
            <h2 className="mt-3 text-2xl text-[#f0e4c9]">Observar y construir una trayectoria</h2>
            <p className="mt-3 text-sm leading-7 text-[#908777]">Conserva apariciones, organiza evidencia y prueba microejecuciones reversibles sin concluir demasiado pronto.</p>
          </Link>
          <Link href="/studio" className="group border border-[#5b4b28] bg-[#0b0a08] p-6 no-underline hover:border-[#c8a951]">
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#c8a951]">STUDIO</span>
            <h2 className="mt-3 text-2xl text-[#f0e4c9]">Analizar o transformar un objeto</h2>
            <p className="mt-3 text-sm leading-7 text-[#908777]">Trabaja sobre objetos propios y prepara resultados que puedan volver a FIELD como evidencia o retorno.</p>
          </Link>
          <Link href="/field/map" className="group border border-[#332c20] bg-[#090908] p-6 no-underline hover:border-[#c8a951]">
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#c8a951]">CAMPO MUNDIAL</span>
            <h2 className="mt-3 text-2xl text-[#f0e4c9]">Explorar señales localizadas</h2>
            <p className="mt-3 text-sm leading-7 text-[#908777]">Observa eventos y tensiones geográficas sin asumir causalidad por su ubicación.</p>
          </Link>
          <Link href="/observatory" className="group border border-[#332c20] bg-[#090908] p-6 no-underline hover:border-[#c8a951]">
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#c8a951]">OBSERVATORIO PÚBLICO</span>
            <h2 className="mt-3 text-2xl text-[#f0e4c9]">Consultar la lectura agregada</h2>
            <p className="mt-3 text-sm leading-7 text-[#908777]">Revisa el estado longitudinal publicado por SFI y sus límites metodológicos.</p>
          </Link>
        </section>
      </div>
    </main>
  );
}
