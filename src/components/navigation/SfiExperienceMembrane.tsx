'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuthState } from '@/components/auth/AuthProvider';
import './sfi-experience-membrane.css';

const CONTEXT_KEYS = ['scene','focus','scope','mode','window','objectId','caseId'] as const;

function internalContext(pathname: string, searchParams: URLSearchParams) {
  const params = new URLSearchParams();
  params.set('origin', pathname || '/');
  for (const key of CONTEXT_KEYS) {
    const value = searchParams.get(key);
    if (value) params.set(key, value);
  }
  return params;
}

function destination(path: string, context: URLSearchParams, additions?: Record<string,string>) {
  const params = new URLSearchParams(context);
  if (additions) Object.entries(additions).forEach(([key,value]) => params.set(key,value));
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function roleHome(role: string | null) {
  if (role === 'root' || role === 'system') return { href: '/root', label: 'ENTER ROOT' };
  if (role === 'operator' || role === 'controller') return { href: '/member', label: 'RESUME' };
  return { href: '/studio', label: 'RESUME STUDIO' };
}

export function SfiExperienceMembrane() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { status, userRole } = useAuthState();
  const authSurface = ['/login','/signup','/forgot','/reset','/verify'].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (authSurface) return null;

  const context = internalContext(pathname, new URLSearchParams(searchParams.toString()));
  const observeHref = destination('/observatory', context, { source: 'membrane' });
  const engageHref = destination('/field', context, { intent: 'engage', source: 'membrane' });
  const roleDestination = roleHome(userRole);
  const accessTarget = destination(roleDestination.href, context, { source: 'membrane' });
  const accessHref = status === 'authenticated'
    ? accessTarget
    : `/login?next=${encodeURIComponent(accessTarget)}`;
  const accessLabel = status === 'authenticated' ? roleDestination.label : 'ACCESS';
  const incomingOrigin = searchParams.get('origin');
  const scene = searchParams.get('scene');
  const focus = searchParams.get('focus') || searchParams.get('objectId') || searchParams.get('scope');

  return (
    <aside className="sfi-membrane" data-private={pathname.startsWith('/root') || pathname.startsWith('/studio') || pathname.startsWith('/member')}>
      <div className="sfi-membrane__identity">
        <Link href="/" aria-label="System Friction Institute home"><strong>SFI</strong><span>SYSTEM FRICTION INSTITUTE</span></Link>
        {incomingOrigin || scene || focus ? (
          <div className="sfi-membrane__context" title="Context transported from the previous surface">
            <span>CONTEXT</span>
            <strong>{[scene, focus].filter(Boolean).join(' / ') || incomingOrigin}</strong>
          </div>
        ) : null}
      </div>
      <nav aria-label="SFI experiential routing">
        <Link href={observeHref}><span>OBSERVE</span><small>OBSERVATORY</small></Link>
        <Link href={engageHref}><span>ENGAGE</span><small>FIELD</small></Link>
        <Link href={accessHref} className="sfi-membrane__access"><span>{accessLabel}</span><small>{status === 'authenticated' ? (userRole ?? 'PRIVATE') : 'SIGN IN'}</small></Link>
      </nav>
    </aside>
  );
}
