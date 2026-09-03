import { redirect } from 'next/navigation';
import { getServerUserContext } from '@/lib/server/productionBackend';

function safeInternalPath(value: unknown) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return null;
  if (value.startsWith('/login') || value.startsWith('/entry') || value.startsWith('/auth-unavailable')) return null;
  return value;
}

export default async function EntryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const requested = safeInternalPath(Array.isArray(params.next) ? params.next[0] : params.next);
  const ctx = await getServerUserContext();

  if (ctx.authState === 'unavailable') {
    const next = requested ?? '/entry';
    redirect(`/auth-unavailable?next=${encodeURIComponent(next)}`);
  }

  if (!ctx.user) {
    const next = requested ? `?next=${encodeURIComponent(requested)}` : '';
    redirect(`/login${next}`);
  }

  if (requested) redirect(requested);
  if (ctx.canObserveRoot) redirect('/root');
  redirect('/field');
}
