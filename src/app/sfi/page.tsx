import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/**
 * `/` is the single public institutional entry for System Friction Institute.
 * `/sfi` remains only as a compatibility alias so the repository never exposes
 * two competing SFI home surfaces.
 */
export default function SfiAliasPage() {
  redirect('/');
}
