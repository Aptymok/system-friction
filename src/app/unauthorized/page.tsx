import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerUserContext } from '@/lib/server/productionBackend';

export const dynamic = 'force-dynamic';

export default async function UnauthorizedPage() {
  const ctx = await getServerUserContext();

  if (ctx.user && ctx.canObserveRoot) {
    redirect('/root');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-void px-5 text-paper">
      <div className="terminal-panel max-w-lg p-8 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-gold">Acceso institucional SFI</p>
        <h1 className="mt-3 font-display text-2xl text-red-500">Acceso no autorizado</h1>
        <p className="mt-4 text-sm text-paper/80">
          Esta cuenta no tiene una superficie institucional asignada para esta ruta.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/member" className="border border-gold/50 px-4 py-2 text-gold">Ir a mi espacio</Link>
          <Link href="/interface" className="border border-paper/20 px-4 py-2 text-paper/75">Ir a FIELD</Link>
          <Link href="/" className="border border-paper/20 px-4 py-2 text-paper/75">Inicio</Link>
        </div>
      </div>
    </div>
  );
}
