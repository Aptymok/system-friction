import Link from 'next/link';
import { redirect } from 'next/navigation';
import { findInstitutionalMember } from '@/lib/system/access/institutionalMembers';
import { createServerSupabaseClient } from '@/runtime/supabase/server';

export const dynamic = 'force-dynamic';

export default async function UnauthorizedPage() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getUser();
  if (findInstitutionalMember(data.user?.email)) redirect('/member');

  return (
    <div className="flex min-h-screen items-center justify-center bg-void px-5 text-paper">
      <div className="terminal-panel max-w-lg p-8 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-gold">Acceso institucional SFI</p>
        <h1 className="mt-3 font-display text-2xl text-red-500">Esta superficie no corresponde a tu cuenta</h1>
        <p className="mt-4 text-sm text-paper/80">
          ROOT está reservado para la gobernanza del instituto. Una cuenta autenticada puede seguir utilizando las superficies que tenga asignadas.
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
